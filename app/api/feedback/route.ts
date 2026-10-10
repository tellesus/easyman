import { env } from 'cloudflare:workers';
import {APP_VERSION} from '../../version';
import { createPrivateKey, sign } from 'node:crypto';
import { getChatGPTUser } from '../../chatgpt-auth';
import { body, rate, response } from '../../team-server';

type Secrets = { GITHUB_APP_CLIENT_ID?: string; GITHUB_APP_PRIVATE_KEY?: string; GITHUB_INSTALLATION_ID?: string; GITHUB_FEEDBACK_REPOSITORY?: string };
const secrets = () => env as typeof env & Secrets;
const configured = () => {
  const e = secrets();
  return Boolean(e.GITHUB_APP_CLIENT_ID && e.GITHUB_APP_PRIVATE_KEY && e.GITHUB_INSTALLATION_ID && e.GITHUB_FEEDBACK_REPOSITORY);
};
const labels: Record<string, { name: string; color: string; description: string }> = {
  'Pain Point': { name: 'pain-point', color: 'D4A72C', description: 'Operational friction reported through EasyMan' },
  Bug: { name: 'bug', color: 'D73A4A', description: 'Unexpected EasyMan behavior' },
  'Feature Request': { name: 'enhancement', color: 'A2EEEF', description: 'An improvement requested through EasyMan' },
};
export async function GET() { return response({ configured: configured() }); }
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return response({ error: 'Sign in before submitting feedback.' }, 401);
  if (request.headers.get('origin') !== new URL(request.url).origin) return response({ error: 'Invalid origin.' }, 403);
  if (!configured()) return response({ error: 'GitHub App setup is required. Your draft is preserved.' }, 503);
  try { await rate(user.userId, 'feedback', 20); } catch (error) { if (error instanceof Response) return error; throw error; }
  let data;
  try { data = await body(request, 45000); } catch (error) { if (error instanceof Response) return error; throw error; }
  const { id, category, subject, description } = data || {};
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    || typeof category !== 'string' || !Object.hasOwn(labels, category) || typeof subject !== 'string' || !subject.trim() || subject.length > 160
    || typeof description !== 'string' || !description.trim() || description.length > 10000) return response({ error: 'Complete all feedback fields.' }, 400);
  const prior = await env.DB!.prepare('SELECT status, issue, owner FROM feedback_submissions WHERE id = ?').bind(id).first<{ status: string; issue: number; owner: string }>();
  if (prior) {
    if (prior.owner !== user.userId) return response({ error: 'Invalid feedback ID.' }, 403);
    if (prior.status === 'submitted') return response({ number: prior.issue });
    if (['sending', 'uncertain'].includes(prior.status)) return response({ error: 'This submission needs developer review before retrying, to avoid creating a duplicate issue. Copy your draft and feedback ID for your developer.' }, 409);
  }
  const recent = await env.DB!.prepare('SELECT COUNT(*) AS count FROM feedback_submissions WHERE owner = ? AND created_at > ?').bind(user.userId, new Date(Date.now() - 3600000).toISOString()).first<{ count: number }>();
  if ((recent?.count || 0) >= 10) return response({ error: 'Please wait before sending more feedback.' }, 429);
  const claimed = prior
    ? await env.DB!.prepare("UPDATE feedback_submissions SET status = 'sending' WHERE id = ? AND status = 'failed'").bind(id).run()
    : await env.DB!.prepare("INSERT OR IGNORE INTO feedback_submissions (id, owner, status, created_at) VALUES (?, ?, 'sending', ?)").bind(id, user.userId, new Date().toISOString()).run();
  if (claimed.meta.changes !== 1) return response({ error: 'This feedback is already being submitted.' }, 409);
  let issueRequestStarted = false;
  try {
    const e = secrets();
    const repository = e.GITHUB_FEEDBACK_REPOSITORY!;
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !/^\d+$/.test(e.GITHUB_INSTALLATION_ID!)) throw new Error('Invalid configuration.');
    const now = Math.floor(Date.now() / 1000);
    const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
    const unsigned = encode({ alg: 'RS256', typ: 'JWT' }) + '.' + encode({ iat: now - 60, exp: now + 540, iss: e.GITHUB_APP_CLIENT_ID });
    const jwt = unsigned + '.' + sign('RSA-SHA256', Buffer.from(unsigned), createPrivateKey(e.GITHUB_APP_PRIVATE_KEY!)).toString('base64url');
    const baseHeaders = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10', 'User-Agent': 'EasyMan', 'Content-Type': 'application/json' };
    const github = (url: string, init: RequestInit) => fetch('https://api.github.com' + url, { ...init, signal: AbortSignal.timeout(15000) });
    const tokenResponse = await github(`/app/installations/${e.GITHUB_INSTALLATION_ID}/access_tokens`, {
      method: 'POST', headers: { ...baseHeaders, Authorization: 'Bearer ' + jwt },
      body: JSON.stringify({ repositories: [repository.split('/')[1]], permissions: { issues: 'write' } }),
    });
    if (!tokenResponse.ok) throw new Error('Authentication failed.');
    const { token } = await tokenResponse.json() as { token: string };
    if (!token) throw new Error('Missing token.');
    const headers = { ...baseHeaders, Authorization: 'Bearer ' + token };
    const repoResponse = await github(`/repos/${repository}`, { headers });
    if (!repoResponse.ok) throw new Error('Repository unavailable.');
    const repo = await repoResponse.json() as { private: boolean; has_issues: boolean; archived: boolean };
    if (repo.private !== true || !repo.has_issues || repo.archived) throw new Error('An active private repository with Issues enabled is required.');
    const label = labels[category];
    const labelResponse = await github(`/repos/${repository}/labels/${label.name}`, { headers });
    if (labelResponse.status === 404) {
      const created = await github(`/repos/${repository}/labels`, { method: 'POST', headers, body: JSON.stringify(label) });
      // Another submission may have created the same label while this one was preparing.
      if (!created.ok) {
        const existing = created.status === 422 ? await github(`/repos/${repository}/labels/${label.name}`, { headers }) : null;
        if (!existing?.ok) throw new Error('Category unavailable.');
      }
    } else if (!labelResponse.ok) throw new Error('Category unavailable.');
    issueRequestStarted = true;
    const issueResponse = await github(`/repos/${repository}/issues`, {
      method: 'POST', headers,
      body: JSON.stringify({ title: `[${category.toUpperCase()}] ${subject.trim()}`, body: `Category: ${category}\nEasyMan Version: ${APP_VERSION}\nModule: Developer feedback\nSubmitted: ${new Date().toISOString()}\nFeedback ID: ${id}\n\nDescription:\n\n${description.trim()}`, labels: [label.name] }),
    });
    if (!issueResponse.ok) { issueRequestStarted = issueResponse.status >= 500; throw new Error('Submission failed.'); }
    const issue = await issueResponse.json() as { number: number };
    if (!Number.isSafeInteger(issue.number) || issue.number <= 0) throw new Error('Invalid confirmation.');
    await env.DB!.prepare("UPDATE feedback_submissions SET status = 'submitted', issue = ? WHERE id = ? AND owner = ?").bind(issue.number, id, user.userId).run();
    return response({ number: issue.number });
  } catch {
    await env.DB!.prepare('UPDATE feedback_submissions SET status = ? WHERE id = ? AND owner = ?').bind(issueRequestStarted ? 'uncertain' : 'failed', id, user.userId).run();
    return response({ error: issueRequestStarted
      ? 'GitHub submission could not be confirmed. Ask your developer to check the feedback ID before retrying, to avoid duplicates.'
      : 'Feedback could not be submitted. Ask your developer to check the private repository and GitHub App setup. Your draft is preserved.' }, 502);
  }
}

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { AsyncLocalStorage } from 'node:async_hooks';
import { generateKeyPairSync, verify } from 'node:crypto';
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';

const sql = new DatabaseSync(':memory:');
for (const file of readdirSync('drizzle').filter(f => f.endsWith('.sql')).sort()) sql.exec(readFileSync('drizzle/' + file, 'utf8'));
class Statement {
  constructor(query, params = []) { this.query = query; this.params = params; }
  bind(...params) { return new Statement(this.query, params); }
  async first() { return sql.prepare(this.query).get(...this.params) || null; }
  async run() { return { meta: { changes: Number(sql.prepare(this.query).run(...this.params).changes) } }; }
}
globalThis.__feedbackEnv = { DB: { prepare: q => new Statement(q) } };
globalThis.__feedbackHeaders = new AsyncLocalStorage();
const out = path.resolve('.sites-runtime/feedback-tests'); mkdirSync(out, { recursive: true });
const file = path.join(out, 'feedback.mjs');
await build({ entryPoints: ['app/api/feedback/route.ts'], outfile: file, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent', plugins: [{ name: 'feedback-platform', setup(b) {
  b.onResolve({ filter: /^(cloudflare:workers|next\/headers|next\/navigation)$/ }, a => ({ path: a.path, namespace: 'fixture' }));
  b.onLoad({ filter: /.*/, namespace: 'fixture' }, a => ({ contents: a.path === 'cloudflare:workers' ? 'export const env=globalThis.__feedbackEnv;' : a.path === 'next/headers' ? 'export async function headers(){return globalThis.__feedbackHeaders.getStore()||new Headers();}' : 'export function redirect(){throw new Error("Unexpected redirect");}' }));
} }] });
const route = await import(pathToFileURL(file));
const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
function reset() {
  sql.exec('DELETE FROM feedback_submissions; DELETE FROM rate_limits;');
  Object.assign(globalThis.__feedbackEnv, { GITHUB_APP_CLIENT_ID: 'Iv1.example', GITHUB_APP_PRIVATE_KEY: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }), GITHUB_INSTALLATION_ID: '123', GITHUB_FEEDBACK_REPOSITORY: 'tellesus/easyman-feedback' });
}
const draft = (category = 'Pain Point') => ({ id: crypto.randomUUID(), category, subject: '  Synthetic test  ', description: '  Only a reviewed synthetic description.  ', hotelRecords: [{ confidential: 'MUST NOT BE COPIED' }], email: 'MUST NOT BE COPIED' });
async function call(data, { actor = 'owner', origin = 'https://easyman.test', raw } = {}) {
  const auth = actor ? new Headers({ 'oai-authenticated-user-id': actor, 'oai-authenticated-user-email': actor + '@example.invalid' }) : new Headers();
  const r = await globalThis.__feedbackHeaders.run(auth, () => route.POST(new Request('https://easyman.test/api/feedback', { method: 'POST', headers: { Origin: origin }, body: raw ?? JSON.stringify(data) })));
  return { status: r.status, value: await r.json() };
}
function github({ privateRepo = true, issues = true, archived = false, missingLabel = false, labelFailure = false, concurrentLabel = false, tokenFailure = false, issueStatus = 201, uncertain = false, malformedConfirmation = false } = {}) {
  const requests = [];
  globalThis.fetch = async (url, init) => {
    const body = init.body ? JSON.parse(init.body) : null;
    const pathname = new URL(url).pathname;
    requests.push({ pathname, method: init.method || 'GET', body });
    assert.ok(init.signal, 'GitHub requests have a timeout');
    if (pathname.endsWith('/access_tokens')) {
      const jwt = init.headers.Authorization.slice(7), [head, payload, signature] = jwt.split('.');
      assert.equal(verify('RSA-SHA256', Buffer.from(head + '.' + payload), pair.publicKey, Buffer.from(signature, 'base64url')), true);
      const claims = JSON.parse(Buffer.from(payload, 'base64url')); assert.equal(claims.iss, 'Iv1.example'); assert.equal(claims.exp - claims.iat, 600);
      assert.deepEqual(body, { repositories: ['easyman-feedback'], permissions: { issues: 'write' } });
      return Response.json(tokenFailure ? {} : { token: 'synthetic-installation-token' }, { status: tokenFailure ? 401 : 201 });
    }
    assert.equal(init.headers.Authorization, 'Bearer synthetic-installation-token');
    if (pathname === '/repos/tellesus/easyman-feedback') return Response.json({ private: privateRepo, has_issues: issues, archived });
    if (pathname.includes('/labels/')) return Response.json({}, { status: labelFailure ? 403 : missingLabel && !(concurrentLabel && requests.filter(r => r.pathname.includes('/labels/')).length > 1) ? 404 : 200 });
    if (pathname.endsWith('/labels')) return Response.json({}, { status: concurrentLabel ? 422 : 201 });
    if (pathname.endsWith('/issues')) {
      if (uncertain) throw new Error('Network interrupted after request dispatch');
      return Response.json(malformedConfirmation ? {} : { number: 42 }, { status: issueStatus });
    }
    throw new Error('Unexpected GitHub endpoint: ' + pathname);
  };
  return requests;
}

test('feedback rejects unauthenticated, cross-origin, unconfigured, invalid and oversized requests', async () => {
  reset(); const requests = github();
  assert.equal((await call(draft(), { actor: null })).status, 401);
  assert.equal((await call(draft(), { origin: 'https://attacker.invalid' })).status, 403);
  delete globalThis.__feedbackEnv.GITHUB_APP_PRIVATE_KEY;
  assert.deepEqual(await (await route.GET()).json(), { configured: false });
  assert.equal((await call(draft())).status, 503);
  reset(); assert.equal((await route.GET()).headers.get('cache-control'), 'no-store');
  for (const raw of ['null', '{', JSON.stringify({ ...draft(), category: 'constructor' }), JSON.stringify({ ...draft(), id: 'not-a-uuid' }), JSON.stringify({ ...draft(), category: {} })]) assert.equal((await call(null, { raw })).status, 400);
  assert.equal((await call(null, { raw: 'x'.repeat(45001) })).status, 413);
  assert.equal(requests.length, 0);
});

test('all feedback categories become labeled private issues without copying hotel data; retries are idempotent', async () => {
  for (const [category, label] of [['Pain Point', 'pain-point'], ['Bug', 'bug'], ['Feature Request', 'enhancement']]) {
    reset(); const requests = github({ missingLabel: true }), data = draft(category);
    assert.deepEqual(await call(data), { status: 200, value: { number: 42 } });
    const issue = requests.find(r => r.pathname.endsWith('/issues'));
    assert.equal(issue.body.title, `[${category.toUpperCase()}] Synthetic test`); assert.deepEqual(issue.body.labels, [label]);
    assert.match(issue.body.body, new RegExp(data.id)); assert.doesNotMatch(JSON.stringify(issue.body), /MUST NOT BE COPIED|owner@example/);
    assert.equal(requests.find(r => r.pathname.endsWith('/labels')).body.name, label);
    const count = requests.length; assert.equal((await call(data)).status, 200); assert.equal(requests.length, count);
    assert.equal((await call(data, { actor: 'another-owner' })).status, 403);
  }
  reset(); github({ missingLabel: true, concurrentLabel: true }); assert.equal((await call(draft())).status, 200);
});

test('public, archived, disabled-issues repositories and credential/category failures never receive feedback', async () => {
  for (const options of [{ privateRepo: false }, { issues: false }, { archived: true }, { tokenFailure: true }, { labelFailure: true }]) {
    reset(); const requests = github(options), data = draft();
    assert.equal((await call(data)).status, 502); assert.equal(requests.some(r => r.pathname.endsWith('/issues')), false);
    assert.equal(sql.prepare('SELECT status FROM feedback_submissions WHERE id=?').get(data.id).status, 'failed');
    github(); assert.equal((await call(data)).status, 200, 'a failure before issue creation can safely retry');
  }
});

test('ambiguous submissions block duplicate creation, while explicit rejected issues can retry', async () => {
  for (const options of [{ uncertain: true }, { issueStatus: 500 }, { malformedConfirmation: true }]) {
    reset(); const requests = github(options), data = draft();
    assert.equal((await call(data)).status, 502); assert.equal(sql.prepare('SELECT status FROM feedback_submissions WHERE id=?').get(data.id).status, 'uncertain');
    const count = requests.length; assert.equal((await call(data)).status, 409); assert.equal(requests.length, count);
  }
  reset(); github({ issueStatus: 422 }); const data = draft(); assert.equal((await call(data)).status, 502);
  assert.equal(sql.prepare('SELECT status FROM feedback_submissions WHERE id=?').get(data.id).status, 'failed');
  github(); assert.equal((await call(data)).status, 200);
});

test('feedback claims prevent concurrent duplicates and per-user submission limits are enforced', async () => {
  reset(); const requests = github(), data = draft();
  const results = await Promise.all([call(data), call(data)]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]); assert.equal(requests.filter(r => r.pathname.endsWith('/issues')).length, 1);
  reset(); github(); for (let i = 0; i < 10; i++) assert.equal((await call(draft())).status, 200);
  assert.equal((await call(draft())).status, 429);
  reset(); github(); for (let i = 0; i < 20; i++) assert.equal((await call(null, { raw: 'null' })).status, 400);
  assert.equal((await call(draft())).status, 429);
});

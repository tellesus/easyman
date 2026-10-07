import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Sign in to sync your workspace.' }, 401);
  const row = await env.DB!.prepare('SELECT ciphertext, iv, revision FROM workspaces WHERE owner = ?').bind(user.userId).first();
  return json({ workspace: row });
}
export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Sign in required.' }, 401);
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Invalid origin.' }, 403);
  const raw = await request.text();
  if (raw.length > 1500000) return json({ error: 'Workspace too large.' }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: 'Invalid JSON.' }, 400); }
  if (!Number.isInteger(body.revision) || body.revision < 0 || typeof body.ciphertext !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(body.ciphertext) || typeof body.iv !== 'string' || !/^[A-Za-z0-9+/]{16}$/.test(body.iv)) return json({ error: 'Invalid encrypted workspace.' }, 400);
  const now = new Date().toISOString();
  await env.DB!.prepare('INSERT OR IGNORE INTO workspaces (owner, ciphertext, iv, revision, updated_at) VALUES (?, ?, ?, 0, ?)').bind(user.userId, body.ciphertext, body.iv, now).run();
  const result = await env.DB!.prepare('UPDATE workspaces SET ciphertext = ?, iv = ?, revision = revision + 1, updated_at = ? WHERE owner = ? AND revision = ? RETURNING revision').bind(body.ciphertext, body.iv, now, user.userId, body.revision).first<{ revision: number }>();
  if (!result) return json({ error: 'This workspace changed in another tab or device. Reload before making more changes.' }, 409);
  await env.DB!.prepare('INSERT INTO audit_events (id, owner, action, timestamp) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), user.userId, 'workspace.saved', now).run();
  return json({ revision: result.revision });
}

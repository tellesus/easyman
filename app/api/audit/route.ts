import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Sign in required.' }, { status: 401 });
  const rows = await env.DB!.prepare('SELECT id, action, timestamp FROM audit_events WHERE owner = ? ORDER BY timestamp DESC LIMIT 200').bind(user.userId).all();
  return Response.json(rows.results, { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Sign in required.' }, { status: 401 });
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ error: 'Invalid origin.' }, { status: 403 });
  const { action } = await request.json() as { action: string };
  if (!['configuration.export.encrypted', 'configuration.export.plaintext', 'configuration.restored', 'schedule.published', 'shift.snapshot'].includes(action)) return Response.json({ error: 'Invalid event.' }, { status: 400 });
  const event = { id: crypto.randomUUID(), action, timestamp: new Date().toISOString() };
  await env.DB!.prepare('INSERT INTO audit_events (id, owner, action, timestamp) VALUES (?, ?, ?, ?)').bind(event.id, user.userId, event.action, event.timestamp).run();
  return Response.json(event);
}

import { env } from 'cloudflare:workers';
import { db, response } from './team-server';
import { capturePropertySnapshots } from './snapshot-server';
import { completedSnapshotHours } from './passon-snapshot';

const purpose = 'EasyManSnapshots/v1\n';
async function signedBody(request: Request) {
  const reader = request.body?.getReader(), decoder = new TextDecoder();
  let raw = '', bytes = 0;
  if (!reader) throw response({ error: 'Invalid scheduler request.' }, 400);
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 1024) throw response({ error: 'Request is too large.' }, 413);
      raw += decoder.decode(chunk.value, { stream: true });
    }
    return raw + decoder.decode();
  } finally { await reader.cancel(); }
}
export async function runSnapshotJob(request: Request) {
  if (!env.EASYMAN_SNAPSHOT_PUBLIC_JWK) return response({ error: 'Scheduler is not configured.' }, 503);
  let payload: { invocationId: string; issuedAt: number; scheduledAt: number; purpose: string };
  try {
    const raw = await signedBody(request);
    const input = JSON.parse(raw);
    const signature = request.headers.get('X-EasyMan-Snapshot-Signature') || '';
    if (!/^[A-Za-z0-9+/]{86}==$/.test(signature)) return response({ error: 'Invalid scheduler signature.' }, 401);
    const jwk = JSON.parse(env.EASYMAN_SNAPSHOT_PUBLIC_JWK);
    delete jwk.alg;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'Ed25519' }, false, ['verify']);
    if (!await crypto.subtle.verify('Ed25519', key, Uint8Array.from(atob(signature), c => c.charCodeAt(0)), new TextEncoder().encode(purpose + raw))) return response({ error: 'Invalid scheduler signature.' }, 401);
    if (!input || Object.keys(input).sort().join(',') !== 'invocationId,issuedAt,purpose,scheduledAt' || input.purpose !== 'shift-snapshots' || !/^[a-f0-9-]{36}$/.test(input.invocationId) || !Number.isFinite(input.issuedAt) || !Number.isFinite(input.scheduledAt) || Math.abs(Date.now() - input.issuedAt) > 180000 || input.scheduledAt > input.issuedAt + 60000) return response({ error: 'Invalid or expired scheduler request.' }, 400);
    payload = input;
  } catch (error) {
    if (error instanceof Response) return error;
    return response({ error: 'Invalid scheduler request.' }, 400);
  }
  const now = new Date(), at = now.toISOString();
  try {
  await db().prepare("INSERT OR IGNORE INTO snapshot_scheduler_job (id) VALUES ('native')").run();
  const lease = await db().prepare("UPDATE snapshot_scheduler_job SET invocation_id=?,lease_until=?,scheduled_at=?,attempted_at=?,status='running' WHERE id='native' AND lease_until<=? RETURNING cursor").bind(payload.invocationId, new Date(now.getTime() + 90000).toISOString(), new Date(payload.scheduledAt).toISOString(), at, at).first<{ cursor: string }>();
  if (!lease) return response({ ok: true, skipped: 'already-running' });
  let captured = 0, checked = 0, failed = 0, cursor = lease.cursor;
  try {
    const properties = await db().prepare('SELECT * FROM properties WHERE id>? ORDER BY id LIMIT 8').bind(cursor).all<any>();
    for (const property of properties.results) {
      if (checked && Date.now() - now.getTime() > 15000) break;
      cursor = property.id;
      checked++;
      try {
        const count = await capturePropertySnapshots(property, now, 16);
        captured += count;
        await db().prepare("INSERT INTO snapshot_scheduler_properties (property,attempted_at,succeeded_at,status,captured,error_code) VALUES (?,?,?,'ok',?,NULL) ON CONFLICT(property) DO UPDATE SET attempted_at=excluded.attempted_at,succeeded_at=excluded.succeeded_at,status='ok',captured=excluded.captured,error_code=NULL").bind(property.id, at, new Date().toISOString(), count).run();
      } catch {
        failed++;
        await db().prepare("INSERT INTO snapshot_scheduler_properties (property,attempted_at,status,error_code) VALUES (?,?,'failed','capture-failed') ON CONFLICT(property) DO UPDATE SET attempted_at=excluded.attempted_at,status='failed',error_code='capture-failed'").bind(property.id, at).run();
      }
    }
    if (properties.results.length < 8 && checked === properties.results.length) cursor = '';
    await db().prepare("UPDATE snapshot_scheduler_job SET lease_until='',cursor=?,status=?,captured=?,checked=?,failed=?,succeeded_at=CASE WHEN ?=0 THEN ? ELSE succeeded_at END WHERE id='native' AND invocation_id=?").bind(cursor, failed ? 'failed' : 'ok', captured, checked, failed, failed, new Date().toISOString(), payload.invocationId).run();
    return response({ ok: failed === 0, captured, checked, failed }, failed ? 503 : 200);
  } catch {
    await db().prepare("UPDATE snapshot_scheduler_job SET lease_until='',status='failed',failed=1 WHERE id='native' AND invocation_id=?").bind(payload.invocationId).run();
    return response({ error: 'Snapshot storage is unavailable.' }, 503);
  }
  } catch { return response({ error: 'Snapshot storage is unavailable.' }, 503); }
}

export async function nativeSnapshotJobStatus(request: Request) {
  const supplied = request.headers.get('X-EasyMan-Snapshot-Status') || '';
  const expected = env.EASYMAN_SNAPSHOT_STATUS_TOKEN || '';
  const digest = async (value: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  const [a, b] = await Promise.all([digest(supplied), digest(expected)]);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  if (!expected || supplied.length > 256 || difference !== 0) return response({ error: 'Unauthorized.' }, 401);
  const job = await db().prepare("SELECT scheduled_at AS scheduledAt,attempted_at AS attemptedAt,succeeded_at AS succeededAt,status,captured,checked,failed FROM snapshot_scheduler_job WHERE id='native'").first();
  const properties = await db().prepare("SELECT COUNT(*) AS total,SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS failed,MIN(succeeded_at) AS oldestSuccess FROM snapshot_scheduler_properties").first();
  const legacy = await db().prepare("SELECT COUNT(*) AS count FROM encrypted_resources WHERE field='passon' AND aad<>2").first<{count:number}>();
  return response({ scheduler: 'cloudflare-cron', job, properties, passonPolicy: { version:1,completedAgeHours:completedSnapshotHours,legacyRecordsAwaitingUpgrade:legacy?.count||0 } });
}

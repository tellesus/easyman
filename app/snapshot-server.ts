import { db, parsedResource } from './team-server';
import { zonedInstant } from './time';
import { days } from './domain';
import { completedSnapshotHours } from './passon-snapshot';

// Browser catch-up and the native job share immutable ciphertext history.
export async function capturePropertySnapshots(property: any, now = new Date(), limit = 200) {
  const boundaries = [...new Set<string>(JSON.parse(property.boundaries))].sort();
  if (!boundaries.length) return 0;
  const localDay = (at: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: property.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
  const last = await db().prepare('SELECT MAX(boundary) AS last FROM shift_snapshots WHERE property=?').bind(property.id).first<any>();
  const started = last?.last ? new Date(new Date(last.last).getTime() + 60000) : new Date(property.created_at || now.toISOString());
  const date = localDay(now);
  const due: { at: string; boundary: string; closing: string }[] = [];
  for (const day of days(localDay(started), 31).filter(day => day <= date)) {
    for (const [index, boundary] of boundaries.entries()) {
      let instant: number;
      try { instant = zonedInstant(day, boundary, property.timezone); } catch { continue; }
      if (instant > now.getTime() || instant < started.getTime()) continue;
      due.push({ at: new Date(instant).toISOString(), boundary, closing: boundaries[(index - 1 + boundaries.length) % boundaries.length] || '' });
    }
  }
  if (!due.length) return 0;
  const current = await db().prepare("SELECT * FROM encrypted_resources WHERE property=? AND field='passon'").bind(property.id).all<any>();
  const versions = await db().prepare('SELECT v.* FROM resource_versions v WHERE v.property=? AND v.timestamp>? ORDER BY v.timestamp ASC').bind(property.id, started.toISOString()).all<any>();
  const first = await db().prepare('SELECT MIN(updated_at) AS started FROM encrypted_resources WHERE property=?').bind(property.id).first<any>();
  const ids = new Set([...current.results.map(r => r.id), ...versions.results.map(v => v.resource_id)]);
  let captured = 0;
  for (const { at, boundary, closing } of due.slice(0, limit)) {
    if ((property.created_at || first?.started) > at) continue;
    const id = property.id + '::' + at;
    const records: any[] = [];
    for (const fullId of ids) {
      const superseded = versions.results.find(v => v.resource_id === fullId && v.timestamp > at);
      const value = superseded ? JSON.parse(superseded.data) : current.results.find(r => r.id === fullId);
      if (!value || value.field !== 'passon') continue;
      const validFrom = superseded ? value.validFrom : value.updated_at;
      if (!validFrom || validFrom > at) continue;
      // Apply the policy to the version that existed at the boundary, not today's state.
      const exclusion = superseded ? value.snapshotExcludeAfter : value.snapshot_exclude_after;
      const aad = superseded ? value.aadVersion : value.aad;
      if (aad === 2 && exclusion && Date.parse(exclusion) <= Date.parse(at)) continue;
      records.push(superseded ? value : parsedResource(value));
    }
    const createdAt = new Date().toISOString();
    const saved = await db().batch([
      db().prepare('INSERT OR IGNORE INTO shift_snapshots (id,property,boundary,incoming,closing,data,created_at,policy) VALUES (?,?,?,?,?,?,?,?)').bind(id, property.id, at, boundary, closing, JSON.stringify(records), createdAt, JSON.stringify({version:1,completedAgeHours:completedSnapshotHours,timezone:property.timezone})),
      db().prepare('INSERT OR IGNORE INTO audit_events (id,owner,action,timestamp) VALUES (?,?,?,?)').bind('snapshot:' + id, property.id, 'shift.snapshot.automatic', createdAt),
    ]);
    if (saved[0].meta.changes) captured++;
  }
  return captured;
}

export async function captureDueSnapshots(owner: string, now = new Date(), source: 'browser' | 'background' = 'browser') {
  const properties = await db().prepare('SELECT * FROM properties WHERE owner=?').bind(owner).all<any>();
  let captured = 0;
  for (const property of properties.results) {
    const count = await capturePropertySnapshots(property, now);
    captured += count;
    // Legacy/manual connector receipts cannot certify the native scheduler.
    if (source === 'background') await db().prepare('INSERT INTO audit_events (id,owner,action,timestamp) VALUES (?,?,?,?)').bind(crypto.randomUUID(), property.id, 'shift.snapshot.run.background:' + count, new Date().toISOString()).run();
  }
  return { captured };
}

export async function propertySnapshotStatus(propertyId: string) {
  const counts = await db().prepare('SELECT COUNT(*) AS total, MAX(boundary) AS latestBoundary FROM shift_snapshots WHERE property=?').bind(propertyId).first<any>();
  const run = await db().prepare("SELECT timestamp, action FROM audit_events WHERE owner=? AND action LIKE 'shift.snapshot.run.background:%' ORDER BY timestamp DESC LIMIT 1").bind(propertyId).first<any>();
  const native = await db().prepare('SELECT attempted_at AS attemptedAt, succeeded_at AS succeededAt, status, captured, error_code AS errorCode FROM snapshot_scheduler_properties WHERE property=?').bind(propertyId).first<any>();
  const propertyCount = await db().prepare('SELECT COUNT(*) AS n FROM properties').first<any>();
  const staleAfterMinutes = Math.max(5, Math.ceil((propertyCount?.n || 0) / 8) * 3);
  return { total: counts?.total || 0, latestBoundary: counts?.latestBoundary || null, lastBackgroundRun: run ? { at: run.timestamp, captured: Number(run.action.split(':').at(-1)) } : null, nativeScheduler: native || null, staleAfterMinutes };
}

export async function snapshotStatus(owner: string) {
  const properties = await db().prepare('SELECT id,timezone,boundaries FROM properties WHERE owner=?').bind(owner).all<any>();
  return { properties: await Promise.all(properties.results.map(async p => ({ propertyId: p.id, timezone: p.timezone, boundaries: JSON.parse(p.boundaries), ...await propertySnapshotStatus(p.id) }))) };
}

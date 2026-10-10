import { dateTimeISO } from './time';

export const completedSnapshotHours = 12;
export function snapshotExcludeAfter(item: Record<string,unknown>, timezone = 'America/Chicago'): string | null {
  if (item.status !== 'Completed' || typeof item.completed !== 'string' || !item.completed) return null;
  try {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/i.test(item.completed)) return null;
    const date = item.completed.slice(0,10);
    if (new Date(date + 'T00:00:00Z').toISOString().slice(0,10) !== date) return null;
    if (Number(item.completed.slice(11,13)) > 23 || Number(item.completed.slice(14,16)) > 59 || Number(item.completed.slice(17,19)||0) > 59) return null;
    // Old sample/import timestamps are property wall times; new completions have offsets.
    const hasOffset = /(?:Z|[+-]\d{2}:\d{2})$/i.test(item.completed);
    const seconds = hasOffset ? 0 : Number(item.completed.slice(17,19)||0)*1000 + Math.round(Number('0.'+(item.completed.split('.')[1]||'0'))*1000);
    const ms = Date.parse(hasOffset ? item.completed : dateTimeISO(item.completed, timezone)) + seconds;
    return Number.isFinite(ms) ? new Date(ms + completedSnapshotHours * 3600000).toISOString() : null;
  } catch { return null; }
}

export function includePassonInSnapshot(item: Record<string,unknown>, boundary: string, timezone = 'America/Chicago') {
  const cutoff = snapshotExcludeAfter(item, timezone);
  // Missing/invalid legacy completion times cannot establish 12 completed hours.
  return !cutoff || Date.parse(boundary) < Date.parse(cutoff);
}

export function validSnapshotMetadata(record: { field: string; aadVersion?: number; snapshotExcludeAfter?: unknown }) {
  if (record.aadVersion !== 2) return record.snapshotExcludeAfter === undefined;
  if (record.field !== 'passon') return false;
  const value = record.snapshotExcludeAfter;
  return value === null || typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

export function snapshotHealthText(health: any, now = Date.now()) {
  const run = health.nativeScheduler;
  if (!run) return 'Automatic snapshots have not reported a native scheduler check yet. Contact the administrator if this persists.';
  if (run.status === 'failed') return 'Automatic snapshot capture failed. The scheduler will retry; contact the administrator if this persists.';
  if (!run.succeededAt || now - Date.parse(run.succeededAt) > health.staleAfterMinutes * 60000) return 'Automatic snapshot checks are overdue. Contact the administrator to check the scheduler.';
  return `Last automatic check: ${new Date(run.succeededAt).toLocaleString()} · ${run.captured} new snapshots · ${health.total} preserved. Runs without an open browser.`;
}

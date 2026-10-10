const path = '/api/internal/shift-snapshots';
async function readReceipt(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('empty-response');
  let bytes = 0, raw = '';
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 2048) throw new Error('invalid-response');
      raw += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(raw + decoder.decode());
  } finally { await reader.cancel(); }
}
export default {
  async scheduled(controller: ScheduledController, env: SnapshotSchedulerEnv, _ctx: ExecutionContext) {
    const target = new URL(env.SNAPSHOT_ORIGIN);
    if (target.protocol !== 'https:' || target.pathname !== '/' || target.username || target.password) throw new Error('invalid-origin');
    const jwk = JSON.parse(env.SNAPSHOT_SIGNING_JWK);
    // Node and Workers emit different optional EdDSA alg labels. The curve is explicit.
    delete jwk.alg;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'Ed25519' }, false, ['sign']);
    const invocationId = crypto.randomUUID();
    for (let attempt = 0; attempt < 3; attempt++) {
      const raw = JSON.stringify({ purpose: 'shift-snapshots', invocationId, issuedAt: Date.now(), scheduledAt: controller.scheduledTime });
      const bytes = await crypto.subtle.sign('Ed25519', key, new TextEncoder().encode('EasyManSnapshots/v1\n' + raw));
      const signature = btoa(String.fromCharCode(...new Uint8Array(bytes)));
      try {
        const response = await fetch(new URL(path, target), {
          method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(25000),
          headers: { 'Content-Type': 'application/json', 'OAI-Sites-Authorization': 'Bearer ' + env.SITES_SERVICE_TOKEN, 'X-EasyMan-Snapshot-Signature': signature }, body: raw,
        });
        if (!response.ok) {
          await response.body?.cancel();
          if (response.status < 500 && response.status !== 429) throw new Error('permanent-' + response.status);
          throw new Error('transient-' + response.status);
        }
        const receipt = await readReceipt(response);
        if (receipt.ok !== true) throw new Error('invalid-response');
        console.log(JSON.stringify({ event: 'snapshot-check', outcome: 'ok', scheduledAt: controller.scheduledTime, captured: receipt.captured || 0, checked: receipt.checked || 0, skipped: receipt.skipped || null }));
        return;
      } catch (error) {
        const code = error instanceof Error && /^(permanent-\d+|transient-\d+|invalid-response|empty-response)$/.test(error.message) ? error.message : 'connection-failed';
        if (attempt === 2 || code.startsWith('permanent-')) {
          console.error(JSON.stringify({ event: 'snapshot-check', outcome: 'failed', scheduledAt: controller.scheduledTime, code }));
          throw new Error('snapshot-check-failed');
        }
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
      }
    }
  },
  async fetch() { return new Response('Not found', { status: 404 }); },
} satisfies ExportedHandler<SnapshotSchedulerEnv>;

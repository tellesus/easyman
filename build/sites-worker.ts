import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    let response = await runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
    if (import.meta.env.DEV) return response;
    const nonce=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
    if(response.headers.get('content-type')?.includes('text/html'))response=new HTMLRewriter().on('script',{element(element){element.setAttribute('nonce',nonce);}}).transform(response);
    const headers=new Headers(response.headers);
    headers.set('Content-Security-Policy',`default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline' data:; img-src 'self' data: blob:; connect-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self' https://chatgpt.com; frame-ancestors 'self' https://*.chatgpt.com https://*.openai.com https://*.chatgpt.site`);
    headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','no-referrer');headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  },
};

import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// Native app (Capacitor) WebView origins. Requests from iOS/Android bundles
// are cross-origin to this server; we must answer CORS preflights and tag
// responses. Auth is still enforced per-request via the Authorization bearer.
const NATIVE_APP_ORIGINS = new Set([
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
  "https://localhost",
]);

const nativeCorsMiddleware = createMiddleware().server(async ({ request, next }) => {
  const origin = request.headers.get("origin");
  const isNative = origin != null && NATIVE_APP_ORIGINS.has(origin);

  if (isNative && request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers":
          request.headers.get("access-control-request-headers") ??
          "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      },
    });
  }

  const response = await next();
  if (isNative && response instanceof Response) {
    const r = new Response(response.body, response);
    r.headers.set("Access-Control-Allow-Origin", origin);
    r.headers.append("Vary", "Origin");
    return r;
  }
  return response;
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [nativeCorsMiddleware, errorMiddleware],
}));

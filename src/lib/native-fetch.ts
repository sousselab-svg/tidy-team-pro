import { Capacitor } from "@capacitor/core";

// When the app runs as a native Capacitor bundle there is NO server inside
// the app — relative calls like fetch("/_serverFn/...") would hit
// capacitor://localhost and fail (white screen / dead data). We rewrite those
// calls to the deployed Lovable server.
//
// While the project is not published yet, we point at the stable preview
// deployment. Once you publish the app, switch to the production URL below.
const NATIVE_SERVER_ORIGIN =
  "https://project--6a6af60f-372a-40a6-a7dc-46010b75f6d4-dev.lovable.app";
// After publishing, use:
// const NATIVE_SERVER_ORIGIN = "https://project--6a6af60f-372a-40a6-a7dc-46010b75f6d4.lovable.app";

const REWRITE_PREFIXES = ["/_serverFn/", "/api/"];

let installed = false;

export function installNativeFetchRewrite() {
  if (installed || typeof window === "undefined") return;
  if (!Capacitor.isNativePlatform()) return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      if (REWRITE_PREFIXES.some((p) => url.startsWith(p))) {
        const rewritten = NATIVE_SERVER_ORIGIN + url;
        if (typeof input === "string" || input instanceof URL) {
          return originalFetch(rewritten, init);
        }
        return originalFetch(new Request(rewritten, input), init);
      }
    } catch {
      // fall through to the original fetch
    }
    return originalFetch(input as RequestInfo, init);
  }) as typeof window.fetch;
}
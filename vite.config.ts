// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// The Lovable wrapper builds the server entry with Nitro, producing
// `dist/server/index.mjs`. TanStack Start's preview-server plugin (used by
// the SPA prerender to fetch `/_shell`) hardcodes the lookup to
// `dist/server/<entryBasename>.js` — defaulting to `server.js`. Without a
// matching file the prerender 500s with `ERR_MODULE_NOT_FOUND` and the build
// aborts. This plugin emits a 1-line re-export shim right after the server
// bundle is written so the preview server can resolve it.
const emitServerShimPlugin = () => {
  let written = false;
  const tryWrite = () => {
    if (written) return;
    const targetPath = resolve(process.cwd(), "dist/server/index.mjs");
    if (!existsSync(targetPath)) return;
    writeFileSync(
      resolve(process.cwd(), "dist/server/server.js"),
      "export { default } from './index.mjs';\nexport * from './index.mjs';\n",
    );
    written = true;
  };
  return {
    name: "lovable:emit-server-shim",
    enforce: "post" as const,
    writeBundle() {
      tryWrite();
    },
    closeBundle() {
      tryWrite();
    },
  };
};

export default defineConfig({
  tanstackStart: {
    spa: { enabled: true },
  },
  vite: {
    plugins: [emitServerShimPlugin()],
  },
});

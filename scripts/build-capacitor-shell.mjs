#!/usr/bin/env node
// Copies the official TanStack Start SPA shell (dist/client/_shell.html,
// generated because `spa.enabled` is on in vite.config.ts) to
// dist/client/index.html so Capacitor (iOS/Android) can ship it inside the
// native binary. A hand-made index.html cannot boot the app — the client
// entry needs the framework's serialized bootstrap payload, which only the
// prerendered shell contains.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDir = resolve(__dirname, "..", "dist", "client");
const shellPath = resolve(clientDir, "_shell.html");
const indexPath = resolve(clientDir, "index.html");

if (!existsSync(shellPath)) {
  console.error(
    "[build-capacitor-shell] SPA shell not found at",
    shellPath,
    "\nMake sure vite.config.ts has tanstackStart.spa.enabled = true and the build completed successfully.",
  );
  process.exit(1);
}

// Boot splash: plays the video the instant the WebView parses the HTML,
// BEFORE React loads/hydrates (which takes 2-3s). It also hides the native
// splash on first frame and marks the splash as shown so AnimatedSplash
// (React) doesn't play it a second time.
const bootSplash = `
<div id="boot-splash" style="position:fixed;inset:0;z-index:99999;background:#fff;transition:opacity .4s ease-out">
  <video id="boot-splash-video" src="/splash-video.mp4" autoplay muted playsinline preload="auto" style="width:100%;height:100%;object-fit:cover"></video>
</div>
<script>
(function () {
  var el = document.getElementById("boot-splash");
  var v = document.getElementById("boot-splash-video");
  try { sessionStorage.setItem("cleanops-splash-shown", "1"); } catch (e) {}
  function hideNative() {
    try {
      var C = window.Capacitor;
      if (C && C.Plugins && C.Plugins.SplashScreen) C.Plugins.SplashScreen.hide({ fadeOutDuration: 250 });
    } catch (e) {}
  }
  var removed = false;
  function remove() {
    if (removed) return;
    removed = true;
    hideNative();
    el.style.opacity = "0";
    el.style.pointerEvents = "none";
    setTimeout(function () { el.parentNode && el.parentNode.removeChild(el); }, 450);
  }
  v.addEventListener("playing", hideNative);
  v.addEventListener("loadeddata", hideNative);
  v.addEventListener("ended", remove);
  v.addEventListener("error", remove);
  var p = v.play();
  if (p && p.catch) p.catch(function () {});
  // Safety nets: native splash never blocks > 2.5s, video never blocks > 8s.
  setTimeout(hideNative, 2500);
  setTimeout(remove, 8000);
})();
</script>
`;

const shellHtml = readFileSync(shellPath, "utf8");
const indexHtml = shellHtml.includes("<body>")
  ? shellHtml.replace("<body>", "<body>" + bootSplash)
  : shellHtml.replace(/<body([^>]*)>/i, (m) => m + bootSplash);

if (indexHtml === shellHtml) {
  console.error("[build-capacitor-shell] Could not find <body> in _shell.html to inject the boot splash.");
  process.exit(1);
}

writeFileSync(indexPath, indexHtml);
console.log("[build-capacitor-shell] Wrote dist/client/index.html (shell + instant boot splash)");
import { useEffect, useRef, useState } from "react";
import splashVideo from "@/assets/splash-video.mp4.asset.json";

async function hideNativeSplash() {
  if (typeof window === "undefined") return;
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 250 });
  } catch {
    // plugin not available on web — no-op
  }
}

// Local copy bundled inside the native binary (public/ -> dist/). Plays
// instantly and offline. The CDN URL is only a fallback for edge cases.
const LOCAL_SRC = "/splash-video.mp4";

/**
 * In-app video splash. The native iOS/Android launch image (white + gold G)
 * stays visible until this component mounts AND the video has its first
 * frame painted. At that point we crossfade the native splash out so the
 * user sees a single, continuous reveal — no white/black flashes.
 */
export function AnimatedSplash() {
  const [shouldShow, setShouldShow] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [gone, setGone] = useState(false);
  const [src, setSrc] = useState(LOCAL_SRC);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const triedFallback = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem("cleanops-splash-shown") === "1") {
        setGone(true);
        // Already shown this session — drop the native splash immediately
        // so the app boot doesn't get stuck behind it.
        void hideNativeSplash();
        return;
      }
      sessionStorage.setItem("cleanops-splash-shown", "1");
    } catch {
      // sessionStorage may be unavailable; show splash anyway
    }
    setShouldShow(true);
    // Fallback: ensure splash never blocks the app for more than 8s
    const failsafe = setTimeout(() => handleEnd(), 8000);
    // Safety: hide the native splash even if the video never reports
    // playing (e.g. autoplay blocked). The video is local now, so this
    // should never be needed — it's only a last resort.
    const nativeFallback = setTimeout(() => void hideNativeSplash(), 2500);
    return () => {
      clearTimeout(failsafe);
      clearTimeout(nativeFallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kick playback as soon as the element exists — don't wait for React
  // event plumbing. Local file means first frame paints almost instantly.
  useEffect(() => {
    if (!shouldShow) return;
    const v = videoRef.current;
    if (!v) return;
    const p = v.play();
    if (p) p.catch(() => {/* autoplay block handled by fallbacks */});
  }, [shouldShow, src]);

  const handleEnd = () => {
    setHidden(true);
    setTimeout(() => setGone(true), 400);
  };

  const handlePlaying = () => {
    // Video has actual pixels on screen — safe to fade the native splash.
    void hideNativeSplash();
  };

  const handleError = () => {
    // Local file missing (e.g. dev preview without build) — retry from CDN
    // once before giving up.
    if (!triedFallback.current) {
      triedFallback.current = true;
      setSrc(splashVideo.url);
      return;
    }
    handleEnd();
  };

  if (gone) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-[400ms] ease-out ${
        hidden ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {shouldShow && (
        <video
          ref={videoRef}
          src={src}
          autoPlay
          muted
          playsInline
          preload="auto"
          onPlaying={handlePlaying}
          onLoadedData={handlePlaying}
          onEnded={handleEnd}
          onError={handleError}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
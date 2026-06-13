import { useEffect, useState } from "react";
import splashVideo from "@/assets/splash-video.mp4.asset.json";

async function hideNativeSplash() {
  if (typeof window === "undefined") return;
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 350 });
  } catch {
    // plugin not available on web — no-op
  }
}

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
    // Safety: hide the native splash after a short delay even if the video
    // never reports playing (e.g. autoplay blocked). The white in-app
    // splash div will still cover the screen.
    const nativeFallback = setTimeout(() => void hideNativeSplash(), 1200);
    return () => {
      clearTimeout(failsafe);
      clearTimeout(nativeFallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnd = () => {
    setHidden(true);
    setTimeout(() => setGone(true), 600);
  };

  const handlePlaying = () => {
    // Video has actual pixels on screen — safe to fade the native splash.
    void hideNativeSplash();
  };

  if (gone) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-500 ${
        hidden ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {shouldShow && (
        <video
          src={splashVideo.url}
          autoPlay
          muted
          playsInline
          preload="auto"
          onPlaying={handlePlaying}
          onLoadedData={handlePlaying}
          onEnded={handleEnd}
          onError={handleEnd}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
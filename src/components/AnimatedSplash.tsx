import { useEffect, useState } from "react";
import splashVideo from "@/assets/splash-video.mp4.asset.json";

/**
 * In-app video splash. Plays the branded intro once per session between
 * app boot and the login/home screen, then fades out. The native iOS /
 * Android launch image (white + gold G) blends seamlessly into the first
 * frame so the user perceives one continuous reveal.
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
        return;
      }
      sessionStorage.setItem("cleanops-splash-shown", "1");
    } catch {
      // sessionStorage may be unavailable; show splash anyway
    }
    setShouldShow(true);
    // Fallback: ensure splash never blocks the app for more than 8s
    const failsafe = setTimeout(() => handleEnd(), 8000);
    return () => clearTimeout(failsafe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnd = () => {
    setHidden(true);
    setTimeout(() => setGone(true), 600);
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
          onEnded={handleEnd}
          onError={handleEnd}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
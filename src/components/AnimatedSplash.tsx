import { useEffect, useState } from "react";
import appIcon from "@/assets/app-icon.png";

/**
 * In-app animated splash. Shown for ~1.8s on first mount, then fades out.
 * The native iOS / Android launch image (white + gold G) blends seamlessly
 * into this animated layer so the user perceives one continuous reveal.
 */
export function AnimatedSplash() {
  const [hidden, setHidden] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHidden(true), 1600);
    const t2 = setTimeout(() => setGone(true), 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-500 ${
        hidden ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* radial soft gold glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(212,175,55,0.18), rgba(255,255,255,0) 60%)",
        }}
      />

      <div className="relative flex flex-col items-center gap-6">
        <div className="relative">
          {/* shimmer ring */}
          <div
            className="absolute -inset-6 rounded-full opacity-70 animate-splash-ring"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, rgba(212,175,55,0.55) 90deg, transparent 180deg, rgba(212,175,55,0.35) 270deg, transparent 360deg)",
              filter: "blur(10px)",
            }}
          />
          <img
            src={appIcon}
            alt="CleanOps"
            className="relative h-40 w-40 animate-splash-pop drop-shadow-[0_10px_30px_rgba(212,175,55,0.35)]"
          />
          {/* sparkles */}
          <span className="absolute -left-2 top-6 h-2 w-2 rotate-45 bg-[#d4af37] animate-splash-spark-1" />
          <span className="absolute left-2 top-16 h-1.5 w-1.5 rotate-45 bg-[#e9c970] animate-splash-spark-2" />
          <span className="absolute -left-4 top-24 h-1 w-1 rotate-45 bg-[#d4af37] animate-splash-spark-3" />
        </div>
        <div className="overflow-hidden">
          <p className="animate-splash-text bg-gradient-to-r from-[#b8862a] via-[#e9c970] to-[#b8862a] bg-clip-text text-2xl font-semibold tracking-[0.25em] text-transparent">
            CLEANOPS
          </p>
        </div>
      </div>
    </div>
  );
}
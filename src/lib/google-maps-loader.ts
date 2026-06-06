let loaderPromise: Promise<typeof google> | null = null;

/** Loads the Google Maps JS API once and resolves with the global `google`. */
export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps requires a browser environment"));
  }
  if (window.google?.maps) return Promise.resolve(window.google);
  if (loaderPromise) return loaderPromise;

  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
  if (!key) {
    return Promise.reject(new Error("Missing VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"));
  }

  loaderPromise = new Promise<typeof google>((resolve, reject) => {
    const callbackName = "__lovableInitGoogleMaps";
    (window as unknown as Record<string, () => void>)[callbackName] = () => {
      resolve(window.google);
    };
    const script = document.createElement("script");
    const channelParam = channel ? `&channel=${encodeURIComponent(channel)}` : "";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      key,
    )}&loading=async&callback=${callbackName}${channelParam}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      loaderPromise = null;
      reject(new Error("Failed to load Google Maps JS API"));
    };
    document.head.appendChild(script);
  });

  return loaderPromise;
}

/** Mock-to-real coordinate origin (Avenida Paulista, São Paulo). */
export const MAP_CENTER = { lat: -23.5613, lng: -46.6566 };
/** Map span in degrees that corresponds to the 0–100 % mock grid. */
const SPAN_DEG = 0.018;

/** Convert mock { x, y } percentage coordinates to real lat/lng. */
export function percentToLatLng(p: { x: number; y: number }): google.maps.LatLngLiteral {
  return {
    lat: MAP_CENTER.lat + (50 - p.y) * (SPAN_DEG / 100),
    lng: MAP_CENTER.lng + (p.x - 50) * (SPAN_DEG / 100),
  };
}
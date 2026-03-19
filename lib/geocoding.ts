const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const PHOTON_BASE = "https://photon.komoot.io/api";
const USER_AGENT = "GeoLook/0.1.0 (geolook-app)";

// ── Photon (primary — more accurate for landmarks, free, no key) ──────────
async function geocodeWithPhoton(
  query: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = new URL(PHOTON_BASE);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "1");
    url.searchParams.set("lang", "en");

    const response = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) return null;

    const data = await response.json();
    const feature = data?.features?.[0];
    if (!feature) return null;

    const [lng, lat] = feature.geometry.coordinates;
    if (isNaN(lat) || isNaN(lng)) return null;

    return { lat, lng };
  } catch {
    return null;
  }
}

// ── Nominatim (fallback — fully free, open source) ────────────────────────
async function geocodeWithNominatim(
  query: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = new URL(`${NOMINATIM_BASE}/search`);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "3");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!response.ok) return null;

    const results = await response.json();
    if (!results?.length) return null;

    // Prefer results with higher importance (more well-known places)
    const best = results.sort(
      (a: { importance: number }, b: { importance: number }) =>
        b.importance - a.importance
    )[0];

    const lat = parseFloat(best.lat);
    const lng = parseFloat(best.lon);
    if (isNaN(lat) || isNaN(lng)) return null;

    return { lat, lng };
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────
export async function geocodePlace(
  query: string
): Promise<{ lat: number; lng: number } | null> {
  // Try Photon first (better landmark recognition)
  const photon = await geocodeWithPhoton(query);
  if (photon) {
    console.log(`[geocode] Photon ✓  "${query}" → ${photon.lat.toFixed(5)}, ${photon.lng.toFixed(5)}`);
    return photon;
  }

  // Fall back to Nominatim
  const nominatim = await geocodeWithNominatim(query);
  if (nominatim) {
    console.log(`[geocode] Nominatim ✓ "${query}" → ${nominatim.lat.toFixed(5)}, ${nominatim.lng.toFixed(5)}`);
    return nominatim;
  }

  console.log(`[geocode] ✗ No result for "${query}"`);
  return null;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = new URL(`${NOMINATIM_BASE}/reverse`);
    url.searchParams.set("lat", lat.toString());
    url.searchParams.set("lon", lng.toString());
    url.searchParams.set("format", "json");

    const response = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!response.ok) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    const result = await response.json();
    if (result.display_name) {
      return result.display_name.split(",").slice(0, 3).join(",").trim();
    }
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

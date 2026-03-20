import { GeoResult } from "@/types";

const FLAG_MAP: Record<string, string> = {
  france: "🇫🇷", "united states": "🇺🇸", usa: "🇺🇸", "united kingdom": "🇬🇧",
  uk: "🇬🇧", germany: "🇩🇪", japan: "🇯🇵", china: "🇨🇳", italy: "🇮🇹",
  spain: "🇪🇸", australia: "🇦🇺", canada: "🇨🇦", brazil: "🇧🇷", india: "🇮🇳",
  russia: "🇷🇺", mexico: "🇲🇽", netherlands: "🇳🇱", sweden: "🇸🇪", norway: "🇳🇴",
  denmark: "🇩🇰", switzerland: "🇨🇭", austria: "🇦🇹", portugal: "🇵🇹",
  belgium: "🇧🇪", poland: "🇵🇱", turkey: "🇹🇷", greece: "🇬🇷", egypt: "🇪🇬",
  "south africa": "🇿🇦", argentina: "🇦🇷", colombia: "🇨🇴", chile: "🇨🇱",
  peru: "🇵🇪", "south korea": "🇰🇷", indonesia: "🇮🇩", thailand: "🇹🇭",
  vietnam: "🇻🇳", singapore: "🇸🇬", malaysia: "🇲🇾", "new zealand": "🇳🇿",
  ireland: "🇮🇪", "czech republic": "🇨🇿", hungary: "🇭🇺", romania: "🇷🇴",
  ukraine: "🇺🇦", finland: "🇫🇮", morocco: "🇲🇦", kenya: "🇰🇪", nigeria: "🇳🇬",
  ghana: "🇬🇭", ethiopia: "🇪🇹", "saudi arabia": "🇸🇦",
  "united arab emirates": "🇦🇪", uae: "🇦🇪", palestine: "🇵🇸",
  iran: "🇮🇷", pakistan: "🇵🇰", bangladesh: "🇧🇩", philippines: "🇵🇭",
  taiwan: "🇹🇼", "hong kong": "🇭🇰", iceland: "🇮🇸", croatia: "🇭🇷",
  serbia: "🇷🇸", slovakia: "🇸🇰", latvia: "🇱🇻", estonia: "🇪🇪",
  lithuania: "🇱🇹", bulgaria: "🇧🇬", luxembourg: "🇱🇺",
};

function getFlag(country: string) {
  return FLAG_MAP[country.toLowerCase()] ?? "🌍";
}

function formatCoords(lat: number, lng: number) {
  const la = Math.abs(lat).toFixed(4) + "° " + (lat >= 0 ? "N" : "S");
  const lo = Math.abs(lng).toFixed(4) + "° " + (lng >= 0 ? "E" : "W");
  return `${la}  ·  ${lo}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawCoverImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, W: number, H: number) {
  const scale = Math.max(W / img.width, H / img.height);
  const sw = img.width * scale;
  const sh = img.height * scale;
  const dx = (W - sw) / 2;
  const dy = (H - sh) / 2;
  ctx.drawImage(img, dx, dy, sw, sh);
}

async function fetchPlacePhoto(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `/api/place-photo?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export async function downloadResultCard(result: GeoResult, fallbackPhotoUrl?: string): Promise<void> {
  const { location } = result;
  const W = 1080, H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // ── Background photo ───────────────────────────────────────
  // Try Street View of the detected place first, fall back to uploaded photo
  const placePhotoUrl = await fetchPlacePhoto(location.coordinates.lat, location.coordinates.lng);
  const photoSrc = placePhotoUrl ?? fallbackPhotoUrl;
  let blobToRevoke: string | null = placePhotoUrl;

  if (photoSrc) {
    try {
      const img = await loadImage(photoSrc);
      drawCoverImage(ctx, img, W, H);
    } catch {
      ctx.fillStyle = "#0d1117";
      ctx.fillRect(0, 0, W, H);
      blobToRevoke = null;
    }
  } else {
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, W, H);
  }

  // ── Gradient overlays ──────────────────────────────────────
  // Deep vignette from mid-card down so all text is legible
  const grad = ctx.createLinearGradient(0, H * 0.48, 0, H);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.35, "rgba(0,0,0,0.55)");
  grad.addColorStop(0.7, "rgba(0,0,0,0.78)");
  grad.addColorStop(1, "rgba(0,0,0,0.92)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle top darkening for branding readability
  const topGrad = ctx.createLinearGradient(0, 0, 0, 140);
  topGrad.addColorStop(0, "rgba(0,0,0,0.45)");
  topGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, 140);

  // ── Thin brand bar — top ───────────────────────────────────
  const bar = ctx.createLinearGradient(0, 0, 300, 0);
  bar.addColorStop(0, "#3b82f6");
  bar.addColorStop(0.5, "#8b5cf6");
  bar.addColorStop(1, "transparent");
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, 300, 4);

  // ── GeoLook logo — top-left ────────────────────────────────
  // Glowing dot
  ctx.beginPath();
  ctx.arc(38, 52, 7, 0, Math.PI * 2);
  ctx.fillStyle = "#60a5fa";
  ctx.shadowColor = "#3b82f6";
  ctx.shadowBlur = 18;
  ctx.fill();
  ctx.shadowBlur = 0;
  // Wordmark
  ctx.font = "700 24px -apple-system, 'Inter', 'Segoe UI', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.90)";
  ctx.fillText("GeoLook", 56, 60);

  // ── Location text block — bottom ──────────────────────────
  // Layout (bottom-up, all baselines):
  //  y_coords   = H - 52    = 1298  (tiny monospace)
  //  y_subtitle = H - 110   = 1240  (city · country)
  //  y_name     = H - 178   = 1172  (landmark, big)
  //  y_flag     = H - 248   = 1102  (flag emoji)
  const PAD = 48;
  const y_coords   = H - 52;
  const y_subtitle = H - 114;
  const y_name     = H - 182;
  const y_flag     = H - 254;

  const landmark = location.landmark || location.city || location.country || "Unknown";

  // Shadow helper for all bottom text
  const setShadow = () => {
    ctx.shadowColor = "rgba(0,0,0,0.85)";
    ctx.shadowBlur = 20;
  };

  // Flag emoji
  ctx.shadowBlur = 0;
  ctx.font = "52px serif";
  ctx.fillText(getFlag(location.country), PAD, y_flag);

  // Landmark name — bold, fitted to width
  setShadow();
  ctx.font = "800 62px -apple-system, 'Inter', 'Segoe UI', sans-serif";
  ctx.fillStyle = "#ffffff";
  let name = landmark;
  const maxW = W - PAD * 2;
  while (ctx.measureText(name).width > maxW && name.length > 6) name = name.slice(0, -1);
  if (name !== landmark) name += "…";
  ctx.fillText(name, PAD, y_name);

  // City · Country subtitle
  const subtitleParts = [location.city, location.country]
    .filter((p): p is string => Boolean(p) && p !== "Unknown" && p !== landmark);
  if (subtitleParts.length) {
    ctx.font = "400 32px -apple-system, 'Inter', 'Segoe UI', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.70)";
    let sub = subtitleParts.join("  ·  ");
    while (ctx.measureText(sub).width > maxW && sub.length > 4) sub = sub.slice(0, -1);
    ctx.fillText(sub, PAD, y_subtitle);
  }

  ctx.shadowBlur = 0;

  // Coordinates
  ctx.font = "400 24px 'Courier New', Courier, monospace";
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.fillText(formatCoords(location.coordinates.lat, location.coordinates.lng), PAD, y_coords);

  // geolook.vercel.app — bottom-right
  ctx.font = "400 22px 'Courier New', Courier, monospace";
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.textAlign = "right";
  ctx.fillText("geolook.vercel.app", W - PAD, y_coords);
  ctx.textAlign = "left";

  // ── Revoke blob URL if created ─────────────────────────────
  if (blobToRevoke) URL.revokeObjectURL(blobToRevoke);

  // ── Download ───────────────────────────────────────────────
  const url = canvas.toDataURL("image/jpeg", 0.93);
  const a = document.createElement("a");
  const safe = landmark.replace(/[^a-z0-9]/gi, "-").toLowerCase().slice(0, 40);
  a.href = url;
  a.download = `geolook-${safe}.jpg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

"use client";

import { useState, useEffect, useRef } from "react";

interface Place {
  landmark: string; city: string; country: string; flag: string; confidence: number;
  lat: string; lng: string; gradient: string; lightGradient: string; accent: string; wikiTitle: string;
}

const PLACES: Place[] = [
  { landmark: "Eiffel Tower", city: "Paris", country: "France", flag: "🇫🇷", confidence: 98, lat: "48.8584° N", lng: "2.2945° E", gradient: "from-blue-950 to-indigo-950", lightGradient: "from-blue-100 to-indigo-100", accent: "#60a5fa", wikiTitle: "Eiffel Tower" },
  { landmark: "Pyramids of Giza", city: "Giza", country: "Egypt", flag: "🇪🇬", confidence: 97, lat: "29.9792° N", lng: "31.1342° E", gradient: "from-amber-950 to-orange-950", lightGradient: "from-amber-100 to-orange-100", accent: "#fbbf24", wikiTitle: "Great Pyramid of Giza" },
  { landmark: "Shibuya Crossing", city: "Tokyo", country: "Japan", flag: "🇯🇵", confidence: 95, lat: "35.6595° N", lng: "139.7004° E", gradient: "from-rose-950 to-pink-950", lightGradient: "from-rose-100 to-pink-100", accent: "#fb7185", wikiTitle: "Shibuya Crossing" },
  { landmark: "Colosseum", city: "Rome", country: "Italy", flag: "🇮🇹", confidence: 96, lat: "41.8902° N", lng: "12.4922° E", gradient: "from-yellow-950 to-amber-950", lightGradient: "from-yellow-100 to-amber-100", accent: "#facc15", wikiTitle: "Colosseum" },
  { landmark: "Burj Khalifa", city: "Dubai", country: "UAE", flag: "🇦🇪", confidence: 94, lat: "25.1972° N", lng: "55.2744° E", gradient: "from-cyan-950 to-teal-950", lightGradient: "from-cyan-100 to-teal-100", accent: "#22d3ee", wikiTitle: "Burj Khalifa" },
  { landmark: "Big Ben", city: "London", country: "United Kingdom", flag: "🇬🇧", confidence: 93, lat: "51.5007° N", lng: "0.1246° W", gradient: "from-violet-950 to-purple-950", lightGradient: "from-violet-100 to-purple-100", accent: "#a78bfa", wikiTitle: "Elizabeth Tower" },
  { landmark: "Blue Mosque", city: "Istanbul", country: "Turkey", flag: "🇹🇷", confidence: 91, lat: "41.0054° N", lng: "28.9768° E", gradient: "from-emerald-950 to-green-950", lightGradient: "from-emerald-100 to-green-100", accent: "#34d399", wikiTitle: "Sultan Ahmed Mosque" },
  { landmark: "Sagrada Família", city: "Barcelona", country: "Spain", flag: "🇪🇸", confidence: 97, lat: "41.4036° N", lng: "2.1744° E", gradient: "from-orange-950 to-red-950", lightGradient: "from-orange-100 to-red-100", accent: "#fb923c", wikiTitle: "Sagrada Família" },
];

// CSS animation duration — must match marquee-left in globals.css
const ANIM_DUR = 35;

const ALL = [...PLACES, ...PLACES];

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const check = () => setTheme((document.documentElement.getAttribute("data-theme") ?? "dark") as "dark" | "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return theme;
}

function PlaceCard({ place, photo }: { place: Place; photo: string | undefined }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    if (!photo) return;
    setImgLoaded(false);
    const img = new Image();
    img.onload = () => setImgLoaded(true);
    img.src = photo;
    return () => { img.onload = null; };
  }, [photo]);

  const grad = theme === "light" ? place.lightGradient : place.gradient;
  return (
    <div className={`shrink-0 w-44 sm:w-48 rounded-2xl border border-white/10 overflow-hidden bg-gradient-to-br ${grad} shadow-xl select-none`}>
      <div className="relative h-32 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${grad}`} />
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={place.landmark} loading="eager" draggable={false}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${imgLoaded ? "opacity-80" : "opacity-0"}`}
            onLoad={() => setImgLoaded(true)} onError={() => setImgLoaded(false)} />
        )}
        {theme === "dark" && <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />}
        <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between">
          <span className="text-xl leading-none drop-shadow">{place.flag}</span>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{ color: theme === "light" ? place.accent : "#fff", background: `${place.accent}25`, border: `1px solid ${place.accent}60` }}>
            <span style={{ color: place.accent }}>✦</span>{place.confidence}%
          </div>
        </div>
        <div className="absolute bottom-2.5 left-3 right-3">
          <p className="text-sm font-bold leading-tight drop-shadow-lg" style={{ color: theme === "light" ? "#1e293b" : "#fff" }}>{place.landmark}</p>
        </div>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-[11px] mb-2" style={{ color: theme === "light" ? "#64748b" : "rgba(255,255,255,0.5)" }}>{place.city} · {place.country}</p>
        <div className="h-[3px] rounded-full overflow-hidden mb-2" style={{ background: theme === "light" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.1)" }}>
          <div className="h-full rounded-full" style={{ width: `${place.confidence}%`, background: place.accent }} />
        </div>
        <p className="text-[9px] font-mono tabular-nums leading-relaxed" style={{ color: theme === "light" ? "#94a3b8" : "rgba(255,255,255,0.25)" }}>
          {place.lat}<br />{place.lng}
        </p>
      </div>
    </div>
  );
}

export default function ExamplePlaces() {
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Motion state
  const mode = useRef<"css" | "js">("css");
  const posX = useRef(0);
  const halfW = useRef(0);
  const velocity = useRef(0);
  const lastTouchX = useRef(0);
  const lastTouchTime = useRef(0);
  const touching = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastRafTime = useRef<number | null>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mouse drag
  const mouseDown = useRef(false);
  const lastMouseX = useRef(0);

  // Fetch photos
  useEffect(() => {
    let active = true;
    Promise.all(PLACES.map(async (p) => {
      try {
        const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(p.wikiTitle)}`);
        if (!res.ok) return null;
        const d = await res.json();
        const src = d?.thumbnail?.source as string | undefined;
        return src ? [p.landmark, src] as [string, string] : null;
      } catch { return null; }
    })).then((rs) => {
      if (!active) return;
      const map: Record<string, string> = {};
      for (const r of rs) { if (r) map[r[0]] = r[1]; }
      setPhotos(map);
    });
    return () => { active = false; };
  }, []);

  // Measure half-width
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => { halfW.current = track.scrollWidth / 2; };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    return () => ro.disconnect();
  }, []);

  // Switch CSS animation → JS transform
  // Reads current animated pixel position from computed style so there's no jump
  const switchToJS = () => {
    const track = trackRef.current;
    if (!track || mode.current === "js") return;
    const matrix = new DOMMatrix(getComputedStyle(track).transform);
    posX.current = matrix.m41; // current translateX in pixels
    track.style.animation = "none";
    track.style.transform = `translate3d(${posX.current}px,0,0)`;
    mode.current = "js";
  };

  // Switch JS transform → CSS animation, resuming from current pixel position
  const switchToCSS = () => {
    const track = trackRef.current;
    if (!track || mode.current === "css") return;
    const hw = halfW.current;
    if (hw <= 0) return;
    // Normalise into [-halfW, 0]
    let p = posX.current % hw;
    if (p > 0) p -= hw;
    // progress 0→1 through one loop
    const progress = Math.abs(p) / hw;
    const delay = -(progress * ANIM_DUR);
    track.style.transform = "";
    track.style.animation = `marquee-left ${ANIM_DUR}s ${delay}s linear infinite`;
    mode.current = "css";
  };

  // JS rAF loop — handles drag + momentum, then hands back to CSS
  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;

    const commit = () => {
      if (halfW.current > 0 && posX.current <= -halfW.current) posX.current += halfW.current;
      track.style.transform = `translate3d(${posX.current}px,0,0)`;
    };

    const step = (now: number) => {
      if (mode.current === "js" && !touching.current) {
        if (lastRafTime.current !== null) {
          const dt = Math.min(now - lastRafTime.current, 64);
          if (Math.abs(velocity.current) > 0.02) {
            posX.current += velocity.current * dt;
            velocity.current *= Math.pow(0.93, dt / 16);
            if (Math.abs(velocity.current) < 0.02) {
              velocity.current = 0;
              // Momentum done — hand back to CSS compositor
              switchToCSS();
              lastRafTime.current = null;
              rafRef.current = requestAnimationFrame(step);
              return;
            }
            commit();
          }
        }
        lastRafTime.current = now;
      }
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    // ── Touch handlers ────────────────────────────────────
    const onTouchStart = (e: TouchEvent) => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
      touching.current = true;
      velocity.current = 0;
      switchToJS();
      lastTouchX.current = e.touches[0].clientX;
      lastTouchTime.current = performance.now();
      lastRafTime.current = null;
    };

    const onTouchMove = (e: TouchEvent) => {
      const x = e.touches[0].clientX;
      const now = performance.now();
      const dx = x - lastTouchX.current;
      const dt = now - lastTouchTime.current;
      posX.current += dx;
      commit(); // safe: we're already on main thread during touchmove, synced here
      if (dt > 0) velocity.current = dx / dt;
      lastTouchX.current = x;
      lastTouchTime.current = now;
    };

    const onTouchEnd = () => {
      touching.current = false;
      if (Math.abs(velocity.current) < 0.05) {
        // No momentum — go straight back to CSS after a short pause
        resumeTimer.current = setTimeout(switchToCSS, 600);
      }
      // else: rAF momentum loop will call switchToCSS when it settles
    };

    // ── Mouse drag (desktop) ──────────────────────────────
    const onMouseDown = (e: MouseEvent) => {
      mouseDown.current = true;
      velocity.current = 0;
      switchToJS();
      lastMouseX.current = e.clientX;
      wrap.style.cursor = "grabbing";
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!mouseDown.current) return;
      posX.current += e.clientX - lastMouseX.current;
      lastMouseX.current = e.clientX;
      commit();
    };
    const onMouseUp = () => {
      mouseDown.current = false;
      wrap.style.cursor = "grab";
      resumeTimer.current = setTimeout(switchToCSS, 700);
    };
    const onMouseLeave = () => {
      if (mouseDown.current) { mouseDown.current = false; wrap.style.cursor = "grab"; }
      resumeTimer.current = setTimeout(switchToCSS, 700);
    };

    wrap.addEventListener("touchstart", onTouchStart, { passive: true });
    wrap.addEventListener("touchmove", onTouchMove, { passive: true });
    wrap.addEventListener("touchend", onTouchEnd, { passive: true });
    wrap.addEventListener("touchcancel", onTouchEnd, { passive: true });
    wrap.addEventListener("mousedown", onMouseDown);
    wrap.addEventListener("mousemove", onMouseMove);
    wrap.addEventListener("mouseup", onMouseUp);
    wrap.addEventListener("mouseleave", onMouseLeave);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
      wrap.removeEventListener("touchstart", onTouchStart);
      wrap.removeEventListener("touchmove", onTouchMove);
      wrap.removeEventListener("touchend", onTouchEnd);
      wrap.removeEventListener("touchcancel", onTouchEnd);
      wrap.removeEventListener("mousedown", onMouseDown);
      wrap.removeEventListener("mousemove", onMouseMove);
      wrap.removeEventListener("mouseup", onMouseUp);
      wrap.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <div className="w-full mt-10">
      <p className="text-center text-[11px] text-zinc-600 uppercase tracking-widest mb-5 font-medium">
        Places GeoLook has identified
      </p>

      {/* marquee-wrap = overflow:hidden + mask */}
      <div ref={wrapRef} className="marquee-wrap" style={{ cursor: "grab", touchAction: "pan-y" }}>
        {/* marquee-track = CSS animation by default; overridden inline when user drags */}
        <div ref={trackRef} className="marquee-track" style={{ gap: 12, paddingLeft: 16, willChange: "transform" }}>
          {ALL.map((place, i) => (
            <PlaceCard key={i} place={place} photo={photos[place.landmark]} />
          ))}
        </div>
      </div>
    </div>
  );
}

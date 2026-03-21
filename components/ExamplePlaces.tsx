"use client";

import { useState, useEffect, useRef } from "react";

interface Place {
  landmark: string;
  city: string;
  country: string;
  flag: string;
  confidence: number;
  lat: string;
  lng: string;
  gradient: string;
  lightGradient: string;
  accent: string;
  wikiTitle: string;
}

const PLACES: Place[] = [
  {
    landmark: "Eiffel Tower",
    city: "Paris",
    country: "France",
    flag: "🇫🇷",
    confidence: 98,
    lat: "48.8584° N",
    lng: "2.2945° E",
    gradient: "from-blue-950 to-indigo-950",
    lightGradient: "from-blue-100 to-indigo-100",
    accent: "#60a5fa",
    wikiTitle: "Eiffel Tower",
  },
  {
    landmark: "Pyramids of Giza",
    city: "Giza",
    country: "Egypt",
    flag: "🇪🇬",
    confidence: 97,
    lat: "29.9792° N",
    lng: "31.1342° E",
    gradient: "from-amber-950 to-orange-950",
    lightGradient: "from-amber-100 to-orange-100",
    accent: "#fbbf24",
    wikiTitle: "Great Pyramid of Giza",
  },
  {
    landmark: "Shibuya Crossing",
    city: "Tokyo",
    country: "Japan",
    flag: "🇯🇵",
    confidence: 95,
    lat: "35.6595° N",
    lng: "139.7004° E",
    gradient: "from-rose-950 to-pink-950",
    lightGradient: "from-rose-100 to-pink-100",
    accent: "#fb7185",
    wikiTitle: "Shibuya Crossing",
  },
  {
    landmark: "Colosseum",
    city: "Rome",
    country: "Italy",
    flag: "🇮🇹",
    confidence: 96,
    lat: "41.8902° N",
    lng: "12.4922° E",
    gradient: "from-yellow-950 to-amber-950",
    lightGradient: "from-yellow-100 to-amber-100",
    accent: "#facc15",
    wikiTitle: "Colosseum",
  },
  {
    landmark: "Burj Khalifa",
    city: "Dubai",
    country: "UAE",
    flag: "🇦🇪",
    confidence: 94,
    lat: "25.1972° N",
    lng: "55.2744° E",
    gradient: "from-cyan-950 to-teal-950",
    lightGradient: "from-cyan-100 to-teal-100",
    accent: "#22d3ee",
    wikiTitle: "Burj Khalifa",
  },
  {
    landmark: "Big Ben",
    city: "London",
    country: "United Kingdom",
    flag: "🇬🇧",
    confidence: 93,
    lat: "51.5007° N",
    lng: "0.1246° W",
    gradient: "from-violet-950 to-purple-950",
    lightGradient: "from-violet-100 to-purple-100",
    accent: "#a78bfa",
    wikiTitle: "Elizabeth Tower",
  },
  {
    landmark: "Blue Mosque",
    city: "Istanbul",
    country: "Turkey",
    flag: "🇹🇷",
    confidence: 91,
    lat: "41.0054° N",
    lng: "28.9768° E",
    gradient: "from-emerald-950 to-green-950",
    lightGradient: "from-emerald-100 to-green-100",
    accent: "#34d399",
    wikiTitle: "Sultan Ahmed Mosque",
  },
  {
    landmark: "Sagrada Família",
    city: "Barcelona",
    country: "Spain",
    flag: "🇪🇸",
    confidence: 97,
    lat: "41.4036° N",
    lng: "2.1744° E",
    gradient: "from-orange-950 to-red-950",
    lightGradient: "from-orange-100 to-red-100",
    accent: "#fb923c",
    wikiTitle: "Sagrada Família",
  },
];

const ALL = [...PLACES, ...PLACES];

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const check = () => {
      const t = document.documentElement.getAttribute("data-theme") ?? "dark";
      setTheme(t as "dark" | "light");
    };
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
    <div
      className={`shrink-0 w-44 sm:w-48 rounded-2xl border border-white/10 overflow-hidden bg-gradient-to-br ${grad} shadow-xl select-none`}
    >
      <div className="relative h-32 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${grad}`} />
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={place.landmark}
            loading="eager"
            draggable={false}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${imgLoaded ? "opacity-80" : "opacity-0"}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgLoaded(false)}
          />
        )}
        {theme === "dark" && <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />}
        <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between">
          <span className="text-xl leading-none drop-shadow">{place.flag}</span>
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{
              color: theme === "light" ? place.accent : "#fff",
              background: `${place.accent}25`,
              border: `1px solid ${place.accent}60`,
            }}
          >
            <span style={{ color: place.accent }}>✦</span>
            {place.confidence}%
          </div>
        </div>
        <div className="absolute bottom-2.5 left-3 right-3">
          <p className="text-sm font-bold leading-tight drop-shadow-lg"
            style={{ color: theme === "light" ? "#1e293b" : "#fff" }}>
            {place.landmark}
          </p>
        </div>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-[11px] mb-2" style={{ color: theme === "light" ? "#64748b" : "rgba(255,255,255,0.5)" }}>
          {place.city} · {place.country}
        </p>
        <div className="h-[3px] rounded-full overflow-hidden mb-2" style={{ background: theme === "light" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.1)" }}>
          <div className="h-full rounded-full" style={{ width: `${place.confidence}%`, background: place.accent }} />
        </div>
        <p className="text-[9px] font-mono tabular-nums leading-relaxed"
          style={{ color: theme === "light" ? "#94a3b8" : "rgba(255,255,255,0.25)" }}>
          {place.lat}<br />{place.lng}
        </p>
      </div>
    </div>
  );
}

export default function ExamplePlaces() {
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const interacting = useRef(false);
  const lastTime = useRef<number | null>(null);
  const accumulator = useRef(0);
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mouse drag
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);

  // Fetch Wikipedia photos
  useEffect(() => {
    let active = true;
    Promise.all(
      PLACES.map(async (place) => {
        try {
          const res = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(place.wikiTitle)}`
          );
          if (!res.ok) return null;
          const data = await res.json();
          const src = data?.thumbnail?.source as string | undefined;
          if (!src) return null;
          return [place.landmark, src] as [string, string];
        } catch {
          return null;
        }
      })
    ).then((results) => {
      if (!active) return;
      const map: Record<string, string> = {};
      for (const r of results) { if (r) map[r[0]] = r[1]; }
      setPhotos(map);
    });
    return () => { active = false; };
  }, []);

  // Passive touch listeners — lets browser optimize native scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onTouchStart = () => {
      if (touchTimer.current) clearTimeout(touchTimer.current);
      interacting.current = true;
    };
    const onTouchEnd = () => {
      // Delay to let momentum scrolling finish before auto-scroll resumes
      touchTimer.current = setTimeout(() => {
        interacting.current = false;
        lastTime.current = null; // reset so delta doesn't spike on resume
      }, 1800);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  // Auto-scroll via rAF — only runs when not interacting
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf: number;

    const step = (time: number) => {
      if (lastTime.current !== null && !interacting.current) {
        const delta = Math.min(time - lastTime.current, 100); // cap to avoid jump after tab switch
        accumulator.current += delta * 0.05; // ~50px/s
        const pixels = Math.floor(accumulator.current);
        if (pixels >= 1) {
          el.scrollLeft += pixels;
          accumulator.current -= pixels;
          // Seamless loop
          if (el.scrollLeft >= el.scrollWidth / 2) {
            el.scrollLeft -= el.scrollWidth / 2;
            accumulator.current = 0;
          }
        }
      }
      lastTime.current = time;
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Mouse drag handlers (desktop)
  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    interacting.current = true;
    dragStartX.current = e.pageX - (scrollRef.current?.offsetLeft ?? 0);
    dragScrollLeft.current = scrollRef.current?.scrollLeft ?? 0;
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    scrollRef.current.scrollLeft = dragScrollLeft.current - (x - dragStartX.current);
  };
  const onMouseUp = () => { isDragging.current = false; };
  const onMouseEnter = () => { interacting.current = true; };
  const onMouseLeave = () => { isDragging.current = false; interacting.current = false; };

  return (
    <div className="w-full mt-10">
      <p className="text-center text-[11px] text-zinc-600 uppercase tracking-widest mb-5 font-medium">
        Places GeoLook has identified
      </p>

      <div
        ref={scrollRef}
        className="flex gap-3 px-4 overflow-x-auto pb-2"
        style={{
          cursor: isDragging.current ? "grabbing" : "grab",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
          maskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      >
        {ALL.map((place, i) => (
          <PlaceCard key={i} place={place} photo={photos[place.landmark]} />
        ))}
      </div>
    </div>
  );
}

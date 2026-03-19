"use client";

import { useState, useEffect } from "react";

interface Place {
  landmark: string;
  city: string;
  country: string;
  flag: string;
  confidence: number;
  lat: string;
  lng: string;
  gradient: string;
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
    accent: "#fb923c",
    wikiTitle: "Sagrada Família",
  },
];

const ALL = [...PLACES, ...PLACES];

function PlaceCard({
  place,
  photo,
}: {
  place: Place;
  photo: string | undefined;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    if (!photo) return;
    setImgLoaded(false);
    const img = new Image();
    img.onload = () => setImgLoaded(true);
    img.src = photo;
    return () => { img.onload = null; };
  }, [photo]);

  return (
    <div
      className={`
        shrink-0 w-48 rounded-2xl border border-white/10 overflow-hidden mx-2
        bg-gradient-to-br ${place.gradient} shadow-xl
      `}
    >
      {/* ── Photo section ── */}
      <div className="relative h-32 overflow-hidden">
        {/* Gradient fallback always rendered underneath */}
        <div className={`absolute inset-0 bg-gradient-to-br ${place.gradient}`} />

        {/* Real photo */}
        {photo && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={photo}
            alt={place.landmark}
            loading="eager"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
              imgLoaded ? "opacity-80" : "opacity-0"
            }`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgLoaded(false)}
          />
        )}

        {/* Dark overlay for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />

        {/* Top row: flag + confidence */}
        <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between">
          <span className="text-xl leading-none drop-shadow">{place.flag}</span>
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
            style={{ background: `${place.accent}30`, border: `1px solid ${place.accent}50` }}
          >
            <span style={{ color: place.accent }}>✦</span>
            {place.confidence}%
          </div>
        </div>

        {/* Landmark name at bottom of photo */}
        <div className="absolute bottom-2.5 left-3 right-3">
          <p className="text-sm font-bold text-white leading-tight drop-shadow-lg">
            {place.landmark}
          </p>
        </div>
      </div>

      {/* ── Info section ── */}
      <div className="px-3 py-2.5">
        <p className="text-[11px] text-white/50 mb-2">
          {place.city} · {place.country}
        </p>

        {/* Confidence bar */}
        <div className="h-[3px] bg-white/10 rounded-full overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${place.confidence}%`, background: place.accent }}
          />
        </div>

        {/* Coordinates */}
        <p className="text-[9px] font-mono text-white/25 tabular-nums leading-relaxed">
          {place.lat}<br />{place.lng}
        </p>
      </div>
    </div>
  );
}

export default function ExamplePlaces() {
  const [photos, setPhotos] = useState<Record<string, string>>({});

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
      for (const r of results) {
        if (r) map[r[0]] = r[1];
      }
      setPhotos(map);
    });

    return () => { active = false; };
  }, []);

  return (
    <div className="w-full mt-10">
      <p className="text-center text-[11px] text-zinc-600 uppercase tracking-widest mb-5 font-medium">
        Places GeoLook has identified
      </p>

      <div className="marquee-wrap">
        <div className="marquee-track">
          {ALL.map((place, i) => (
            <PlaceCard key={i} place={place} photo={photos[place.landmark]} />
          ))}
        </div>
      </div>
    </div>
  );
}

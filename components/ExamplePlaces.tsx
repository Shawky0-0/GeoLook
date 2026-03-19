"use client";

interface Place {
  landmark: string;
  city: string;
  country: string;
  flag: string;
  confidence: number;
  lat: string;
  lng: string;
  gradient: string;
  accentColor: string;
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
    gradient: "from-blue-900/60 to-indigo-900/40",
    accentColor: "bg-blue-400",
  },
  {
    landmark: "Pyramids of Giza",
    city: "Giza",
    country: "Egypt",
    flag: "🇪🇬",
    confidence: 97,
    lat: "29.9792° N",
    lng: "31.1342° E",
    gradient: "from-amber-900/60 to-orange-900/40",
    accentColor: "bg-amber-400",
  },
  {
    landmark: "Shibuya Crossing",
    city: "Tokyo",
    country: "Japan",
    flag: "🇯🇵",
    confidence: 95,
    lat: "35.6595° N",
    lng: "139.7004° E",
    gradient: "from-rose-900/60 to-pink-900/40",
    accentColor: "bg-rose-400",
  },
  {
    landmark: "Colosseum",
    city: "Rome",
    country: "Italy",
    flag: "🇮🇹",
    confidence: 96,
    lat: "41.8902° N",
    lng: "12.4922° E",
    gradient: "from-yellow-900/60 to-amber-900/40",
    accentColor: "bg-yellow-400",
  },
  {
    landmark: "Burj Khalifa",
    city: "Dubai",
    country: "UAE",
    flag: "🇦🇪",
    confidence: 94,
    lat: "25.1972° N",
    lng: "55.2744° E",
    gradient: "from-cyan-900/60 to-teal-900/40",
    accentColor: "bg-cyan-400",
  },
  {
    landmark: "Big Ben",
    city: "London",
    country: "United Kingdom",
    flag: "🇬🇧",
    confidence: 93,
    lat: "51.5007° N",
    lng: "0.1246° W",
    gradient: "from-violet-900/60 to-purple-900/40",
    accentColor: "bg-violet-400",
  },
  {
    landmark: "Blue Mosque",
    city: "Istanbul",
    country: "Turkey",
    flag: "🇹🇷",
    confidence: 91,
    lat: "41.0054° N",
    lng: "28.9768° E",
    gradient: "from-emerald-900/60 to-green-900/40",
    accentColor: "bg-emerald-400",
  },
  {
    landmark: "Sagrada Família",
    city: "Barcelona",
    country: "Spain",
    flag: "🇪🇸",
    confidence: 97,
    lat: "41.4036° N",
    lng: "2.1744° E",
    gradient: "from-orange-900/60 to-red-900/40",
    accentColor: "bg-orange-400",
  },
];

// Duplicate for seamless loop
const ALL = [...PLACES, ...PLACES];

function PlaceCard({ place }: { place: Place }) {
  return (
    <div
      className={`
        shrink-0 w-52 rounded-xl border border-white/10 overflow-hidden
        bg-gradient-to-br ${place.gradient}
        backdrop-blur-sm mx-2
      `}
    >
      {/* Top bar */}
      <div className={`h-[2px] ${place.accentColor} opacity-80`} />

      <div className="p-3.5">
        {/* Flag + confidence */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl">{place.flag}</span>
          <div className="flex items-center gap-1 bg-black/30 border border-white/10 px-2 py-0.5 rounded-full">
            <div className={`w-1.5 h-1.5 rounded-full ${place.accentColor} opacity-90`} />
            <span className="text-[10px] font-bold text-white">{place.confidence}%</span>
          </div>
        </div>

        {/* Place name */}
        <p className="text-sm font-bold text-white leading-tight mb-0.5">{place.landmark}</p>
        <p className="text-xs text-white/50">{place.city}, {place.country}</p>

        {/* Confidence bar */}
        <div className="mt-3 h-1 bg-black/30 rounded-full overflow-hidden">
          <div
            className={`h-full ${place.accentColor} rounded-full opacity-80`}
            style={{ width: `${place.confidence}%` }}
          />
        </div>

        {/* Coordinates */}
        <p className="mt-2 text-[9px] font-mono text-white/30 tabular-nums">
          {place.lat} · {place.lng}
        </p>
      </div>
    </div>
  );
}

export default function ExamplePlaces() {
  return (
    <div className="w-full mt-8">
      <p className="text-center text-[11px] text-zinc-600 uppercase tracking-widest mb-4 font-medium">
        Places GeoLook has identified
      </p>

      <div className="marquee-wrap">
        <div className="marquee-track">
          {ALL.map((place, i) => (
            <PlaceCard key={i} place={place} />
          ))}
        </div>
      </div>
    </div>
  );
}

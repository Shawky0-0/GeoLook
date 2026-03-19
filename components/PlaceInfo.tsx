"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  ExternalLink,
  Thermometer,
  Wind,
  Droplets,
  Clock,
  Users,
  Building2,
  Coins,
  Languages,
  Map,
  Globe,
  Loader2,
} from "lucide-react";
import { WikiInfo } from "@/lib/wikipedia";
import { WeatherData, CountryData, getWeatherData, getCountryData } from "@/lib/placeData";

interface PlaceInfoProps {
  info: WikiInfo;
  coordinates: { lat: number; lng: number };
  country: string;
}

function formatPopulation(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function formatArea(n: number): string {
  return n.toLocaleString() + " km²";
}

function StatRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <span className="text-xs text-zinc-500 w-24 shrink-0">{label}</span>
      <span className="text-sm text-zinc-200 font-medium">{value}</span>
    </div>
  );
}

export default function PlaceInfo({ info, coordinates, country }: PlaceInfoProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [countryData, setCountryData] = useState<CountryData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [loadingCountry, setLoadingCountry] = useState(true);

  useEffect(() => {
    setLoadingWeather(true);
    getWeatherData(coordinates.lat, coordinates.lng).then((w) => {
      setWeather(w);
      setLoadingWeather(false);
    });
  }, [coordinates.lat, coordinates.lng]);

  useEffect(() => {
    setLoadingCountry(true);
    getCountryData(country).then((c) => {
      setCountryData(c);
      setLoadingCountry(false);
    });
  }, [country]);

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── Wikipedia Overview ── */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-xl">
        <div className="h-[2px] bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-400" />

        <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <h2 className="text-sm font-semibold text-zinc-100">About this Place</h2>
          <span className="ml-auto text-[10px] text-zinc-600 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">
            Wikipedia
          </span>
        </div>

        <div className="p-5">
          <div className="flex gap-4 mb-4">
            {info.thumbnail && (
              <div className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border border-white/10 bg-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={info.thumbnail} alt={info.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white leading-tight">{info.title}</h3>
              {info.description && (
                <p className="text-xs text-amber-400/80 mt-1 font-medium">{info.description}</p>
              )}
            </div>
          </div>

          {/* Full extract — no truncation */}
          <p className="text-sm text-zinc-400 leading-relaxed">{info.extract}</p>

          <a
            href={info.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white border border-zinc-700 hover:border-zinc-500 bg-zinc-800/50 hover:bg-zinc-800 px-3 py-1.5 rounded-lg transition-all duration-200"
          >
            <ExternalLink className="w-3 h-3" />
            Read full article on Wikipedia
          </a>
        </div>
      </div>

      {/* ── Live Status: Weather + Time ── */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-xl">
        <div className="h-[2px] bg-gradient-to-r from-teal-500 via-cyan-400 to-blue-500" />

        <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-500/15 border border-teal-500/20 flex items-center justify-center">
            <Thermometer className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <h2 className="text-sm font-semibold text-zinc-100">Live Status</h2>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-500" />
            </span>
            <span className="text-[10px] text-teal-400 font-medium">Live</span>
          </div>
        </div>

        <div className="p-5">
          {loadingWeather ? (
            <div className="flex items-center gap-2 text-zinc-600 text-sm py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Fetching live weather…
            </div>
          ) : weather ? (
            <>
              {/* Big weather display */}
              <div className="flex items-center gap-5 mb-5 p-4 rounded-xl bg-zinc-900/60 border border-white/5">
                <span className="text-5xl">{weather.emoji}</span>
                <div>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black text-white">{weather.temperature}°</span>
                    <span className="text-lg text-zinc-500 mb-1">C</span>
                  </div>
                  <p className="text-sm text-zinc-400">{weather.description}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">Feels like {weather.feelsLike}°C</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-sm font-semibold text-white">{weather.localTime}</p>
                  <p className="text-xs text-zinc-500">{weather.localDate}</p>
                  <p className="text-[10px] text-zinc-700 mt-1">{weather.timezone}</p>
                </div>
              </div>

              {/* Weather detail grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-zinc-900/50 border border-white/5 p-3 text-center">
                  <Droplets className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-white">{weather.humidity}%</p>
                  <p className="text-[10px] text-zinc-600">Humidity</p>
                </div>
                <div className="rounded-xl bg-zinc-900/50 border border-white/5 p-3 text-center">
                  <Wind className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-white">{weather.windSpeed}</p>
                  <p className="text-[10px] text-zinc-600">km/h Wind</p>
                </div>
                <div className="rounded-xl bg-zinc-900/50 border border-white/5 p-3 text-center">
                  <Clock className="w-4 h-4 text-violet-400 mx-auto mb-1" />
                  <p className="text-sm font-bold text-white">{weather.isDay ? "Day" : "Night"}</p>
                  <p className="text-[10px] text-zinc-600">Time of day</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-zinc-600 py-2">Weather data unavailable for this location.</p>
          )}
        </div>
      </div>

      {/* ── Country Facts ── */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-xl">
        <div className="h-[2px] bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500" />

        <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
            <Globe className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <h2 className="text-sm font-semibold text-zinc-100">Country Facts</h2>
        </div>

        <div className="p-5">
          {loadingCountry ? (
            <div className="flex items-center gap-2 text-zinc-600 text-sm py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading country data…
            </div>
          ) : countryData ? (
            <>
              {/* Country name + flag */}
              <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-zinc-900/60 border border-white/5">
                <span className="text-3xl">{countryData.flagEmoji}</span>
                <div>
                  <p className="text-sm font-bold text-white">{countryData.officialName}</p>
                  <p className="text-xs text-zinc-500">{countryData.subregion}, {countryData.region}</p>
                </div>
              </div>

              <div className="divide-y divide-white/[0.04]">
                <StatRow
                  icon={<Building2 className="w-3.5 h-3.5 text-blue-400" />}
                  label="Capital"
                  value={countryData.capital}
                />
                <StatRow
                  icon={<Users className="w-3.5 h-3.5 text-green-400" />}
                  label="Population"
                  value={formatPopulation(countryData.population)}
                />
                <StatRow
                  icon={<Map className="w-3.5 h-3.5 text-amber-400" />}
                  label="Area"
                  value={formatArea(countryData.area)}
                />
                <StatRow
                  icon={<Coins className="w-3.5 h-3.5 text-yellow-400" />}
                  label="Currency"
                  value={
                    countryData.currencySymbol
                      ? `${countryData.currency} (${countryData.currencySymbol})`
                      : countryData.currency
                  }
                />
                <StatRow
                  icon={<Languages className="w-3.5 h-3.5 text-pink-400" />}
                  label="Languages"
                  value={countryData.languages.join(", ")}
                />
              </div>
            </>
          ) : (
            <p className="text-xs text-zinc-600 py-2">Country data unavailable.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  description: string;
  emoji: string;
  timezone: string;
  localTime: string;
  localDate: string;
  isDay: boolean;
}

export interface CountryData {
  officialName: string;
  capital: string;
  population: number;
  currency: string;
  currencySymbol: string;
  languages: string[];
  area: number;
  flagEmoji: string;
  region: string;
  subregion: string;
}

function getWeatherInfo(code: number, isDay: boolean): { description: string; emoji: string } {
  if (code === 0) return { description: isDay ? "Clear Sky" : "Clear Night", emoji: isDay ? "☀️" : "🌙" };
  if (code === 1) return { description: "Mainly Clear", emoji: isDay ? "🌤️" : "🌤️" };
  if (code === 2) return { description: "Partly Cloudy", emoji: "⛅" };
  if (code === 3) return { description: "Overcast", emoji: "☁️" };
  if (code === 45 || code === 48) return { description: "Foggy", emoji: "🌫️" };
  if (code === 51 || code === 53 || code === 55) return { description: "Drizzle", emoji: "🌦️" };
  if (code === 56 || code === 57) return { description: "Freezing Drizzle", emoji: "🌨️" };
  if (code === 61 || code === 63) return { description: "Rain", emoji: "🌧️" };
  if (code === 65) return { description: "Heavy Rain", emoji: "🌧️" };
  if (code === 66 || code === 67) return { description: "Freezing Rain", emoji: "🌨️" };
  if (code === 71 || code === 73) return { description: "Snowfall", emoji: "🌨️" };
  if (code === 75 || code === 77) return { description: "Heavy Snow", emoji: "❄️" };
  if (code === 80 || code === 81) return { description: "Rain Showers", emoji: "🌦️" };
  if (code === 82) return { description: "Violent Showers", emoji: "⛈️" };
  if (code === 85 || code === 86) return { description: "Snow Showers", emoji: "🌨️" };
  if (code === 95) return { description: "Thunderstorm", emoji: "⛈️" };
  if (code === 96 || code === 99) return { description: "Thunderstorm + Hail", emoji: "⛈️" };
  return { description: "Unknown", emoji: "🌡️" };
}

export async function getWeatherData(lat: number, lng: number): Promise<WeatherData | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day` +
      `&timezone=auto&forecast_days=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = await res.json();
    const cur = data.current;
    if (!cur) return null;

    const isDay = cur.is_day === 1;
    const { description, emoji } = getWeatherInfo(cur.weather_code, isDay);

    // Format local time using timezone
    const tz: string = data.timezone || "UTC";
    const now = new Date();
    const localTime = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(now);
    const localDate = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(now);

    return {
      temperature: Math.round(cur.temperature_2m),
      feelsLike: Math.round(cur.apparent_temperature),
      humidity: cur.relative_humidity_2m,
      windSpeed: Math.round(cur.wind_speed_10m),
      weatherCode: cur.weather_code,
      description,
      emoji,
      timezone: tz,
      localTime,
      localDate,
      isDay,
    };
  } catch {
    return null;
  }
}

export async function getCountryData(country: string): Promise<CountryData | null> {
  try {
    const url =
      `https://restcountries.com/v3.1/name/${encodeURIComponent(country)}` +
      `?fullText=false&fields=name,capital,population,currencies,languages,area,flags,region,subregion`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const c = data[0];

    const currencyEntries = Object.entries(c.currencies || {}) as [string, { name: string; symbol: string }][];
    const currency = currencyEntries.length > 0 ? currencyEntries[0][1].name : "Unknown";
    const currencySymbol = currencyEntries.length > 0 ? currencyEntries[0][1].symbol : "";

    const languages = Object.values(c.languages || {}) as string[];

    return {
      officialName: c.name?.official || c.name?.common || country,
      capital: (c.capital as string[])?.[0] || "Unknown",
      population: c.population || 0,
      currency,
      currencySymbol,
      languages,
      area: c.area || 0,
      flagEmoji: c.flags?.emoji || "🌍",
      region: c.region || "",
      subregion: c.subregion || "",
    };
  } catch {
    return null;
  }
}

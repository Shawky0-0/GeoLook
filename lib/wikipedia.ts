export interface WikiInfo {
  title: string;
  description: string;
  extract: string;
  thumbnail?: string;
  url: string;
}

async function searchWikipedia(query: string): Promise<string | null> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=0&format=json&origin=*&srlimit=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    const results = data?.query?.search;
    if (!results?.length) return null;
    return results[0].title as string;
  } catch {
    return null;
  }
}

async function getPageSummary(title: string): Promise<WikiInfo | null> {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.type === "disambiguation" || !data.extract || data.extract.length < 50) return null;
    return {
      title: data.title as string,
      description: (data.description as string) || "",
      extract: data.extract as string,
      thumbnail: data.thumbnail?.source as string | undefined,
      url:
        (data.content_urls?.desktop?.page as string) ||
        `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    };
  } catch {
    return null;
  }
}

export async function getPlaceInfo(
  landmark: string | null,
  city: string,
  country: string,
  confidence: number
): Promise<WikiInfo | null> {
  if (confidence < 40) return null;

  const queries: string[] = [];

  if (landmark && landmark !== "Unknown") {
    queries.push(landmark);
    if (city && city !== "Unknown") queries.push(`${landmark} ${city}`);
  }
  if (city && city !== "Unknown") {
    queries.push(`${city}, ${country}`);
    queries.push(city);
  }
  if (queries.length === 0 && country && country !== "Unknown") {
    queries.push(country);
  }

  for (const query of queries) {
    const title = await searchWikipedia(query);
    if (!title) continue;
    const info = await getPageSummary(title);
    if (info) return info;
  }

  return null;
}

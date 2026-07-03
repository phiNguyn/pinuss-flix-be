import https from "https";

export interface ScheduledEpisode {
  episode: string;
  air_date: string;
}

const CHOPHIM_BASE = "https://chophim.fun/api";

// Simple in-memory cache to avoid hammering the upstream API
const scheduleCache = new Map<
  string,
  { data: ScheduledEpisode[]; expiresAt: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function fetchJson<T>(url: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          res.resume();
          reject(new Error(`Upstream responded with ${res.statusCode}`));
          return;
        }

        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body) as T);
          } catch {
            reject(new Error("Invalid JSON response"));
          }
        });
      })
      .on("error", reject);
  });
}

export class MoviesService {
  async getScheduledEpisodes(slug: string): Promise<ScheduledEpisode[]> {
    const cached = scheduleCache.get(slug);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const url = `${CHOPHIM_BASE}/scheduled-episodes?slug=${encodeURIComponent(
      slug,
    )}`;

    const raw = await fetchJson<unknown>(url);

    const data: ScheduledEpisode[] = Array.isArray(raw)
      ? raw
          .filter(
            (item): item is ScheduledEpisode =>
              !!item &&
              typeof (item as ScheduledEpisode).episode === "string" &&
              typeof (item as ScheduledEpisode).air_date === "string",
          )
          .map((item) => ({
            episode: item.episode,
            air_date: item.air_date,
          }))
      : [];

    scheduleCache.set(slug, {
      data,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return data;
  }
}

export const moviesService = new MoviesService();

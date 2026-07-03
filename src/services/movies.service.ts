import { z } from "zod";
import { loadEnv } from "../config/env.js";

const scheduledEpisodeSchema = z.object({
  episode: z.string(),
  air_date: z.string(),
});

const scheduledEpisodesResponseSchema = z.array(scheduledEpisodeSchema);

export type ScheduledEpisode = z.infer<typeof scheduledEpisodeSchema>;

export class UpstreamFetchError extends Error {
  constructor(
    message: string,
    readonly url: string,
    readonly status?: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = "UpstreamFetchError";
  }
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const UPSTREAM_TIMEOUT = 8000; // 8 seconds

// Simple in-memory cache to avoid hammering the upstream API.
const scheduleCache = new Map<
  string,
  { data: ScheduledEpisode[]; expiresAt: number }
>();

// Dedup concurrent requests for the same slug to avoid a cache stampede.
const inFlight = new Map<string, Promise<ScheduledEpisode[]>>();

function pruneExpired(now: number): void {
  for (const [key, entry] of scheduleCache) {
    if (entry.expiresAt <= now) {
      scheduleCache.delete(key);
    }
  }
}

async function fetchJson(url: string): Promise<unknown> {
  let res: Response;

  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT),
      headers: { accept: "application/json" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upstream request failed";
    throw new UpstreamFetchError(message, url);
  }

  if (!res.ok) {
    const body = (await res.text()).slice(0, 200);
    throw new UpstreamFetchError(
      `Upstream responded with ${res.status}`,
      url,
      res.status,
      body || undefined,
    );
  }

  try {
    return await res.json();
  } catch {
    throw new UpstreamFetchError("Invalid JSON response", url, res.status);
  }
}

export class MoviesService {
  async getScheduledEpisodes(slug: string): Promise<ScheduledEpisode[]> {
    const now = Date.now();
    const cached = scheduleCache.get(slug);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    const existing = inFlight.get(slug);
    if (existing) return existing;

    const request = this.loadFromUpstream(slug).finally(() => {
      inFlight.delete(slug);
    });
    inFlight.set(slug, request);
    return request;
  }

  private async loadFromUpstream(slug: string): Promise<ScheduledEpisode[]> {
    const { CHOPHIM_BASE } = loadEnv();
    const base = CHOPHIM_BASE.replace(/\/$/, "");
    const url = `${base}/scheduled-episodes?slug=${encodeURIComponent(slug)}`;

    const raw = await fetchJson(url);
    const parsed = scheduledEpisodesResponseSchema.safeParse(raw);
    const data = parsed.success ? parsed.data : [];

    const now = Date.now();
    pruneExpired(now);
    scheduleCache.set(slug, { data, expiresAt: now + CACHE_TTL });

    return data;
  }
}

export const moviesService = new MoviesService();

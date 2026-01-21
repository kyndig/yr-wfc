import { clearCachedByPrefix, getCached, setCached } from "./cache";
import { getCacheThresholds } from "./config/weather-config";
import { TimeseriesEntry } from "./weather-client";
import { SunTimes } from "./sunrise-client";
import { buildGraphMarkdown } from "./graph-utils";
import { CacheKeyGenerator } from "./utils/cache-manager";
import { DebugLogger } from "./utils/debug-utils";
import { environment, LocalStorage } from "@raycast/api";

/**
 * Graph cache entry with versioning support
 */
type GraphCacheEntry = {
  markdown: string;
  version: string;
  dataHash: string; // Hash of the input data to detect changes
  generatedAt: number;
};

/**
 * Graph cache key generator (now using unified CacheKeyGenerator)
 */
function generateGraphCacheKey(
  locationKey: string,
  mode: "detailed" | "summary",
  targetDate?: string,
  dataHash?: string,
): string {
  const paletteId = environment.appearance === "dark" ? "dark" : "light";
  return CacheKeyGenerator.graph(locationKey, mode, targetDate, dataHash, paletteId);
}

/**
 * Generate a hash for the input data to detect changes
 */
function generateDataHash(
  series: TimeseriesEntry[],
  name: string,
  hours: number,
  sunByDate?: Record<string, SunTimes>,
): string {
  // Create a simple hash based on key data points
  const keyData = {
    seriesLength: series.length,
    name,
    hours,
    firstTime: series[0]?.time,
    lastTime: series[series.length - 1]?.time,
    sunByDate: sunByDate ? JSON.stringify(sunByDate) : "empty",
  };

  // Create a more robust hash that includes sunrise/sunset data
  const dataString = JSON.stringify(keyData);
  const hash = btoa(dataString)
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 40); // Increased to 40 chars to ensure uniqueness

  DebugLogger.debug(
    "Generated cache hash:",
    hash,
    "for sunByDate:",
    sunByDate ? Object.keys(sunByDate).length + " dates" : "empty",
  );
  return hash;
}

/**
 * Get cached graph if available and valid
 */
export async function getCachedGraph(
  locationKey: string,
  mode: "detailed" | "summary",
  series: TimeseriesEntry[],
  name: string,
  hours: number,
  sunByDate?: Record<string, SunTimes>,
  targetDate?: string,
): Promise<string | undefined> {
  try {
    const cacheThresholds = getCacheThresholds();
    const dataHash = generateDataHash(series, name, hours, sunByDate);
    const cacheKey = generateGraphCacheKey(locationKey, mode, targetDate, dataHash);

    const cached = await getCached<GraphCacheEntry>(cacheKey, cacheThresholds.GRAPH);

    if (!cached) return undefined;

    // Check version compatibility
    if (cached.version !== cacheThresholds.GRAPH_VERSION) {
      return undefined;
    }

    // Check if data has changed
    if (cached.dataHash !== dataHash) {
      return undefined;
    }

    return cached.markdown;
  } catch (error) {
    DebugLogger.warn("Failed to get cached graph:", error);
    return undefined;
  }
}

/**
 * Cache a generated graph
 */
export async function setCachedGraph(
  locationKey: string,
  mode: "detailed" | "summary",
  series: TimeseriesEntry[],
  name: string,
  hours: number,
  markdown: string,
  sunByDate?: Record<string, SunTimes>,
  targetDate?: string,
): Promise<void> {
  try {
    const cacheThresholds = getCacheThresholds();
    const dataHash = generateDataHash(series, name, hours, sunByDate);
    const cacheKey = generateGraphCacheKey(locationKey, mode, targetDate, dataHash);

    const cacheEntry: GraphCacheEntry = {
      markdown,
      version: cacheThresholds.GRAPH_VERSION,
      dataHash,
      generatedAt: Date.now(),
    };

    await setCached(cacheKey, cacheEntry);
  } catch (error) {
    DebugLogger.warn("Failed to cache graph:", error);
  }
}

/**
 * Generate and cache a graph
 */
export async function generateAndCacheGraph(
  locationKey: string,
  mode: "detailed" | "summary",
  series: TimeseriesEntry[],
  name: string,
  hours: number,
  sunByDate?: Record<string, SunTimes>,
  targetDate?: string,
  forceRegenerate?: boolean,
): Promise<string> {
  // Try to get from cache first (unless forcing regeneration)
  if (!forceRegenerate) {
    const cached = await getCachedGraph(locationKey, mode, series, name, hours, sunByDate, targetDate);
    if (cached) {
      DebugLogger.debug("Using cached graph for", mode, "with sunByDate:", sunByDate);
      return cached;
    }
  } else {
    DebugLogger.debug("Bypassing cache due to forceRegenerate flag");
  }

  // Generate new graph
  const title = targetDate ? "1-day forecast" : mode === "detailed" ? "48h forecast" : "9-day summary";
  DebugLogger.debug("🚀 GENERATING NEW GRAPH with sunByDate:", sunByDate, "mode:", mode);

  // Ensure we always have a valid sunByDate object, even if empty
  const safeSunByDate = sunByDate || {};

  const result = buildGraphMarkdown(name, series, hours, {
    title,
    smooth: true,
    sunByDate: mode === "detailed" || targetDate ? safeSunByDate : undefined,
  });

  // Cache the result
  await setCachedGraph(locationKey, mode, series, name, hours, result.markdown, sunByDate, targetDate);

  return result.markdown;
}

/**
 * Clear all cached graphs for a location
 */
export async function clearLocationGraphCache(locationKey: string): Promise<void> {
  try {
    const removed = await clearCachedByPrefix(`graph:${locationKey}:`);
    DebugLogger.debug(`Cleared ${removed} graph cache entries for location ${locationKey}`);
  } catch (error) {
    DebugLogger.warn("Failed to clear location graph cache:", error);
  }
}

/**
 * Invalidate cached graphs for a specific location
 */
export async function invalidateLocationGraphCache(locationKey: string): Promise<void> {
  try {
    // For graphs, invalidation means removing persisted entries so they regenerate.
    await clearLocationGraphCache(locationKey);
  } catch (error) {
    DebugLogger.warn("Failed to invalidate location graph cache:", error);
  }
}

/**
 * Invalidate cached graphs for a specific mode (detailed/summary)
 */
export async function invalidateModeGraphCache(mode: "detailed" | "summary"): Promise<void> {
  try {
    const all = await LocalStorage.allItems();
    const removedKeys: string[] = [];
    for (const storageKey of Object.keys(all)) {
      if (!storageKey.startsWith("cache:graph:")) continue;
      const internalKey = storageKey.slice("cache:".length);
      // internalKey: graph:<locationKey>:<mode>[:...]
      if (internalKey.includes(`:${mode}`)) {
        removedKeys.push(internalKey);
        await LocalStorage.removeItem(storageKey);
      }
    }
    DebugLogger.debug(`Cleared ${removedKeys.length} graph cache entries for mode ${mode}`);
  } catch (error) {
    DebugLogger.warn("Failed to invalidate mode graph cache:", error);
  }
}

/**
 * Invalidate cached graphs for a specific target date
 */
export async function invalidateDateGraphCache(targetDate: string): Promise<void> {
  try {
    const all = await LocalStorage.allItems();
    let removedCount = 0;
    for (const storageKey of Object.keys(all)) {
      if (!storageKey.startsWith("cache:graph:")) continue;
      const internalKey = storageKey.slice("cache:".length);
      if (internalKey.endsWith(`:${targetDate}`) || internalKey.includes(`:${targetDate}:`)) {
        await LocalStorage.removeItem(storageKey);
        removedCount++;
      }
    }
    DebugLogger.debug(`Cleared ${removedCount} graph cache entries for date ${targetDate}`);
  } catch (error) {
    DebugLogger.warn("Failed to invalidate date graph cache:", error);
  }
}

/**
 * Clear all cached graphs (useful when graph format changes)
 */
export async function clearAllGraphCache(): Promise<void> {
  try {
    const removed = await clearCachedByPrefix("graph:");
    DebugLogger.debug(`Cleared ${removed} graph cache entries`);
  } catch (error) {
    DebugLogger.warn("Failed to clear all graph cache:", error);
  }
}

/**
 * Clean up old cached graphs to prevent memory bloat
 * Removes graphs older than the specified age
 */
export async function cleanupOldGraphCache(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
  try {
    const all = await LocalStorage.allItems();
    const now = Date.now();
    let removedCount = 0;

    for (const storageKey of Object.keys(all)) {
      if (!storageKey.startsWith("cache:graph:")) continue;
      const raw = all[storageKey];
      if (typeof raw !== "string") continue;
      try {
        const parsed = JSON.parse(raw) as { savedAtMs?: number };
        const savedAtMs = parsed?.savedAtMs;
        if (typeof savedAtMs === "number" && now - savedAtMs > maxAgeMs) {
          await LocalStorage.removeItem(storageKey);
          removedCount++;
        }
      } catch {
        // If we can't parse, remove it to keep storage clean.
        await LocalStorage.removeItem(storageKey);
        removedCount++;
      }
    }

    DebugLogger.debug(`Graph cache cleanup removed ${removedCount} entries older than ${maxAgeMs}ms`);
    return removedCount;
  } catch (error) {
    DebugLogger.warn("Failed to cleanup old graph cache:", error);
    return 0;
  }
}

/**
 * Get cache statistics (for debugging and monitoring)
 */
export async function getGraphCacheStats(): Promise<{
  totalEntries: number;
  oldestEntry: number | null;
  newestEntry: number | null;
  totalSize: number;
}> {
  try {
    const all = await LocalStorage.allItems();
    const entries = Object.entries(all).filter(([k]) => k.startsWith("cache:graph:"));
    let totalSize = 0;
    let oldest: number | null = null;
    let newest: number | null = null;

    for (const [, raw] of entries) {
      if (typeof raw === "string") {
        totalSize += raw.length;
        try {
          const parsed = JSON.parse(raw) as { savedAtMs?: number };
          const savedAtMs = parsed?.savedAtMs;
          if (typeof savedAtMs === "number") {
            oldest = oldest === null ? savedAtMs : Math.min(oldest, savedAtMs);
            newest = newest === null ? savedAtMs : Math.max(newest, savedAtMs);
          }
        } catch {
          // ignore
        }
      }
    }

    return {
      totalEntries: entries.length,
      oldestEntry: oldest,
      newestEntry: newest,
      totalSize,
    };
  } catch (error) {
    DebugLogger.warn("Failed to get graph cache stats:", error);
    return {
      totalEntries: 0,
      oldestEntry: null,
      newestEntry: null,
      totalSize: 0,
    };
  }
}

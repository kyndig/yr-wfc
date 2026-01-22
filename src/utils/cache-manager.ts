import { clearAllCached, clearCachedByPrefix, getCached, setCached } from "../cache";
import { DebugLogger } from "./debug-utils";
import { getCacheThresholds } from "../config/weather-config";

/**
 * Unified cache key generator following consistent patterns
 */
export class CacheKeyGenerator {
  /**
   * Generate cache key for graph data
   */
  static graph(
    locationKey: string,
    mode: "detailed" | "summary",
    targetDate?: string,
    dataHash?: string,
    paletteId: "light" | "dark" = "light",
  ): string {
    const baseKey = `graph:${locationKey}:${mode}:${paletteId}`;
    if (targetDate) {
      return `${baseKey}:${targetDate}`;
    }
    if (dataHash) {
      return `${baseKey}:${dataHash}`;
    }
    return baseKey;
  }

  /**
   * Generate cache key for API data
   */
  static api(prefix: string, suffix: string): string {
    return `${prefix}:${suffix}`;
  }

  /**
   * Generate cache key for weather data
   */
  static weather(lat: number, lon: number): string {
    return `weather:${lat.toFixed(3)},${lon.toFixed(3)}`;
  }

  /**
   * Generate cache key for sunrise/sunset data
   */
  static sunrise(lat: number, lon: number, date: string): string {
    return `sunrise:${lat.toFixed(3)},${lon.toFixed(3)}:${date}`;
  }
}

/**
 * Unified cache manager that handles both memory and persistent caching
 */
export class CacheManager {
  private memoryCache = new Map<string, { value: unknown; timestamp: number }>();
  private readonly memoryCacheTtl = 5 * 60 * 1000; // 5 minutes for memory cache

  /**
   * Get data from cache (memory first, then persistent)
   */
  async get<T>(key: string, ttlMs?: number): Promise<T | undefined> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry) {
      const age = Date.now() - memoryEntry.timestamp;
      if (age < this.memoryCacheTtl) {
        DebugLogger.debug(`Cache hit (memory): ${key}`);
        return memoryEntry.value as T;
      } else {
        // Remove expired memory entry
        this.memoryCache.delete(key);
      }
    }

    // Check persistent cache
    const persistentValue = await getCached<T>(key, ttlMs || this.getDefaultTtl(key));
    if (persistentValue !== undefined) {
      DebugLogger.debug(`Cache hit (persistent): ${key}`);
      // Store in memory cache for faster access
      this.memoryCache.set(key, { value: persistentValue, timestamp: Date.now() });
      return persistentValue;
    }

    DebugLogger.debug(`Cache miss: ${key}`);
    return undefined;
  }

  /**
   * Set data in both memory and persistent cache
   */
  async set<T>(key: string, value: T): Promise<void> {
    // Store in memory cache
    this.memoryCache.set(key, { value, timestamp: Date.now() });

    // Store in persistent cache
    await setCached(key, value);
    DebugLogger.debug(`Cache set: ${key}`);
  }

  /**
   * Clear specific key from both caches
   */
  async clear(key: string): Promise<void> {
    this.memoryCache.delete(key);
    // Note: We can't easily clear individual keys from persistent cache
    // without knowing the exact key format, so we rely on TTL expiration
    DebugLogger.debug(`Cache cleared (memory): ${key}`);
  }

  /**
   * Clear all memory cache
   */
  clearMemoryCache(): void {
    this.memoryCache.clear();
    DebugLogger.debug("Memory cache cleared");
  }

  /**
   * Get default TTL based on cache key type
   */
  private getDefaultTtl(key: string): number {
    const thresholds = getCacheThresholds();

    if (key.startsWith("graph:")) {
      return thresholds.GRAPH;
    } else if (key.startsWith("weather:")) {
      return thresholds.WEATHER;
    } else if (key.startsWith("sunrise:")) {
      return thresholds.SUNRISE;
    } else if (key.startsWith("location:")) {
      return thresholds.LOCATION_SEARCH;
    }

    return thresholds.WEATHER; // Default fallback
  }

  /**
   * Get cache statistics
   */
  getStats(): { memoryEntries: number; memorySize: number } {
    const memoryEntries = this.memoryCache.size;
    const memorySize = Array.from(this.memoryCache.values()).reduce(
      (total, entry) => total + JSON.stringify(entry.value).length,
      0,
    );

    return { memoryEntries, memorySize };
  }
}

/**
 * Singleton cache manager instance
 */
export const cacheManager = new CacheManager();

/**
 * Unified cache clearing utility
 */
export class CacheClearingUtility {
  /**
   * Clear all caches (memory + persistent)
   */
  static async clearAllCaches(): Promise<void> {
    try {
      // Clear memory cache
      cacheManager.clearMemoryCache();

      // Clear all persistent cache entries (weather + sunrise + graph)
      const removed = await clearAllCached();

      DebugLogger.info("All caches cleared successfully", { removedPersistentEntries: removed });
    } catch (error) {
      DebugLogger.error("Failed to clear all caches:", error);
      throw error;
    }
  }

  /**
   * Clear graph caches specifically
   */
  static async clearGraphCaches(): Promise<void> {
    try {
      // Clear memory cache for graph keys
      const graphKeys = Array.from(cacheManager["memoryCache"].keys()).filter((key) => key.startsWith("graph:"));
      graphKeys.forEach((key) => cacheManager.clear(key));

      // Clear persistent graph cache
      const removed = await clearCachedByPrefix("graph:");

      DebugLogger.info("Graph caches cleared successfully", { removedPersistentEntries: removed });
    } catch (error) {
      DebugLogger.error("Failed to clear graph caches:", error);
      throw error;
    }
  }

  /**
   * Clear caches when sunrise/sunset data changes
   */
  static async clearCachesForSunriseSunsetChange(): Promise<void> {
    try {
      cacheManager.clearMemoryCache();
      const removed = await clearCachedByPrefix("graph:");
      DebugLogger.debug("Caches cleared due to sunrise/sunset data change");
      DebugLogger.debug("Cleared graph caches due to sunrise/sunset data change", {
        removedPersistentEntries: removed,
      });
    } catch (error) {
      DebugLogger.error("Failed to clear caches for sunrise/sunset change:", error);
    }
  }
}

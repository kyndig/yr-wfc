import { getCached, setCached } from "../cache";
import { API_CONFIG, buildApiHeaders, buildApiUrl } from "./api-config";
import { DebugLogger } from "./debug-utils";
import { getCacheThresholds } from "../config/weather-config";

/**
 * Generic API client for making cached HTTP requests
 * Eliminates duplication between weather and sunrise clients
 */
export class ApiClient {
  private baseUrl: string;
  private cacheKeyPrefix: string;
  private cacheTtl: number;

  constructor(baseUrl: string, cacheKeyPrefix: string, cacheTtl: number) {
    this.baseUrl = baseUrl;
    this.cacheKeyPrefix = cacheKeyPrefix;
    this.cacheTtl = cacheTtl;
  }

  private async fetchJsonWithRetry(
    url: string,
    options?: {
      signal?: AbortSignal;
      timeoutMs?: number;
      retries?: number;
      retryDelayMs?: number;
      headers?: Record<string, string>;
    },
  ): Promise<{ data: unknown; response: Response }> {
    const { signal, timeoutMs = 10000, retries = 1, retryDelayMs = 500, headers } = options ?? {};

    const shouldRetryStatus = (status: number) => status === 429 || (status >= 500 && status <= 599);
    type HttpError = Error & { status?: number };

    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const onAbort = () => controller.abort();
      signal?.addEventListener("abort", onAbort);

      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { headers: buildApiHeaders(headers), signal: controller.signal });
        if (!res.ok) {
          const err: HttpError = new Error(`API responded ${res.status} ${res.statusText}`);
          err.status = res.status;
          if (attempt < retries && shouldRetryStatus(res.status)) {
            lastError = err;
          } else {
            throw err;
          }
        } else {
          const data = await res.json();
          return { data, response: res };
        }
      } catch (error) {
        lastError = error;
        const status = (error as HttpError | undefined)?.status;
        const isAbort = error instanceof Error && (error.name === "AbortError" || /aborted/i.test(error.message));
        if (isAbort) throw error;

        if (attempt >= retries) throw error;
        if (typeof status === "number" && !shouldRetryStatus(status)) throw error;
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", onAbort);
      }

      // Backoff before retrying
      const delay = retryDelayMs * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  /**
   * Make a cached API request with automatic error handling
   */
  async request<T>(
    params: Record<string, string | number>,
    cacheKeySuffix: string,
    responseTransformer: (data: unknown, response: Response) => T,
    options?: {
      signal?: AbortSignal;
      timeoutMs?: number;
      retries?: number;
      retryDelayMs?: number;
      headers?: Record<string, string>;
    },
  ): Promise<T> {
    const cacheKey = `${this.cacheKeyPrefix}:${cacheKeySuffix}`;

    // Check cache first
    const cached = await getCached<T>(cacheKey, this.cacheTtl);
    if (cached) return cached;

    // Make API request
    const url = buildApiUrl(this.baseUrl, params);
    const { data, response } = await this.fetchJsonWithRetry(url, options);

    // Validate the response data before transforming
    if (!data || typeof data !== "object") {
      throw new Error("Invalid API response: expected object");
    }

    const result = responseTransformer(data, response);

    // Validate the transformed result
    if (result === undefined || result === null) {
      throw new Error("Response transformer returned invalid result");
    }

    // Cache the result
    await setCached(cacheKey, result);
    return result;
  }

  /**
   * Make a cached API request that can fail gracefully
   */
  async requestSafe<T>(
    params: Record<string, string | number>,
    cacheKeySuffix: string,
    responseTransformer: (data: unknown, response: Response) => T,
    fallback: T,
    options?: {
      signal?: AbortSignal;
      timeoutMs?: number;
      retries?: number;
      retryDelayMs?: number;
      headers?: Record<string, string>;
    },
  ): Promise<T> {
    try {
      return await this.request(params, cacheKeySuffix, responseTransformer, options);
    } catch (error) {
      DebugLogger.warn(`API request failed for ${cacheKeySuffix}:`, error);
      return fallback;
    }
  }
}

/**
 * Pre-configured API clients for common endpoints
 */
export const weatherApiClient = new ApiClient(
  "https://api.met.no/weatherapi/locationforecast/2.0/compact",
  "weather",
  API_CONFIG.CACHE_TTL.WEATHER,
);

export const sunriseApiClient = new ApiClient(
  "https://api.met.no/weatherapi/sunrise/3.0/sun",
  "sun",
  API_CONFIG.CACHE_TTL.SUNRISE,
);

export const locationApiClient = new ApiClient(
  "https://nominatim.openstreetmap.org/search",
  "location",
  getCacheThresholds().LOCATION_SEARCH,
);

// Debug: Log API client initialization
DebugLogger.log("API clients initialized:", {
  weatherApiClient: !!weatherApiClient,
  sunriseApiClient: !!sunriseApiClient,
  locationApiClient: !!locationApiClient,
  weatherApiClientType: typeof weatherApiClient,
  sunriseApiClientType: typeof sunriseApiClient,
});

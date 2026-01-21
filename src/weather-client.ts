import { weatherApiClient } from "./utils/api-client";

export type TimeseriesEntry = {
  time: string;
  data: {
    instant: {
      details: Record<string, number> & {
        air_temperature?: number;
        wind_speed?: number;
        wind_from_direction?: number; // degrees
      };
    };
    next_1_hours?: {
      summary?: { symbol_code?: string };
      details?: { precipitation_amount?: number };
    };
    next_6_hours?: {
      summary?: { symbol_code?: string };
      details?: { precipitation_amount?: number };
    };
    next_12_hours?: {
      summary?: { symbol_code?: string };
      details?: { precipitation_amount?: number };
    };
  };
};

export type WeatherDataWithMetadata = {
  data: TimeseriesEntry | TimeseriesEntry[];
  metadata: {
    updated_at?: string;
    last_modified?: string;
    expires?: string;
  };
};

type LocationForecastResponse = {
  properties?: {
    timeseries?: unknown[];
  };
  meta?: {
    updated_at?: string;
  };
};

function coordSuffix(lat: number, lon: number): string {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

export async function getWeather(
  lat: number,
  lon: number,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<TimeseriesEntry> {
  const cacheKeySuffix = `current:${coordSuffix(lat, lon)}`;
  return weatherApiClient.request(
    { lat, lon },
    cacheKeySuffix,
    (raw: unknown) => {
      const data = raw as LocationForecastResponse;
      const first = data.properties?.timeseries?.[0] as unknown;
      if (!first) throw new Error("Unexpected response shape: missing timeseries[0]");
      return first as TimeseriesEntry;
    },
    { signal: options?.signal, timeoutMs: options?.timeoutMs ?? 10000, retries: 1 },
  );
}

export async function getWeatherWithMetadata(
  lat: number,
  lon: number,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<WeatherDataWithMetadata> {
  const cacheKeySuffix = `current-meta:${coordSuffix(lat, lon)}`;
  return weatherApiClient.request(
    { lat, lon },
    cacheKeySuffix,
    (raw: unknown, response: Response) => {
      const data = raw as LocationForecastResponse;
      const first = data.properties?.timeseries?.[0] as unknown;
      if (!first) throw new Error("Unexpected response shape: missing timeseries[0]");
      const ts = first as TimeseriesEntry;
      return {
        data: ts,
        metadata: {
          updated_at: data.meta?.updated_at,
          last_modified: response.headers.get("Last-Modified") || undefined,
          expires: response.headers.get("Expires") || undefined,
        },
      };
    },
    { signal: options?.signal, timeoutMs: options?.timeoutMs ?? 10000, retries: 1 },
  );
}

export async function getForecast(
  lat: number,
  lon: number,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<TimeseriesEntry[]> {
  const cacheKeySuffix = `forecast:${coordSuffix(lat, lon)}`;
  return weatherApiClient.request(
    { lat, lon },
    cacheKeySuffix,
    (raw: unknown) => {
      const data = raw as LocationForecastResponse;
      const series = data.properties?.timeseries as unknown;
      if (!Array.isArray(series)) throw new Error("Unexpected response shape: missing timeseries array");
      return series as TimeseriesEntry[];
    },
    { signal: options?.signal, timeoutMs: options?.timeoutMs ?? 10000, retries: 1 },
  );
}

export async function getForecastWithMetadata(
  lat: number,
  lon: number,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<WeatherDataWithMetadata> {
  const cacheKeySuffix = `forecast-meta:${coordSuffix(lat, lon)}`;
  return weatherApiClient.request(
    { lat, lon },
    cacheKeySuffix,
    (raw: unknown, response: Response) => {
      const data = raw as LocationForecastResponse;
      const series = data.properties?.timeseries as unknown;
      if (!Array.isArray(series)) throw new Error("Unexpected response shape: missing timeseries array");
      const list = series as TimeseriesEntry[];
      return {
        data: list,
        metadata: {
          updated_at: data.meta?.updated_at,
          last_modified: response.headers.get("Last-Modified") || undefined,
          expires: response.headers.get("Expires") || undefined,
        },
      };
    },
    { signal: options?.signal, timeoutMs: options?.timeoutMs ?? 10000, retries: 1 },
  );
}

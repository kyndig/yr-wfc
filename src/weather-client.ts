import { getCached, setCached } from "./cache";
import { API_HEADERS, API_CONFIG, API_ENDPOINTS, buildApiUrl } from "./utils/api-config";

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

export async function getWeather(lat: number, lon: number): Promise<TimeseriesEntry> {
  const cacheKey = `weather:${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = await getCached<TimeseriesEntry>(cacheKey, API_CONFIG.CACHE_TTL.WEATHER);
  if (cached) return cached;

  const url = buildApiUrl(API_ENDPOINTS.MET.WEATHER_FORECAST, { lat, lon });
  const res = await fetch(url, { headers: API_HEADERS });
  if (!res.ok) {
    throw new Error(`met.no responded ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as LocationForecastResponse;
  const first = data.properties?.timeseries?.[0] as unknown;
  if (!first) {
    throw new Error("Unexpected response shape: missing timeseries[0]");
  }
  const ts = first as TimeseriesEntry;
  await setCached(cacheKey, ts);
  return ts;
}

export async function getWeatherWithMetadata(lat: number, lon: number): Promise<WeatherDataWithMetadata> {
  const cacheKey = `weather-metadata:${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = await getCached<WeatherDataWithMetadata>(cacheKey, API_CONFIG.CACHE_TTL.WEATHER);
  if (cached) return cached;

  const url = buildApiUrl(API_ENDPOINTS.MET.WEATHER_FORECAST, { lat, lon });
  const res = await fetch(url, { headers: API_HEADERS });
  if (!res.ok) {
    throw new Error(`met.no responded ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as LocationForecastResponse;
  const first = data.properties?.timeseries?.[0] as unknown;
  if (!first) {
    throw new Error("Unexpected response shape: missing timeseries[0]");
  }
  const ts = first as TimeseriesEntry;

  const result: WeatherDataWithMetadata = {
    data: ts,
    metadata: {
      updated_at: data.meta?.updated_at,
      last_modified: res.headers.get("Last-Modified") || undefined,
      expires: res.headers.get("Expires") || undefined,
    },
  };

  await setCached(cacheKey, result);
  return result;
}

export async function getForecast(lat: number, lon: number): Promise<TimeseriesEntry[]> {
  const cacheKey = `forecast:${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = await getCached<TimeseriesEntry[]>(cacheKey, API_CONFIG.CACHE_TTL.WEATHER);
  if (cached) return cached;

  const url = buildApiUrl(API_ENDPOINTS.MET.WEATHER_FORECAST, { lat, lon });
  const res = await fetch(url, { headers: API_HEADERS });
  if (!res.ok) {
    throw new Error(`met.no responded ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as LocationForecastResponse;
  const series = data.properties?.timeseries as unknown;
  if (!Array.isArray(series)) {
    throw new Error("Unexpected response shape: missing timeseries array");
  }
  const list = series as TimeseriesEntry[];
  await setCached(cacheKey, list);
  return list;
}

export async function getForecastWithMetadata(lat: number, lon: number): Promise<WeatherDataWithMetadata> {
  const cacheKey = `forecast-metadata:${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = await getCached<WeatherDataWithMetadata>(cacheKey, API_CONFIG.CACHE_TTL.WEATHER);
  if (cached) return cached;

  const url = buildApiUrl(API_ENDPOINTS.MET.WEATHER_FORECAST, { lat, lon });
  const res = await fetch(url, { headers: API_HEADERS });
  if (!res.ok) {
    throw new Error(`met.no responded ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as LocationForecastResponse;
  const series = data.properties?.timeseries as unknown;
  if (!Array.isArray(series)) {
    throw new Error("Unexpected response shape: missing timeseries array");
  }
  const list = series as TimeseriesEntry[];

  const result: WeatherDataWithMetadata = {
    data: list,
    metadata: {
      updated_at: data.meta?.updated_at,
      last_modified: res.headers.get("Last-Modified") || undefined,
      expires: res.headers.get("Expires") || undefined,
    },
  };

  await setCached(cacheKey, result);
  return result;
}

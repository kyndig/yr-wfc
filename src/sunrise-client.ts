import { sunriseApiClient } from "./utils/api-client";
import { coordSuffix } from "./cache-keys";

export type SunTimes = {
  sunrise?: string; // ISO time
  sunset?: string; // ISO time
};

type SunriseApiResponse = {
  properties?: {
    sunrise?: { time?: string };
    sunset?: { time?: string };
  };
};

export async function getSunTimes(lat: number, lon: number, dateISO?: string): Promise<SunTimes> {
  const dateRaw = dateISO ?? new Date().toISOString().slice(0, 10);
  const date = dateRaw.includes("T") ? dateRaw.split("T")[0] : dateRaw;
  const cacheKeySuffix = `${coordSuffix(lat, lon)}:${date}`;

  return sunriseApiClient.requestSafe(
    { lat, lon, date },
    cacheKeySuffix,
    (data: unknown) => {
      const typedData = data as SunriseApiResponse;
      const sunrise = typedData.properties?.sunrise?.time;
      const sunset = typedData.properties?.sunset?.time;
      return { sunrise, sunset };
    },
    { sunrise: undefined, sunset: undefined }, // Return empty object as fallback
  );
}

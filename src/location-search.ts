import { API_CONFIG } from "./utils/api-config";
import { locationApiClient } from "./utils/api-client";

export type LocationResult = {
  id: string;
  displayName: string;
  lat: number;
  lon: number;
  address?: {
    city?: string;
    town?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
    postcode?: string;
  };
  osm_type?: string;
  type?: string;
  class?: string;
  addresstype?: string;
};

// Simple Nominatim search (OpenStreetMap). Comply with usage policy by sending a UA.
export async function searchLocations(query: string, options?: { signal?: AbortSignal }): Promise<LocationResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const data = await locationApiClient.request(
    {
      format: "json",
      q: trimmed,
      addressdetails: API_CONFIG.NOMINATIM.ADDRESS_DETAILS,
    },
    // Keep cache key short and stable.
    `search:${encodeURIComponent(trimmed.toLowerCase())}`,
    (raw: unknown) => {
      const list = raw as Array<{
        place_id: number | string;
        display_name: string;
        lat: string;
        lon: string;
        address?: {
          city?: string;
          town?: string;
          municipality?: string;
          county?: string;
          state?: string;
          country?: string;
          country_code?: string;
          postcode?: string;
        };
        osm_type?: string;
        type?: string;
        class?: string;
        addresstype?: string;
      }>;

      if (!Array.isArray(list)) return [];

      return list.map((p) => ({
        id: String(p.place_id),
        displayName: p.display_name,
        lat: Number(p.lat),
        lon: Number(p.lon),
        address: p.address,
        osm_type: p.osm_type,
        type: p.type,
        class: p.class,
        addresstype: p.addresstype,
      }));
    },
    { signal: options?.signal, timeoutMs: 10000, retries: 1 },
  );

  // Nominatim may return partial/invalid coordinate rows; filter those out.
  return data.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
}

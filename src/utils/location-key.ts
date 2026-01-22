/**
 * Canonical location identity utilities.
 *
 * Goal: provide a single stable key used across favorites, caches, and UI keys.
 *
 * - Prefer stable upstream IDs (e.g. Nominatim place_id) when available.
 * - Fall back to a namespaced coordinate key with fixed precision.
 */
export type LocationKey = string;

const COORD_PRECISION = 3;

function coordPart(n: number): string {
  return n.toFixed(COORD_PRECISION);
}

export function locationKeyFromCoords(lat: number, lon: number): LocationKey {
  return `coord:${coordPart(lat)},${coordPart(lon)}`;
}

function looksLikeLatLonPair(id: string): { lat: number; lon: number } | null {
  const parts = id.split(",").map((p) => p.trim());
  if (parts.length !== 2) return null;
  const lat = Number(parts[0]);
  const lon = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

/**
 * Convert any legacy/loose ID + coordinates into a canonical key.
 *
 * Important: we do NOT require callers to pre-prefix IDs. This function
 * canonicalizes common legacy formats used in this repo:
 * - Raw Nominatim place_id string/number -> `osm:${id}`
 * - Raw `"lat,lon"` strings -> `coord:...` (rounded)
 * - `favorite-<lat>-<lon>` -> treated as coord fallback
 */
export function locationKeyFromIdOrCoords(id: string | undefined, lat: number, lon: number): LocationKey {
  if (id) {
    if (id.startsWith("osm:") || id.startsWith("coord:") || id.startsWith("id:")) return id;

    // Internal/legacy placeholder used in forecast view
    if (id.startsWith("favorite-")) {
      return locationKeyFromCoords(lat, lon);
    }

    // Legacy coordinate string IDs
    const pair = looksLikeLatLonPair(id);
    if (pair) {
      return locationKeyFromCoords(pair.lat, pair.lon);
    }

    // Nominatim place_id is numeric (stringified); treat as stable OSM/Nominatim ID.
    if (/^\d+$/.test(id)) {
      return `osm:${id}`;
    }

    // Fallback for any other external id
    return `id:${id}`;
  }

  return locationKeyFromCoords(lat, lon);
}

import type { LocationResult } from "../../src/location-search";
import { LocationUtils } from "../../src/utils/location-utils";

function location(overrides: Partial<LocationResult>): LocationResult {
  return {
    id: "1",
    displayName: "Test",
    lat: 59.9,
    lon: 10.7,
    ...overrides,
  };
}

describe("LocationUtils.getLocationEmoji", () => {
  it("returns house emoji for house/building", () => {
    expect(LocationUtils.getLocationEmoji(location({ addresstype: "house" }))).toBe("🏠");
    expect(LocationUtils.getLocationEmoji(location({ addresstype: "building" }))).toBe("🏠");
  });

  it("returns neighborhood emoji for neighbourhood/suburb/town/village/hamlet", () => {
    expect(LocationUtils.getLocationEmoji(location({ addresstype: "neighbourhood" }))).toBe("🏘️");
    expect(LocationUtils.getLocationEmoji(location({ addresstype: "suburb" }))).toBe("🏘️");
    expect(LocationUtils.getLocationEmoji(location({ addresstype: "town" }))).toBe("🏘️");
    expect(LocationUtils.getLocationEmoji(location({ addresstype: "village" }))).toBe("🏘️");
    expect(LocationUtils.getLocationEmoji(location({ addresstype: "hamlet" }))).toBe("🏘️");
  });

  it("returns city emoji for city", () => {
    expect(LocationUtils.getLocationEmoji(location({ addresstype: "city" }))).toBe("🏙️");
  });

  it("returns municipality emoji for municipality", () => {
    expect(LocationUtils.getLocationEmoji(location({ addresstype: "municipality" }))).toBe("🏛️");
  });

  it("returns map emoji for county/state", () => {
    expect(LocationUtils.getLocationEmoji(location({ addresstype: "county" }))).toBe("🗺️");
    expect(LocationUtils.getLocationEmoji(location({ addresstype: "state" }))).toBe("🗺️");
  });

  it("returns globe emoji for country", () => {
    expect(LocationUtils.getLocationEmoji(location({ addresstype: "country" }))).toBe("🌍");
  });

  it("falls back to location type when addresstype is absent", () => {
    expect(LocationUtils.getLocationEmoji(location({ type: "town", addresstype: undefined }))).toBe("🏘️");
  });

  it("falls back to osm class/type defaults", () => {
    expect(LocationUtils.getLocationEmoji(location({ addresstype: undefined, class: "place" }))).toBe("📍");
    expect(
      LocationUtils.getLocationEmoji(location({ addresstype: undefined, class: "boundary", type: "administrative" })),
    ).toBe("🏛️");
    expect(LocationUtils.getLocationEmoji(location({ addresstype: undefined, class: "amenity", type: "cafe" }))).toBe(
      "📍",
    );
  });
});

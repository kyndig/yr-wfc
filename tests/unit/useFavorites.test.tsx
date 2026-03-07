/** @jest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";
import { useFavorites } from "../../src/hooks/useFavorites";
import type { FavoriteLocation } from "../../src/storage";
import { getFavorites } from "../../src/storage";
import { getWeather } from "../../src/weather-client";
import { getSunTimes } from "../../src/sunrise-client";
import { generateAndCacheGraph } from "../../src/graph-cache";

jest.mock("../../src/storage", () => ({
  addFavorite: jest.fn(async () => true),
  removeFavorite: jest.fn(async () => undefined),
  moveFavoriteUp: jest.fn(async () => undefined),
  moveFavoriteDown: jest.fn(async () => undefined),
  getFavorites: jest.fn(),
}));

jest.mock("../../src/weather-client", () => ({
  getWeather: jest.fn(),
}));

jest.mock("../../src/sunrise-client", () => ({
  getSunTimes: jest.fn(),
}));

jest.mock("../../src/graph-cache", () => ({
  generateAndCacheGraph: jest.fn(async () => "graph"),
}));

describe("useFavorites missing entry detection", () => {
  it("refetches entries that were only marked loading after cancellation", async () => {
    const alpha: FavoriteLocation = { id: "alpha", name: "Alpha", lat: 59.9, lon: 10.7 };
    const beta: FavoriteLocation = { id: "beta", name: "Beta", lat: 60.4, lon: 5.3 };

    const mockedGetFavorites = getFavorites as jest.MockedFunction<typeof getFavorites>;
    const mockedGetWeather = getWeather as jest.MockedFunction<typeof getWeather>;
    const mockedGetSunTimes = getSunTimes as jest.MockedFunction<typeof getSunTimes>;
    const mockedGenerateAndCacheGraph = generateAndCacheGraph as jest.MockedFunction<typeof generateAndCacheGraph>;

    mockedGetFavorites.mockResolvedValueOnce([alpha, beta]).mockResolvedValueOnce([beta, alpha]);

    const neverResolvingWeather = new Promise<never>(() => undefined);
    const weatherEntry = { time: "2026-03-07T00:00:00Z", data: { instant: { details: { air_temperature: 12 } } } } as never;

    mockedGetWeather
      .mockImplementationOnce(() => neverResolvingWeather)
      .mockImplementationOnce(() => neverResolvingWeather)
      .mockResolvedValueOnce(weatherEntry)
      .mockResolvedValueOnce(weatherEntry);

    mockedGetSunTimes.mockResolvedValue({});
    mockedGenerateAndCacheGraph.mockResolvedValue("graph");

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(mockedGetWeather).toHaveBeenCalledTimes(2);
      expect(result.current.isFavoriteLoading(alpha.id ?? "", alpha.lat, alpha.lon)).toBe(true);
      expect(result.current.isFavoriteLoading(beta.id ?? "", beta.lat, beta.lon)).toBe(true);
    });

    await act(async () => {
      await result.current.refreshFavorites();
    });

    await waitFor(() => {
      // Regression assertion:
      // when loading-only keys are incorrectly treated as "already fetched",
      // this remains at 2 and favorites stay stuck in loading=true.
      expect(mockedGetWeather).toHaveBeenCalledTimes(4);
    });

    await waitFor(() => {
      expect(result.current.isFavoriteLoading(alpha.id ?? "", alpha.lat, alpha.lon)).toBe(false);
      expect(result.current.isFavoriteLoading(beta.id ?? "", beta.lat, beta.lon)).toBe(false);
      expect(result.current.getFavoriteWeather(alpha.id ?? "", alpha.lat, alpha.lon)).toBeDefined();
      expect(result.current.getFavoriteWeather(beta.id ?? "", beta.lat, beta.lon)).toBeDefined();
    });
  });
});

import { useEffect, useMemo, useState, useCallback } from "react";
import { Action, ActionPanel, List, Icon } from "@raycast/api";
import ForecastView from "./forecast";
import { searchLocations, type LocationResult } from "./location-search";
import { getWeather, type TimeseriesEntry } from "./weather-client";
import { addFavorite, isFavorite, removeFavorite, type FavoriteLocation, getFavorites } from "./storage";
import { getSunTimes, type SunTimes } from "./sunrise-client";
import { parseQueryIntent } from "./query-intent";
import { generateDaySummary, formatSummary } from "./weather-summary";
import { getForecast } from "./weather-client";
import { iconForSymbol } from "./weather-emoji";
import { filterToDate, formatTemp } from "./weather-utils";
import { useDelayedError } from "./hooks/useDelayedError";
import { useNetworkTest } from "./hooks/useNetworkTest";
import { formatDate } from "./utils/date-utils";
import { ToastMessages } from "./utils/toast-utils";
import { WeatherFormatters } from "./utils/weather-formatters";
import { LocationUtils } from "./utils/location-utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);

  // Simple search state management to avoid infinite loops
  const [locations, setLocations] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Simple search function with debouncing
  const performSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setLocations([]);
      return;
    }

    // Require minimum 3 characters before searching
    if (trimmed.length < 3) {
      setLocations([]);
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchLocations(trimmed);
      setLocations(results);
    } catch (error) {
      console.error("Search failed:", error);
      setLocations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Ensure locations is always an array
  const safeLocations = locations || [];
  const [favoriteIds, setFavoriteIds] = useState<Record<string, boolean>>({});
  const [favoriteWeather, setFavoriteWeather] = useState<Record<string, TimeseriesEntry | undefined>>({});
  const [sunTimes, setSunTimes] = useState<Record<string, SunTimes>>({});
  const [quickWeather, setQuickWeather] = useState<TimeseriesEntry | undefined>(undefined);
  const [quickDayForecast, setQuickDayForecast] = useState<TimeseriesEntry[]>([]);
  const [favoriteErrors, setFavoriteErrors] = useState<Record<string, boolean>>({});
  const { showError: showQuickViewError, setErrorWithDelay: setQuickViewErrorWithDelay } = useDelayedError();
  const networkTest = useNetworkTest();

  useEffect(() => {
    (async () => {
      const favs = await getFavorites();
      setFavorites(favs);
      setFavoritesLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (favorites.length === 0) {
      setFavoriteWeather({});
      setFavoriteErrors({});
      return;
    }
    let cancelled = false;
    const errorTimeouts = new Map<string, NodeJS.Timeout>();

    async function fetchAll() {
      setFavoriteErrors({});

      try {
        const entries = await Promise.all(
          favorites.map(async (fav) => {
            try {
              const ts = await getWeather(fav.lat, fav.lon);
              const key = fav.id ?? (`${fav.lat},${fav.lon}` as string);
              const sun = await getSunTimes(fav.lat, fav.lon).catch(() => ({}) as SunTimes);
              return [key, ts, sun] as const;
            } catch (err) {
              // Clear weather data for this favorite when API fails
              const key = fav.id ?? (`${fav.lat},${fav.lon}` as string);
              console.warn(`Failed to fetch weather for ${fav.name}:`, err);

              // Delay showing error by 150ms to give API time to catch up
              if (!cancelled) {
                const timeout = setTimeout(() => {
                  if (!cancelled) {
                    setFavoriteErrors((prev) => ({ ...prev, [key]: true }));
                  }
                }, 150);
                errorTimeouts.set(key, timeout);
              }

              return [key, undefined, {} as SunTimes] as const;
            }
          }),
        );
        if (!cancelled) {
          const weatherMap: Record<string, TimeseriesEntry | undefined> = {};
          const sunMap: Record<string, SunTimes> = {};
          for (const [key, ts, sun] of entries) {
            weatherMap[key] = ts;
            sunMap[key] = sun;
          }
          setFavoriteWeather(weatherMap);
          setSunTimes(sunMap);
        }
      } catch (err) {
        console.error("Error fetching favorites:", err);
      }
    }
    fetchAll();
    return () => {
      cancelled = true;
      // Clear all error timeouts
      errorTimeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [favorites]);

  // Trigger search when search text changes with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const parsed = parseQueryIntent(searchText);
      const q = (parsed.locationQuery ?? searchText).trim();
      if (q && q.length >= 3) {
        performSearch(q);
      } else if (q && q.length > 0 && q.length < 3) {
        // Clear locations but don't show toast feedback
        setLocations([]);
        setIsLoading(false);
      } else {
        setLocations([]);
        setIsLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchText, performSearch]);

  // Update favorite flags when search results change
  useEffect(() => {
    if (safeLocations.length > 0) {
      (async () => {
        const map: Record<string, boolean> = {};
        for (const r of safeLocations) {
          const favLike = LocationUtils.createFavoriteFromSearchResult(r.id, r.displayName, r.lat, r.lon);
          map[r.id] = await isFavorite(favLike);
        }
        setFavoriteIds(map);
      })();
    } else {
      setFavoriteIds({});
    }
  }, [safeLocations]);

  const intent = useMemo(() => parseQueryIntent(searchText), [searchText]);

  const quickTarget = useMemo(() => {
    const date = intent.targetDate;
    const q = intent.locationQuery?.toLowerCase().trim();
    if (!date || !q) return undefined;
    // Prefer favorites that include query
    const fav = favorites.find((f) => f.name.toLowerCase().includes(q));
    if (fav) return { name: fav.name, lat: fav.lat, lon: fav.lon, date } as const;
    // Fall back to first matching search result
    const loc = safeLocations.find((l) => l.displayName.toLowerCase().includes(q));
    if (loc) return { name: loc.displayName, lat: loc.lat, lon: loc.lon, date } as const;
    return undefined;
  }, [favorites, locations, intent]);

  // Fetch current weather for Quick View to display icon and accessories like Favorites
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!quickTarget) {
        setQuickWeather(undefined);
        setQuickDayForecast([]);
        setQuickViewErrorWithDelay(null);
        return;
      }

      setQuickViewErrorWithDelay(null);

      try {
        const [ts, forecast] = await Promise.all([
          getWeather(quickTarget.lat, quickTarget.lon),
          getForecast(quickTarget.lat, quickTarget.lon),
        ]);
        if (!cancelled) {
          setQuickWeather(ts);
          setQuickDayForecast(forecast);
          setQuickViewErrorWithDelay(null);
        }
      } catch (err) {
        if (!cancelled) {
          // Clear weather data when API fails
          setQuickWeather(undefined);
          setQuickDayForecast([]);
          console.warn(`Failed to fetch weather for Quick View (${quickTarget.name}):`, err);

          // Use the delayed error hook
          setQuickViewErrorWithDelay("Failed to fetch weather data");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quickTarget?.lat, quickTarget?.lon]);

  // Generate day summary for Quick View
  const daySummary = useMemo(() => {
    if (!quickTarget || quickDayForecast.length === 0) return undefined;

    // Filter forecast to just the target day
    const daySeries = filterToDate(quickDayForecast, quickTarget.date);

    return generateDaySummary(daySeries);
  }, [quickTarget, quickDayForecast]);

  // Check if the requested date has forecast data
  const hasForecastData = useMemo(() => {
    if (!quickTarget || quickDayForecast.length === 0) return false;

    const daySeries = filterToDate(quickDayForecast, quickTarget.date);

    return daySeries.length > 0;
  }, [quickTarget, quickDayForecast]);

  // Check if there was an error fetching weather data
  const hasWeatherError = useMemo(() => {
    return quickTarget && showQuickViewError;
  }, [quickTarget, showQuickViewError]);

  // Debug: Log network test results and show user-friendly notifications
  useEffect(() => {
    if (networkTest.error) {
      console.error("Network test results:", networkTest);

      // Show user-friendly notifications for critical API failures
      if (!networkTest.metApi) {
        ToastMessages.weatherApiUnavailable();
      }

      if (!networkTest.nominatim) {
        ToastMessages.locationApiUnavailable();
      }

      // Only show general connectivity warning if both critical services fail
      if (!networkTest.metApi && !networkTest.nominatim) {
        ToastMessages.networkConnectivityIssues();
      }
    }
  }, [networkTest]);

  const showEmpty = favoritesLoaded && favorites.length === 0 && safeLocations.length === 0 && !isLoading;

  // Only show favorites when not actively searching or when search is empty
  const shouldShowFavorites = favorites.length > 0 && (!searchText.trim() || safeLocations.length === 0);

  // Determine if we should show loading state
  const shouldShowLoading = !favoritesLoaded || isLoading;

  // Use the utility function to create location actions
  const createLocationActions = LocationUtils.createLocationActions;

  return (
    <List
      isLoading={shouldShowLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for a location (min. 3 characters)..."
      throttle
    >
      {showEmpty ? (
        <List.EmptyView
          title={
            searchText && searchText.trim().length >= 3
              ? `Searching for "${searchText}"`
              : searchText
                ? `"${searchText}"`
                : "Search for a location"
          }
          description={
            searchText && searchText.trim().length < 3
              ? "Enter at least 3 characters to search"
              : "Enter a city name or coordinates to get weather information"
          }
        />
      ) : (
        <>
          {/* Show feedback when no results and insufficient characters */}
          {safeLocations.length === 0 && searchText && searchText.trim().length > 0 && searchText.trim().length < 3 && (
            <List.Item
              key="min-chars-feedback"
              title={`"${searchText}" - More characters needed`}
              subtitle={`Type ${3 - searchText.trim().length} more character${3 - searchText.trim().length === 1 ? "" : "s"} to search`}
              icon="💡"
              accessories={[
                { text: `${searchText.trim().length}/3`, tooltip: "Characters entered" },
                { text: `${3 - searchText.trim().length} more`, tooltip: "Characters needed" },
              ]}
            />
          )}

          {quickTarget && (
            <List.Section title="Quick View">
              <List.Item
                key={`qv:${quickTarget.name}:${quickTarget.date.toISOString().slice(0, 10)}`}
                title={`${quickTarget.name} — ${formatDate(quickTarget.date, "WEEKDAY_ONLY")}`}
                subtitle={`${formatDate(quickTarget.date, "MONTH_DAY")} • ${hasWeatherError ? "⚠️ Data fetch failed" : hasForecastData ? (daySummary ? formatSummary(daySummary) : "Loading...") : "⚠️ No forecast data available"}`}
                icon={hasWeatherError ? "⚠️" : hasForecastData ? iconForSymbol(quickWeather) : "🤷"}
                accessories={
                  hasWeatherError ? undefined : hasForecastData ? formatAccessories(quickWeather) : undefined
                }
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Open 1-Day View"
                      target={<ForecastView name={quickTarget.name} lat={quickTarget.lat} lon={quickTarget.lon} />}
                    />
                    <Action.Push
                      title="Open Full Forecast"
                      target={<ForecastView name={quickTarget.name} lat={quickTarget.lat} lon={quickTarget.lon} />}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}

          {/* Network Status Section - Show when there are connectivity issues */}
          {networkTest.error && (
            <List.Section title="⚠️ Network Status">
              <List.Item
                title="Service Connectivity Issues Detected"
                subtitle="Some features may not work properly"
                icon="⚠️"
                accessories={[
                  {
                    text: networkTest.metApi ? "✅" : "❌",
                    tooltip: networkTest.metApi ? "Weather API: Connected" : "Weather API: Failed",
                  },
                  {
                    text: networkTest.nominatim ? "✅" : "❌",
                    tooltip: networkTest.nominatim ? "Location API: Connected" : "Location API: Failed",
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Retry Network Tests"
                      icon={Icon.ArrowClockwise}
                      onAction={() => {
                        // Note: Network tests will re-run when the component re-mounts
                        // For now, just show a toast message
                        ToastMessages.networkTestsRetry();
                      }}
                    />
                    <Action
                      title="Show Error Details"
                      icon={Icon.Info}
                      onAction={async () => {
                        await ToastMessages.networkTestErrors(
                          networkTest.error || "Unknown network connectivity issues",
                        );
                      }}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}

          {/* Show search results first when actively searching */}
          {safeLocations.length > 0 && (
            <List.Section title={`Search Results (${safeLocations.length})`}>
              {safeLocations.map((loc) => (
                <List.Item
                  key={loc.id}
                  title={loc.displayName}
                  accessories={[{ text: `${loc.lat.toFixed(3)}, ${loc.lon.toFixed(3)}` }]}
                  actions={createLocationActions(loc.displayName, loc.lat, loc.lon, favoriteIds[loc.id], async () => {
                    if (favoriteIds[loc.id]) {
                      const fav = LocationUtils.createFavoriteFromSearchResult(
                        loc.id,
                        loc.displayName,
                        loc.lat,
                        loc.lon,
                      );
                      await removeFavorite(fav);
                      setFavoriteIds((m) => ({ ...m, [loc.id]: false }));
                      setFavorites(await getFavorites());
                      await ToastMessages.favoriteRemoved(loc.displayName);
                    } else {
                      const fav = LocationUtils.createFavoriteFromSearchResult(
                        loc.id,
                        loc.displayName,
                        loc.lat,
                        loc.lon,
                      );
                      await addFavorite(fav);
                      setFavoriteIds((m) => ({ ...m, [loc.id]: true }));
                      setFavorites(await getFavorites());
                      await ToastMessages.favoriteAdded(loc.displayName);
                    }
                  })}
                />
              ))}
            </List.Section>
          )}

          {/* Show "no results" message only when search has completed and returned no results */}
          {!isLoading && searchText.trim().length >= 3 && safeLocations.length === 0 && (
            <List.EmptyView
              title={`No results found for "${searchText}"`}
              description="Try a different location name or check your spelling"
            />
          )}

          {/* Show favorites only when not actively searching or when no search results */}
          {shouldShowFavorites && (
            <List.Section title="Favorites">
              {favorites.map((fav) => (
                <List.Item
                  key={fav.id ?? `${fav.lat},${fav.lon}`}
                  title={fav.name}
                  subtitle={
                    favoriteWeather[fav.id ?? `${fav.lat},${fav.lon}`]
                      ? formatTemp(favoriteWeather[fav.id ?? `${fav.lat},${fav.lon}`])
                      : favoriteErrors[fav.id ?? `${fav.lat},${fav.lon}`]
                        ? "⚠️ Data fetch failed"
                        : "Loading..."
                  }
                  icon={
                    favoriteWeather[fav.id ?? `${fav.lat},${fav.lon}`]
                      ? iconForSymbol(favoriteWeather[fav.id ?? `${fav.lat},${fav.lon}`])
                      : favoriteErrors[fav.id ?? `${fav.lat},${fav.lon}`]
                        ? "⚠️"
                        : "⏳"
                  }
                  accessories={
                    favoriteWeather[fav.id ?? `${fav.lat},${fav.lon}`]
                      ? formatAccessories(
                          favoriteWeather[fav.id ?? `${fav.lat},${fav.lon}`],
                          sunTimes[fav.id ?? `${fav.lat},${fav.lon}`],
                        )
                      : undefined
                  }
                  actions={createLocationActions(fav.name, fav.lat, fav.lon, true, async () => {
                    await removeFavorite(fav);
                    setFavorites(await getFavorites());
                    if (fav.id) setFavoriteIds((m) => ({ ...m, [fav.id as string]: false }));
                    await ToastMessages.favoriteRemoved(fav.name);
                  })}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

// Use the utility function instead of local implementation
const formatAccessories = WeatherFormatters.formatAccessories;

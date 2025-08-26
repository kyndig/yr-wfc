import { Action, ActionPanel, Detail, showToast, Toast, Icon } from "@raycast/api";
import { useMemo, useState, useEffect } from "react";
import { type TimeseriesEntry } from "./weather-client";
import { buildGraphMarkdown } from "./graph";
import { groupByDay, reduceToDayPeriods, buildWeatherTable } from "./weather-utils";
import { useWeatherData } from "./hooks/useWeatherData";
import { generateNoForecastDataMessage } from "./utils/error-messages";
import { addFavorite, removeFavorite, isFavorite as checkIsFavorite, type FavoriteLocation } from "./storage";

export default function ForecastView(props: { name: string; lat: number; lon: number }) {
  const { name, lat, lon } = props;
  const [mode, setMode] = useState<"detailed" | "summary">("detailed");
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const { series: items, loading, showNoData } = useWeatherData(lat, lon);

  // Check if current location is in favorites
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      const favLocation: FavoriteLocation = { name, lat, lon };
      const favorite = await checkIsFavorite(favLocation);
      setIsFavorite(favorite);
    };
    checkFavoriteStatus();
  }, [name, lat, lon]);

  const byDay = useMemo(() => groupByDay(items), [items]);
  const reduced = useMemo(() => reduceToDayPeriods(items, 9), [items]);
  const displaySeries = mode === "detailed" ? items.slice(0, 48) : reduced;

  // Cache both graph types for instant switching
  const [graphCache, setGraphCache] = useState<{
    detailed?: string;
    summary?: string;
  }>({});

  // Generate and cache graphs when data changes
  useEffect(() => {
    if (items.length > 0) {
      // Cache detailed graph (48h)
      const detailedGraph = buildGraphMarkdown(name, items.slice(0, 48), 48, {
        title: "48h forecast",
        smooth: true,
      }).markdown;

      // Cache summary graph (9-day)
      const summaryGraph = buildGraphMarkdown(name, reduced, reduced.length, {
        title: "9-day summary",
        smooth: true,
      }).markdown;

      setGraphCache({
        detailed: detailedGraph,
        summary: summaryGraph,
      });
    }
  }, [items, reduced, name]);

  // Get cached graph based on current mode
  const graph = useMemo(() => {
    if (displaySeries.length === 0 && showNoData) return "";
    return mode === "detailed" ? graphCache.detailed : graphCache.summary;
  }, [mode, graphCache, displaySeries.length, showNoData]);

  const listMarkdown = useMemo(() => {
    if (displaySeries.length === 0 && showNoData) {
      return generateNoForecastDataMessage({ locationName: name });
    }

    return mode === "detailed" ? buildListMarkdown(byDay) : buildSummaryListMarkdown(reduced);
  }, [mode, byDay, reduced, displaySeries.length, showNoData, name]);

  // Only show content when not loading and we have data or know there's no data
  const shouldShowContent = !loading && (displaySeries.length > 0 || showNoData);
  const markdown = [graph, "\n---\n", listMarkdown].join("\n");

  // Add a small delay to ensure graph is fully rendered before showing content
  // Now much faster since graphs are pre-cached
  const [graphReady, setGraphReady] = useState(false);

  useEffect(() => {
    if (shouldShowContent && displaySeries.length > 0 && graph) {
      // Much shorter delay since graphs are pre-cached
      const timer = setTimeout(() => {
        setGraphReady(true);
      }, 50); // Reduced from 100ms to 50ms

      return () => clearTimeout(timer);
    } else {
      setGraphReady(false);
    }
  }, [shouldShowContent, displaySeries.length, graph]);

  // Only show content when graph is ready
  const finalMarkdown = graphReady ? markdown : "";

  const handleFavoriteToggle = async () => {
    const favLocation: FavoriteLocation = { name, lat, lon };

    try {
      if (isFavorite) {
        await removeFavorite(favLocation);
        setIsFavorite(false);
        await showToast({
          style: Toast.Style.Success,
          title: "Removed from Favorites",
          message: `${name} has been removed from your favorites`,
        });
      } else {
        await addFavorite(favLocation);
        setIsFavorite(true);
        await showToast({
          style: Toast.Style.Success,
          title: "Added to Favorites",
          message: `${name} has been added to your favorites`,
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update favorites",
        message: String(error),
      });
    }
  };

  return (
    <Detail
      isLoading={loading}
      markdown={finalMarkdown}
      actions={
        <ActionPanel>
          {mode === "detailed" ? (
            <Action title="Show 9-Day Summary" onAction={() => setMode("summary")} />
          ) : (
            <Action title="Show 2-Day Detailed" onAction={() => setMode("detailed")} />
          )}
          {isFavorite ? (
            <Action
              title="Remove from Favorites"
              icon={Icon.StarDisabled}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              onAction={handleFavoriteToggle}
            />
          ) : (
            <Action
              title="Add to Favorites"
              icon={Icon.Star}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={handleFavoriteToggle}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function buildListMarkdown(byDay: Record<string, TimeseriesEntry[]>): string {
  const sections: string[] = [];
  for (const [day, entries] of Object.entries(byDay)) {
    sections.push(`### ${day}`);
    sections.push("");
    sections.push(buildWeatherTable(entries, { showDirection: true }));
  }
  return sections.join("\n");
}

function buildSummaryListMarkdown(series: TimeseriesEntry[]): string {
  // Group reduced series again by day for table rendering
  const byDay = groupByDay(series);
  const sections: string[] = [];
  for (const [day, entries] of Object.entries(byDay)) {
    // Sort by time
    entries.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    sections.push(`### ${day}`);
    sections.push("");
    sections.push(buildWeatherTable(entries, { showDirection: true, showPeriod: true }));
  }
  return sections.join("\n");
}

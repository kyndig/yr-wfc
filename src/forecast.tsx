import { Action, ActionPanel, Detail } from "@raycast/api";
import { useMemo, useState } from "react";
import { type TimeseriesEntry } from "./weather-client";
import { buildGraphMarkdown } from "./graph";
import { groupByDay, reduceToDayPeriods, buildWeatherTable } from "./weather-utils";
import { useWeatherData } from "./hooks/useWeatherData";
import { generateNoForecastDataMessage } from "./utils/error-messages";

export default function ForecastView(props: { name: string; lat: number; lon: number }) {
  const { name, lat, lon } = props;
  const [mode, setMode] = useState<"detailed" | "summary">("detailed");
  const { series: items, loading, showNoData } = useWeatherData(lat, lon);

  const byDay = useMemo(() => groupByDay(items), [items]);
  const reduced = useMemo(() => reduceToDayPeriods(items, 9), [items]);
  const displaySeries = mode === "detailed" ? items.slice(0, 48) : reduced;

  const graph = useMemo(() => {
    if (displaySeries.length === 0 && showNoData) return "";
    const title = mode === "detailed" ? "48h forecast" : "9-day summary";
    const smooth = true; // smooth both 48h detailed and 9-day summary
    return buildGraphMarkdown(name, displaySeries, displaySeries.length, { title, smooth }).markdown;
  }, [name, displaySeries, mode, showNoData]);

  const listMarkdown = useMemo(() => {
    if (displaySeries.length === 0 && showNoData) {
      return generateNoForecastDataMessage({ locationName: name });
    }

    return mode === "detailed" ? buildListMarkdown(byDay) : buildSummaryListMarkdown(reduced);
  }, [mode, byDay, reduced, displaySeries.length, showNoData, name]);

  const markdown = [graph, "\n---\n", listMarkdown].join("\n");

  return (
    <Detail
      isLoading={loading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {mode === "detailed" ? (
            <Action title="Show 9-Day Summary" onAction={() => setMode("summary")} />
          ) : (
            <Action title="Show 2-Day Detailed" onAction={() => setMode("detailed")} />
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

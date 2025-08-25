import { Detail } from "@raycast/api";
import { useMemo } from "react";
import { buildGraphMarkdown } from "./graph";
import { generateDaySummary, formatSummary } from "./weather-summary";
import { filterToDate, buildWeatherTable } from "./weather-utils";
import { useWeatherData } from "./hooks/useWeatherData";
import { generateNoForecastDataMessage } from "./utils/error-messages";
import { formatDate } from "./utils/date-utils";

export default function DayQuickView(props: { name: string; lat: number; lon: number; date: Date }) {
  const { name, lat, lon, date } = props;
  const { series, loading, showNoData } = useWeatherData(lat, lon);

  const daySeries = useMemo(() => {
    return filterToDate(series, date);
  }, [series, date]);

  const title = useMemo(() => {
    const label = formatDate(date, "LONG_DAY");
    return `${label} (1-day)`;
  }, [date]);

  const graph = useMemo(() => {
    if (daySeries.length === 0 && showNoData) return "";
    return buildGraphMarkdown(name, daySeries, daySeries.length, { title, smooth: true }).markdown;
  }, [name, daySeries, title, showNoData]);

  const summary = useMemo(() => {
    if (daySeries.length === 0 && showNoData) return undefined;
    return generateDaySummary(daySeries);
  }, [daySeries, showNoData]);

  const list = useMemo(() => {
    if (daySeries.length === 0 && showNoData) {
      return generateNoForecastDataMessage({ locationName: name, date });
    }

    return buildWeatherTable(daySeries, { showDirection: true });
  }, [daySeries, showNoData, name, date]);

  const summarySection = summary ? `## Summary\n\n${formatSummary(summary)}\n\n---\n` : "";
  const markdown = [summarySection, graph, "\n---\n", list].join("\n");

  return <Detail isLoading={loading} markdown={markdown} />;
}

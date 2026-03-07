import { lazy, Suspense } from "react";
import { Detail } from "@raycast/api";
import { ActionPanelBuilders } from "../utils/action-panel-builders";
import { LocationResult } from "../location-search";

// Lazy load the ForecastView component to defer D3 loading
const LazyForecastComponent = lazy(() => import("../forecast"));

interface LazyForecastProps {
  location?: LocationResult;
  name?: string; // For backward compatibility with favorites
  lat: number;
  lon: number;
  preCachedGraph?: string;
  onShowWelcome?: () => void;
  targetDate?: string;
  onFavoriteChange?: () => void;
  initialMode?: "detailed" | "summary";
}

/**
 * Lazy-loaded ForecastView that defers D3 library loading
 * until the forecast view is actually opened
 */
export function LazyForecastView(props: LazyForecastProps) {
  return (
    <Suspense
      fallback={
        <Detail
          markdown={`
# ${props.location?.displayName || props.name || "Unknown Location"}
## Loading forecast...

Please wait while we load the weather forecast and generate the interactive graph...

**Location:** ${props.lat.toFixed(3)}, ${props.lon.toFixed(3)}
${props.targetDate ? `**Date:** ${props.targetDate}` : ""}

*This may take a moment as we load the graph generation libraries...*
          `}
          actions={ActionPanelBuilders.createRefreshActions(() => {}, "Refresh Forecast")}
        />
      }
    >
      <LazyForecastComponent {...props} />
    </Suspense>
  );
}

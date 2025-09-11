import { memo, useMemo } from "react";
import { List, Icon } from "@raycast/api";
import { TimeseriesEntry } from "../weather-client";
import { SunTimes } from "../sunrise-client";
import { formatTemp } from "../weather-utils";
import { iconForSymbol } from "../weather-emoji";
import { LocationUtils } from "../utils/location-utils";
import { getUIThresholds } from "../config/weather-config";
import {
  generateWeatherAccessibilityText,
  generateLocationAccessibilityText,
  generateSearchResultAccessibilityText,
  generateActionAccessibilityText,
  generateSectionAccessibilityText,
  generateLoadingAccessibilityText,
  generateErrorAccessibilityText,
} from "../utils/accessibility-utils";

interface AccessibleFavoriteItemProps {
  favorite: {
    id: string;
    name: string;
    lat: number;
    lon: number;
  };
  weather?: TimeseriesEntry;
  sunTimes?: SunTimes;
  error: boolean;
  loading: boolean;
  preCachedGraph?: string;
  onOpenForecast: () => void;
  onShowCurrentWeather: () => void;
  onRemoveFavorite: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onShowWelcome: () => void;
}

/**
 * Accessibility-enhanced favorite item component
 */
export const AccessibleFavoriteItem = memo<AccessibleFavoriteItemProps>(({
  favorite,
  weather,
  sunTimes,
  error,
  loading,
  preCachedGraph,
  onOpenForecast,
  onShowCurrentWeather,
  onRemoveFavorite,
  onMoveUp,
  onMoveDown,
  onShowWelcome,
}) => {
  const key = LocationUtils.getLocationKey(favorite.id, favorite.lat, favorite.lon);

  // Generate accessibility text
  const accessibilityText = useMemo(() => {
    if (loading) {
      return generateLoadingAccessibilityText(`weather data for ${favorite.name}`);
    }
    
    if (error) {
      return generateErrorAccessibilityText("Failed to load weather data", favorite.name);
    }
    
    return generateLocationAccessibilityText(
      favorite.name,
      favorite.lat,
      favorite.lon,
      weather,
      true, // isFavorite
      undefined, // targetDate
      sunTimes
    );
  }, [favorite, weather, sunTimes, error, loading]);

  // Memoize subtitle calculation
  const subtitle = useMemo(() => {
    if (!favorite.id) return "Invalid favorite";
    
    if (weather) {
      const temp = formatTemp(weather);
      return temp || "⚠️ Temperature unavailable";
    }

    if (error) {
      return "⚠️ Data fetch failed";
    }

    if (loading) {
      return "Loading weather...";
    }

    // Show coordinates when no weather data yet (lazy loading)
    return `${favorite.lat.toFixed(2)}, ${favorite.lon.toFixed(2)}`;
  }, [favorite.id, weather, error, loading, favorite.lat, favorite.lon]);

  // Memoize icon calculation
  const icon = useMemo(() => {
    if (!favorite.id) return "❌";
    
    if (weather) {
      return iconForSymbol(weather);
    }
    if (error) {
      return "⚠️";
    }
    if (loading) {
      return "⏳";
    }
    // Show neutral location icon when no weather data yet (lazy loading)
    return "📍";
  }, [favorite.id, weather, error, loading]);

  // Memoize accessories calculation with accessibility
  const accessories = useMemo(() => {
    if (!favorite.id) return undefined;
    
    const accessories = [];
    
    if (weather) {
      accessories.push({
        text: "Weather data available",
        tooltip: accessibilityText,
      });
    } else if (loading) {
      accessories.push({
        text: "Loading...",
        icon: Icon.ArrowClockwise,
        tooltip: generateLoadingAccessibilityText(`weather data for ${favorite.name}`),
      });
    } else if (error) {
      accessories.push({
        text: "Error",
        tooltip: generateErrorAccessibilityText("Failed to load weather data", favorite.name),
      });
    }

    return accessories;
  }, [favorite.id, weather, loading, error, accessibilityText, favorite.name]);

  return (
    <List.Item
      key={key}
      title={favorite.name}
      subtitle={subtitle}
      icon={icon}
      accessories={accessories}
      actions={
        <List.Item.Actions>
          <List.Item.Action
            title="Open Forecast"
            icon={Icon.Clock}
            onAction={onOpenForecast}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
          />
          <List.Item.Action
            title="Show Current Weather"
            icon={Icon.Wind}
            onAction={onShowCurrentWeather}
            shortcut={{ modifiers: ["cmd"], key: "w" }}
          />
          <List.Item.Action
            title="Remove from Favorites"
            icon={Icon.StarDisabled}
            onAction={onRemoveFavorite}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          />
          <List.Item.Action
            title="Move up"
            icon={Icon.ArrowUp}
            onAction={onMoveUp}
            shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
          />
          <List.Item.Action
            title="Move Down"
            icon={Icon.ArrowDown}
            onAction={onMoveDown}
            shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
          />
          <List.Item.Action
            title="Show Welcome Message"
            icon={Icon.Info}
            onAction={onShowWelcome}
            shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
          />
        </List.Item.Actions>
      }
    />
  );
});

AccessibleFavoriteItem.displayName = "AccessibleFavoriteItem";

interface AccessibleSearchResultProps {
  location: {
    id: string;
    displayName: string;
    lat: number;
    lon: number;
  };
  isFavorite: boolean;
  targetDate?: Date;
  onToggleFavorite: () => void;
  onOpenForecast: () => void;
  onShowWelcome: () => void;
}

/**
 * Accessibility-enhanced search result item component
 */
export const AccessibleSearchResult = memo<AccessibleSearchResultProps>(({
  location,
  isFavorite,
  targetDate,
  onToggleFavorite,
  onOpenForecast,
  onShowWelcome,
}) => {
  // Generate accessibility text
  const accessibilityText = useMemo(() => {
    return generateSearchResultAccessibilityText(
      location.displayName,
      location.lat,
      location.lon,
      isFavorite,
      targetDate
    );
  }, [location, isFavorite, targetDate]);

  // Memoize subtitle calculation
  const subtitle = useMemo(() => {
    if (targetDate) {
      return `Tap to view weather for ${targetDate.toLocaleDateString()}`;
    }
    return undefined;
  }, [targetDate]);

  // Memoize icon calculation
  const icon = useMemo(() => {
    return targetDate ? "📅" : LocationUtils.getLocationEmoji(location);
  }, [targetDate, location]);

  // Memoize accessories calculation with accessibility
  const accessories = useMemo(() => {
    const coordinateText = targetDate
      ? targetDate.toLocaleDateString()
      : `${location.lat.toFixed(getUIThresholds().COORDINATE_PRECISION)}, ${location.lon.toFixed(getUIThresholds().COORDINATE_PRECISION)}`;
    
    return [
      {
        text: coordinateText,
        icon: targetDate ? Icon.Calendar : undefined,
        tooltip: accessibilityText,
      },
    ];
  }, [targetDate, location.lat, location.lon, accessibilityText]);

  return (
    <List.Item
      key={location.id}
      title={LocationUtils.formatLocationName(location)}
      subtitle={subtitle}
      icon={icon}
      accessories={accessories}
      actions={
        <List.Item.Actions>
          <List.Item.Action
            title="Open Forecast"
            onAction={onOpenForecast}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
          />
          <List.Item.Action
            title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            icon={isFavorite ? Icon.StarDisabled : Icon.Star}
            onAction={onToggleFavorite}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <List.Item.Action
            title="Show Welcome Message"
            icon={Icon.Info}
            onAction={onShowWelcome}
            shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
          />
        </List.Item.Actions>
      }
    />
  );
});

AccessibleSearchResult.displayName = "AccessibleSearchResult";

interface AccessibleSectionProps {
  title: string;
  itemCount: number;
  context?: string;
  children: React.ReactNode;
}

/**
 * Accessibility-enhanced section component
 */
export const AccessibleSection = memo<AccessibleSectionProps>(({
  title,
  itemCount,
  context,
  children,
}) => {
  const accessibilityText = useMemo(() => {
    return generateSectionAccessibilityText(title, itemCount, context);
  }, [title, itemCount, context]);

  return (
    <List.Section
      title={title}
      subtitle={accessibilityText}
    >
      {children}
    </List.Section>
  );
});

AccessibleSection.displayName = "AccessibleSection";

import { TimeseriesEntry } from "../weather-client";
import { SunTimes } from "../sunrise-client";
import { formatTemperatureCelsius, formatPrecip } from "../units";
import { formatDate, formatTime } from "./date-utils";
import { getUnits } from "../units";

/**
 * Accessibility utilities for screen reader compatibility
 */

/**
 * Generate screen reader friendly text for weather data
 */
export function generateWeatherAccessibilityText(
  weather: TimeseriesEntry,
  sunTimes?: SunTimes,
  locationName?: string,
): string {
  const units = getUnits();
  const temp = formatTemperatureCelsius(weather.data?.instant?.details?.air_temperature);
  const precip = formatPrecip(weather.data?.next_1_hours?.details?.precipitation_amount);
  const windSpeed = weather.data?.instant?.details?.wind_speed;
  const windDirection = weather.data?.instant?.details?.wind_from_direction;
  const symbol = weather.data?.next_1_hours?.summary?.symbol_code;

  const time = formatTime(new Date(weather.time), "FULL");
  const date = formatDate(new Date(weather.time), "FULL");

  let description = `${locationName ? `${locationName}, ` : ""}${date} at ${time}. `;

  if (temp) {
    description += `Temperature: ${temp}. `;
  }

  if (precip && precip !== "0 mm") {
    description += `Precipitation: ${precip}. `;
  }

  if (windSpeed !== undefined) {
    const windText =
      units === "imperial"
        ? `${(windSpeed * 2.237).toFixed(1)} miles per hour`
        : `${windSpeed.toFixed(1)} meters per second`;
    description += `Wind speed: ${windText}. `;
  }

  if (windDirection !== undefined) {
    const direction = getWindDirectionText(windDirection);
    description += `Wind direction: ${direction}. `;
  }

  if (symbol) {
    const weatherDescription = getWeatherSymbolDescription(symbol);
    description += `Weather conditions: ${weatherDescription}. `;
  }

  if (sunTimes?.sunrise) {
    const sunrise = formatTime(new Date(sunTimes.sunrise), "TIME_ONLY");
    description += `Sunrise at ${sunrise}. `;
  }

  if (sunTimes?.sunset) {
    const sunset = formatTime(new Date(sunTimes.sunset), "TIME_ONLY");
    description += `Sunset at ${sunset}. `;
  }

  return description.trim();
}

/**
 * Generate screen reader friendly text for location items
 */
export function generateLocationAccessibilityText(
  locationName: string,
  lat: number,
  lon: number,
  weather?: TimeseriesEntry,
  isFavorite: boolean = false,
  targetDate?: Date,
): string {
  let description = `Location: ${locationName}. `;
  description += `Coordinates: ${lat.toFixed(3)} degrees latitude, ${lon.toFixed(3)} degrees longitude. `;

  if (isFavorite) {
    description += "This location is saved in your favorites. ";
  }

  if (targetDate) {
    description += `Weather forecast for ${targetDate.toLocaleDateString()}. `;
  }

  if (weather) {
    const weatherText = generateWeatherAccessibilityText(weather, undefined, locationName);
    description += weatherText;
  } else {
    description += "Weather data is loading or unavailable. ";
  }

  return description.trim();
}

/**
 * Generate screen reader friendly text for search results
 */
export function generateSearchResultAccessibilityText(
  locationName: string,
  lat: number,
  lon: number,
  isFavorite: boolean,
  targetDate?: Date,
): string {
  let description = `Search result: ${locationName}. `;
  description += `Coordinates: ${lat.toFixed(3)} degrees latitude, ${lon.toFixed(3)} degrees longitude. `;

  if (isFavorite) {
    description += "This location is already in your favorites. ";
  } else {
    description += "This location is not in your favorites. ";
  }

  if (targetDate) {
    description += `Tap to view weather forecast for ${targetDate.toLocaleDateString()}. `;
  } else {
    description += "Tap to view weather forecast. ";
  }

  return description.trim();
}

/**
 * Generate screen reader friendly text for action buttons
 */
export function generateActionAccessibilityText(actionTitle: string, context?: string): string {
  let description = `Action: ${actionTitle}. `;

  if (context) {
    description += `Context: ${context}. `;
  }

  // Add keyboard shortcut information if available
  const shortcuts: Record<string, string> = {
    "Open Forecast": "Press Enter to open forecast",
    "Show Current Weather": "Press Cmd+W to show current weather",
    "Add to Favorites": "Press Cmd+F to add to favorites",
    "Remove from Favorites": "Press Cmd+Shift+F to remove from favorites",
    "Move up": "Press Cmd+Shift+Up to move up",
    "Move Down": "Press Cmd+Shift+Down to move down",
  };

  if (shortcuts[actionTitle]) {
    description += shortcuts[actionTitle];
  }

  return description.trim();
}

/**
 * Convert wind direction degrees to text
 */
function getWindDirectionText(degrees: number): string {
  const directions = [
    "North",
    "North-Northeast",
    "Northeast",
    "East-Northeast",
    "East",
    "East-Southeast",
    "Southeast",
    "South-Southeast",
    "South",
    "South-Southwest",
    "Southwest",
    "West-Southwest",
    "West",
    "West-Northwest",
    "Northwest",
    "North-Northwest",
  ];

  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

/**
 * Convert weather symbol codes to descriptive text
 */
function getWeatherSymbolDescription(symbol: string): string {
  const descriptions: Record<string, string> = {
    clearsky_day: "Clear sky",
    clearsky_night: "Clear sky",
    clearsky_polartwilight: "Clear sky",
    fair_day: "Fair weather",
    fair_night: "Fair weather",
    fair_polartwilight: "Fair weather",
    partlycloudy_day: "Partly cloudy",
    partlycloudy_night: "Partly cloudy",
    partlycloudy_polartwilight: "Partly cloudy",
    cloudy: "Cloudy",
    rainshowers_day: "Rain showers",
    rainshowers_night: "Rain showers",
    rainshowers_polartwilight: "Rain showers",
    rain: "Rain",
    heavyrain: "Heavy rain",
    snow: "Snow",
    heavysnow: "Heavy snow",
    snowshowers_day: "Snow showers",
    snowshowers_night: "Snow showers",
    snowshowers_polartwilight: "Snow showers",
    sleet: "Sleet",
    snowshowers: "Snow showers",
    fog: "Fog",
    rainandthunder: "Rain and thunder",
    snowandthunder: "Snow and thunder",
    sleetandthunder: "Sleet and thunder",
    snowshowersandthunder: "Snow showers and thunder",
    rainshowersandthunder: "Rain showers and thunder",
  };

  return descriptions[symbol] || "Unknown weather conditions";
}

/**
 * Generate screen reader friendly section titles
 */
export function generateSectionAccessibilityText(sectionTitle: string, itemCount: number, context?: string): string {
  let description = `Section: ${sectionTitle}. `;
  description += `${itemCount} ${itemCount === 1 ? "item" : "items"}. `;

  if (context) {
    description += context;
  }

  return description.trim();
}

/**
 * Generate screen reader friendly loading states
 */
export function generateLoadingAccessibilityText(context: string, progress?: number): string {
  let description = `Loading: ${context}. `;

  if (progress !== undefined) {
    description += `Progress: ${Math.round(progress)}%. `;
  }

  description += "Please wait while data is being loaded.";

  return description.trim();
}

/**
 * Generate screen reader friendly error messages
 */
export function generateErrorAccessibilityText(
  errorType: string,
  context?: string,
  retryCount?: number,
  maxRetries?: number,
): string {
  let description = `Error: ${errorType}. `;

  if (context) {
    description += `Context: ${context}. `;
  }

  if (retryCount !== undefined && maxRetries !== undefined) {
    description += `Retry attempt ${retryCount} of ${maxRetries}. `;
  }

  description += "Please try again or contact support if the problem persists.";

  return description.trim();
}

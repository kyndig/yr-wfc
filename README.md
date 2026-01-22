# Yr Weather Forecast

Norwegian weather data from MET, wrapped in a Raycast extension. Search locations, save favourites, get 9-day forecasts with graphs. No API keys, no faff.

**Maintainer:** [Kynd](https://www.kynd.no)  
**Contact:** weather@kynd.no  
**Issues & Feedback:** [GitHub Issues](https://github.com/kyndig/yr-wfc/issues)

## Quick Start

1. Search for a location (minimum 3 characters)
2. Press Enter to open the forecast view
3. Press `D` to toggle between graph and data table views
4. Press `Cmd+R` to refresh and clear cache

## Search

Search uses OpenStreetMap Nominatim to find locations worldwide. Type city names, addresses, or landmarks.

### Date Queries

The search parser recognises date-related tokens alongside location names:

- **Weekdays**: "Oslo fredag" or "oslo friday" for the upcoming Friday
- **Next week**: "London next monday" for next Monday
- **Day of month**: "Bergen 25" for the 25th (within the 9-day forecast window)
- **Relative dates**: "Paris tomorrow" or "Paris i morgen" (Norwegian)

Supported languages: English and Norwegian (Bokmål). Diacritics are normalised, so "søndag" and "sondag" both work.

## Favourites

Save frequently used locations for quick access. Favourites appear at the top of the main view with current weather.

- **Add**: `Cmd+F` (from search results or forecast view)
- **Remove**: `Cmd+Shift+F` (from search results or forecast view)
- **Reorder**: `Cmd+Shift+↑` to move up, `Cmd+Shift+↓` to move down

Favourites are stored locally and persist between sessions.

## Views & Navigation

### Forecast View

Two forecast modes:

- **48-hour detailed**: Hourly data with graphs showing temperature, precipitation, wind direction, and weather symbols
- **9-day summary**: Daily overview with representative time periods

Switch between modes with `Cmd+4` (detailed) or `Cmd+9` (summary). In date query views, these shortcuts navigate to the full forecast.

### View Toggles

- **Graph ↔ Data**: Press `D` to switch from graph to data table, `G` to switch back
- **Data table**: Markdown table with complete weather data for the current location

### One-Day View

When searching with a date query (e.g., "Oslo fredag"), the forecast shows a focused 1-day view. Use `Cmd+4` or `Cmd+9` to navigate to the full 48-hour or 9-day forecast.

## Keyboard Shortcuts

### Global Actions

- `Cmd+R`: Refresh & Clear Cache (clears all caches and reloads data)
- `Cmd+Shift+W`: Show welcome message
- `Cmd+Shift+Alt+W`: Hide welcome message

### Search & Favourites

- `Cmd+F`: Add location to favourites
- `Cmd+Shift+F`: Remove location from favourites
- `Cmd+Shift+↑`: Move favourite up in list
- `Cmd+Shift+↓`: Move favourite down in list
- `Enter`: Open forecast (from search results or favourites)

### View Navigation

- `D`: Switch to data table view (from graph view)
- `G`: Switch to graph view (from data table view)
- `Cmd+4`: Show 48-hour detailed forecast
- `Cmd+9`: Show 9-day summary forecast

## Preferences

Access via `Yr` command → `Cmd+K` → Configure Command:

- **Units**: Metric (°C, m/s, mm) or Imperial (°F, mph, in)
- **Clock Format**: 12-hour (2:30 PM) or 24-hour (14:30) — defaults to 24-hour
- **Show Wind Direction**: Display wind arrows and cardinal directions in main view
- **Show Sunrise/Sunset**: Include sun times in location displays
- **Debug Mode**: Enable console output for troubleshooting API calls and network tests

## Data Sources & Caching

### APIs

- **Weather & Forecast**: [MET Locationforecast 2.0](https://developer.yr.no/doc/locationforecast/2.0/)
- **Sunrise/Sunset**: [MET Sunrise 3.0](https://developer.yr.no/doc/sunrise/3.0/)
- **Geocoding**: [OpenStreetMap Nominatim](https://nominatim.org/)

All APIs are publicly available and don't require authentication or API keys.

### Cache Durations

- **Forecast data**: 30 minutes per location
- **Sunrise/Sunset**: 6 hours per location/day
- **Location search**: 1 hour per query
- **Graphs**: 2 hours per location/mode

Caches are stored locally and cleared automatically on expiration or when using `Cmd+R` (Refresh & Clear Cache).

## Privacy

- **Local storage only**: Favourites and cache data are stored on your device
- **No personal data collection**: The extension doesn't collect, store, or transmit personal information
- **No tracking**: No analytics or user behaviour monitoring
- **Location search**: Search queries are sent to OpenStreetMap Nominatim for geocoding; no personal identifiers are included
- **Open source**: Full source code available for review

## Troubleshooting

### Network Status

If connectivity issues are detected, a "Network Status" section appears in the main view showing which APIs are reachable (MET weather API and Nominatim geocoding).

### Refresh & Clear Cache

Press `Cmd+R` from the main view or forecast view to clear all caches and force a fresh data fetch. This is useful if data seems stale or if you're experiencing errors.

### Debug Mode

Enable Debug Mode in preferences to see detailed console output in Raycast's terminal. Useful for diagnosing API failures, network test results, and data fetching errors.

## Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/kyndig/yr-wfc/issues)
- **Email**: weather@kynd.no

## Raycast Extensions Monorepo Sync

When updating the extension in the Raycast Extensions monorepo, treat this repository (`kyndig/yr-wfc`) as the source of truth:

1. **Copy source files**: Copy `src/`, `assets/`, `metadata/` directories to the monorepo extension directory
2. **Update documentation**: Copy updated `README.md` and `CHANGELOG.md` to the monorepo
3. **Verify manifest**: Ensure the monorepo's `package.json` repository/bugs URLs match the canonical repo (`https://github.com/kyndig/yr-wfc`)
4. **Preserve placeholders**: Keep `{PR_MERGE_DATE}` placeholder in CHANGELOG (Raycast CI fills this on merge)
5. **Verify metadata**: Ensure extension listing fields (title/subtitle/description/repo link) in the monorepo match this repo

## License

MIT License — see `package.json` for details.

---

**Made with 🫶 by [Kynd](https://www.kynd.no)**

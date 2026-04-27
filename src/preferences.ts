import { getPreferenceValues } from "@raycast/api";

export function getAppPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

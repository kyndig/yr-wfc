import { useState, useEffect } from "react";
import { List, Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { LocalStorage } from "@raycast/api";

interface AccessibilitySettings {
  enableScreenReaderMode: boolean;
  verboseDescriptions: boolean;
  announceLoadingStates: boolean;
  announceErrors: boolean;
  announceWeatherChanges: boolean;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  enableScreenReaderMode: false,
  verboseDescriptions: true,
  announceLoadingStates: true,
  announceErrors: true,
  announceWeatherChanges: false,
};

const STORAGE_KEY = "accessibility-settings";

export function useAccessibilitySettings() {
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AccessibilitySettings;
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.warn("Failed to load accessibility settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: AccessibilitySettings) => {
    try {
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
      return true;
    } catch (error) {
      console.error("Failed to save accessibility settings:", error);
      return false;
    }
  };

  const updateSetting = async <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    const success = await saveSettings(newSettings);

    if (success) {
      showToast({
        style: Toast.Style.Success,
        title: "Accessibility Setting Updated",
        message: `${key} has been ${value ? "enabled" : "disabled"}`,
      });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Save Setting",
        message: "Please try again",
      });
    }

    return success;
  };

  const resetSettings = async () => {
    const success = await saveSettings(DEFAULT_SETTINGS);

    if (success) {
      showToast({
        style: Toast.Style.Success,
        title: "Settings Reset",
        message: "Accessibility settings have been reset to defaults",
      });
    }

    return success;
  };

  return {
    settings,
    isLoading,
    updateSetting,
    resetSettings,
  };
}

export function AccessibilitySettingsPanel() {
  const { settings, isLoading, updateSetting, resetSettings } = useAccessibilitySettings();

  if (isLoading) {
    return (
      <List.Section title="Accessibility Settings">
        <List.Item title="Loading settings..." icon={Icon.Gear} />
      </List.Section>
    );
  }

  return (
    <List.Section title="♿ Accessibility Settings">
      <List.Item
        title="Screen Reader Mode"
        subtitle={settings.enableScreenReaderMode ? "Enabled" : "Disabled"}
        icon={settings.enableScreenReaderMode ? "♿" : "👁️"}
        accessories={[
          {
            text: settings.enableScreenReaderMode ? "ON" : "OFF",
            tooltip: "Enable enhanced screen reader support with detailed descriptions",
          },
        ]}
        actions={
          <ActionPanel>
            <Action
              title={settings.enableScreenReaderMode ? "Disable Screen Reader Mode" : "Enable Screen Reader Mode"}
              icon={settings.enableScreenReaderMode ? Icon.Eye : Icon.EyeSlash}
              onAction={() => updateSetting("enableScreenReaderMode", !settings.enableScreenReaderMode)}
            />
            <Action title="Reset All Settings" icon={Icon.Trash} onAction={resetSettings} />
          </ActionPanel>
        }
      />

      <List.Item
        title="Verbose Descriptions"
        subtitle={settings.verboseDescriptions ? "Detailed weather descriptions" : "Brief descriptions"}
        icon={settings.verboseDescriptions ? "📝" : "📄"}
        accessories={[
          {
            text: settings.verboseDescriptions ? "ON" : "OFF",
            tooltip: "Include detailed weather information in descriptions",
          },
        ]}
        actions={
          <ActionPanel>
            <Action
              title={settings.verboseDescriptions ? "Use Brief Descriptions" : "Use Detailed Descriptions"}
              icon={settings.verboseDescriptions ? Icon.Minus : Icon.Plus}
              onAction={() => updateSetting("verboseDescriptions", !settings.verboseDescriptions)}
            />
          </ActionPanel>
        }
      />

      <List.Item
        title="Announce Loading States"
        subtitle={settings.announceLoadingStates ? "Loading states are announced" : "Loading states are silent"}
        icon={settings.announceLoadingStates ? "🔊" : "🔇"}
        accessories={[
          {
            text: settings.announceLoadingStates ? "ON" : "OFF",
            tooltip: "Announce when data is being loaded",
          },
        ]}
        actions={
          <ActionPanel>
            <Action
              title={settings.announceLoadingStates ? "Silence Loading Announcements" : "Enable Loading Announcements"}
              icon={settings.announceLoadingStates ? Icon.SpeakerSlash : Icon.Speaker}
              onAction={() => updateSetting("announceLoadingStates", !settings.announceLoadingStates)}
            />
          </ActionPanel>
        }
      />

      <List.Item
        title="Announce Errors"
        subtitle={settings.announceErrors ? "Errors are announced" : "Errors are silent"}
        icon={settings.announceErrors ? "⚠️" : "🔇"}
        accessories={[
          {
            text: settings.announceErrors ? "ON" : "OFF",
            tooltip: "Announce when errors occur",
          },
        ]}
        actions={
          <ActionPanel>
            <Action
              title={settings.announceErrors ? "Silence Error Announcements" : "Enable Error Announcements"}
              icon={settings.announceErrors ? Icon.SpeakerSlash : Icon.Speaker}
              onAction={() => updateSetting("announceErrors", !settings.announceErrors)}
            />
          </ActionPanel>
        }
      />

      <List.Item
        title="Announce Weather Changes"
        subtitle={settings.announceWeatherChanges ? "Weather updates are announced" : "Weather updates are silent"}
        icon={settings.announceWeatherChanges ? "🌤️" : "🔇"}
        accessories={[
          {
            text: settings.announceWeatherChanges ? "ON" : "OFF",
            tooltip: "Announce when weather data is updated",
          },
        ]}
        actions={
          <ActionPanel>
            <Action
              title={settings.announceWeatherChanges ? "Silence Weather Announcements" : "Enable Weather Announcements"}
              icon={settings.announceWeatherChanges ? Icon.SpeakerSlash : Icon.Speaker}
              onAction={() => updateSetting("announceWeatherChanges", !settings.announceWeatherChanges)}
            />
          </ActionPanel>
        }
      />

      <List.Item
        title="Keyboard Shortcuts"
        subtitle="View available keyboard shortcuts"
        icon="⌨️"
        accessories={[
          {
            text: "Help",
            tooltip: "Show keyboard shortcuts and accessibility features",
          },
        ]}
        actions={
          <ActionPanel>
            <Action
              title="Show Keyboard Shortcuts"
              icon={Icon.QuestionMark}
              onAction={() => {
                showToast({
                  style: Toast.Style.Success,
                  title: "Keyboard Shortcuts",
                  message: "Enter: Open forecast, Cmd+W: Current weather, Cmd+F: Toggle favorite",
                });
              }}
            />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}

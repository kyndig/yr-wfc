import { Detail, List } from "@raycast/api";
import type { FallbackProps } from "react-error-boundary";
import { ActionPanelBuilders } from "../utils/action-panel-builders";

function describeError(error: Error): string {
  const message = error.message?.trim();
  if (!message) {
    return "An unexpected error occurred. Try again.";
  }
  return message;
}

export function ListErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <List>
      <List.EmptyView
        title="Something went wrong"
        description={describeError(error)}
        actions={ActionPanelBuilders.createRefreshActions(resetErrorBoundary, "Retry")}
      />
    </List>
  );
}

export function DetailErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <Detail
      markdown={`
# Forecast unavailable

${describeError(error)}

Try refreshing to retry loading the forecast.
      `}
      actions={ActionPanelBuilders.createRefreshActions(resetErrorBoundary, "Retry Forecast")}
    />
  );
}

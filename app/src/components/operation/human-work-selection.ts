export type HumanWorkTab = "pending" | "decisions" | "issuance";

export function resolveHumanWorkProcessId(
  tab: HumanWorkTab,
  pinnedPendingProcessId: string | null,
  focusedProcessId: string,
) {
  return tab === "pending" && pinnedPendingProcessId
    ? pinnedPendingProcessId
    : focusedProcessId;
}

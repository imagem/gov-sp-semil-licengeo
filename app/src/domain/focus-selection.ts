export function resolvePortfolioSelection(
  pinnedId: string | null,
  selectedId: string | null,
  activeIds: readonly string[],
  firstArrivalId: string | null,
  availableIds: readonly string[],
): string | null {
  if (pinnedId && availableIds.includes(pinnedId)) return pinnedId;
  if (selectedId && activeIds.includes(selectedId)) return selectedId;
  return firstArrivalId ?? activeIds[0] ?? (selectedId && availableIds.includes(selectedId) ? selectedId : null);
}

type PendingProcess = {
  readonly scenario: {
    readonly id: string;
    readonly center: readonly [number, number];
    readonly municipality: string;
  };
};

export function pendingMarkerSpecs(processes: readonly PendingProcess[]) {
  return processes.map(({ scenario }) => ({
    id: scenario.id,
    center: scenario.center,
    label: `Pendência ${scenario.id} em ${scenario.municipality}`,
  }));
}

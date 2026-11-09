export interface GasPricePoint {
  time: Date;
  /** EUR per m³ excluding VAT, as published by EnergyZero (energy tax probably included). */
  eurPerM3: number;
}

/** EnergyZero gas prices (usage type 3) per hour, excluding VAT. */
export function energyZeroGasUrl(from: Date, till: Date): string {
  const params = new URLSearchParams({
    fromDate: from.toISOString(),
    tillDate: new Date(till.getTime() - 1).toISOString(),
    interval: '4',
    usageType: '3',
    inclBtw: 'false',
  });
  return `https://api.energyzero.nl/v1/energyprices?${params.toString()}`;
}

export function parseEnergyZero(json: unknown): GasPricePoint[] {
  const prices = (json as { Prices?: Array<{ readingDate?: unknown; price?: unknown }> }).Prices;
  if (!Array.isArray(prices)) return [];
  return prices.flatMap((p) =>
    typeof p.readingDate === 'string' && typeof p.price === 'number'
      ? [{ time: new Date(p.readingDate), eurPerM3: p.price }]
      : [],
  );
}

export function formatCurrencyFromPaise(paise: number): string {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function formatDistanceKm(distanceKm: number): string {
  return `${distanceKm.toFixed(1)} km`;
}

export function formatRating(ratingAvg: number, ratingCount: number): string {
  const countLabel = ratingCount >= 1000 ? `${(ratingCount / 1000).toFixed(1)}k` : String(ratingCount);
  return `${ratingAvg.toFixed(1)} (${countLabel})`;
}

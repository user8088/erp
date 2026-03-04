/**
 * Format amount as full PKR value with comma separators (e.g. PKR 15,000 or PKR 1,50,000).
 * Use this for dashboard cards and anywhere we want readable values instead of 1.5K / 2 L.
 */
export function formatCurrencyPkr(amount: number): string {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  const formatted = absAmount.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${sign}PKR ${formatted}`;
}

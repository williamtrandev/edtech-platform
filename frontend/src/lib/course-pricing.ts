// Currencies with no minor unit: the stored integer is the whole amount, not cents.
const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF"
]);

export function formatMoney(amountCents: number, currency: string, locale?: string) {
  const code = currency.toUpperCase();
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(code);
  const amount = isZeroDecimal ? amountCents : amountCents / 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code
    }).format(amount);
  } catch {
    return `${code} ${isZeroDecimal ? amount : amount.toFixed(2)}`;
  }
}

export function isPaidCourse(priceCents?: number | null) {
  return Boolean(priceCents && priceCents > 0);
}

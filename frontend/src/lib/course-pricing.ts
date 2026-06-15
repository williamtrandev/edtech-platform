export function formatMoney(amountCents: number, currency: string, locale?: string) {
  const amount = amountCents / 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.toUpperCase()
    }).format(amount);
  } catch {
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
  }
}

export function isPaidCourse(priceCents?: number | null) {
  return Boolean(priceCents && priceCents > 0);
}

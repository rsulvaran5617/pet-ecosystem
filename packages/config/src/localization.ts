export const productLanguage = "es" as const;
export const productLocale = "es-PA";

export function formatCurrencyAmount(priceCents: number, currencyCode: string) {
  return new Intl.NumberFormat(productLocale, {
    style: "currency",
    currency: currencyCode
  }).format(priceCents / 100);
}

export function formatDateTimeLabel(value: string) {
  return new Intl.DateTimeFormat(productLocale, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat(productLocale, {
    dateStyle: "medium"
  }).format(new Date(value));
}

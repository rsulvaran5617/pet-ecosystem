export const productLanguage = "es" as const;
export const productLocale = "es-PA";
export const productTimeZone = "America/Panama";

export function formatCurrencyAmount(priceCents: number, currencyCode: string) {
  return new Intl.NumberFormat(productLocale, {
    style: "currency",
    currency: currencyCode
  }).format(priceCents / 100);
}

export function formatDateTimeLabel(value: string) {
  return new Intl.DateTimeFormat(productLocale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: productTimeZone
  }).format(new Date(value));
}

export function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat(productLocale, {
    dateStyle: "medium",
    timeZone: productTimeZone
  }).format(new Date(value));
}

export function formatShortDateLabel(value: string) {
  return new Intl.DateTimeFormat(productLocale, {
    day: "numeric",
    month: "short",
    timeZone: productTimeZone
  }).format(new Date(value));
}

export function formatShortTimeLabel(value: string) {
  return new Intl.DateTimeFormat(productLocale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: productTimeZone
  }).format(new Date(value));
}

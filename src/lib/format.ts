import i18n from "./i18n";

function locale() {
  const l = (i18n.language || "en").slice(0, 2);
  if (l === "es") return "es-US";
  if (l === "pt") return "pt-BR";
  return "en-US";
}

/** App uses USD as the canonical currency (US-targeted). */
export function formatCurrency(cents: number, opts?: { noCents?: boolean }) {
  return new Intl.NumberFormat(locale(), {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: opts?.noCents ? 0 : 2,
    minimumFractionDigits: opts?.noCents ? 0 : 2,
  }).format(cents / 100);
}

/** MM/DD/YYYY (en/es) or DD/MM/YYYY (pt) — locale-driven. */
export function formatDate(input: string | number | Date) {
  const d = input instanceof Date ? input : new Date(input);
  return new Intl.DateTimeFormat(locale(), { dateStyle: "short" }).format(d);
}

export function formatDateTime(input: string | number | Date) {
  const d = input instanceof Date ? input : new Date(input);
  return new Intl.DateTimeFormat(locale(), { dateStyle: "short", timeStyle: "short" }).format(d);
}

export function formatTime(input: string | number | Date) {
  const d = input instanceof Date ? input : new Date(input);
  return new Intl.DateTimeFormat(locale(), { hour: "numeric", minute: "2-digit" }).format(d);
}

export function formatMonthShort(input: Date) {
  return new Intl.DateTimeFormat(locale(), { month: "short" }).format(input);
}

export function formatWeekdayShort(input: Date) {
  return new Intl.DateTimeFormat(locale(), { weekday: "short" }).format(input);
}

export function formatLongDate(input: Date) {
  return new Intl.DateTimeFormat(locale(), { weekday: "long", day: "2-digit", month: "long" }).format(input);
}

/** Format a US phone as (XXX) XXX-XXXX. Returns input as-is if not 10/11 digits. */
export function formatUsPhone(input: string | null | undefined): string {
  if (!input) return "";
  const d = input.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) {
    return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return input;
}

/** Format a US ZIP (5 or 9 digits → 5 or 5+4). */
export function formatZip(input: string | null | undefined): string {
  if (!input) return "";
  const d = input.replace(/\D/g, "");
  if (d.length === 9) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return d.length === 5 ? d : input;
}
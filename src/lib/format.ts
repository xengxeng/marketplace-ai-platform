const PESO_LOCALE = "en-PH";

export function formatPeso(cents: number, options: Intl.NumberFormatOptions = { minimumFractionDigits: 2 }) {
  return `₱${(cents / 100).toLocaleString(PESO_LOCALE, options)}`;
}

export function formatWholePeso(cents: number) {
  return formatPeso(cents, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(PESO_LOCALE);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(PESO_LOCALE);
}

export function shortId(id: string) {
  return id.slice(0, 8);
}

export function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

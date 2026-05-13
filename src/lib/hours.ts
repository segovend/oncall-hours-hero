// On-call hours calculator
// Rules: weekday (Mon-Fri) = 16h, weekend (Sat/Sun) = 24h. Inclusive of both endpoints.

export type DayType = "weekday" | "weekend";

export interface DayEntry {
  date: Date;
  iso: string; // YYYY-MM-DD
  label: string; // dd.mm.yy
  weekday: string; // Mon, Tue...
  type: DayType;
  defaultHours: number;
  hours: number; // possibly overridden
  overridden: boolean;
}

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function parseDDMMYY(input: string): Date | null {
  const m = input.trim().match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2}|\d{4})$/);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  let y = parseInt(m[3], 10);
  if (m[3].length === 2) y = y < 70 ? 2000 + y : 1900 + y;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

export function formatDDMMYY(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getFullYear()).slice(-2)}`;
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dayTypeFor(d: Date): DayType {
  const dow = d.getDay();
  return dow === 0 || dow === 6 ? "weekend" : "weekday";
}

export function defaultHoursFor(type: DayType): number {
  return type === "weekend" ? 24 : 16;
}

/** Build the per-day list for a date range, applying any overrides keyed by ISO date. */
export function buildRange(
  start: Date,
  end: Date,
  overrides: Record<string, number>,
): DayEntry[] {
  const out: DayEntry[] = [];
  if (end < start) return out;
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cur <= last) {
    const type = dayTypeFor(cur);
    const def = defaultHoursFor(type);
    const iso = isoDate(cur);
    const o = overrides[iso];
    const overridden = typeof o === "number" && !Number.isNaN(o) && o !== def;
    out.push({
      date: new Date(cur),
      iso,
      label: formatDDMMYY(cur),
      weekday: WEEKDAY_NAMES[cur.getDay()],
      type,
      defaultHours: def,
      hours: overridden ? (o as number) : def,
      overridden,
    });
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function sumHours(entries: DayEntry[]): number {
  return entries.reduce((a, b) => a + b.hours, 0);
}

export function sumDefaults(entries: DayEntry[]): number {
  return entries.reduce((a, b) => a + b.defaultHours, 0);
}

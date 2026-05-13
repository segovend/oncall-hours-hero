// On-call hours & payment calculator (spec v2)
// Rules:
//  - Inclusive date range
//  - Mon–Fri: 16h, Sat/Sun: 24h
//  - hourRate = salary / 168
//  - tenPercent = hourRate * 0.10
//  - payment = effectiveHours * tenPercent
//  - All money rounded to 2dp

export interface OnCallEntry {
  id: string;
  person: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string;
  costCenter: string;
  monthlyGrossSalary: number;
  manualHoursOverride?: number;
  isFlagged?: boolean;
}

export interface OnCallResult extends OnCallEntry {
  calculatedHours: number;
  effectiveHours: number;
  hourRate: number;
  tenPercent: number;
  payment: number;
  hasHoursMismatch: boolean;
  isFlagged: boolean;
  errors: string[];
}

export const STANDARD_MONTHLY_HOURS = 168;

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function calculateHours(fromDate: string, toDate: string): number {
  if (!fromDate || !toDate) return 0;
  const s = new Date(fromDate + "T00:00:00");
  const e = new Date(toDate + "T00:00:00");
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
  let h = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const dow = cur.getDay();
    h += dow === 0 || dow === 6 ? 24 : 16;
    cur.setDate(cur.getDate() + 1);
  }
  return h;
}

export function compute(entry: OnCallEntry): OnCallResult {
  const errors: string[] = [];
  const s = entry.fromDate ? new Date(entry.fromDate + "T00:00:00") : null;
  const e = entry.toDate ? new Date(entry.toDate + "T00:00:00") : null;
  if (!s || !e || isNaN(s.getTime()) || isNaN(e.getTime())) {
    errors.push("Valid dates required");
  } else if (e < s) {
    errors.push("End date must be after start date");
  }
  if (!(entry.monthlyGrossSalary > 0)) errors.push("Salary must be a positive number");
  if (!entry.costCenter.trim()) errors.push("Cost center is required");
  if (entry.manualHoursOverride !== undefined && !(entry.manualHoursOverride > 0)) {
    errors.push("Hours must be a positive number");
  }

  const calculatedHours = calculateHours(entry.fromDate, entry.toDate);
  const effectiveHours =
    entry.manualHoursOverride !== undefined ? entry.manualHoursOverride : calculatedHours;
  const hourRate = entry.monthlyGrossSalary / STANDARD_MONTHLY_HOURS;
  const tenPercent = hourRate * 0.1;
  const payment = effectiveHours * tenPercent;

  return {
    ...entry,
    isFlagged: !!entry.isFlagged,
    calculatedHours,
    effectiveHours,
    hourRate: round2(hourRate),
    tenPercent: round2(tenPercent),
    payment: round2(payment),
    hasHoursMismatch:
      entry.manualHoursOverride !== undefined &&
      entry.manualHoursOverride !== calculatedHours,
    errors,
  };
}

export function fmtMoney(n: number): string {
  return new Intl.NumberFormat("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

// Date helpers — work in YYYY-MM-DD <-> dd.MM.yy
export function isoToDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}.${m}.${y.slice(-2)}`;
}

export function displayToIso(input: string): string | null {
  const m = input.trim().match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2}|\d{4})$/);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  let y = parseInt(m[3], 10);
  if (m[3].length === 2) y = y < 70 ? 2000 + y : 1900 + y;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

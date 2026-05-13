// On-call hours & pay calculator.
// Rules:
//  - Regular working hours: Mon-Fri 09:00-17:00 (8h)
//  - On-call hours = any hour outside regular working hours (incl. full weekends)
//  - Hourly rate = monthlySalary / (workingDaysInThatMonth * 8)
//  - On-call pay per hour = hourlyRate / 10
// When the period spans multiple months, each hour is priced using the
// hourly rate of the month it falls in.

const WORK_START = 9;
const WORK_END = 17;

export function workingDaysInMonth(year: number, monthIdx: number): number {
  // monthIdx: 0-11
  const last = new Date(year, monthIdx + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= last; d++) {
    const dow = new Date(year, monthIdx, d).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

export function hourlyRateForMonth(monthlySalary: number, year: number, monthIdx: number): number {
  const wd = workingDaysInMonth(year, monthIdx);
  if (wd === 0) return 0;
  return monthlySalary / (wd * 8);
}

export interface CalcResult {
  totalHours: number;
  oncallHours: number;
  regularHours: number;
  pay: number;
  breakdown: {
    month: string; // "YYYY-MM"
    oncallHours: number;
    hourlyRate: number;
    pay: number;
  }[];
}

/**
 * Walk every hour between start and end (end exclusive), classify it,
 * and accumulate on-call pay based on the hourly rate of that hour's month.
 */
export function calculateOncall(
  monthlySalary: number,
  startISO: string, // "YYYY-MM-DDTHH:mm"
  endISO: string,
): CalcResult {
  const start = new Date(startISO);
  const end = new Date(endISO);

  const result: CalcResult = {
    totalHours: 0,
    oncallHours: 0,
    regularHours: 0,
    pay: 0,
    breakdown: [],
  };

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return result;
  }

  const monthAcc = new Map<string, number>(); // monthKey -> oncall hours

  const cur = new Date(start);
  // Round to hourly granularity
  cur.setMinutes(0, 0, 0);
  if (cur < start) cur.setHours(cur.getHours() + 1);

  while (cur < end) {
    const dow = cur.getDay();
    const hour = cur.getHours();
    const isWeekend = dow === 0 || dow === 6;
    const isWorkHour = !isWeekend && hour >= WORK_START && hour < WORK_END;

    result.totalHours++;
    if (isWorkHour) {
      result.regularHours++;
    } else {
      result.oncallHours++;
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
      monthAcc.set(key, (monthAcc.get(key) ?? 0) + 1);
    }
    cur.setHours(cur.getHours() + 1);
  }

  for (const [key, hours] of monthAcc) {
    const [y, m] = key.split("-").map(Number);
    const rate = hourlyRateForMonth(monthlySalary, y, m - 1);
    const pay = hours * (rate / 10);
    result.pay += pay;
    result.breakdown.push({ month: key, oncallHours: hours, hourlyRate: rate, pay });
  }
  result.breakdown.sort((a, b) => a.month.localeCompare(b.month));
  return result;
}

export function formatEUR(n: number): string {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(n);
}

import { useMemo, useState } from "react";
import { Plus, Trash2, Clock, Wallet, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { calculateOncall, formatEUR, workingDaysInMonth } from "@/lib/oncall";

interface Row {
  id: string;
  name: string;
  salary: string;
  start: string;
  end: string;
}

function defaultPeriod(): { start: string; end: string } {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(17, 0, 0, 0);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  nextMonday.setHours(9, 0, 0, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return { start: fmt(monday), end: fmt(nextMonday) };
}

function newRow(): Row {
  const { start, end } = defaultPeriod();
  return { id: crypto.randomUUID(), name: "", salary: "", start, end };
}

export function OncallCalculator() {
  const [rows, setRows] = useState<Row[]>([newRow()]);

  const computed = useMemo(
    () =>
      rows.map((r) => ({
        row: r,
        result: calculateOncall(parseFloat(r.salary) || 0, r.start, r.end),
      })),
    [rows],
  );

  const totals = useMemo(() => {
    let pay = 0, hours = 0;
    for (const c of computed) { pay += c.result.pay; hours += c.result.oncallHours; }
    return { pay, hours };
  }, [computed]);

  const update = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) =>
    setRows((rs) => (rs.length === 1 ? rs : rs.filter((r) => r.id !== id)));
  const add = () => setRows((rs) => [...rs, newRow()]);

  const [refMonth, setRefMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const refMonthInfo = useMemo(() => {
    const [y, m] = refMonth.split("-").map(Number);
    if (!y || !m) return { days: 0, hours: 0 };
    const days = workingDaysInMonth(y, m - 1);
    return { days, hours: days * 8 };
  }, [refMonth]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
      <header className="mb-10 flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> On-call calculator
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Oncall<span className="text-primary">.</span>
        </h1>
        <p className="max-w-xl text-muted-foreground">
          Add a person, their monthly salary and the on-call period. We compute
          out-of-hours coverage at <span className="font-medium text-foreground">1/10 of the hourly rate</span>,
          using working days of each month.
        </p>
      </header>

      <section className="mb-6 flex flex-wrap items-end gap-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ref-month" className="text-xs uppercase tracking-wider text-muted-foreground">
            Reference month
          </Label>
          <Input
            id="ref-month"
            type="month"
            value={refMonth}
            onChange={(e) => setRefMonth(e.target.value)}
            className="w-[180px]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Working days
          </Label>
          <div className="flex h-9 items-center rounded-md border border-input bg-secondary px-3 font-mono text-sm">
            {refMonthInfo.days}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Working hours in month
          </Label>
          <div className="flex h-9 items-center rounded-md border border-transparent bg-[image:var(--gradient-accent)] px-3 font-mono text-sm font-semibold text-primary-foreground">
            {refMonthInfo.hours} h
          </div>
        </div>
        <p className="ml-auto max-w-xs text-xs text-muted-foreground">
          Mon–Fri × 8h. Used as the divisor when turning a monthly salary into an hourly rate.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[160px]">Name</TableHead>
                <TableHead className="min-w-[140px]">Monthly salary (€)</TableHead>
                <TableHead className="min-w-[210px]">Start</TableHead>
                <TableHead className="min-w-[210px]">End</TableHead>
                <TableHead className="text-right">On-call h</TableHead>
                <TableHead className="text-right">Pay</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {computed.map(({ row, result }) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Input
                      value={row.name}
                      onChange={(e) => update(row.id, { name: e.target.value })}
                      placeholder="Jane Doe"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={row.salary}
                      onChange={(e) => update(row.id, { salary: e.target.value })}
                      placeholder="3500"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="datetime-local"
                      value={row.start}
                      onChange={(e) => update(row.id, { start: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="datetime-local"
                      value={row.end}
                      onChange={(e) => update(row.id, { end: e.target.value })}
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {result.oncallHours}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">
                    {formatEUR(result.pay)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(row.id)}
                      disabled={rows.length === 1}
                      aria-label="Remove row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border p-4">
          <Button onClick={add} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> Add person
          </Button>
          <div className="flex flex-wrap gap-3">
            <SummaryPill icon={<CalendarDays className="h-4 w-4" />} label="Total on-call hours" value={String(totals.hours)} />
            <SummaryPill icon={<Wallet className="h-4 w-4" />} label="Total pay" value={formatEUR(totals.pay)} accent />
          </div>
        </div>
      </section>

      {computed.some((c) => c.result.breakdown.length > 0) && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold">Breakdown by month</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {computed
              .filter((c) => c.result.breakdown.length > 0)
              .map(({ row, result }) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]"
                >
                  <div className="mb-3 flex items-baseline justify-between">
                    <h3 className="font-medium">{row.name || "Unnamed"}</h3>
                    <span className="font-mono text-sm text-muted-foreground">
                      {formatEUR(result.pay)}
                    </span>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {result.breakdown.map((b) => (
                      <li key={b.month} className="flex justify-between gap-2">
                        <span className="text-muted-foreground">{b.month}</span>
                        <span className="font-mono">
                          {b.oncallHours}h · {formatEUR(b.hourlyRate / 10)}/h
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SummaryPill({
  icon, label, value, accent,
}: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={
        "flex items-center gap-3 rounded-xl border px-4 py-2 " +
        (accent
          ? "border-transparent bg-[image:var(--gradient-accent)] text-primary-foreground"
          : "border-border bg-secondary text-secondary-foreground")
      }
    >
      <div className={accent ? "opacity-90" : "text-muted-foreground"}>{icon}</div>
      <div className="leading-tight">
        <div className={"text-[10px] uppercase tracking-wider " + (accent ? "opacity-80" : "text-muted-foreground")}>
          {label}
        </div>
        <div className="font-mono text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}

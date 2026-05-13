import { useEffect, useMemo, useState } from "react";
import {
  Plus, Trash2, Flag, RotateCcw, AlertTriangle, Download, Clock, Users, Wallet,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  compute, fmtMoney, isoToDisplay, displayToIso, calculateHours,
  type OnCallEntry, type OnCallResult,
} from "@/lib/oncall-v2";

function uid() { return crypto.randomUUID(); }

function newEntry(cc = "", person = ""): OnCallEntry {
  const today = new Date();
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const end = new Date(today); end.setDate(today.getDate() + 6);
  return {
    id: uid(),
    person,
    fromDate: iso(today),
    toDate: iso(end),
    costCenter: cc,
    monthlyGrossSalary: 0,
  };
}

// ---------- Column layout (single source of truth) ----------
// Tailwind classes per column — used in both header and body for perfect alignment.
const COLS = {
  person:  "w-[180px]",
  from:    "w-[120px]",
  to:      "w-[120px]",
  hours:   "w-[110px] text-right",
  cc:      "w-[110px]",
  salary:  "w-[130px] text-right",
  rate:    "w-[100px] text-right",
  ten:     "w-[100px] text-right",
  payment: "w-[130px] text-right",
  actions: "w-[110px]",
} as const;

function DateCell({ iso, onChange }: { iso: string; onChange: (iso: string) => void }) {
  const [text, setText] = useState(isoToDisplay(iso));
  const [invalid, setInvalid] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setText(isoToDisplay(iso)); }, [iso, focused]);
  return (
    <Input
      value={text}
      onChange={(e) => {
        const v = e.target.value;
        setText(v);
        const parsed = displayToIso(v);
        if (parsed) { setInvalid(false); onChange(parsed); }
        else setInvalid(true);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        const parsed = displayToIso(text);
        if (parsed) { setInvalid(false); setText(isoToDisplay(parsed)); }
      }}
      placeholder="dd.mm.yy"
      className={cn("h-9 w-full font-mono text-sm", invalid && "border-destructive")}
    />
  );
}

export function OncallV2() {
  const [entries, setEntries] = useState<OnCallEntry[]>([
    { ...newEntry("60DOS", "Jane Doe"), monthlyGrossSalary: 2712, fromDate: "2026-04-01", toDate: "2026-04-05" },
    { ...newEntry("60DOS", "John Smith"), monthlyGrossSalary: 2920, fromDate: "2026-04-06", toDate: "2026-04-12" },
  ]);

  const results = useMemo(() => entries.map(compute), [entries]);

  const update = (id: string, patch: Partial<OnCallEntry>) =>
    setEntries((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const remove = (id: string) => {
    if (!confirm("Delete this row?")) return;
    setEntries((es) => es.filter((e) => e.id !== id));
  };

  const add = () => setEntries((es) => [...es, newEntry()]);

  const setManualHours = (id: string, value: string) => {
    const num = value === "" ? undefined : parseFloat(value);
    setEntries((es) => es.map((e) => {
      if (e.id !== id) return e;
      if (num === undefined || Number.isNaN(num)) {
        const { manualHoursOverride: _omit, ...rest } = e; return rest;
      }
      const calc = calculateHours(e.fromDate, e.toDate);
      if (num === calc) {
        const { manualHoursOverride: _omit, ...rest } = e; return rest;
      }
      return { ...e, manualHoursOverride: num };
    }));
  };

  const resetHours = (id: string) =>
    setEntries((es) => es.map((e) => {
      if (e.id !== id) return e;
      const { manualHoursOverride: _omit, ...rest } = e; return rest;
    }));

  const toggleFlag = (id: string) =>
    setEntries((es) => es.map((e) => (e.id === id ? { ...e, isFlagged: !e.isFlagged } : e)));

  const groups = useMemo(() => {
    const map = new Map<string, OnCallResult[]>();
    for (const r of results) {
      const key = r.costCenter || "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [results]);

  const grand = results.reduce(
    (a, r) => ({ hours: a.hours + r.effectiveHours, payment: a.payment + r.payment }),
    { hours: 0, payment: 0 },
  );

  const hasMismatch = results.some((r) => r.hasHoursMismatch);
  const hasFlagged = results.some((r) => r.isFlagged);
  const peopleCount = new Set(entries.map((e) => e.person.trim()).filter(Boolean)).size;

  const exportXlsx = () => {
    const wb = XLSX.utils.book_new();
    for (const [cc, rows] of groups) {
      const aoa: (string | number)[][] = [
        ["Person", "From", "To", "Hours", "CC", "Salary", "Hour rate", "10%", "Payment"],
      ];
      let subH = 0, subP = 0;
      for (const r of rows) {
        aoa.push([
          r.person, isoToDisplay(r.fromDate), isoToDisplay(r.toDate),
          r.effectiveHours, r.costCenter, r.monthlyGrossSalary,
          r.hourRate, r.tenPercent, r.payment,
        ]);
        subH += r.effectiveHours; subP += r.payment;
      }
      aoa.push(["", "", "", subH, "Subtotal", "", "", "", Math.round(subP * 100) / 100]);
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      rows.forEach((r, i) => {
        const rowIdx = i + 1;
        if (r.hasHoursMismatch) {
          const ref = XLSX.utils.encode_cell({ r: rowIdx, c: 3 });
          if (ws[ref]) ws[ref].s = { font: { color: { rgb: "FF0000" } } };
        }
        if (r.isFlagged) {
          const ref = XLSX.utils.encode_cell({ r: rowIdx, c: 8 });
          if (ws[ref]) ws[ref].s = { fill: { fgColor: { rgb: "FFFF00" } } };
        }
      });
      XLSX.utils.book_append_sheet(wb, ws, cc.slice(0, 31));
    }
    const sumAoa: (string | number)[][] = [["Cost Center", "Hours", "Payment"]];
    let gH = 0, gP = 0;
    for (const [cc, rows] of groups) {
      const h = rows.reduce((a, r) => a + r.effectiveHours, 0);
      const p = rows.reduce((a, r) => a + r.payment, 0);
      sumAoa.push([cc, h, Math.round(p * 100) / 100]);
      gH += h; gP += p;
    }
    sumAoa.push(["GRAND TOTAL", gH, Math.round(gP * 100) / 100]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sumAoa), "Summary");
    XLSX.writeFile(wb, "oncall.xlsx");
  };

  return (
    <div className="mx-auto max-w-[1300px] px-4 py-8 sm:py-12">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> On-call calculator
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            On-call hours & payment<span className="text-primary">.</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Mon–Fri = 16h, Sat–Sun = 24h. Pay = salary / 168 × 10% × hours.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportXlsx} className="gap-2">
            <Download className="h-4 w-4" /> Export Excel
          </Button>
          <Button onClick={add} className="gap-2">
            <Plus className="h-4 w-4" /> Add row
          </Button>
        </div>
      </header>

      {/* KPI strip */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<Users className="h-4 w-4" />} label="People" value={String(peopleCount)} />
        <Stat icon={<Clock className="h-4 w-4" />} label="Total hours" value={`${grand.hours} h`} />
        <Stat icon={<Wallet className="h-4 w-4" />} label="Total payment" value={`€ ${fmtMoney(grand.payment)}`} accent />
        <Stat icon={<Flag className="h-4 w-4" />} label="Cost centers" value={String(groups.length)} />
      </div>

      {(hasMismatch || hasFlagged) && (
        <div className="mb-4 space-y-2">
          {hasMismatch && (
            <Banner tone="warn">Some hours have been manually overridden and don't match the calculated value.</Banner>
          )}
          {hasFlagged && <Banner tone="info">Some rows are flagged for review.</Banner>}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col className={COLS.person} />
              <col className={COLS.from} />
              <col className={COLS.to} />
              <col className={COLS.hours} />
              <col className={COLS.cc} />
              <col className={COLS.salary} />
              <col className={COLS.rate} />
              <col className={COLS.ten} />
              <col className={COLS.payment} />
              <col className={COLS.actions} />
            </colgroup>
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <Th>Person</Th>
                <Th>From</Th>
                <Th>To</Th>
                <Th align="right">Hours</Th>
                <Th>CC</Th>
                <Th align="right">Salary (€)</Th>
                <Th align="right">Hour rate</Th>
                <Th align="right">10%</Th>
                <Th align="right">Payment (€)</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {groups.map(([cc, rows]) => {
                const subH = rows.reduce((a, r) => a + r.effectiveHours, 0);
                const subP = rows.reduce((a, r) => a + r.payment, 0);
                return (
                  <RenderGroup
                    key={cc}
                    cc={cc}
                    rows={rows}
                    subH={subH}
                    subP={subP}
                    update={update}
                    remove={remove}
                    setManualHours={setManualHours}
                    resetHours={resetHours}
                    toggleFlag={toggleFlag}
                  />
                );
              })}
              <tr className="border-t-2 border-border bg-secondary/40 font-semibold">
                <td className="px-3 py-3 text-xs uppercase tracking-wider text-muted-foreground" colSpan={3}>
                  Grand total
                </td>
                <td className="px-3 py-3 text-right font-mono">{grand.hours}</td>
                <td colSpan={4} />
                <td className="px-3 py-3 text-right font-mono">€ {fmtMoney(grand.payment)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {results.some((r) => r.errors.length > 0) && (
        <div className="mt-4 space-y-1 text-sm text-destructive">
          {results.flatMap((r) =>
            r.errors.map((e, i) => (
              <div key={r.id + i}>
                {r.person || "Unnamed"} · {r.costCenter || "?"} · {isoToDisplay(r.fromDate)}: {e}
              </div>
            )),
          )}
        </div>
      )}
    </div>
  );
}

function Th({ children, align = "left" }: { children?: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th className={cn("px-3 py-2.5 font-medium", align === "right" ? "text-right" : "text-left")}>
      {children}
    </th>
  );
}

function Td({ children, className, align }: { children?: React.ReactNode; className?: string; align?: "right" }) {
  return (
    <td className={cn("px-3 py-2 align-middle", align === "right" && "text-right", className)}>
      {children}
    </td>
  );
}

interface GroupProps {
  cc: string;
  rows: OnCallResult[];
  subH: number;
  subP: number;
  update: (id: string, p: Partial<OnCallEntry>) => void;
  remove: (id: string) => void;
  setManualHours: (id: string, v: string) => void;
  resetHours: (id: string) => void;
  toggleFlag: (id: string) => void;
}
function RenderGroup({ cc, rows, subH, subP, update, remove, setManualHours, resetHours, toggleFlag }: GroupProps) {
  return (
    <>
      <tr className="bg-muted/30">
        <td colSpan={10} className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Cost center · {cc} <span className="ml-1 opacity-60">({rows.length})</span>
        </td>
      </tr>
      {rows.map((r) => (
        <tr key={r.id} className="border-b border-border/60 hover:bg-muted/20">
          <Td>
            <Input
              value={r.person}
              onChange={(e) => update(r.id, { person: e.target.value })}
              placeholder="Full name"
              className="h-9 w-full"
            />
          </Td>
          <Td>
            <DateCell iso={r.fromDate} onChange={(v) => update(r.id, { fromDate: v })} />
          </Td>
          <Td>
            <DateCell iso={r.toDate} onChange={(v) => update(r.id, { toDate: v })} />
          </Td>
          <Td align="right">
            <div className="flex items-center justify-end gap-1">
              <Input
                type="number"
                min={0}
                value={r.effectiveHours}
                onChange={(e) => setManualHours(r.id, e.target.value)}
                className={cn(
                  "h-9 w-full text-right font-mono",
                  r.hasHoursMismatch && "text-destructive font-semibold border-destructive/40",
                )}
                title={r.hasHoursMismatch ? `Calculated: ${r.calculatedHours}h` : undefined}
              />
            </div>
          </Td>
          <Td>
            <Input
              value={r.costCenter}
              onChange={(e) => update(r.id, { costCenter: e.target.value })}
              placeholder="60DOS"
              className="h-9 w-full font-mono"
            />
          </Td>
          <Td align="right">
            <Input
              type="number"
              min={0}
              value={r.monthlyGrossSalary || ""}
              onChange={(e) => update(r.id, { monthlyGrossSalary: parseFloat(e.target.value) || 0 })}
              placeholder="2920"
              className={cn(
                "h-9 w-full text-right font-mono",
                r.isFlagged && "bg-[hsl(54_100%_62%/0.35)]",
              )}
            />
          </Td>
          <Td align="right" className="font-mono text-muted-foreground">{fmtMoney(r.hourRate)}</Td>
          <Td align="right" className="font-mono text-muted-foreground">{fmtMoney(r.tenPercent)}</Td>
          <Td
            align="right"
            className={cn(
              "font-mono font-medium",
              r.isFlagged && "bg-[hsl(54_100%_62%/0.35)]",
            )}
          >
            {fmtMoney(r.payment)}
          </Td>
          <Td>
            <div className="flex items-center justify-end gap-0.5">
              {r.hasHoursMismatch && (
                <Button
                  variant="ghost" size="icon" className="h-8 w-8"
                  onClick={() => resetHours(r.id)}
                  aria-label="Reset hours"
                  title={`Reset to ${r.calculatedHours}h`}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost" size="icon"
                className={cn("h-8 w-8", r.isFlagged && "text-[hsl(38_92%_50%)]")}
                onClick={() => toggleFlag(r.id)}
                aria-label="Flag for review"
              >
                <Flag className={cn("h-4 w-4", r.isFlagged && "fill-current")} />
              </Button>
              <Button
                variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => remove(r.id)}
                aria-label="Delete row"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Td>
        </tr>
      ))}
      <tr className="border-b border-border bg-muted/10">
        <td colSpan={3} className="px-3 py-2 text-right text-[11px] uppercase tracking-wider text-muted-foreground">
          Subtotal {cc}
        </td>
        <td className="px-3 py-2 text-right font-mono font-semibold">{subH}</td>
        <td colSpan={4} />
        <td className="px-3 py-2 text-right font-mono font-semibold">€ {fmtMoney(subP)}</td>
        <td />
      </tr>
    </>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3",
        accent
          ? "border-transparent bg-[image:var(--gradient-accent)] text-primary-foreground"
          : "border-border bg-card",
      )}
    >
      <div className={cn("rounded-lg p-2", accent ? "bg-white/15" : "bg-secondary text-muted-foreground")}>
        {icon}
      </div>
      <div className="leading-tight">
        <div className={cn("text-[10px] uppercase tracking-wider", accent ? "opacity-80" : "text-muted-foreground")}>
          {label}
        </div>
        <div className="font-mono text-lg font-semibold">{value}</div>
      </div>
    </div>
  );
}

function Banner({ tone, children }: { tone: "warn" | "info"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
        tone === "warn"
          ? "border-[hsl(38_92%_50%/0.4)] bg-[hsl(38_92%_50%/0.1)] text-[hsl(38_92%_45%)]"
          : "border-primary/30 bg-primary/5 text-primary",
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

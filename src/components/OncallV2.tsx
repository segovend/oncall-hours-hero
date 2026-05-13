import { useMemo, useState } from "react";
import {
  Plus, Trash2, Flag, RotateCcw, AlertTriangle, Download, Clock,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  compute, fmtMoney, isoToDisplay, displayToIso, calculateHours,
  type OnCallEntry, type OnCallResult,
} from "@/lib/oncall-v2";

function uid() { return crypto.randomUUID(); }

function newEntry(cc = ""): OnCallEntry {
  const today = new Date();
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const end = new Date(today); end.setDate(today.getDate() + 6);
  return {
    id: uid(),
    fromDate: iso(today),
    toDate: iso(end),
    costCenter: cc,
    monthlyGrossSalary: 0,
  };
}

interface DateCellProps {
  iso: string;
  onChange: (iso: string) => void;
}
function DateCell({ iso, onChange }: DateCellProps) {
  const [text, setText] = useState(isoToDisplay(iso));
  const [invalid, setInvalid] = useState(false);
  // sync when external iso changes
  if (isoToDisplay(iso) !== text && document.activeElement?.tagName !== "INPUT") {
    setText(isoToDisplay(iso));
  }
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
      onBlur={() => {
        const parsed = displayToIso(text);
        if (parsed) { setInvalid(false); setText(isoToDisplay(parsed)); }
      }}
      placeholder="dd.mm.yy"
      className={cn("w-[110px] font-mono", invalid && "border-destructive")}
    />
  );
}

export function OncallV2() {
  const [entries, setEntries] = useState<OnCallEntry[]>([
    { ...newEntry("60DOS"), monthlyGrossSalary: 2712, fromDate: "2026-04-01", toDate: "2026-04-05" },
    { ...newEntry("60DOS"), monthlyGrossSalary: 2920, fromDate: "2026-04-06", toDate: "2026-04-12" },
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
        const { manualHoursOverride: _omit, ...rest } = e;
        return rest;
      }
      const calc = calculateHours(e.fromDate, e.toDate);
      if (num === calc) {
        const { manualHoursOverride: _omit, ...rest } = e;
        return rest;
      }
      return { ...e, manualHoursOverride: num };
    }));
  };

  const resetHours = (id: string) =>
    setEntries((es) => es.map((e) => {
      if (e.id !== id) return e;
      const { manualHoursOverride: _omit, ...rest } = e;
      return rest;
    }));

  const toggleFlag = (id: string) =>
    setEntries((es) => es.map((e) => (e.id === id ? { ...e, isFlagged: !e.isFlagged } : e)));

  // Group by CC
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

  const exportXlsx = () => {
    const wb = XLSX.utils.book_new();
    // sheet per CC
    for (const [cc, rows] of groups) {
      const aoa: (string | number)[][] = [
        ["From", "To", "Hours", "CC", "Salary", "Hour rate", "10%", "Payment"],
      ];
      let subH = 0, subP = 0;
      for (const r of rows) {
        aoa.push([
          isoToDisplay(r.fromDate), isoToDisplay(r.toDate),
          r.effectiveHours, r.costCenter, r.monthlyGrossSalary,
          r.hourRate, r.tenPercent, r.payment,
        ]);
        subH += r.effectiveHours; subP += r.payment;
      }
      aoa.push(["", "", subH, "Subtotal", "", "", "", Math.round(subP * 100) / 100]);
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      // color: red font for mismatched hours, yellow fill for flagged payment
      rows.forEach((r, i) => {
        const rowNum = i + 2; // 1-based + header
        if (r.hasHoursMismatch) {
          const ref = XLSX.utils.encode_cell({ r: rowNum - 1, c: 2 });
          if (ws[ref]) ws[ref].s = { font: { color: { rgb: "FF0000" } } };
        }
        if (r.isFlagged) {
          const ref = XLSX.utils.encode_cell({ r: rowNum - 1, c: 7 });
          if (ws[ref]) ws[ref].s = { fill: { fgColor: { rgb: "FFFF00" } } };
        }
      });
      XLSX.utils.book_append_sheet(wb, ws, cc.slice(0, 31));
    }
    // summary
    const sumAoa: (string | number)[][] = [["Cost Center", "Hours", "Payment"]];
    let gH = 0, gP = 0;
    for (const [cc, rows] of groups) {
      const h = rows.reduce((a, r) => a + r.effectiveHours, 0);
      const p = rows.reduce((a, r) => a + r.payment, 0);
      sumAoa.push([cc, h, Math.round(p * 100) / 100]);
      gH += h; gP += p;
    }
    sumAoa.push(["GRAND TOTAL", gH, Math.round(gP * 100) / 100]);
    const sumWs = XLSX.utils.aoa_to_sheet(sumAoa);
    XLSX.utils.book_append_sheet(wb, sumWs, "Summary");
    XLSX.writeFile(wb, "oncall.xlsx");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
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

      {(hasMismatch || hasFlagged) && (
        <div className="mb-4 space-y-2">
          {hasMismatch && (
            <Banner tone="warn">
              Some hours have been manually overridden and don't match the calculated value.
            </Banner>
          )}
          {hasFlagged && (
            <Banner tone="info">Some rows are flagged for review.</Banner>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">From</TableHead>
                <TableHead className="w-[120px]">To</TableHead>
                <TableHead className="w-[110px] text-right">Hours</TableHead>
                <TableHead className="w-[120px]">CC</TableHead>
                <TableHead className="w-[130px] text-right">Salary</TableHead>
                <TableHead className="w-[100px] text-right">Hour rate</TableHead>
                <TableHead className="w-[100px] text-right">10%</TableHead>
                <TableHead className="w-[120px] text-right">Payment</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
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
              <TableRow className="bg-secondary/40 font-semibold">
                <TableCell colSpan={2} className="text-right uppercase tracking-wider text-xs text-muted-foreground">
                  Grand total
                </TableCell>
                <TableCell className="text-right font-mono">{grand.hours}</TableCell>
                <TableCell colSpan={4} />
                <TableCell className="text-right font-mono">{fmtMoney(grand.payment)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {results.some((r) => r.errors.length > 0) && (
        <div className="mt-4 space-y-1 text-sm text-destructive">
          {results.flatMap((r) =>
            r.errors.map((e, i) => (
              <div key={r.id + i}>
                Row {r.costCenter || "?"} {isoToDisplay(r.fromDate)}: {e}
              </div>
            )),
          )}
        </div>
      )}
    </div>
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
      <TableRow className="bg-muted/30">
        <TableCell colSpan={9} className="py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Cost center · {cc}
        </TableCell>
      </TableRow>
      {rows.map((r) => (
        <TableRow key={r.id}>
          <TableCell>
            <DateCell iso={r.fromDate} onChange={(v) => update(r.id, { fromDate: v })} />
          </TableCell>
          <TableCell>
            <DateCell iso={r.toDate} onChange={(v) => update(r.id, { toDate: v })} />
          </TableCell>
          <TableCell className="text-right">
            <div className="flex items-center justify-end gap-1">
              <Input
                type="number"
                min={0}
                value={r.effectiveHours}
                onChange={(e) => setManualHours(r.id, e.target.value)}
                className={cn(
                  "w-[80px] text-right font-mono",
                  r.hasHoursMismatch && "text-destructive font-semibold",
                )}
                title={r.hasHoursMismatch ? `Calculated: ${r.calculatedHours}h` : undefined}
              />
              {r.hasHoursMismatch && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => resetHours(r.id)} aria-label="Reset hours">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </TableCell>
          <TableCell>
            <Input
              value={r.costCenter}
              onChange={(e) => update(r.id, { costCenter: e.target.value })}
              placeholder="60DOS"
              className="w-[100px] font-mono"
            />
          </TableCell>
          <TableCell className="text-right">
            <Input
              type="number"
              min={0}
              value={r.monthlyGrossSalary || ""}
              onChange={(e) => update(r.id, { monthlyGrossSalary: parseFloat(e.target.value) || 0 })}
              placeholder="2920"
              className={cn(
                "w-[110px] text-right font-mono",
                r.isFlagged && "bg-[hsl(54_100%_62%/0.35)]",
              )}
            />
          </TableCell>
          <TableCell className="text-right font-mono text-sm text-muted-foreground">
            {fmtMoney(r.hourRate)}
          </TableCell>
          <TableCell className="text-right font-mono text-sm text-muted-foreground">
            {fmtMoney(r.tenPercent)}
          </TableCell>
          <TableCell
            className={cn(
              "text-right font-mono text-sm font-medium",
              r.isFlagged && "bg-[hsl(54_100%_62%/0.35)]",
            )}
          >
            {fmtMoney(r.payment)}
          </TableCell>
          <TableCell>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8", r.isFlagged && "text-[hsl(38_92%_50%)]")}
                onClick={() => toggleFlag(r.id)}
                aria-label="Flag for review"
              >
                <Flag className={cn("h-4 w-4", r.isFlagged && "fill-current")} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(r.id)} aria-label="Delete row">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      ))}
      <TableRow className="bg-muted/20">
        <TableCell colSpan={2} className="text-right text-xs uppercase tracking-wider text-muted-foreground">
          Subtotal {cc}
        </TableCell>
        <TableCell className="text-right font-mono font-semibold">{subH}</TableCell>
        <TableCell colSpan={4} />
        <TableCell className="text-right font-mono font-semibold">{fmtMoney(subP)}</TableCell>
        <TableCell />
      </TableRow>
    </>
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

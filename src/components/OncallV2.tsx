import { useEffect, useMemo, useState } from "react";
import {
  Plus, Trash2, Flag, RotateCcw, AlertTriangle, Download, Clock, Users, Wallet,
  Sparkles, Calculator, PencilLine, FileText,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  compute, fmtMoney, fmtInt, isoToDisplay, displayToIso, calculateHours,
  type OnCallEntry, type OnCallResult,
} from "@/lib/oncall-v2";
import { exportPaymentDocx } from "@/lib/oncall-docx";

function uid() { return crypto.randomUUID(); }

function newEntry(cc = "", person = ""): OnCallEntry {
  return {
    id: uid(),
    person,
    fromDate: "",
    toDate: "",
    costCenter: cc,
    monthlyGrossSalary: 0,
  };
}

const COLS = {
  person:  "w-[170px]",
  mode:    "w-[110px]",
  from:    "w-[110px]",
  to:      "w-[110px]",
  hours:   "w-[100px]",
  cc:      "w-[90px]",
  salary:  "w-[120px]",
  rate:    "w-[88px]",
  ten:     "w-[80px]",
  payment: "w-[120px]",
  actions: "w-[110px]",
} as const;

function DateCell({ iso, onChange, disabled }: { iso: string; onChange: (iso: string) => void; disabled?: boolean }) {
  const [text, setText] = useState(isoToDisplay(iso));
  const [invalid, setInvalid] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setText(isoToDisplay(iso)); }, [iso, focused]);
  return (
    <Input
      value={text}
      disabled={disabled}
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
      className={cn(
        "h-9 w-full rounded-md border-white/10 bg-white/5 font-mono text-sm tracking-tight text-foreground placeholder:text-muted-foreground/50",
        "focus-visible:ring-1 focus-visible:ring-primary/60",
        invalid && "border-destructive/60",
        disabled && "opacity-40 cursor-not-allowed",
      )}
    />
  );
}

export function OncallV2() {
  const [entries, setEntries] = useState<OnCallEntry[]>([newEntry()]);

  const [monthlyHours, setMonthlyHours] = useState<number>(168);
  const results = useMemo(() => entries.map((e) => compute(e, monthlyHours)), [entries, monthlyHours]);

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
      // In manual mode always store override; in auto mode strip override if equal to calc
      if (!e.manualMode) {
        const calc = calculateHours(e.fromDate, e.toDate);
        if (num === calc) {
          const { manualHoursOverride: _omit, ...rest } = e; return rest;
        }
      }
      return { ...e, manualHoursOverride: num };
    }));
  };

  const toggleManualMode = (id: string) =>
    setEntries((es) => es.map((e) => {
      if (e.id !== id) return e;
      if (e.manualMode) {
        // Switching back to auto: drop override
        const { manualMode: _m, manualHoursOverride: _h, ...rest } = e;
        return rest;
      }
      // Switching to manual: seed override with current calculated value
      const seed = e.manualHoursOverride ?? calculateHours(e.fromDate, e.toDate);
      return { ...e, manualMode: true, manualHoursOverride: seed };
    }));

  const resetHours = (id: string) =>
    setEntries((es) => es.map((e) => {
      if (e.id !== id) return e;
      const { manualHoursOverride: _omit, ...rest } = e; return rest;
    }));

  const toggleFlag = (id: string) =>
    setEntries((es) => es.map((e) => (e.id === id ? { ...e, isFlagged: !e.isFlagged } : e)));

  const grandHours = results.reduce((a, r) => a + r.effectiveHours, 0);
  const ccCount = new Set(entries.map((e) => e.costCenter.trim()).filter(Boolean)).size;
  const hasMismatch = results.some((r) => r.hasHoursMismatch);
  const hasFlagged = results.some((r) => r.isFlagged);
  const peopleCount = new Set(entries.map((e) => e.person.trim()).filter(Boolean)).size;

  const exportXlsx = () => {
    const wb = XLSX.utils.book_new();
    const aoa: (string | number)[][] = [
      ["Person", "Mode", "From", "To", "Hours", "CC", "Salary", "Hour rate", "10%", "Payment"],
    ];
    for (const r of results) {
      aoa.push([
        r.person, r.manualMode ? "Manual" : "Auto",
        isoToDisplay(r.fromDate), isoToDisplay(r.toDate),
        r.effectiveHours, r.costCenter, r.monthlyGrossSalary,
        r.hourRate, r.tenPercent, r.payment,
      ]);
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, "On-call");
    XLSX.writeFile(wb, "oncall.xlsx");
  };

  return (
    <div className="relative mx-auto max-w-[1400px] px-4 py-10 sm:py-14">
      {/* Decorative blur orbs */}
      <div aria-hidden className="pointer-events-none absolute -top-24 left-1/3 h-72 w-72 rounded-full bg-[image:var(--gradient-accent)] opacity-30 blur-[120px]" />
      <div aria-hidden className="pointer-events-none absolute top-40 right-0 h-64 w-64 rounded-full bg-primary/30 opacity-30 blur-[120px]" />

      <header className="relative mb-8 flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            On-call payment engine · v2
          </span>
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
            Compute on-call pay,<br />
            <span className="bg-[image:var(--gradient-hero)] bg-clip-text text-transparent">beautifully precise.</span>
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Mon–Fri 16h · weekends 24h · Mon→Mon handover splits 7/9. Pay = salary ÷ {monthlyHours} × 10% × hours, rounded up.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Working hours / month
            </span>
            <Input
              type="number"
              min={1}
              value={monthlyHours || ""}
              onChange={(e) => setMonthlyHours(parseFloat(e.target.value) || 0)}
              className="h-10 w-[170px] border-white/15 bg-white/5 text-right font-mono text-base font-semibold backdrop-blur focus-visible:ring-1 focus-visible:ring-primary/60"
            />
          </label>
          <Button variant="outline" onClick={exportXlsx} className="h-10 gap-2 border-white/15 bg-white/5 backdrop-blur hover:bg-white/10">
            <Download className="h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" onClick={() => exportPaymentDocx(results)} className="h-10 gap-2 border-white/15 bg-white/5 backdrop-blur hover:bg-white/10">
            <FileText className="h-4 w-4" /> Word
          </Button>
          <Button onClick={add} className="h-10 gap-2 bg-[image:var(--gradient-accent)] text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-90">
            <Plus className="h-4 w-4" /> Add row
          </Button>

        </div>
      </header>

      {/* KPI strip */}
      <div className="relative mb-6 grid grid-cols-3 gap-3">
        <Stat icon={<Users className="h-4 w-4" />} label="People" value={String(peopleCount)} />
        <Stat icon={<Clock className="h-4 w-4" />} label="Total hours" value={`${grandHours} h`} accent />
        <Stat icon={<Flag className="h-4 w-4" />} label="Cost centers" value={String(ccCount)} />
      </div>

      {(hasMismatch || hasFlagged) && (
        <div className="relative mb-4 space-y-2">
          {hasMismatch && (
            <Banner tone="warn">Some hours have been manually overridden and don't match the calculated value.</Banner>
          )}
          {hasFlagged && <Banner tone="info">Some rows are flagged for review.</Banner>}
        </div>
      )}

      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col className={COLS.person} />
              <col className={COLS.mode} />
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
            <thead className="bg-secondary/60 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <tr className="border-b border-border">
                <Th>Person</Th>
                <Th>Mode</Th>
                <Th>From</Th>
                <Th>To</Th>
                <Th align="right">Hours</Th>
                <Th>CC</Th>
                <Th align="right">Salary €</Th>
                <Th align="right">Rate</Th>
                <Th align="right">10%</Th>
                <Th align="right">Payment €</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <Row
                  key={r.id}
                  r={r}
                  update={update}
                  remove={remove}
                  setManualHours={setManualHours}
                  resetHours={resetHours}
                  toggleFlag={toggleFlag}
                  toggleManualMode={toggleManualMode}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {results.some((r) => r.errors.length > 0) && (
        <div className="mt-4 space-y-1 text-sm text-destructive">
          {results.flatMap((r) =>
            r.errors.map((e, i) => (
              <div key={r.id + i}>
                {r.person || "Unnamed"} · {r.costCenter || "?"} · {isoToDisplay(r.fromDate) || "—"}: {e}
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
    <th className={cn("px-3 py-3 font-semibold", align === "right" ? "text-right" : "text-left")}>
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

interface RowProps {
  r: OnCallResult;
  update: (id: string, p: Partial<OnCallEntry>) => void;
  remove: (id: string) => void;
  setManualHours: (id: string, v: string) => void;
  resetHours: (id: string) => void;
  toggleFlag: (id: string) => void;
  toggleManualMode: (id: string) => void;
}
function Row({ r, update, remove, setManualHours, resetHours, toggleFlag, toggleManualMode }: RowProps) {
  return (
    <tr className="border-b border-border/60 transition-colors hover:bg-secondary/40">
      <Td>
        <Input
          value={r.person}
          onChange={(e) => update(r.id, { person: e.target.value })}
          placeholder="Full name"
          className="h-9 w-full focus-visible:ring-1 focus-visible:ring-primary/60"
        />
      </Td>
      <Td>
        <ModeToggle manual={r.manualMode} onToggle={() => toggleManualMode(r.id)} />
      </Td>
      <Td>
        <DateCell iso={r.fromDate} onChange={(v) => update(r.id, { fromDate: v })} disabled={r.manualMode} />
      </Td>
      <Td>
        <DateCell iso={r.toDate} onChange={(v) => update(r.id, { toDate: v })} disabled={r.manualMode} />
      </Td>
      <Td align="right">
        <Input
          type="number"
          min={0}
          value={r.effectiveHours}
          onChange={(e) => setManualHours(r.id, e.target.value)}
          className={cn(
            "h-9 w-full text-right font-mono",
            r.manualMode && "border-primary/40 bg-primary/10",
            r.hasHoursMismatch && "border-destructive/50 bg-destructive/10 text-destructive font-semibold",
          )}
          title={
            r.manualMode ? "Manual mode — enter hours directly" :
            r.hasHoursMismatch ? `Calculated: ${r.calculatedHours}h` : undefined
          }
        />
      </Td>
      <Td>
        <Input
          value={r.costCenter}
          onChange={(e) => update(r.id, { costCenter: e.target.value })}
          placeholder="00XXX"
          className="h-9 w-full font-mono"
        />
      </Td>
      <Td align="right">
        <Input
          type="number"
          min={0}
          value={r.monthlyGrossSalary}
          onChange={(e) => update(r.id, { monthlyGrossSalary: parseFloat(e.target.value) || 0 })}
          className={cn(
            "h-9 w-full text-right font-mono",
            r.isFlagged && "border-[var(--color-flag)]/60 bg-[var(--color-flag)]/15",
          )}
        />
      </Td>
      <Td align="right" className="font-mono text-xs text-muted-foreground">{fmtMoney(r.hourRate)}</Td>
      <Td align="right" className="font-mono text-xs text-muted-foreground">{fmtMoney(r.tenPercent)}</Td>
      <Td
        align="right"
        className={cn(
          "font-mono font-semibold tabular-nums",
          r.isFlagged && "rounded-md bg-[var(--color-flag)]/20 text-[var(--color-flag)]",
        )}
      >
        € {fmtInt(r.payment)}
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
            className={cn("h-8 w-8", r.isFlagged && "text-[var(--color-flag)]")}
            onClick={() => toggleFlag(r.id)}
            aria-label="Flag for review"
          >
            <Flag className={cn("h-4 w-4", r.isFlagged && "fill-current")} />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => remove(r.id)}
            aria-label="Delete row"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </Td>
    </tr>
  );
}

function ModeToggle({ manual, onToggle }: { manual?: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "group flex h-9 w-full items-center justify-center gap-1.5 rounded-md border text-[11px] font-medium uppercase tracking-wider transition-all",
        manual
          ? "border-primary/40 bg-primary/15 text-primary hover:bg-primary/20"
          : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground",
      )}
      title={manual ? "Manual hours — click for auto" : "Auto from dates — click for manual"}
    >
      {manual ? <PencilLine className="h-3.5 w-3.5" /> : <Calculator className="h-3.5 w-3.5" />}
      {manual ? "Manual" : "Auto"}
    </button>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={cn(
        "relative flex items-center gap-3 overflow-hidden rounded-2xl border px-4 py-4 backdrop-blur-xl",
        accent
          ? "border-white/15 bg-[image:var(--gradient-accent)] text-primary-foreground shadow-[var(--shadow-glow)]"
          : "border-white/10 bg-card/60",
      )}
    >
      <div className={cn("rounded-xl p-2.5", accent ? "bg-white/20" : "bg-white/5 text-primary")}>
        {icon}
      </div>
      <div className="leading-tight">
        <div className={cn("text-[10px] uppercase tracking-[0.14em]", accent ? "opacity-80" : "text-muted-foreground")}>
          {label}
        </div>
        <div className="font-display text-xl font-semibold">{value}</div>
      </div>
    </div>
  );
}

function Banner({ tone, children }: { tone: "warn" | "info"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl border px-4 py-2.5 text-sm backdrop-blur",
        tone === "warn"
          ? "border-[var(--color-warn)]/30 bg-[var(--color-warn)]/10 text-[var(--color-warn)]"
          : "border-primary/30 bg-primary/10 text-primary",
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

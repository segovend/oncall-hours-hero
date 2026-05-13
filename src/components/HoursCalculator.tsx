import { useMemo, useState } from "react";
import { Plus, Trash2, AlertTriangle, RotateCcw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  buildRange, formatDDMMYY, parseDDMMYY, sumDefaults, sumHours, type DayEntry,
} from "@/lib/hours";

interface RangeInput {
  id: string;
  from: string; // dd.mm.yy
  to: string;
  overrides: Record<string, number>;
}

function today(): string { return formatDDMMYY(new Date()); }
function plusDays(s: string, n: number): string {
  const d = parseDDMMYY(s); if (!d) return s;
  d.setDate(d.getDate() + n); return formatDDMMYY(d);
}
function newRange(): RangeInput {
  const f = today();
  return { id: crypto.randomUUID(), from: f, to: plusDays(f, 6), overrides: {} };
}

interface ComputedRange {
  input: RangeInput;
  entries: DayEntry[];
  total: number;
  defaultTotal: number;
  invalid: boolean;
}

export function HoursCalculator() {
  const [ranges, setRanges] = useState<RangeInput[]>([newRange()]);

  const computed = useMemo<ComputedRange[]>(() =>
    ranges.map((r) => {
      const s = parseDDMMYY(r.from);
      const e = parseDDMMYY(r.to);
      if (!s || !e || e < s) {
        return { input: r, entries: [], total: 0, defaultTotal: 0, invalid: true };
      }
      const entries = buildRange(s, e, r.overrides);
      return {
        input: r,
        entries,
        total: sumHours(entries),
        defaultTotal: sumDefaults(entries),
        invalid: false,
      };
    }), [ranges]);

  const grandTotal = computed.reduce((a, c) => a + c.total, 0);
  const grandDefault = computed.reduce((a, c) => a + c.defaultTotal, 0);
  const hasOverrides = computed.some((c) => c.entries.some((e) => e.overridden));
  const mismatch = grandTotal !== grandDefault;

  const updateRange = (id: string, patch: Partial<RangeInput>) =>
    setRanges((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const setOverride = (id: string, iso: string, value: string, def: number) =>
    setRanges((rs) => rs.map((r) => {
      if (r.id !== id) return r;
      const next = { ...r.overrides };
      const num = parseFloat(value);
      if (value === "" || Number.isNaN(num)) { delete next[iso]; }
      else { next[iso] = num; }
      // ensure clean default doesn't linger
      if (next[iso] === def) delete next[iso];
      return { ...r, overrides: next };
    }));
  const resetOverride = (id: string, iso: string) =>
    setRanges((rs) => rs.map((r) => {
      if (r.id !== id) return r;
      const next = { ...r.overrides }; delete next[iso];
      return { ...r, overrides: next };
    }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
      <header className="mb-8 flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> Hours calculator
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          On-call hours<span className="text-primary">.</span>
        </h1>
        <p className="max-w-xl text-muted-foreground">
          Weekdays count as <span className="font-medium text-foreground">16h</span>,
          weekends as <span className="font-medium text-foreground">24h</span>.
          Both start and end dates are included. Format: <code className="font-mono text-xs">dd.mm.yy</code>.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Grand total</div>
          <div className="font-mono text-3xl font-semibold">{grandTotal} h</div>
          {hasOverrides && (
            <div className="mt-1 text-xs text-muted-foreground">
              Calculated default: <span className="font-mono">{grandDefault} h</span>
            </div>
          )}
        </div>
        {mismatch && (
          <div className="flex items-start gap-2 rounded-lg border border-[hsl(38_92%_50%/0.4)] bg-[hsl(38_92%_50%/0.1)] px-3 py-2 text-sm text-[hsl(38_92%_45%)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Manual overrides differ from the calculated total by{" "}
              <strong>{Math.abs(grandTotal - grandDefault)} h</strong>.
            </span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {computed.map((c, idx) => (
          <section key={c.input.id} className="rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
            <div className="flex flex-wrap items-end gap-3 border-b border-border p-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Range #{idx + 1} — From
                </Label>
                <Input
                  value={c.input.from}
                  onChange={(e) => updateRange(c.input.id, { from: e.target.value })}
                  placeholder="dd.mm.yy"
                  className="w-[140px] font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">To</Label>
                <Input
                  value={c.input.to}
                  onChange={(e) => updateRange(c.input.id, { to: e.target.value })}
                  placeholder="dd.mm.yy"
                  className="w-[140px] font-mono"
                />
              </div>
              <div className="ml-auto flex items-end gap-3">
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Range total</div>
                  <div className="font-mono text-xl font-semibold">{c.total} h</div>
                </div>
                <Button
                  variant="ghost" size="icon"
                  onClick={() => setRanges((rs) => rs.length === 1 ? rs : rs.filter((r) => r.id !== c.input.id))}
                  disabled={ranges.length === 1}
                  aria-label="Remove range"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {c.invalid ? (
              <div className="p-4 text-sm text-destructive">
                Invalid range. Use <code className="font-mono">dd.mm.yy</code> and ensure
                the end date is on or after the start date.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Day</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Default h</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {c.entries.map((e) => (
                      <TableRow key={e.iso}>
                        <TableCell className="font-mono text-sm">{e.label}</TableCell>
                        <TableCell className="text-sm">{e.weekday}</TableCell>
                        <TableCell>
                          <span className={
                            "rounded-full px-2 py-0.5 text-xs " +
                            (e.type === "weekend"
                              ? "bg-[hsl(280_70%_60%/0.15)] text-[hsl(280_70%_70%)]"
                              : "bg-secondary text-secondary-foreground")
                          }>
                            {e.type}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          {e.defaultHours}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            value={e.hours}
                            onChange={(ev) => setOverride(c.input.id, e.iso, ev.target.value, e.defaultHours)}
                            className={
                              "ml-auto w-24 text-right font-mono " +
                              (e.overridden
                                ? "border-[hsl(38_92%_50%)] bg-[hsl(38_92%_50%/0.12)] text-[hsl(38_92%_55%)] font-semibold"
                                : "")
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {e.overridden ? (
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => resetOverride(c.input.id, e.iso)}
                              aria-label="Reset to default"
                              title={`Calculated: ${e.defaultHours}h`}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        ))}
      </div>

      <div className="mt-6">
        <Button onClick={() => setRanges((rs) => [...rs, newRange()])} variant="outline" className="gap-2">
          <Plus className="h-4 w-4" /> Add date range
        </Button>
      </div>
    </div>
  );
}

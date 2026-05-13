import { r as reactExports, T as jsxRuntimeExports } from "./server-CNzfh8eg.js";
import { c as createSlot, a as cn, b as cva, C as Clock, T as TriangleAlert, I as Input, B as Button, d as Trash2, R as RotateCcw, P as Plus } from "./input-C2-7ymTy.js";
import "./router-C-7jOGuV.js";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
var NODES = [
  "a",
  "button",
  "div",
  "form",
  "h2",
  "h3",
  "img",
  "input",
  "label",
  "li",
  "nav",
  "ol",
  "p",
  "select",
  "span",
  "svg",
  "ul"
];
var Primitive = NODES.reduce((primitive, node) => {
  const Slot = createSlot(`Primitive.${node}`);
  const Node = reactExports.forwardRef((props, forwardedRef) => {
    const { asChild, ...primitiveProps } = props;
    const Comp = asChild ? Slot : node;
    if (typeof window !== "undefined") {
      window[/* @__PURE__ */ Symbol.for("radix-ui")] = true;
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Comp, { ...primitiveProps, ref: forwardedRef });
  });
  Node.displayName = `Primitive.${node}`;
  return { ...primitive, [node]: Node };
}, {});
var NAME = "Label";
var Label$1 = reactExports.forwardRef((props, forwardedRef) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Primitive.label,
    {
      ...props,
      ref: forwardedRef,
      onMouseDown: (event) => {
        const target = event.target;
        if (target.closest("button, input, select, textarea")) return;
        props.onMouseDown?.(event);
        if (!event.defaultPrevented && event.detail > 1) event.preventDefault();
      }
    }
  );
});
Label$1.displayName = NAME;
var Root = Label$1;
const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);
const Label = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(Root, { ref, className: cn(labelVariants(), className), ...props }));
Label.displayName = Root.displayName;
const Table = reactExports.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative w-full overflow-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx("table", { ref, className: cn("w-full caption-bottom text-sm", className), ...props }) })
);
Table.displayName = "Table";
const TableHeader = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { ref, className: cn("[&_tr]:border-b", className), ...props }));
TableHeader.displayName = "TableHeader";
const TableBody = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { ref, className: cn("[&_tr:last-child]:border-0", className), ...props }));
TableBody.displayName = "TableBody";
const TableFooter = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  "tfoot",
  {
    ref,
    className: cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className),
    ...props
  }
));
TableFooter.displayName = "TableFooter";
const TableRow = reactExports.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
    "tr",
    {
      ref,
      className: cn(
        "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        className
      ),
      ...props
    }
  )
);
TableRow.displayName = "TableRow";
const TableHead = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  "th",
  {
    ref,
    className: cn(
      "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    ),
    ...props
  }
));
TableHead.displayName = "TableHead";
const TableCell = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  "td",
  {
    ref,
    className: cn(
      "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    ),
    ...props
  }
));
TableCell.displayName = "TableCell";
const TableCaption = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx("caption", { ref, className: cn("mt-4 text-sm text-muted-foreground", className), ...props }));
TableCaption.displayName = "TableCaption";
const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function parseDDMMYY(input) {
  const m = input.trim().match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2}|\d{4})$/);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  let y = parseInt(m[3], 10);
  if (m[3].length === 2) y = y < 70 ? 2e3 + y : 1900 + y;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}
function formatDDMMYY(d) {
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getFullYear()).slice(-2)}`;
}
function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dayTypeFor(d) {
  const dow = d.getDay();
  return dow === 0 || dow === 6 ? "weekend" : "weekday";
}
function defaultHoursFor(type) {
  return type === "weekend" ? 24 : 16;
}
function buildRange(start, end, overrides) {
  const out = [];
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
      hours: overridden ? o : def,
      overridden
    });
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}
function sumHours(entries) {
  return entries.reduce((a, b) => a + b.hours, 0);
}
function sumDefaults(entries) {
  return entries.reduce((a, b) => a + b.defaultHours, 0);
}
function today() {
  return formatDDMMYY(/* @__PURE__ */ new Date());
}
function plusDays(s, n) {
  const d = parseDDMMYY(s);
  if (!d) return s;
  d.setDate(d.getDate() + n);
  return formatDDMMYY(d);
}
function newRange() {
  const f = today();
  return { id: crypto.randomUUID(), from: f, to: plusDays(f, 6), overrides: {} };
}
function HoursCalculator() {
  const [ranges, setRanges] = reactExports.useState([newRange()]);
  const computed = reactExports.useMemo(() => ranges.map((r) => {
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
      invalid: false
    };
  }), [ranges]);
  const grandTotal = computed.reduce((a, c) => a + c.total, 0);
  const grandDefault = computed.reduce((a, c) => a + c.defaultTotal, 0);
  const hasOverrides = computed.some((c) => c.entries.some((e) => e.overridden));
  const mismatch = grandTotal !== grandDefault;
  const updateRange = (id, patch) => setRanges((rs) => rs.map((r) => r.id === id ? { ...r, ...patch } : r));
  const setOverride = (id, iso, value, def) => setRanges((rs) => rs.map((r) => {
    if (r.id !== id) return r;
    const next = { ...r.overrides };
    const num = parseFloat(value);
    if (value === "" || Number.isNaN(num)) {
      delete next[iso];
    } else {
      next[iso] = num;
    }
    if (next[iso] === def) delete next[iso];
    return { ...r, overrides: next };
  }));
  const resetOverride = (id, iso) => setRanges((rs) => rs.map((r) => {
    if (r.id !== id) return r;
    const next = { ...r.overrides };
    delete next[iso];
    return { ...r, overrides: next };
  }));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-5xl px-4 py-10 sm:py-16", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "mb-8 flex flex-col gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "h-3.5 w-3.5" }),
        " Hours calculator"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "text-4xl font-semibold tracking-tight sm:text-5xl", children: [
        "On-call hours",
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-primary", children: "." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "max-w-xl text-muted-foreground", children: [
        "Weekdays count as ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-foreground", children: "16h" }),
        ", weekends as ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-foreground", children: "24h" }),
        ". Both start and end dates are included. Format: ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "font-mono text-xs", children: "dd.mm.yy" }),
        "."
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Grand total" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "font-mono text-3xl font-semibold", children: [
          grandTotal,
          " h"
        ] }),
        hasOverrides && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 text-xs text-muted-foreground", children: [
          "Calculated default: ",
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono", children: [
            grandDefault,
            " h"
          ] })
        ] })
      ] }),
      mismatch && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2 rounded-lg border border-[hsl(38_92%_50%/0.4)] bg-[hsl(38_92%_50%/0.1)] px-3 py-2 text-sm text-[hsl(38_92%_45%)]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "mt-0.5 h-4 w-4 shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "Manual overrides differ from the calculated total by",
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { children: [
            Math.abs(grandTotal - grandDefault),
            " h"
          ] }),
          "."
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-6", children: computed.map((c, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-end gap-3 border-b border-border p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Label, { className: "text-xs uppercase tracking-wider text-muted-foreground", children: [
            "Range #",
            idx + 1,
            " — From"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              value: c.input.from,
              onChange: (e) => updateRange(c.input.id, { from: e.target.value }),
              placeholder: "dd.mm.yy",
              className: "w-[140px] font-mono"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "To" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              value: c.input.to,
              onChange: (e) => updateRange(c.input.id, { to: e.target.value }),
              placeholder: "dd.mm.yy",
              className: "w-[140px] font-mono"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-auto flex items-end gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-right", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Range total" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "font-mono text-xl font-semibold", children: [
              c.total,
              " h"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "ghost",
              size: "icon",
              onClick: () => setRanges((rs) => rs.length === 1 ? rs : rs.filter((r) => r.id !== c.input.id)),
              disabled: ranges.length === 1,
              "aria-label": "Remove range",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-4 w-4" })
            }
          )
        ] })
      ] }),
      c.invalid ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 text-sm text-destructive", children: [
        "Invalid range. Use ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "font-mono", children: "dd.mm.yy" }),
        " and ensure the end date is on or after the start date."
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Date" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Day" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Type" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "text-right", children: "Default h" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "text-right", children: "Hours" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, {})
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: c.entries.map((e) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "font-mono text-sm", children: e.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "text-sm", children: e.weekday }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full px-2 py-0.5 text-xs " + (e.type === "weekend" ? "bg-[hsl(280_70%_60%/0.15)] text-[hsl(280_70%_70%)]" : "bg-secondary text-secondary-foreground"), children: e.type }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "text-right font-mono text-sm text-muted-foreground", children: e.defaultHours }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              type: "number",
              inputMode: "decimal",
              min: 0,
              value: e.hours,
              onChange: (ev) => setOverride(c.input.id, e.iso, ev.target.value, e.defaultHours),
              className: "ml-auto w-24 text-right font-mono " + (e.overridden ? "border-[hsl(38_92%_50%)] bg-[hsl(38_92%_50%/0.12)] text-[hsl(38_92%_55%)] font-semibold" : "")
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: e.overridden ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "ghost",
              size: "icon",
              onClick: () => resetOverride(c.input.id, e.iso),
              "aria-label": "Reset to default",
              title: `Calculated: ${e.defaultHours}h`,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "h-3.5 w-3.5" })
            }
          ) : null })
        ] }, e.iso)) })
      ] }) })
    ] }, c.input.id)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: () => setRanges((rs) => [...rs, newRange()]), variant: "outline", className: "gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
      " Add date range"
    ] }) })
  ] });
}
function HoursPage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(HoursCalculator, {});
}
export {
  HoursPage as component
};

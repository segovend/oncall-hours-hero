import { createFileRoute, Link } from "@tanstack/react-router";
import { OncallCalculator } from "@/components/OncallCalculator";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Oncall — calculate on-call hours & pay" },
      { name: "description", content: "Frontend calculator for on-call hours and pay across multiple people, with weekend and out-of-hours rates." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <Link
          to="/hours"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          → Hours-only calculator (16h weekday / 24h weekend)
        </Link>
      </div>
      <OncallCalculator />
    </>
  );
}

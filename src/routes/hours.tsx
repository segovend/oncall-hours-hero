import { createFileRoute } from "@tanstack/react-router";
import { HoursCalculator } from "@/components/HoursCalculator";

export const Route = createFileRoute("/hours")({
  component: HoursPage,
  head: () => ({
    meta: [
      { title: "On-call hours calculator" },
      { name: "description", content: "Calculate on-call hours by date range with weekday/weekend rules." },
    ],
  }),
});

function HoursPage() {
  return <HoursCalculator />;
}

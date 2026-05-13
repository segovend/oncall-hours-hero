import { createFileRoute } from "@tanstack/react-router";
import { OncallCalculator } from "@/components/OncallCalculator";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Oncall — calculate on-call hours & pay" },
      { name: "description", content: "Frontend calculator for on-call hours and pay across multiple people, with weekend and out-of-hours rates." },
    ],
  }),
  component: OncallCalculator,
});

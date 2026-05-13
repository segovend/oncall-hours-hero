import { createFileRoute } from "@tanstack/react-router";
import { OncallV2 } from "@/components/OncallV2";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "On-call hours & payment calculator" },
      { name: "description", content: "Calculate on-call hours and additional payment per cost center, with overrides, flags and Excel export." },
    ],
  }),
  component: OncallV2,
});

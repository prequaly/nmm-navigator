import { createFileRoute } from "@tanstack/react-router";
import { AssessmentRunner } from "@/components/assessments/AssessmentRunner";
import { IMPACT } from "@/lib/assessments/configs";

export const Route = createFileRoute("/_authenticated/assess/impact")({
  head: () => ({ meta: [{ title: `${IMPACT.title} — NMM Navigator` }] }),
  component: () => <AssessmentRunner config={IMPACT} assessmentType="impact" />,
});

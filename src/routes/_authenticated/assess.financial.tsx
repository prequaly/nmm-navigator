import { createFileRoute } from "@tanstack/react-router";
import { AssessmentRunner } from "@/components/assessments/AssessmentRunner";
import { FINANCIAL } from "@/lib/assessments/configs";

export const Route = createFileRoute("/_authenticated/assess/financial")({
  head: () => ({ meta: [{ title: `${FINANCIAL.title} — NMM Navigator` }] }),
  component: () => <AssessmentRunner config={FINANCIAL} assessmentType="financial" />,
});

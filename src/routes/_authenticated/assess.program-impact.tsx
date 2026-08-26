import { createFileRoute } from "@tanstack/react-router";
import { AssessmentRunner } from "@/components/assessments/AssessmentRunner";
import { PROGRAM_IMPACT } from "@/lib/assessments/configs";

export const Route = createFileRoute("/_authenticated/assess/program-impact")({
  head: () => ({ meta: [{ title: `${PROGRAM_IMPACT.title} — NMM Navigator` }] }),
  component: () => <AssessmentRunner config={PROGRAM_IMPACT} assessmentType="program-impact" />,
});

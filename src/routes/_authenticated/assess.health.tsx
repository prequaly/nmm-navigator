import { createFileRoute } from "@tanstack/react-router";
import { AssessmentRunner } from "@/components/assessments/AssessmentRunner";
import { HEALTH } from "@/lib/assessments/configs";

export const Route = createFileRoute("/_authenticated/assess/health")({
  head: () => ({ meta: [{ title: `${HEALTH.title} — NMM Navigator` }] }),
  component: () => <AssessmentRunner config={HEALTH} assessmentType="health" />,
});

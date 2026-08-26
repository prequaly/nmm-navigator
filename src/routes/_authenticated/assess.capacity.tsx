import { createFileRoute } from "@tanstack/react-router";
import { AssessmentRunner } from "@/components/assessments/AssessmentRunner";
import { CAPACITY } from "@/lib/assessments/configs";

export const Route = createFileRoute("/_authenticated/assess/capacity")({
  head: () => ({ meta: [{ title: `${CAPACITY.title} — NMM Navigator` }] }),
  component: () => <AssessmentRunner config={CAPACITY} assessmentType="capacity" />,
});

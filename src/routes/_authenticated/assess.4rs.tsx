import { createFileRoute } from "@tanstack/react-router";
import { AssessmentRunner } from "@/components/assessments/AssessmentRunner";
import { FOURRS } from "@/lib/assessments/configs";

export const Route = createFileRoute("/_authenticated/assess/4rs")({
  head: () => ({ meta: [{ title: `${FOURRS.title} — NMM Navigator` }] }),
  component: () => <AssessmentRunner config={FOURRS} assessmentType="4rs" />,
});

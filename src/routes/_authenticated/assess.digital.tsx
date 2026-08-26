import { createFileRoute } from "@tanstack/react-router";
import { AssessmentRunner } from "@/components/assessments/AssessmentRunner";
import { DIGITAL } from "@/lib/assessments/configs";

export const Route = createFileRoute("/_authenticated/assess/digital")({
  head: () => ({ meta: [{ title: `${DIGITAL.title} — NMM Navigator` }] }),
  component: () => <AssessmentRunner config={DIGITAL} assessmentType="digital" />,
});

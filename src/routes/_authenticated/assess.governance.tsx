import { createFileRoute } from "@tanstack/react-router";
import { AssessmentRunner } from "@/components/assessments/AssessmentRunner";
import { GOVERNANCE } from "@/lib/assessments/configs";

export const Route = createFileRoute("/_authenticated/assess/governance")({
  head: () => ({ meta: [{ title: `${GOVERNANCE.title} — NMM Navigator` }] }),
  component: () => <AssessmentRunner config={GOVERNANCE} assessmentType="governance" />,
});

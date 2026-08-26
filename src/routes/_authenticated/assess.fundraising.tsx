import { createFileRoute } from "@tanstack/react-router";
import { AssessmentRunner } from "@/components/assessments/AssessmentRunner";
import { FUNDRAISING } from "@/lib/assessments/configs";

export const Route = createFileRoute("/_authenticated/assess/fundraising")({
  head: () => ({ meta: [{ title: `${FUNDRAISING.title} — NMM Navigator` }] }),
  component: () => <AssessmentRunner config={FUNDRAISING} assessmentType="fundraising" />,
});

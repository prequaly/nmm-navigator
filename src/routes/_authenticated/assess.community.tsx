import { createFileRoute } from "@tanstack/react-router";
import { AssessmentRunner } from "@/components/assessments/AssessmentRunner";
import { COMMUNITY } from "@/lib/assessments/configs";

export const Route = createFileRoute("/_authenticated/assess/community")({
  head: () => ({ meta: [{ title: `${COMMUNITY.title} — NMM Navigator` }] }),
  component: () => <AssessmentRunner config={COMMUNITY} assessmentType="community" />,
});

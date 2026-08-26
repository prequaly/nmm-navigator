import { createFileRoute } from "@tanstack/react-router";
import { AssessmentRunner } from "@/components/assessments/AssessmentRunner";
import { DEI } from "@/lib/assessments/configs";

export const Route = createFileRoute("/_authenticated/assess/dei")({
  head: () => ({ meta: [{ title: `${DEI.title} — NMM Navigator` }] }),
  component: () => <AssessmentRunner config={DEI} assessmentType="dei" />,
});

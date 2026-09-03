// Tri-state assessment answers (FR Sections 9, 12): every answer is either
// Historical Actual, Projected/Planned, or Not Yet Applicable. "Not Yet
// Applicable" must never lower a score — this module is the single place
// that enforces that by excluding "na" answers from both the numerator and
// the denominator, rather than treating a missing/zero answer as a 0.

export type AnswerStatus = "historical" | "projected" | "na";

export type Answer = {
  status: AnswerStatus;
  value: number | null; // 1-5, null when status is "na"
};

export type Answers = Record<string, Answer>;

// Assessments created before the tri-state shape shipped stored a plain
// number per question. Treat those as "historical" so old completed
// assessments keep rendering and scoring the same as before.
export function normalizeAnswer(raw: unknown): Answer {
  if (raw && typeof raw === "object" && "status" in (raw as Record<string, unknown>)) {
    const r = raw as { status?: unknown; value?: unknown };
    const status: AnswerStatus =
      r.status === "projected" || r.status === "na" ? r.status : "historical";
    const value = typeof r.value === "number" ? r.value : null;
    return { status, value: status === "na" ? null : value };
  }
  if (typeof raw === "number") {
    return { status: "historical", value: raw };
  }
  return { status: "historical", value: null };
}

export function normalizeAnswers(raw: Record<string, unknown> | null | undefined): Answers {
  const out: Answers = {};
  for (const [id, v] of Object.entries(raw ?? {})) out[id] = normalizeAnswer(v);
  return out;
}

/** 0-100, computed only over answers that aren't "na". Returns 0 if every answered question is "na" or nothing's answered yet. */
export function computeScore(answers: Answers): number {
  const scored = Object.values(answers).filter(
    (a): a is Answer & { value: number } => a.status !== "na" && a.value != null,
  );
  if (scored.length === 0) return 0;
  const sum = scored.reduce((s, a) => s + a.value, 0);
  return Math.round((sum / (scored.length * 5)) * 100);
}

/** A question counts as answered whether it got a 1-5 or was marked N/A. */
export function isAnswered(a: Answer | undefined): boolean {
  return !!a && (a.status === "na" || a.value != null);
}

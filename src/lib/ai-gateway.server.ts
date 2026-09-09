import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Direct Google AI Studio (Gemini) access via its OpenAI-compatible endpoint —
// replaces the earlier Lovable-managed gateway now that the project has its
// own free-tier Gemini API key. Model IDs churn fast on Google's side (this
// codebase previously hardcoded the now-defunct "gemini-3-flash-preview"), so
// call sites should prefer the "-latest" aliases (e.g. "gemini-flash-latest")
// over pinning a dated version number.
export function createGeminiProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    // Gemini's OpenAI-compat endpoint supports strict JSON-schema responses
    // (needed for generateObject); without this the SDK falls back to loose
    // "json_object" mode, which some Gemini models don't reliably honor.
    supportsStructuredOutputs: true,
  });
}

/**
 * Model preference order for long-form generation.
 *
 * On the free tier, gemini-flash-latest refuses a large share of requests
 * carrying a real payload — measured at 5 of 6 rejections with a ~8KB prompt,
 * where gemini-flash-lite-latest took 6 of 6. The 503 is Google declining on
 * capacity, not a malformed request, so retrying the same model in a tight
 * loop (which is all the AI SDK does by default) tends to burn all attempts
 * inside the same overload window and surface "Service Unavailable" to the
 * user. Falling back to the lighter model gets an answer instead.
 */
export const TEXT_MODEL_CHAIN = ["gemini-flash-latest", "gemini-flash-lite-latest"] as const;

type MaybeApiError = {
  statusCode?: number;
  status?: number;
  message?: string;
  // The AI SDK wraps its own retries in a RetryError that hides the real
  // status code one level down.
  lastError?: unknown;
  errors?: unknown[];
  cause?: unknown;
};

/** Walks the SDK's RetryError wrapper to reach the underlying failures. */
function errorChain(err: unknown, depth = 0): MaybeApiError[] {
  if (!err || typeof err !== "object" || depth > 4) return [];
  const e = err as MaybeApiError;
  return [
    e,
    ...errorChain(e.lastError, depth + 1),
    ...errorChain(e.cause, depth + 1),
    ...(Array.isArray(e.errors) ? e.errors.flatMap((x) => errorChain(x, depth + 1)) : []),
  ];
}

export type CapacityKind = "overloaded" | "rate-limited" | null;

/**
 * Distinguishes "Google is busy" (503) from "you've asked too often" (429).
 * Both are worth trying the next model for — Gemini's free-tier limits are
 * per-model — but they need different advice when every model is exhausted.
 */
function capacityKind(err: unknown): CapacityKind {
  for (const e of errorChain(err)) {
    const status = e.statusCode ?? e.status;
    const msg = (e.message ?? "").toLowerCase();
    if (
      status === 429 ||
      msg.includes("too many requests") ||
      msg.includes("rate limit") ||
      msg.includes("resource_exhausted")
    ) {
      return "rate-limited";
    }
    if (status === 503 || msg.includes("service unavailable") || msg.includes("overloaded")) {
      return "overloaded";
    }
  }
  return null;
}

/**
 * Runs `attempt` against each model in turn, moving on only when the model is
 * refusing on capacity. Any other failure (bad key, malformed request) throws
 * immediately rather than being retried against a second model.
 */
export async function withModelFallback<T>(
  attempt: (modelId: string) => Promise<T>,
  models: readonly string[] = TEXT_MODEL_CHAIN,
): Promise<T> {
  let lastErr: unknown;
  let lastKind: CapacityKind = null;

  for (const modelId of models) {
    try {
      return await attempt(modelId);
    } catch (err) {
      lastErr = err;
      const kind = capacityKind(err);
      // Anything that isn't a capacity problem (bad key, malformed request)
      // will fail identically on the next model, so surface it now.
      if (!kind) throw err;
      lastKind = kind;
    }
  }

  throw new Error(
    lastKind === "rate-limited"
      ? "You've hit Google's free-tier rate limit — it allows only a few AI generations per minute. " +
          "Wait about a minute and try again."
      : "Google's AI service is busy and turned down every retry. This is free-tier capacity on " +
          "their side, not a problem with your data — wait a moment and try again.",
    { cause: lastErr },
  );
}

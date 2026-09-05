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

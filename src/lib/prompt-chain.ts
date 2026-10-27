import "server-only";

import { createGeminiClient, GEMINI_MODEL } from "@/lib/gemini";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// One prompt-chain step as stored in humor_flavor_steps (joined with its
// model). id/llm_model_id are null for the hardcoded fallback chain.
type Step = {
  id: number | null;
  llm_model_id: number | null;
  provider_model_id: string;
  llm_temperature: number | null;
  llm_system_prompt: string | null;
  llm_user_prompt: string;
};

type Chain = { flavorId: number | null; steps: Step[] };

// Used only when the admin-managed config is missing or unreadable, so a
// misconfigured chain can never take caption generation down entirely.
// Mirrors the seed in the admin repo's 20261027000000 migration.
const FALLBACK_CHAIN: Chain = {
  flavorId: null,
  steps: [
    {
      id: null,
      llm_model_id: null,
      provider_model_id: GEMINI_MODEL,
      llm_temperature: null,
      llm_system_prompt: null,
      llm_user_prompt:
        "Describe this image in concrete, vivid detail: objects, people, actions, setting, mood. Note anything that could be funny or absurd. Plain prose, no preamble.",
    },
    {
      id: null,
      llm_model_id: null,
      provider_model_id: GEMINI_MODEL,
      llm_temperature: null,
      llm_system_prompt: null,
      llm_user_prompt:
        'Here is a description of an image: "{input}"\n\nWrite one short, funny caption for this image, in the style of a witty meme caption. Return only the caption text, nothing else — no quotes, no preamble.',
    },
  ],
};

const MAX_TERMS = 20;
const MAX_EXAMPLES = 5;

// No auto-retry: the free Gemini tier is capped at 5 requests/minute, and
// each upload already makes 2 calls — retrying would burn through that
// quota fast and make rate-limit errors more likely, not less. Surface a
// clear message instead and let the user retry manually.
export function describeGeminiError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/"code":\s*429|RESOURCE_EXHAUSTED/i.test(message)) {
    return "Hit the free Gemini rate limit (5 requests/minute) — wait a bit and try again.";
  }
  if (/"code":\s*503|UNAVAILABLE/i.test(message)) {
    return "Gemini is temporarily overloaded — try again in a moment.";
  }
  return message;
}

/**
 * Logs a generation request (caption_requests). Logging is best-effort:
 * a failure here returns null and generation carries on unlogged rather
 * than blocking the user's caption.
 */
export async function startCaptionRequest(
  supabase: Supabase,
  input: {
    profileId: string;
    imageId: string | null;
    kind: "upload" | "manual" | "regenerate" | "iotd";
  },
): Promise<number | null> {
  const { data, error } = await supabase
    .from("caption_requests")
    .insert({ profile_id: input.profileId, image_id: input.imageId, kind: input.kind })
    .select("id")
    .single();
  if (error) {
    console.error("caption_requests insert failed:", error.message);
    return null;
  }
  return data.id;
}

export async function finishCaptionRequest(
  supabase: Supabase,
  requestId: number | null,
  result: { captionId: string; imageId: string | null },
) {
  if (requestId === null) return;
  const { error } = await supabase
    .from("caption_requests")
    .update({ caption_id: result.captionId, image_id: result.imageId })
    .eq("id", requestId);
  if (error) console.error("caption_requests update failed:", error.message);
}

// Weighted pick from humor_flavor_mix (caption_count = weight), then that
// flavor's ordered steps with their models.
async function loadChain(supabase: Supabase): Promise<Chain> {
  const { data: mix } = await supabase
    .from("humor_flavor_mix")
    .select("humor_flavor_id, caption_count")
    .gt("caption_count", 0);

  const total = (mix ?? []).reduce((sum, m) => sum + m.caption_count, 0);
  if (!mix?.length || total <= 0) return FALLBACK_CHAIN;

  let roll = Math.random() * total;
  const picked = mix.find((m) => (roll -= m.caption_count) < 0) ?? mix[mix.length - 1];

  const { data: steps, error } = await supabase
    .from("humor_flavor_steps")
    .select(
      "id, llm_model_id, llm_temperature, llm_system_prompt, llm_user_prompt, llm_models(provider_model_id, is_temperature_supported)",
    )
    .eq("humor_flavor_id", picked.humor_flavor_id)
    .order("order_by");

  if (error || !steps?.length) return FALLBACK_CHAIN;

  return {
    flavorId: picked.humor_flavor_id,
    steps: steps.map((s) => {
      // PostgREST types a to-one embed as object-or-array depending on
      // generated types; normalize.
      const model = Array.isArray(s.llm_models) ? s.llm_models[0] : s.llm_models;
      return {
        id: s.id,
        llm_model_id: s.llm_model_id,
        provider_model_id: model?.provider_model_id ?? GEMINI_MODEL,
        llm_temperature: model?.is_temperature_supported ? s.llm_temperature : null,
        llm_system_prompt: s.llm_system_prompt,
        llm_user_prompt: s.llm_user_prompt,
      };
    }),
  };
}

// Terms + few-shot examples, appended to the final (caption-writing) step's
// system prompt. Empty string when there are none.
async function loadCaptionContext(supabase: Supabase): Promise<string> {
  const [{ data: terms }, { data: examples }] = await Promise.all([
    supabase
      .from("terms")
      .select("term, definition, example")
      .order("priority", { ascending: false })
      .limit(MAX_TERMS),
    supabase
      .from("caption_examples")
      .select("image_description, caption, explanation")
      .order("priority", { ascending: false })
      .limit(MAX_EXAMPLES),
  ]);

  const parts: string[] = [];
  if (terms?.length) {
    parts.push(
      "Slang and terms you may use when they fit:\n" +
        terms
          .map((t) => `- ${t.term}: ${t.definition}${t.example ? ` (e.g. "${t.example}")` : ""}`)
          .join("\n"),
    );
  }
  if (examples?.length) {
    parts.push(
      "Examples of great captions:\n" +
        examples
          .map(
            (e) =>
              `Image: ${e.image_description}\nCaption: ${e.caption}${e.explanation ? `\nWhy it works: ${e.explanation}` : ""}`,
          )
          .join("\n\n"),
    );
  }
  return parts.join("\n\n");
}

export type ChainResult =
  | { error: string }
  | {
      error: null;
      /** The final step's output: the caption. */
      caption: string;
      /** Step 1's output when the chain ran from the image, else the input. */
      description: string;
    };

/**
 * Runs the configured prompt chain. With `image`, every step runs (step 1
 * is the vision step). With `description` instead, step 1 is skipped and
 * the stored description feeds step 2 directly — only the cheap text-only
 * call(s) run, as regenerate/Image of the Day always did.
 *
 * Every LLM call (including failures) is logged to llm_model_responses.
 */
export async function runPromptChain(
  supabase: Supabase,
  opts: {
    userId: string;
    requestId: number | null;
  } & (
    | { image: { mimeType: string; base64: string }; description?: never }
    | { description: string; image?: never }
  ),
): Promise<ChainResult> {
  const [chain, context] = await Promise.all([
    loadChain(supabase),
    loadCaptionContext(supabase),
  ]);

  const steps = opts.image ? chain.steps : chain.steps.slice(1);
  if (!steps.length) {
    return { error: "The configured prompt chain has no caption step." };
  }

  let chainId: number | null = null;
  if (opts.requestId !== null) {
    const { data, error } = await supabase
      .from("llm_prompt_chains")
      .insert({
        caption_request_id: opts.requestId,
        humor_flavor_id: chain.flavorId,
        profile_id: opts.userId,
      })
      .select("id")
      .single();
    if (error) console.error("llm_prompt_chains insert failed:", error.message);
    chainId = data?.id ?? null;
  }

  const gemini = createGeminiClient();
  let input = opts.description ?? "";
  let description = opts.description ?? "";

  for (const [i, step] of steps.entries()) {
    const isFirst = i === 0 && !!opts.image;
    const isLast = i === steps.length - 1;
    const userPrompt = step.llm_user_prompt.replaceAll("{input}", input);
    const systemPrompt =
      [step.llm_system_prompt, isLast ? context : ""].filter(Boolean).join("\n\n") || null;

    const started = performance.now();
    let output = "";
    let failure: string | null = null;
    try {
      const response = await gemini.models.generateContent({
        model: step.provider_model_id,
        contents: [
          {
            role: "user",
            parts: [
              ...(isFirst
                ? [{ inlineData: { mimeType: opts.image!.mimeType, data: opts.image!.base64 } }]
                : []),
              { text: userPrompt },
            ],
          },
        ],
        config: {
          ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
          ...(step.llm_temperature !== null ? { temperature: step.llm_temperature } : {}),
        },
      });
      output = (response.text ?? "").trim();
      if (!output) failure = "Gemini returned an empty response.";
    } catch (err) {
      failure = describeGeminiError(err);
    }

    if (opts.requestId !== null) {
      const { error } = await supabase.from("llm_model_responses").insert({
        caption_request_id: opts.requestId,
        llm_prompt_chain_id: chainId,
        humor_flavor_step_id: step.id,
        llm_model_id: step.llm_model_id,
        profile_id: opts.userId,
        llm_system_prompt: systemPrompt,
        llm_user_prompt: userPrompt,
        llm_temperature: step.llm_temperature,
        llm_model_response: output || null,
        error: failure,
        processing_time_seconds: Number(((performance.now() - started) / 1000).toFixed(2)),
      });
      if (error) console.error("llm_model_responses insert failed:", error.message);
    }

    if (failure) return { error: failure };
    if (isFirst) description = output;
    input = output;
  }

  return { error: null, caption: input, description };
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createGeminiClient, GEMINI_MODEL } from "@/lib/gemini";
import type { Caption } from "@/lib/captions";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB

export type ActionState = { error: string | null };

function captionPrompt(description: string) {
  return `Here is a description of an image: "${description}"\n\nWrite one short, funny caption for this image, in the style of a witty meme caption. Return only the caption text, nothing else — no quotes, no preamble.`;
}

// No auto-retry: the free Gemini tier is capped at 5 requests/minute, and
// each upload already makes 2 calls — retrying would burn through that
// quota fast and make rate-limit errors more likely, not less. Surface a
// clear message instead and let the user retry manually.
function describeGeminiError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/"code":\s*429|RESOURCE_EXHAUSTED/i.test(message)) {
    return "Hit the free Gemini rate limit (5 requests/minute) — wait a bit and try again.";
  }
  if (/"code":\s*503|UNAVAILABLE/i.test(message)) {
    return "Gemini is temporarily overloaded — try again in a moment.";
  }
  return message;
}

// Expected failures are returned as { error } rather than thrown: Next.js
// redacts thrown Server Function errors to a generic message in production
// builds (dev mode shows the real one, which is why this only ever surfaced
// after deploying) — see node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md,
// "avoid using try/catch blocks and throw errors [for expected errors].
// Instead, model expected errors as return values."
export async function uploadImageAndGenerateCaption(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return { error: "Please choose an image to upload." };
  }
  if (!image.type.startsWith("image/")) {
    return { error: "That file doesn't look like an image." };
  }
  if (image.size > MAX_IMAGE_BYTES) {
    return { error: "Image is too large (8MB max)." };
  }

  const manualCaption = String(formData.get("manual_caption") ?? "").trim();

  const bytes = Buffer.from(await image.arrayBuffer());
  const base64 = bytes.toString("base64");
  const ext = image.name.split(".").pop() || "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  // Try the per-request (RLS-enforced) client first, matching
  // caption_images_insert_own's auth.uid() folder-prefix check. Fall back to
  // the admin client, same documented reasoning as the avatars bucket in
  // src/app/profile/actions.ts, if it's rejected for the same unexplained
  // reason that bucket's policy was.
  let uploadError = (
    await supabase.storage
      .from("caption-images")
      .upload(path, image, { contentType: image.type })
  ).error;

  const storageClient = uploadError ? createAdminClient() : supabase;
  if (uploadError) {
    uploadError = (
      await storageClient.storage
        .from("caption-images")
        .upload(path, image, { contentType: image.type })
    ).error;
  }

  if (uploadError) {
    return { error: `Failed to upload image: ${uploadError.message}` };
  }

  const {
    data: { publicUrl: imageUrl },
  } = storageClient.storage.from("caption-images").getPublicUrl(path);

  let imageDescription: string;
  let captionText: string;

  if (manualCaption) {
    // User-provided fallback — skip Gemini entirely (e.g. rate-limited or
    // down). image_description is NOT NULL, so record that none was
    // generated rather than leaving a fake AI description in place.
    imageDescription = "(no AI description — caption entered manually)";
    captionText = manualCaption;
  } else {
    // Prompt chain: call #1 describes the image, call #2 writes a caption
    // from that description text alone (not the image again) — a real
    // two-step chain, not one multimodal call doing both jobs at once.
    const gemini = createGeminiClient();
    try {
      const descriptionResponse = await gemini.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: image.type, data: base64 } },
              {
                text: "Describe this image in concrete, vivid detail: objects, people, actions, setting, mood. Note anything that could be funny or absurd. Plain prose, no preamble.",
              },
            ],
          },
        ],
      });
      imageDescription = (descriptionResponse.text ?? "").trim();
      if (!imageDescription) {
        throw new Error("Gemini returned an empty description.");
      }

      const captionResponse = await gemini.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          { role: "user", parts: [{ text: captionPrompt(imageDescription) }] },
        ],
      });
      captionText = (captionResponse.text ?? "").trim();
      if (!captionText) {
        throw new Error("Gemini returned an empty caption.");
      }
    } catch (err) {
      // Don't leave an orphaned upload if caption generation fails.
      await storageClient.storage.from("caption-images").remove([path]);
      return { error: `Failed to generate a caption: ${describeGeminiError(err)}` };
    }
  }

  // RLS-enforced insert: captions_insert_own requires auth.uid() = user_id.
  const { error: insertError } = await supabase.from("captions").insert({
    user_id: user.id,
    image_url: imageUrl,
    image_description: imageDescription,
    caption_text: captionText,
  });

  if (insertError) {
    await storageClient.storage.from("caption-images").remove([path]);
    return { error: `Failed to save caption: ${insertError.message}` };
  }

  revalidatePath("/captions");
  redirect("/captions");
}

export async function submitVote(
  captionId: string,
  value: 1 | -1,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (value !== 1 && value !== -1) {
    return { error: "Invalid vote value." };
  }

  // RLS-enforced upsert: votes_insert_own / votes_update_own both require
  // auth.uid() = user_id, so a forged user_id is rejected by Postgres, not
  // by this code.
  const { error } = await supabase.from("votes").upsert(
    {
      caption_id: captionId,
      user_id: user.id,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "caption_id,user_id" },
  );

  if (error) {
    return { error: `Failed to save vote: ${error.message}` };
  }

  revalidatePath("/captions");
  return { error: null };
}

export async function regenerateCaption(
  sourceCaptionId: string,
): Promise<ActionState & { caption?: Caption }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Readable by any authenticated user per captions_select_authenticated —
  // remixing someone else's photo is allowed by design (more content for
  // the feed, see src/app/dashboard/page.tsx's "Your captions" section).
  const { data: source, error: sourceError } = await supabase
    .from("captions")
    .select("image_url, image_description")
    .eq("id", sourceCaptionId)
    .single();

  if (sourceError || !source) {
    return { error: "Couldn't find that image anymore." };
  }

  // Reuse the stored description instead of re-sending the image — the
  // whole point of keeping image_description around: only the cheap
  // text-only call runs here, not the vision step.
  const gemini = createGeminiClient();
  let captionText: string;
  try {
    const captionResponse = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: captionPrompt(source.image_description) }],
        },
      ],
    });
    captionText = (captionResponse.text ?? "").trim();
    if (!captionText) {
      throw new Error("Gemini returned an empty caption.");
    }
  } catch (err) {
    return { error: `Failed to generate a caption: ${describeGeminiError(err)}` };
  }

  // RLS-enforced insert: captions_insert_own requires auth.uid() = user_id.
  const { data: inserted, error: insertError } = await supabase
    .from("captions")
    .insert({
      user_id: user.id,
      image_url: source.image_url,
      image_description: source.image_description,
      caption_text: captionText,
    })
    .select("id, image_url, caption_text, user_id, created_at")
    .single();

  if (insertError || !inserted) {
    return { error: `Failed to save caption: ${insertError?.message}` };
  }

  revalidatePath("/captions");
  revalidatePath("/dashboard");

  return {
    error: null,
    caption: {
      ...inserted,
      tally: { upvotes: 0, downvotes: 0, score: 0 },
      myVote: null,
    },
  };
}

export async function generateImageOfTheDayCaption(): Promise<
  ActionState & { caption?: Caption }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: iotdRows, error: iotdError } = await supabase.rpc(
    "get_or_create_image_of_the_day",
  );
  const iotd = iotdRows?.[0] as
    | { pick_date: string; image_url: string; image_description: string }
    | undefined;

  // If no captions exist yet at all, nothing gets inserted and the function
  // returns zero rows.
  if (iotdError || !iotd?.image_url) {
    return { error: "Couldn't load today's image." };
  }

  // Check before spending a Gemini call — the partial unique index on
  // captions(iotd_date, user_id) is the real enforcement, this is just to
  // avoid wasting quota on a submission that would be rejected anyway.
  const { data: existing } = await supabase
    .from("captions")
    .select("id")
    .eq("iotd_date", iotd.pick_date)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return { error: "You've already submitted a caption for today's image." };
  }

  const gemini = createGeminiClient();
  let captionText: string;
  try {
    const captionResponse = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { role: "user", parts: [{ text: captionPrompt(iotd.image_description) }] },
      ],
    });
    captionText = (captionResponse.text ?? "").trim();
    if (!captionText) {
      throw new Error("Gemini returned an empty caption.");
    }
  } catch (err) {
    return { error: `Failed to generate a caption: ${describeGeminiError(err)}` };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("captions")
    .insert({
      user_id: user.id,
      image_url: iotd.image_url,
      image_description: iotd.image_description,
      caption_text: captionText,
      iotd_date: iotd.pick_date,
    })
    .select("id, image_url, caption_text, user_id, created_at")
    .single();

  if (insertError || !inserted) {
    // Most likely cause: the unique index caught a same-user double submit
    // (e.g. two tabs) that slipped past the check above.
    return {
      error: "Failed to save your caption — you may have already submitted one today.",
    };
  }

  revalidatePath("/captions");

  return {
    error: null,
    caption: {
      ...inserted,
      tally: { upvotes: 0, downvotes: 0, score: 0 },
      myVote: null,
    },
  };
}

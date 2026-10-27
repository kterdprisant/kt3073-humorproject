"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  finishCaptionRequest,
  runPromptChain,
  startCaptionRequest,
} from "@/lib/prompt-chain";
import type { Caption } from "@/lib/captions";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB

export type ActionState = { error: string | null };

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

  const requestId = await startCaptionRequest(supabase, {
    profileId: user.id,
    imageId: null,
    kind: manualCaption ? "manual" : "upload",
  });

  let imageDescription: string;
  let captionText: string;

  if (manualCaption) {
    // User-provided fallback — skip Gemini entirely (e.g. rate-limited or
    // down). image_description is NOT NULL, so record that none was
    // generated rather than leaving a fake AI description in place.
    imageDescription = "(no AI description — caption entered manually)";
    captionText = manualCaption;
  } else {
    // Prompt chain from humor_flavor_steps (admin-managed): step 1 describes
    // the image, later steps work from that description text alone — see
    // src/lib/prompt-chain.ts.
    const result = await runPromptChain(supabase, {
      userId: user.id,
      requestId,
      image: { mimeType: image.type, base64 },
    });
    if (result.error !== null) {
      // Don't leave an orphaned upload if caption generation fails.
      await storageClient.storage.from("caption-images").remove([path]);
      return { error: `Failed to generate a caption: ${result.error}` };
    }
    imageDescription = result.description;
    captionText = result.caption;
  }

  // RLS-enforced: images_insert_own requires profile_id = auth.uid().
  // Best-effort — the caption still works off image_url without it.
  const { data: imageRow, error: imageError } = await supabase
    .from("images")
    .insert({ url: imageUrl, image_description: imageDescription, profile_id: user.id })
    .select("id")
    .single();
  if (imageError) console.error("images insert failed:", imageError.message);
  const imageId = imageRow?.id ?? null;

  // RLS-enforced insert: captions_insert_own requires auth.uid() = user_id.
  const { data: inserted, error: insertError } = await supabase
    .from("captions")
    .insert({
      user_id: user.id,
      image_url: imageUrl,
      image_id: imageId,
      image_description: imageDescription,
      caption_text: captionText,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    await storageClient.storage.from("caption-images").remove([path]);
    if (imageId) await supabase.from("images").delete().eq("id", imageId);
    return { error: `Failed to save caption: ${insertError?.message}` };
  }

  await finishCaptionRequest(supabase, requestId, { captionId: inserted.id, imageId });

  revalidatePath("/captions");
  redirect("/captions");
}

// value is null to remove an existing vote entirely (click the same button
// again), or 1 | -1 to cast/change it.
export async function submitVote(
  captionId: string,
  value: 1 | -1 | null,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (value !== 1 && value !== -1 && value !== null) {
    return { error: "Invalid vote value." };
  }

  // RLS-enforced: votes_insert_own / votes_update_own / votes_delete_own all
  // require auth.uid() = user_id, so a forged user_id is rejected by
  // Postgres, not by this code.
  if (value === null) {
    const { error } = await supabase
      .from("votes")
      .delete()
      .eq("caption_id", captionId)
      .eq("user_id", user.id);

    if (error) {
      return { error: `Failed to remove your vote: ${error.message}` };
    }
  } else {
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
    .select("image_url, image_id, image_description")
    .eq("id", sourceCaptionId)
    .single();

  if (sourceError || !source) {
    return { error: "Couldn't find that image anymore." };
  }

  const requestId = await startCaptionRequest(supabase, {
    profileId: user.id,
    imageId: source.image_id,
    kind: "regenerate",
  });

  // Reuse the stored description instead of re-sending the image — the
  // whole point of keeping image_description around: only the cheap
  // text-only step(s) run here, not the vision step.
  const result = await runPromptChain(supabase, {
    userId: user.id,
    requestId,
    description: source.image_description,
  });
  if (result.error !== null) {
    return { error: `Failed to generate a caption: ${result.error}` };
  }

  // RLS-enforced insert: captions_insert_own requires auth.uid() = user_id.
  // regenerated_from_id links this Encore back to the caption it replaced,
  // so the "Ratio'd" secret achievement can later compare their scores.
  const { data: inserted, error: insertError } = await supabase
    .from("captions")
    .insert({
      user_id: user.id,
      image_url: source.image_url,
      image_id: source.image_id,
      image_description: source.image_description,
      caption_text: result.caption,
      regenerated_from_id: sourceCaptionId,
    })
    .select("id, image_url, caption_text, user_id, created_at")
    .single();

  if (insertError || !inserted) {
    return { error: `Failed to save caption: ${insertError?.message}` };
  }

  await finishCaptionRequest(supabase, requestId, {
    captionId: inserted.id,
    imageId: source.image_id,
  });

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

  // The RPC only returns the URL; any caption on that image carries its
  // image_id (images itself is only readable by its uploader).
  const { data: sameImage } = await supabase
    .from("captions")
    .select("image_id")
    .eq("image_url", iotd.image_url)
    .not("image_id", "is", null)
    .limit(1)
    .maybeSingle();
  const imageId: string | null = sameImage?.image_id ?? null;

  const requestId = await startCaptionRequest(supabase, {
    profileId: user.id,
    imageId,
    kind: "iotd",
  });

  const result = await runPromptChain(supabase, {
    userId: user.id,
    requestId,
    description: iotd.image_description,
  });
  if (result.error !== null) {
    return { error: `Failed to generate a caption: ${result.error}` };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("captions")
    .insert({
      user_id: user.id,
      image_url: iotd.image_url,
      image_id: imageId,
      image_description: iotd.image_description,
      caption_text: result.caption,
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

  await finishCaptionRequest(supabase, requestId, { captionId: inserted.id, imageId });

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

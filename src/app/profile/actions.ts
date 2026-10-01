"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const redirectTo = String(formData.get("redirect_to") ?? "/profile");
  const avatar = formData.get("avatar");

  const updates: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  } = {
    first_name: firstName,
    last_name: lastName,
  };

  const admin = createAdminClient();

  if (avatar instanceof File && avatar.size > 0) {
    const ext = avatar.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar.${ext}`;

    // Service-role upload: bypasses the Storage bucket's RLS policy, see
    // admin.ts. Path is scoped to the verified session's own user id.
    const { error: uploadError } = await admin.storage
      .from("avatars")
      .upload(path, avatar, { upsert: true, contentType: avatar.type });

    if (uploadError) {
      throw new Error(`Failed to upload photo: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = admin.storage.from("avatars").getPublicUrl(path);

    // Cache-bust so the new photo shows immediately even though the path
    // (and therefore the URL) is the same as before.
    updates.avatar_url = `${publicUrl}?t=${Date.now()}`;
  }

  // RLS-enforced write: profiles_update_own requires auth.uid() = id, which
  // is exactly what stops a forged id here — not application code.
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  revalidatePath("/profile");
  revalidatePath("/complete-profile");
  redirect(redirectTo);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

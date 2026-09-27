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

  const updates = {
    first_name: firstName,
    last_name: lastName,
  };

  // Service-role write: profiles has no RLS policy yet, see admin.ts.
  // user.id comes from the verified session above, never from the client.
  const { error } = await createAdminClient()
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

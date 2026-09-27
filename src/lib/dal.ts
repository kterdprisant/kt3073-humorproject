import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  email: string | null;
};

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  // Service-role read: profiles has no RLS policy yet, see admin.ts.
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, avatar_url, email")
    .eq("id", userId)
    .single();
  return data;
}

export function isProfileComplete(profile: Profile | null) {
  return Boolean(profile?.first_name?.trim() && profile?.last_name?.trim());
}

/** Redirects to /login if there is no authenticated user. */
export async function requireUser() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

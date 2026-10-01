import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile, isProfileComplete } from "@/lib/dal";

// Redirect URI configured in Supabase (Authentication -> URL Configuration)
// and passed as `redirectTo` from signInWithOAuth. Keep this the only path
// ever used for that — no other route, no extra query params.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const profile = await getProfile(user.id);
    if (!isProfileComplete(profile)) {
      return NextResponse.redirect(`${origin}/complete-profile`);
    }
  }

  return NextResponse.redirect(`${origin}/captions`);
}

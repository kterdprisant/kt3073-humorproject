import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, isProfileComplete } from "@/lib/dal";

// Signup gating (admin-managed): the email must be whitelisted exactly, or
// be on an allowed domain or one of its subdomains. Read with the service-role
// client — neither list is granted to anon/authenticated. Fails closed.
async function isEmailAllowed(email: string | undefined) {
  if (!email) return false;
  const address = email.toLowerCase();
  const domain = address.split("@")[1] ?? "";
  // "cs.columbia.edu" → ["cs.columbia.edu", "columbia.edu", "edu"]
  const domains = domain.split(".").map((_, i, parts) => parts.slice(i).join("."));

  const admin = createAdminClient();
  const [whitelisted, allowedDomain] = await Promise.all([
    admin
      .from("whitelist_email_addresses")
      .select("id")
      .eq("email_address", address)
      .limit(1),
    admin
      .from("allowed_signup_domains")
      .select("id")
      .in("apex_domain", domains)
      .limit(1),
  ]);

  return Boolean(whitelisted.data?.length || allowedDomain.data?.length);
}

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

  if (!(await isEmailAllowed(user?.email))) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=not_allowed`);
  }

  if (user) {
    const profile = await getProfile(user.id);
    if (!isProfileComplete(profile)) {
      return NextResponse.redirect(`${origin}/complete-profile`);
    }
  }

  return NextResponse.redirect(`${origin}/captions`);
}

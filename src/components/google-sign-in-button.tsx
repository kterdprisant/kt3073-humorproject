"use client";

import { createClient } from "@/lib/supabase/client";

export function GoogleSignInButton() {
  const handleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <button
      onClick={handleSignIn}
      className="rounded-md border border-neutral-700 bg-neutral-900 px-4 py-2 font-medium text-neutral-100 transition-colors hover:bg-neutral-800"
    >
      Continue with Google
    </button>
  );
}

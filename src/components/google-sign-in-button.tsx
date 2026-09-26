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
      className="rounded-md border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50"
    >
      Continue with Google
    </button>
  );
}

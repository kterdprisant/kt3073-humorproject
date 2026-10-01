import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for privileged, server-only operations. `profiles` now
 * has real RLS policies (`profiles_select_own`/`profiles_update_own`, see the
 * Assignment #4 migration) and no longer needs this for table reads/writes —
 * use the normal per-request client (`src/lib/supabase/server.ts`) for those.
 *
 * Still used for: uploading to the `avatars` Storage bucket, and as a
 * documented fallback for `caption-images` uploads if that bucket's RLS
 * policy reproduces the same unexplained rejection `avatars`' policy had.
 *
 * Because RLS is bypassed here, every call site MUST scope its query/path to
 * the currently authenticated user's own id (from `supabase.auth.getUser()`),
 * never to a client-supplied id. Never import this from a Client Component
 * or anywhere that could ship it to the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

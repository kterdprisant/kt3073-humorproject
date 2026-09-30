import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for privileged, server-only operations: reading/
 * writing a user's own `profiles` row, and uploading their avatar to the
 * `avatars` Storage bucket. `profiles` has RLS enabled with no policies yet
 * (out of scope for this assignment: "do not update/enable/disable any RLS
 * policies"), and the Storage bucket's own RLS policy didn't reliably match
 * real upload requests, so the normal per-request client can't be used for
 * either. The service role key bypasses RLS by privilege level, not by
 * changing any policy — so RLS on `profiles` and the Storage policy both
 * stay exactly as-is.
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

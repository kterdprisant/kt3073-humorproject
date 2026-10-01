import Link from "next/link";
import { getUser, getProfile } from "@/lib/dal";
import { signOut } from "@/app/profile/actions";

export async function NavBar() {
  const user = await getUser();
  const profile = user ? await getProfile(user.id) : null;

  return (
    <nav className="sticky top-0 z-10 flex items-center justify-between border-b border-black/5 bg-white/80 px-6 py-3 backdrop-blur">
      <Link href="/" className="font-semibold tracking-tight">
        Humor Project
      </Link>
      <div className="flex items-center gap-5 text-sm text-gray-700">
        {user ? (
          <>
            <Link href="/captions" className="hover:text-black">
              Feed
            </Link>
            <Link href="/dashboard" className="hover:text-black">
              Dashboard
            </Link>
            <Link href="/profile" className="flex items-center gap-2 hover:text-black">
              {profile?.avatar_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-6 w-6 rounded-full object-cover"
                />
              )}
              Profile
            </Link>
            <form action={signOut}>
              <button type="submit" className="text-gray-400 hover:text-black">
                Sign out
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className="hover:text-black">
            Log in
          </Link>
        )}
      </div>
    </nav>
  );
}

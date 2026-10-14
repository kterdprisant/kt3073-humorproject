import Link from "next/link";
import Image from "next/image";
import { getUser, getProfile } from "@/lib/dal";
import { signOut } from "@/app/profile/actions";

export async function NavBar() {
  const user = await getUser();
  const profile = user ? await getProfile(user.id) : null;

  return (
    <nav className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-neutral-800 bg-neutral-950/90 px-6 backdrop-blur">
      <Link href="/" className="flex items-center">
        <Image
          src="/spotlight-badge.png"
          alt="Open Mic AI"
          width={400}
          height={200}
          priority
          className="neon-wordmark h-11 w-auto"
        />
      </Link>
      <div className="flex items-center gap-5 text-sm text-neutral-300">
        {user ? (
          <>
            <Link href="/captions" className="hover:text-amber-400">
              The Stage
            </Link>
            <Link href="/dashboard" className="hover:text-amber-400">
              Green Room
            </Link>
            <Link
              href="/profile"
              className="flex items-center gap-2 hover:text-amber-400"
            >
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
              <button type="submit" className="text-neutral-500 hover:text-amber-400">
                Sign out
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className="hover:text-amber-400">
            Log in
          </Link>
        )}
      </div>
    </nav>
  );
}

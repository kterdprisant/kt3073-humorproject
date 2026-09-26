import Link from "next/link";
import { getUser } from "@/lib/dal";
import { signOut } from "@/app/profile/actions";

export async function NavBar() {
  const user = await getUser();

  return (
    <nav className="flex items-center justify-between border-b border-gray-200 px-8 py-4">
      <Link href="/" className="font-semibold">
        Humor Project
      </Link>
      <div className="flex items-center gap-4 text-sm">
        {user ? (
          <>
            <Link href="/jokes" className="underline">
              Jokes
            </Link>
            <Link href="/profile" className="underline">
              Profile
            </Link>
            <form action={signOut}>
              <button type="submit" className="text-gray-500 underline">
                Sign out
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className="underline">
            Log in
          </Link>
        )}
      </div>
    </nav>
  );
}

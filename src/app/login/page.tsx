import { redirect } from "next/navigation";
import Image from "next/image";
import { getUser } from "@/lib/dal";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

const ERRORS: Record<string, string> = {
  not_allowed:
    "That account isn't on the guest list — sign in with an approved school email, or ask an admin to whitelist you.",
  auth_failed: "Sign-in failed. Please try again.",
  missing_code: "Sign-in failed. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const user = await getUser();
  if (user) {
    redirect("/captions");
  }

  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-6 p-8 text-center">
      <Image
        src="/joyful-robot-spotlight.png"
        alt=""
        width={1312}
        height={1199}
        priority
        className="h-auto w-full max-w-xs"
      />
      <h1 className="text-3xl font-semibold text-neutral-100">🎤 Grab the mic</h1>
      <p className="text-neutral-400">Sign in to take the stage and rate the lineup.</p>
      {message && (
        <p role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {message}
        </p>
      )}
      <GoogleSignInButton />
    </main>
  );
}

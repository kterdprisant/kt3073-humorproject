import { redirect } from "next/navigation";
import Image from "next/image";
import { getUser } from "@/lib/dal";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default async function LoginPage() {
  const user = await getUser();
  if (user) {
    redirect("/captions");
  }

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
      <GoogleSignInButton />
    </main>
  );
}

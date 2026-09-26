import { redirect } from "next/navigation";
import { getUser } from "@/lib/dal";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default async function LoginPage() {
  const user = await getUser();
  if (user) {
    redirect("/jokes");
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-semibold">Log in</h1>
      <p className="text-gray-600">Sign in to view jokes and your profile.</p>
      <GoogleSignInButton />
    </main>
  );
}

import { redirect } from "next/navigation";
import { requireUser, getProfile, isProfileComplete } from "@/lib/dal";
import { ProfileForm } from "@/components/profile-form";

export default async function CompleteProfilePage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (isProfileComplete(profile)) {
    redirect("/captions");
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-2 text-3xl font-semibold text-neutral-100">
        Before you take the stage
      </h1>
      <p className="mb-6 text-neutral-400">Just need your name before you can continue.</p>
      <ProfileForm
        defaultFirstName={profile?.first_name ?? ""}
        defaultLastName={profile?.last_name ?? ""}
        avatarUrl={profile?.avatar_url ?? null}
        redirectTo="/captions"
        submitLabel="Continue"
      />
    </main>
  );
}

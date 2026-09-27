import { redirect } from "next/navigation";
import { requireUser, getProfile, isProfileComplete } from "@/lib/dal";
import { ProfileForm } from "@/components/profile-form";

export default async function CompleteProfilePage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (isProfileComplete(profile)) {
    redirect("/jokes");
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-2 text-3xl font-semibold">Finish setting up your profile</h1>
      <p className="mb-6 text-gray-600">
        Just need your name before you can continue.
      </p>
      <ProfileForm
        defaultFirstName={profile?.first_name ?? ""}
        defaultLastName={profile?.last_name ?? ""}
        redirectTo="/jokes"
        submitLabel="Continue"
      />
    </main>
  );
}

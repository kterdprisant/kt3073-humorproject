import { requireUser, getProfile } from "@/lib/dal";
import { ProfileForm } from "@/components/profile-form";
import { signOut } from "./actions";

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-6 text-3xl font-semibold">Profile</h1>
      <ProfileForm
        defaultFirstName={profile?.first_name ?? ""}
        defaultLastName={profile?.last_name ?? ""}
        avatarUrl={profile?.avatar_url ?? null}
        redirectTo="/profile"
      />
      <form action={signOut} className="mt-6">
        <button type="submit" className="text-sm text-gray-500 underline">
          Sign out
        </button>
      </form>
    </main>
  );
}

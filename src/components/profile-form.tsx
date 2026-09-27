"use client";

import { useActionState } from "react";
import { unstable_rethrow } from "next/navigation";
import { updateProfile } from "@/app/profile/actions";

type ProfileFormProps = {
  defaultFirstName: string;
  defaultLastName: string;
  redirectTo: string;
  submitLabel?: string;
};

async function action(_prevState: unknown, formData: FormData) {
  try {
    await updateProfile(formData);
    return { error: null };
  } catch (err) {
    // redirect() throws internally on success; let that propagate.
    unstable_rethrow(err);
    return { error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export function ProfileForm({
  defaultFirstName,
  defaultLastName,
  redirectTo,
  submitLabel = "Save",
}: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="redirect_to" value={redirectTo} />

      <div className="flex flex-col gap-1">
        <label htmlFor="first_name" className="text-sm font-medium">
          First name
        </label>
        <input
          id="first_name"
          name="first_name"
          defaultValue={defaultFirstName}
          className="rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="last_name" className="text-sm font-medium">
          Last name
        </label>
        <input
          id="last_name"
          name="last_name"
          defaultValue={defaultLastName}
          className="rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-black px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

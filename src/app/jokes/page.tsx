import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";

async function JokeList() {
  await connection();
  const supabase = await createClient();
  const { data: jokes, error } = await supabase
    .from("jokes")
    .select("id, joke, author, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="text-red-600">Failed to load jokes: {error.message}</p>;
  }

  if (!jokes?.length) {
    return <p>No jokes yet.</p>;
  }

  return (
    <ul className="space-y-4">
      {jokes.map((j) => (
        <li key={j.id} className="rounded-lg border border-gray-300 p-4">
          <p className="text-lg">{j.joke}</p>
          <p className="mt-2 text-sm text-gray-500">
            {j.author ?? "Anonymous"} ·{" "}
            {new Date(j.created_at).toLocaleDateString("en-US")}
          </p>
        </li>
      ))}
    </ul>
  );
}

export default async function JokesPage() {
  await requireUser();

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-3xl font-semibold">Jokes</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <JokeList />
      </Suspense>
    </main>
  );
}

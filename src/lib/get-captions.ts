import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Caption, TallyRow } from "@/lib/captions";

type CaptionRow = {
  id: string;
  image_url: string;
  caption_text: string;
  user_id: string;
  created_at: string;
};

async function attachVotesAndTallies(
  userId: string,
  captions: CaptionRow[],
): Promise<Caption[]> {
  const supabase = await createClient();
  const [{ data: myVotes }, { data: tallies }] = await Promise.all([
    supabase.from("votes").select("caption_id, value").eq("user_id", userId),
    supabase.rpc("caption_vote_tallies"),
  ]);

  const voteMap = new Map<string, 1 | -1>(
    (myVotes ?? []).map((v) => [v.caption_id, v.value as 1 | -1]),
  );
  const tallyMap = new Map(
    ((tallies ?? []) as TallyRow[]).map((t) => [t.caption_id, t]),
  );

  return captions.map((c) => ({
    ...c,
    tally: tallyMap.get(c.id) ?? { upvotes: 0, downvotes: 0, score: 0 },
    myVote: voteMap.get(c.id) ?? null,
  }));
}

/** The main feed: every caption, newest first — excludes Image of the Day
 * submissions, which get their own showcase section instead. */
export async function getFeedCaptions(userId: string): Promise<Caption[]> {
  const supabase = await createClient();
  const { data: captions } = await supabase
    .from("captions")
    .select("id, image_url, caption_text, user_id, created_at")
    .is("iotd_date", null)
    .order("created_at", { ascending: false });
  return attachVotesAndTallies(userId, (captions ?? []) as CaptionRow[]);
}

export type ImageOfTheDay = {
  day: string;
  imageUrl: string;
  submissions: Caption[];
  hasSubmitted: boolean;
};

/** Today's picked image plus the leaderboard of captions submitted for it,
 * sorted by score (net upvotes) descending. */
export async function getImageOfTheDay(userId: string): Promise<ImageOfTheDay | null> {
  const supabase = await createClient();
  const { data: iotdRows, error: iotdError } = await supabase.rpc(
    "get_or_create_image_of_the_day",
  );
  if (iotdError) {
    console.error("get_or_create_image_of_the_day failed:", iotdError.message);
    return null;
  }
  const iotd = iotdRows?.[0] as
    | { pick_date: string; image_url: string; image_description: string }
    | undefined;
  // If no captions exist yet at all, nothing gets inserted and the function
  // returns zero rows.
  if (!iotd?.image_url) return null;

  const { data: submissionsRaw } = await supabase
    .from("captions")
    .select("id, image_url, caption_text, user_id, created_at")
    .eq("iotd_date", iotd.pick_date)
    .order("created_at", { ascending: false });

  const submissions = await attachVotesAndTallies(
    userId,
    (submissionsRaw ?? []) as CaptionRow[],
  );
  submissions.sort((a, b) => b.tally.score - a.tally.score);

  return {
    day: iotd.pick_date,
    imageUrl: iotd.image_url,
    submissions,
    hasSubmitted: submissions.some((c) => c.user_id === userId),
  };
}

/** Captions a user created, newest first — includes original uploads and remixes (regenerated captions on others' photos). */
export async function getCreatedCaptions(userId: string): Promise<Caption[]> {
  const supabase = await createClient();
  const { data: captions } = await supabase
    .from("captions")
    .select("id, image_url, caption_text, user_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return attachVotesAndTallies(userId, (captions ?? []) as CaptionRow[]);
}

/** Captions a user has voted on, most recently voted first. */
export async function getVotedCaptions(userId: string): Promise<Caption[]> {
  const supabase = await createClient();
  const { data: votes } = await supabase
    .from("votes")
    .select("caption_id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  const ids = (votes ?? []).map((v) => v.caption_id);
  if (ids.length === 0) return [];

  const { data: captions } = await supabase
    .from("captions")
    .select("id, image_url, caption_text, user_id, created_at")
    .in("id", ids);

  const byId = new Map(((captions ?? []) as CaptionRow[]).map((c) => [c.id, c]));
  // Preserve vote-recency order, drop any caption that's been deleted since.
  const ordered = ids.map((id) => byId.get(id)).filter((c): c is CaptionRow => !!c);

  return attachVotesAndTallies(userId, ordered);
}

export type Tally = {
  upvotes: number;
  downvotes: number;
  score: number;
};

// Shape returned by the caption_vote_tallies() RPC (one row per caption).
export type TallyRow = Tally & { caption_id: string };

export type Caption = {
  id: string;
  image_url: string;
  caption_text: string;
  user_id: string;
  created_at: string;
  tally: Tally;
  /** The current user's own vote on this caption, or null if they haven't voted. */
  myVote: 1 | -1 | null;
};

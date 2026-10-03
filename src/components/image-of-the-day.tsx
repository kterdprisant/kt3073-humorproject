"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  submitVote,
  generateImageOfTheDayCaption,
} from "@/app/captions/actions";
import type { Caption } from "@/lib/captions";

function LeaderboardRow({ caption, rank }: { caption: Caption; rank: number }) {
  const [myVote, setMyVote] = useState(caption.myVote);
  const [tally, setTally] = useState(caption.tally);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const vote = (value: 1 | -1) => {
    // Clicking the already-active vote removes it entirely.
    const newValue = myVote === value ? null : value;

    const prevVote = myVote;
    const prevTally = tally;
    setMyVote(newValue);
    setTally((t) => ({
      upvotes: t.upvotes + (newValue === 1 ? 1 : 0) - (prevVote === 1 ? 1 : 0),
      downvotes:
        t.downvotes + (newValue === -1 ? 1 : 0) - (prevVote === -1 ? 1 : 0),
      score: t.score + ((newValue ?? 0) - (prevVote ?? 0)),
    }));
    setError(null);

    startTransition(async () => {
      const result = await submitVote(caption.id, newValue);
      if (result.error) {
        setMyVote(prevVote);
        setTally(prevTally);
        setError(result.error);
      }
    });
  };

  return (
    <li className="flex items-center gap-3 border-b border-gray-100 py-3 last:border-0">
      <span className="w-5 shrink-0 text-right text-sm font-medium text-gray-400">
        {rank}
      </span>
      <p className="min-w-0 flex-1 text-sm font-medium">{caption.caption_text}</p>
      <div className="flex shrink-0 gap-1.5">
        <button
          type="button"
          disabled={isPending}
          onClick={() => vote(1)}
          aria-pressed={myVote === 1}
          className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
            myVote === 1
              ? "bg-black text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          👍 {tally.upvotes}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => vote(-1)}
          aria-pressed={myVote === -1}
          className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
            myVote === -1
              ? "bg-black text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          👎 {tally.downvotes}
        </button>
      </div>
      {error && <p className="basis-full text-xs text-red-600">{error}</p>}
    </li>
  );
}

export function ImageOfTheDay({
  imageUrl,
  initialSubmissions,
  initialHasSubmitted,
}: {
  imageUrl: string;
  initialSubmissions: Caption[];
  initialHasSubmitted: boolean;
}) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [hasSubmitted, setHasSubmitted] = useState(initialHasSubmitted);
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const ranked = [...submissions].sort((a, b) => b.tally.score - a.tally.score);

  const generate = () => {
    setError(null);
    startTransition(async () => {
      const result = await generateImageOfTheDayCaption();
      if (result.error) {
        setError(result.error);
      } else if (result.caption) {
        setSubmissions((current) => [result.caption!, ...current]);
        setHasSubmitted(true);
        setExpanded(true);
      }
    });
  };

  return (
    <section className="mb-8 overflow-hidden rounded-3xl bg-gray-100 shadow-sm">
      <div className="relative aspect-[4/3] w-full">
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, 480px"
          className="object-cover"
        />
        <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
          ✨ Image of the Day
        </span>
      </div>
      <div className="p-4">
        {!hasSubmitted ? (
          <button
            type="button"
            disabled={isPending}
            onClick={generate}
            className="w-full rounded-md bg-black px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {isPending ? "Writing…" : "🎲 Generate my caption"}
          </button>
        ) : (
          <p className="text-sm text-gray-600">
            You&apos;re in today&apos;s leaderboard — come back tomorrow for a new photo.
          </p>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        {submissions.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="text-sm font-medium text-gray-700 underline"
            >
              {expanded ? "Hide" : "Show"} leaderboard ({submissions.length})
            </button>
            {expanded && (
              <ul className="mt-2">
                {ranked.map((caption, i) => (
                  <LeaderboardRow key={caption.id} caption={caption} rank={i + 1} />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { submitVote } from "@/app/captions/actions";
import type { Caption } from "@/lib/captions";

function FeedItem({ caption }: { caption: Caption }) {
  const [myVote, setMyVote] = useState(caption.myVote);
  const [tally, setTally] = useState(caption.tally);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const vote = (value: 1 | -1) => {
    if (myVote === value) return;

    const prevVote = myVote;
    const prevTally = tally;
    const delta = {
      upvotes: (value === 1 ? 1 : 0) - (prevVote === 1 ? 1 : 0),
      downvotes: (value === -1 ? 1 : 0) - (prevVote === -1 ? 1 : 0),
    };
    setMyVote(value);
    setTally((t) => ({
      upvotes: t.upvotes + delta.upvotes,
      downvotes: t.downvotes + delta.downvotes,
      score: t.score + (value - (prevVote ?? 0)),
    }));
    setError(null);

    startTransition(async () => {
      try {
        await submitVote(caption.id, value);
      } catch (err) {
        setMyVote(prevVote);
        setTally(prevTally);
        setError(err instanceof Error ? err.message : "Failed to save your vote.");
      }
    });
  };

  return (
    <article className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
      <div className="relative aspect-[4/5] w-full bg-gray-100">
        <Image
          src={caption.image_url}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, 480px"
          className="object-cover"
        />
      </div>
      <div className="flex items-center justify-between gap-4 p-4">
        <p className="text-base font-medium">{caption.caption_text}</p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => vote(1)}
            aria-pressed={myVote === 1}
            className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
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
            className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
              myVote === -1
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            👎 {tally.downvotes}
          </button>
        </div>
      </div>
      {error && <p className="px-4 pb-3 text-sm text-red-600">{error}</p>}
    </article>
  );
}

export function CaptionFeed({ captions }: { captions: Caption[] }) {
  if (captions.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
        No captions yet — be the first to upload one.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {captions.map((caption) => (
        <FeedItem key={caption.id} caption={caption} />
      ))}
    </div>
  );
}

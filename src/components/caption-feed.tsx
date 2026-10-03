"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { submitVote, regenerateCaption } from "@/app/captions/actions";
import type { Caption } from "@/lib/captions";

function FeedItem({
  caption,
  onRegenerated,
}: {
  caption: Caption;
  onRegenerated: (caption: Caption) => void;
}) {
  const [myVote, setMyVote] = useState(caption.myVote);
  const [tally, setTally] = useState(caption.tally);
  const [isPending, startTransition] = useTransition();
  const [isRegenerating, startRegenerate] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const vote = (value: 1 | -1) => {
    // Clicking the already-active vote removes it entirely.
    const newValue = myVote === value ? null : value;

    const prevVote = myVote;
    const prevTally = tally;
    const delta = {
      upvotes: (newValue === 1 ? 1 : 0) - (prevVote === 1 ? 1 : 0),
      downvotes: (newValue === -1 ? 1 : 0) - (prevVote === -1 ? 1 : 0),
    };
    setMyVote(newValue);
    setTally((t) => ({
      upvotes: t.upvotes + delta.upvotes,
      downvotes: t.downvotes + delta.downvotes,
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

  const regenerate = () => {
    setError(null);
    startRegenerate(async () => {
      const result = await regenerateCaption(caption.id);
      if (result.error) {
        setError(result.error);
      } else if (result.caption) {
        onRegenerated(result.caption);
      }
    });
  };

  return (
    <article className="overflow-hidden rounded-3xl bg-gray-100 shadow-sm">
      <div className="relative aspect-[4/5] w-full">
        <Image
          src={caption.image_url}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, 480px"
          className="object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 pt-16">
          <p className="text-xl font-medium text-white drop-shadow-sm">
            {caption.caption_text}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => vote(1)}
              aria-pressed={myVote === 1}
              className={`rounded-full px-3 py-1.5 text-sm backdrop-blur-sm transition-colors ${
                myVote === 1
                  ? "bg-white text-black"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              👍 {tally.upvotes}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => vote(-1)}
              aria-pressed={myVote === -1}
              className={`rounded-full px-3 py-1.5 text-sm backdrop-blur-sm transition-colors ${
                myVote === -1
                  ? "bg-white text-black"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              👎 {tally.downvotes}
            </button>
            <button
              type="button"
              disabled={isRegenerating}
              onClick={regenerate}
              title="Generate a different caption for this photo"
              className="ml-auto rounded-full bg-white/20 px-3 py-1.5 text-sm text-white backdrop-blur-sm transition-colors hover:bg-white/30 disabled:opacity-50"
            >
              {isRegenerating ? "Writing…" : "🎲 New caption"}
            </button>
          </div>
        </div>
      </div>
      {error && <p className="px-4 py-2 text-sm text-red-600">{error}</p>}
    </article>
  );
}

export function CaptionFeed({ captions }: { captions: Caption[] }) {
  const [items, setItems] = useState(captions);

  const handleRegenerated = (newCaption: Caption) => {
    setItems((current) => [newCaption, ...current]);
  };

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
        No captions yet — be the first to upload one.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {items.map((caption) => (
        <FeedItem
          key={caption.id}
          caption={caption}
          onRegenerated={handleRegenerated}
        />
      ))}
    </div>
  );
}

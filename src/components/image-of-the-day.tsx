"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { generateImageOfTheDayCaption } from "@/app/captions/actions";
import { VoteButtons } from "@/components/vote-buttons";
import type { Caption } from "@/lib/captions";

function LeaderboardRow({ caption, rank }: { caption: Caption; rank: number }) {
  return (
    <li className="flex items-center gap-3 border-b border-neutral-800 py-3 last:border-0">
      <span className="w-5 shrink-0 text-right text-sm font-medium text-neutral-500">
        {rank}
      </span>
      <p className="min-w-0 flex-1 text-sm font-medium text-neutral-100">
        {caption.caption_text}
      </p>
      <VoteButtons
        captionId={caption.id}
        initialMyVote={caption.myVote}
        initialTally={caption.tally}
        variant="leaderboard"
      />
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
    <section className="relative flex h-full w-full shrink-0 snap-start flex-col items-center justify-center gap-3 overflow-y-auto p-6">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[65vmin] w-[65vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(251,191,36,0.22), transparent 65%)",
        }}
      />
      <span className="relative rounded-full bg-black/50 px-5 py-2 text-lg font-semibold text-amber-300 backdrop-blur-sm sm:text-xl">
        Tonight&apos;s Headliner
      </span>
      <div className="relative aspect-[4/5] w-full max-w-sm max-h-[45vh] overflow-hidden rounded-3xl border-4 border-amber-400/60 bg-neutral-900 shadow-2xl">
        <Image src={imageUrl} alt="" fill sizes="(max-width: 640px) 100vw, 384px" className="object-cover" />
      </div>

      {!hasSubmitted ? (
        <button
          type="button"
          disabled={isPending}
          onClick={generate}
          className="relative rounded-full bg-amber-400 px-6 py-3 font-medium text-neutral-950 transition-colors hover:bg-amber-300 disabled:opacity-50"
        >
          {isPending ? "Writing…" : "🎤 Take the mic"}
        </button>
      ) : (
        <p className="relative text-sm text-white">
          You&apos;re on tonight&apos;s lineup — come back tomorrow for a new headliner.
        </p>
      )}
      {error && <p className="relative text-sm text-red-400">{error}</p>}

      {submissions.length > 0 && (
        <div className="relative w-full max-w-md">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mx-auto block text-sm font-medium text-white underline"
          >
            {expanded ? "Hide" : "Show"} crowd favorites ({submissions.length})
          </button>
          {expanded && (
            <ul className="mt-2 max-h-40 overflow-y-auto rounded-xl bg-black/40 px-3 backdrop-blur-sm">
              {ranked.map((caption, i) => (
                <LeaderboardRow key={caption.id} caption={caption} rank={i + 1} />
              ))}
            </ul>
          )}
        </div>
      )}
      <p className="absolute inset-x-0 bottom-3 text-center text-xs text-neutral-500">
        Scroll for the next act ↓
      </p>
    </section>
  );
}

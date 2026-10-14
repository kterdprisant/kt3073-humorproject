"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { regenerateCaption } from "@/app/captions/actions";
import { VoteButtons } from "@/components/vote-buttons";
import type { Caption } from "@/lib/captions";

export function StageAct({
  caption,
  onRegenerated,
}: {
  caption: Caption;
  onRegenerated: (caption: Caption) => void;
}) {
  const [isRegenerating, startRegenerate] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
    <section className="relative flex h-full w-full shrink-0 snap-start flex-col items-center justify-center gap-3 p-6">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[65vmin] w-[65vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(251,191,36,0.22), transparent 65%)",
        }}
      />
      <div className="relative aspect-[4/5] w-full max-w-md max-h-[55vh] overflow-hidden rounded-3xl border-4 border-neutral-800 bg-neutral-900 shadow-2xl">
        <Image
          src={caption.image_url}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, 448px"
          className="object-cover"
        />
      </div>
      <p className="relative max-w-sm text-center text-xl font-medium text-white drop-shadow sm:text-2xl">
        {caption.caption_text}
      </p>
      <VoteButtons
        captionId={caption.id}
        initialMyVote={caption.myVote}
        initialTally={caption.tally}
        variant="stage"
      />
      <button
        type="button"
        disabled={isRegenerating}
        onClick={regenerate}
        className="relative rounded-full bg-black/30 px-4 py-2 text-sm text-neutral-200 backdrop-blur-sm transition-colors hover:bg-black/40 disabled:opacity-50"
      >
        {isRegenerating ? "Writing…" : "🎤 Encore"}
      </button>
      {error && <p className="relative text-sm text-red-400">{error}</p>}
      <p className="absolute inset-x-0 bottom-3 text-center text-xs text-neutral-500">
        Scroll for the next act ↓
      </p>
    </section>
  );
}

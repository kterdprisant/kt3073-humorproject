import Image from "next/image";
import type { Caption } from "@/lib/captions";

export function CaptionThumb({ caption }: { caption: Caption }) {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-100 shadow-sm">
      <Image
        src={caption.image_url}
        alt=""
        fill
        sizes="200px"
        className="object-cover"
      />
      {caption.myVote && (
        <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white">
          {caption.myVote === 1 ? "👍" : "👎"}
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 pt-10">
        <p className="line-clamp-2 text-base font-medium text-white drop-shadow-sm">
          {caption.caption_text}
        </p>
        <p className="mt-1 text-xs text-white/80">
          {caption.tally.upvotes} up · {caption.tally.downvotes} down
        </p>
      </div>
    </div>
  );
}

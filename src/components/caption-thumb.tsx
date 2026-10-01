import Image from "next/image";
import type { Caption } from "@/lib/captions";

export function CaptionThumb({ caption }: { caption: Caption }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
      <div className="relative aspect-square w-full bg-gray-100">
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
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-base font-medium">{caption.caption_text}</p>
        <p className="mt-1 text-xs text-gray-500">
          {caption.tally.upvotes} up · {caption.tally.downvotes} down
        </p>
      </div>
    </div>
  );
}

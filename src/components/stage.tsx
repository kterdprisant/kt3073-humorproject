"use client";

import { useEffect, useRef, useState } from "react";
import { ImageOfTheDay } from "@/components/image-of-the-day";
import { StageAct } from "@/components/stage-act";
import { StageBackdrop } from "@/components/stage-backdrop";
import type { Caption } from "@/lib/captions";

export function Stage({
  imageUrl,
  initialSubmissions,
  initialHasSubmitted,
  captions,
}: {
  imageUrl: string | null;
  initialSubmissions: Caption[];
  initialHasSubmitted: boolean;
  captions: Caption[];
}) {
  const [items, setItems] = useState(captions);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleRegenerated = (newCaption: Caption) => {
    setItems((current) => [newCaption, ...current]);
  };

  // Fade each act based on its distance from the center of the screen, so
  // the previous/next act visibly fades out/in as you scroll between them,
  // rather than cutting abruptly at the snap point. Driven by a manual
  // scroll handler (rAF-throttled) rather than CSS animation-timeline, for
  // consistent behavior across browsers (Safari's support is unreliable).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const containerRect = container.getBoundingClientRect();
      const center = containerRect.top + containerRect.height / 2;
      for (const child of Array.from(container.children)) {
        const el = child as HTMLElement;
        const rect = el.getBoundingClientRect();
        const elCenter = rect.top + rect.height / 2;
        const distance = Math.abs(elCenter - center);
        const opacity = Math.max(0, 1 - distance / (containerRect.height * 0.5));
        el.style.opacity = String(opacity);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    container.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      container.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [items.length, imageUrl]);

  return (
    <>
      <StageBackdrop />
      <div
        ref={containerRef}
        className="h-[calc(100vh-4rem)] snap-y snap-mandatory overflow-y-scroll"
      >
        {imageUrl && (
          <ImageOfTheDay
            imageUrl={imageUrl}
            initialSubmissions={initialSubmissions}
            initialHasSubmitted={initialHasSubmitted}
          />
        )}
        {items.length === 0 ? (
          <section className="relative flex h-full w-full shrink-0 snap-start items-center justify-center p-6">
            <p className="relative z-10 text-center text-neutral-400">
              No sets yet — be the first to take the mic.
            </p>
          </section>
        ) : (
          items.map((caption) => (
            <StageAct
              key={caption.id}
              caption={caption}
              onRegenerated={handleRegenerated}
            />
          ))
        )}
      </div>
    </>
  );
}

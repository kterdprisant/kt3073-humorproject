"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { submitVote } from "@/app/captions/actions";
import type { Tally } from "@/lib/captions";

type Particle = { id: number; dx: number; delay: number };
type Variant = "feed" | "leaderboard" | "stage";

type ButtonStyle = {
  pad: string;
  active: string;
  inactive: string;
};

function BooButton({
  count,
  active,
  disabled,
  style,
  onClick,
}: {
  count: number;
  active: boolean;
  disabled: boolean;
  style: ButtonStyle;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full transition-colors ${style.pad} ${
        active ? style.active : style.inactive
      }`}
    >
      🦗 {count}
    </button>
  );
}

const PARTICLE_COUNT: Record<Variant, number> = {
  feed: 6,
  leaderboard: 4,
  stage: 14,
};

const PARTICLE_TRAVEL: Record<Variant, number> = {
  feed: -48,
  leaderboard: -30,
  stage: -100,
};

const PARTICLE_SPREAD: Record<Variant, number> = {
  feed: 50,
  leaderboard: 30,
  stage: 90,
};

export function VoteButtons({
  captionId,
  initialMyVote,
  initialTally,
  variant = "feed",
}: {
  captionId: string;
  initialMyVote: 1 | -1 | null;
  initialTally: Tally;
  /** "feed": photo overlay, medium. "leaderboard": plain dark row, small.
   * "stage": one-act full-screen view, large buttons + bigger effects. */
  variant?: Variant;
}) {
  const [myVote, setMyVote] = useState(initialMyVote);
  const [tally, setTally] = useState(initialTally);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  // Starts at 0 ("never booed"); only non-zero values trigger the shake, so
  // the button doesn't shake on initial render.
  const [booKey, setBooKey] = useState(0);
  const [showCricket, setShowCricket] = useState(false);

  const vote = (value: 1 | -1) => {
    const newValue = myVote === value ? null : value;
    const casting = newValue !== null; // skip the effect when just removing a vote

    const prevVote = myVote;
    const prevTally = tally;
    setMyVote(newValue);
    setTally((t) => ({
      upvotes: t.upvotes + (newValue === 1 ? 1 : 0) - (prevVote === 1 ? 1 : 0),
      downvotes: t.downvotes + (newValue === -1 ? 1 : 0) - (prevVote === -1 ? 1 : 0),
      score: t.score + ((newValue ?? 0) - (prevVote ?? 0)),
    }));
    setError(null);

    if (casting && value === 1) {
      const spread = PARTICLE_SPREAD[variant];
      const burst: Particle[] = Array.from(
        { length: PARTICLE_COUNT[variant] },
        (_, i) => ({
          id: Date.now() + i,
          dx: Math.random() * spread * 2 - spread,
          delay: i * 0.025,
        }),
      );
      setParticles((p) => [...p, ...burst]);
    }
    if (casting && value === -1) {
      setBooKey((k) => k + 1);
      setShowCricket(true);
      setTimeout(() => setShowCricket(false), variant === "stage" ? 1600 : 1200);
    }

    startTransition(async () => {
      const result = await submitVote(captionId, newValue);
      if (result.error) {
        setMyVote(prevVote);
        setTally(prevTally);
        setError(result.error);
      }
    });
  };

  const style: ButtonStyle = {
    pad:
      variant === "leaderboard"
        ? "px-2.5 py-1 text-xs"
        : variant === "stage"
          ? "px-6 py-4 text-2xl font-medium"
          : "px-3 py-1.5 text-sm",
    active: "bg-amber-400 text-neutral-950",
    inactive:
      variant === "leaderboard"
        ? "bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
        : "bg-black/30 text-neutral-100 backdrop-blur-sm hover:bg-black/40",
  };

  const particleTextSize = variant === "stage" ? "text-4xl" : "text-base";
  const shakeAmplitude = variant === "stage" ? [0, -10, 10, -10, 8, -4, 0] : [0, -4, 4, -4, 0];

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <AnimatePresence>
          {particles.map((p) => (
            <motion.span
              key={p.id}
              className={`pointer-events-none absolute top-0 ${particleTextSize}`}
              style={{ left: "50%" }}
              initial={{ opacity: 1, x: "-50%", y: 0, scale: 1 }}
              animate={{
                opacity: 0,
                x: `calc(-50% + ${p.dx}px)`,
                y: PARTICLE_TRAVEL[variant],
                scale: variant === "stage" ? 1.8 : 1.4,
              }}
              transition={{
                duration: variant === "stage" ? 1 : 0.7,
                delay: p.delay,
                ease: "easeOut",
              }}
              onAnimationComplete={() =>
                setParticles((cur) => cur.filter((c) => c.id !== p.id))
              }
            >
              👏
            </motion.span>
          ))}
        </AnimatePresence>
        <button
          type="button"
          disabled={isPending}
          onClick={() => vote(1)}
          aria-pressed={myVote === 1}
          className={`rounded-full transition-colors ${style.pad} ${
            myVote === 1 ? style.active : style.inactive
          }`}
        >
          👏 {tally.upvotes}
        </button>
      </div>

      <div className="relative">
        <AnimatePresence>
          {showCricket && (
            <motion.span
              className={`pointer-events-none absolute top-0 ${particleTextSize}`}
              style={{ left: "50%" }}
              initial={{ opacity: 1, x: "-50%", y: 0 }}
              animate={{ opacity: 0, x: "-50%", y: variant === "stage" ? -50 : -24 }}
              transition={{ duration: variant === "stage" ? 1.5 : 1.1, ease: "easeOut" }}
            >
              🦗
            </motion.span>
          )}
        </AnimatePresence>
        {booKey === 0 ? (
          <BooButton
            count={tally.downvotes}
            active={myVote === -1}
            disabled={isPending}
            style={style}
            onClick={() => vote(-1)}
          />
        ) : (
          <motion.div
            key={booKey}
            initial={{ x: 0 }}
            animate={{ x: shakeAmplitude }}
            transition={{ duration: variant === "stage" ? 0.45 : 0.3 }}
          >
            <BooButton
              count={tally.downvotes}
              active={myVote === -1}
              disabled={isPending}
              style={style}
              onClick={() => vote(-1)}
            />
          </motion.div>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

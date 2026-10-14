import type { Caption } from "@/lib/captions";
import type { UserStats } from "@/lib/get-captions";

/** Achievement tier definitions for The Green Room's achievement badges.
 * Each category tracks a running count (sets created, applause given, boos
 * given) against a fixed ladder of thresholds — crossing one unlocks it. */

export type AchievementTier = {
  threshold: number;
  name: string;
  /** Custom badge artwork, served from /public/badges. */
  image: string;
};

export type AchievementCategory = {
  key: "created" | "applause" | "boos";
  icon: string;
  label: string;
  tiers: AchievementTier[];
};

export const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = [
  {
    key: "created",
    icon: "🎤",
    label: "Sets created",
    tiers: [
      { threshold: 5, name: "Open Mic'er", image: "/badges/badge-created-5.png" },
      { threshold: 10, name: "Regular", image: "/badges/badge-created-10.png" },
      { threshold: 20, name: "Headliner", image: "/badges/badge-created-20.png" },
      { threshold: 50, name: "Comedy Legend", image: "/badges/badge-created-50.png" },
      { threshold: 100, name: "Hall of Fame", image: "/badges/badge-created-100.png" },
    ],
  },
  {
    key: "applause",
    icon: "👏",
    label: "Applause given",
    tiers: [
      { threshold: 5, name: "Easy Crowd", image: "/badges/badge-applause-5.png" },
      { threshold: 10, name: "Supportive Fan", image: "/badges/badge-applause-10.png" },
      { threshold: 20, name: "Superfan", image: "/badges/badge-applause-20.png" },
      { threshold: 50, name: "Front Row Regular", image: "/badges/badge-applause-50.png" },
      { threshold: 100, name: "Standing Ovation", image: "/badges/badge-applause-100.png" },
    ],
  },
  {
    key: "boos",
    icon: "🦗",
    label: "Boos given",
    tiers: [
      { threshold: 5, name: "Heckler", image: "/badges/badge-boos-5.png" },
      { threshold: 10, name: "Tough Crowd", image: "/badges/badge-boos-10.png" },
      { threshold: 20, name: "Harsh Critic", image: "/badges/badge-boos-20.png" },
      { threshold: 50, name: "Theater Critic", image: "/badges/badge-boos-50.png" },
      { threshold: 100, name: "Nothing's Funny", image: "/badges/badge-boos-100.png" },
    ],
  },
];

/** A fixed minimum of "meaningful" signal before a secret achievement can
 * fire — stops someone unlocking "#1 Hater" off a single boo. */
const SECRET_MIN_COUNT = 5;

export type SecretAchievementKey =
  | "hater"
  | "yesman"
  | "contrarian"
  | "bro"
  | "ratiod";

export type SecretAchievement = {
  key: SecretAchievementKey;
  name: string;
  hint: string;
  image: string;
};

export const SECRET_ACHIEVEMENTS: SecretAchievement[] = [
  {
    key: "hater",
    name: "#1 Hater",
    hint: "Boo every set you've ever voted on.",
    image: "/badges/badge-secret-hater.png",
  },
  {
    key: "yesman",
    name: "Yes-Man",
    hint: "Applaud every set you've ever voted on.",
    image: "/badges/badge-secret-yesman.png",
  },
  {
    key: "contrarian",
    name: "Contrarian",
    hint: "Disagree with the crowd's verdict enough times.",
    image: "/badges/badge-secret-contrarian.png",
  },
  {
    key: "bro",
    name: "Bro Thinks He's Funny",
    hint: "Create sets that never land a single laugh.",
    image: "/badges/badge-secret-bro-thinks-hes-funny.png",
  },
  {
    key: "ratiod",
    name: "Ratio'd",
    hint: "An Encore that outshines the original.",
    image: "/badges/badge-secret-ratiod.png",
  },
];

/** Computes which secret achievements are unlocked from data the dashboard
 * already fetches (uploads, voted captions, the tiered-achievement stats)
 * plus the one DB round-trip Ratio'd needs. */
export function getSecretUnlocks({
  stats,
  uploads,
  voted,
  outscoredEncore,
}: {
  stats: UserStats;
  uploads: Caption[];
  voted: Caption[];
  outscoredEncore: boolean;
}): Record<SecretAchievementKey, boolean> {
  const contrarianCount = voted.filter(
    (c) =>
      (c.myVote === 1 && c.tally.score < 0) ||
      (c.myVote === -1 && c.tally.score > 0),
  ).length;
  const flopSets = uploads.filter((c) => c.tally.upvotes === 0).length;

  return {
    hater:
      stats.boosGiven >= SECRET_MIN_COUNT && stats.applauseGiven === 0,
    yesman:
      stats.applauseGiven >= SECRET_MIN_COUNT && stats.boosGiven === 0,
    contrarian: contrarianCount >= SECRET_MIN_COUNT,
    bro: flopSets >= SECRET_MIN_COUNT,
    ratiod: outscoredEncore,
  };
}

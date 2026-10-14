import Image from "next/image";
import {
  ACHIEVEMENT_CATEGORIES,
  SECRET_ACHIEVEMENTS,
  type SecretAchievementKey,
} from "@/lib/achievements";
import type { UserStats } from "@/lib/get-captions";

const STAT_KEY: Record<string, keyof UserStats> = {
  created: "setsCreated",
  applause: "applauseGiven",
  boos: "boosGiven",
};

export function Achievements({
  stats,
  secretUnlocks,
}: {
  stats: UserStats;
  secretUnlocks: Record<SecretAchievementKey, boolean>;
}) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
        Achievements
      </h2>
      <div className="flex flex-col gap-6">
        {ACHIEVEMENT_CATEGORIES.map((category) => {
          const count = stats[STAT_KEY[category.key]];
          return (
            <div key={category.key}>
              <p className="mb-2 text-sm text-neutral-400">
                {category.label} —{" "}
                <span className="font-medium text-neutral-200">{count}</span>
              </p>
              <div className="grid grid-cols-5 gap-3 sm:gap-4">
                {category.tiers.map((tier) => {
                  const unlocked = count >= tier.threshold;
                  return (
                    <div
                      key={tier.threshold}
                      title={`${tier.name} — ${tier.threshold}+ ${category.label.toLowerCase()}`}
                      className="flex flex-col items-center gap-1 text-center"
                    >
                      <div className="relative aspect-square w-full">
                        <Image
                          src={tier.image}
                          alt={tier.name}
                          fill
                          sizes="(max-width: 640px) 18vw, 120px"
                          className={`object-contain ${
                            unlocked ? "" : "grayscale opacity-30"
                          }`}
                        />
                      </div>
                      <span
                        className={`text-[11px] font-medium leading-tight sm:text-xs ${
                          unlocked ? "text-amber-300" : "text-neutral-500"
                        }`}
                      >
                        {tier.name}
                      </span>
                      <span className="text-[10px] text-neutral-500">
                        {tier.threshold}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div>
          <p className="mb-2 text-sm text-neutral-400">Secret achievements</p>
          <div className="grid grid-cols-5 gap-3 sm:gap-4">
            {SECRET_ACHIEVEMENTS.map((secret) => {
              const unlocked = secretUnlocks[secret.key];
              return (
                <div
                  key={secret.key}
                  title={unlocked ? `${secret.name} — ${secret.hint}` : undefined}
                  className="flex flex-col items-center gap-1 text-center"
                >
                  <div className="relative aspect-square w-full">
                    <Image
                      src={secret.image}
                      alt={unlocked ? secret.name : "Locked secret achievement"}
                      fill
                      sizes="(max-width: 640px) 18vw, 120px"
                      className={`object-contain ${
                        unlocked ? "" : "grayscale opacity-30"
                      }`}
                    />
                  </div>
                  <span
                    className={`text-[11px] font-medium leading-tight sm:text-xs ${
                      unlocked ? "text-amber-300" : "text-neutral-600"
                    }`}
                  >
                    {unlocked ? secret.name : "???"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

import { requireUser } from "@/lib/dal";
import {
  getCreatedCaptions,
  getVotedCaptions,
  getUserStats,
  hasOutscoredEncore,
} from "@/lib/get-captions";
import { getSecretUnlocks } from "@/lib/achievements";
import { CaptionThumb } from "@/components/caption-thumb";
import { UploadFab } from "@/components/upload-fab";
import { Achievements } from "@/components/achievements";

export default async function DashboardPage() {
  const user = await requireUser();
  const [uploads, voted, stats, outscoredEncore] = await Promise.all([
    getCreatedCaptions(user.id),
    getVotedCaptions(user.id),
    getUserStats(user.id),
    hasOutscoredEncore(user.id),
  ]);
  const secretUnlocks = getSecretUnlocks({ stats, uploads, voted, outscoredEncore });

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-8 text-2xl font-semibold text-neutral-100">The Green Room</h1>

      <Achievements stats={stats} secretUnlocks={secretUnlocks} />

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
          Your sets
        </h2>
        {uploads.length === 0 ? (
          <p className="text-neutral-500">You haven&apos;t taken the mic yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {uploads.map((caption) => (
              <CaptionThumb key={caption.id} caption={caption} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
          Sets you&apos;ve rated
        </h2>
        {voted.length === 0 ? (
          <p className="text-neutral-500">You haven&apos;t rated anything yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {voted.map((caption) => (
              <CaptionThumb key={caption.id} caption={caption} />
            ))}
          </div>
        )}
      </section>

      <UploadFab />
    </main>
  );
}

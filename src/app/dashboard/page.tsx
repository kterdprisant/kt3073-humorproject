import { requireUser } from "@/lib/dal";
import { getUploadedCaptions, getVotedCaptions } from "@/lib/get-captions";
import { CaptionThumb } from "@/components/caption-thumb";
import { UploadFab } from "@/components/upload-fab";

export default async function DashboardPage() {
  const user = await requireUser();
  const [uploads, voted] = await Promise.all([
    getUploadedCaptions(user.id),
    getVotedCaptions(user.id),
  ]);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-8 text-2xl font-semibold">Dashboard</h1>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
          Your uploads
        </h2>
        {uploads.length === 0 ? (
          <p className="text-gray-500">You haven&apos;t uploaded anything yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {uploads.map((caption) => (
              <CaptionThumb key={caption.id} caption={caption} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
          Captions you&apos;ve rated
        </h2>
        {voted.length === 0 ? (
          <p className="text-gray-500">You haven&apos;t rated anything yet.</p>
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

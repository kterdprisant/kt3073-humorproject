import { requireUser } from "@/lib/dal";
import { getFeedCaptions } from "@/lib/get-captions";
import { CaptionFeed } from "@/components/caption-feed";
import { UploadFab } from "@/components/upload-fab";

export default async function CaptionsPage() {
  const user = await requireUser();
  const captions = await getFeedCaptions(user.id);

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="mb-6 text-2xl font-semibold">Feed</h1>
      <CaptionFeed captions={captions} />
      <UploadFab />
    </main>
  );
}

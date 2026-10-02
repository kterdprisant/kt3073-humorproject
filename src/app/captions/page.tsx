import { requireUser } from "@/lib/dal";
import { getFeedCaptions, getImageOfTheDay } from "@/lib/get-captions";
import { CaptionFeed } from "@/components/caption-feed";
import { ImageOfTheDay } from "@/components/image-of-the-day";
import { UploadFab } from "@/components/upload-fab";

export default async function CaptionsPage() {
  const user = await requireUser();
  const [captions, iotd] = await Promise.all([
    getFeedCaptions(user.id),
    getImageOfTheDay(user.id),
  ]);

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="mb-6 text-2xl font-semibold">Feed</h1>
      {iotd && (
        <ImageOfTheDay
          imageUrl={iotd.imageUrl}
          initialSubmissions={iotd.submissions}
          initialHasSubmitted={iotd.hasSubmitted}
        />
      )}
      <CaptionFeed captions={captions} />
      <UploadFab />
    </main>
  );
}

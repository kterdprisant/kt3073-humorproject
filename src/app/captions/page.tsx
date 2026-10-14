import { requireUser } from "@/lib/dal";
import { getFeedCaptions, getImageOfTheDay } from "@/lib/get-captions";
import { Stage } from "@/components/stage";
import { UploadFab } from "@/components/upload-fab";

export default async function CaptionsPage() {
  const user = await requireUser();
  const [captions, iotd] = await Promise.all([
    getFeedCaptions(user.id),
    getImageOfTheDay(user.id),
  ]);

  return (
    <>
      <Stage
        imageUrl={iotd?.imageUrl ?? null}
        initialSubmissions={iotd?.submissions ?? []}
        initialHasSubmitted={iotd?.hasSubmitted ?? false}
        captions={captions}
      />
      <UploadFab />
    </>
  );
}

import { requireUser } from "@/lib/dal";
import { CaptionUploadForm } from "@/components/caption-upload-form";

export default async function CaptionUploadPage() {
  await requireUser();

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-2 text-3xl font-semibold">Upload a photo</h1>
      <p className="mb-6 text-gray-600">
        We&apos;ll describe it and write a funny caption automatically.
      </p>
      <CaptionUploadForm />
    </main>
  );
}

import Link from "next/link";

export function UploadFab() {
  return (
    <Link
      href="/captions/upload"
      aria-label="Upload a photo"
      className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-black text-2xl font-light text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
    >
      +
    </Link>
  );
}

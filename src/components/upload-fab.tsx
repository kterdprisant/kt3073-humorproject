import Link from "next/link";

export function UploadFab() {
  return (
    <Link
      href="/captions/upload"
      aria-label="Take the mic"
      title="Take the mic"
      className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-amber-400 text-2xl text-neutral-950 shadow-lg shadow-amber-400/30 transition-transform hover:scale-105 active:scale-95"
    >
      🎤
    </Link>
  );
}

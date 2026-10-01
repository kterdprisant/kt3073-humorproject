import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Humor Project</h1>
      <p className="max-w-sm text-gray-600">
        Upload a photo, get an AI-written caption, and rate everyone else&apos;s.
      </p>
      <Link
        href="/captions"
        className="mt-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white"
      >
        Go to the feed
      </Link>
    </div>
  );
}

import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="relative w-full max-w-xl">
        <Image
          src="/comedy-night.png"
          alt="Open Mic AI — a robot comedian performing stand-up for a crowd at a comedy club"
          width={1672}
          height={941}
          priority
          className="h-auto w-full"
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at center, transparent 40%, black 95%)",
          }}
        />
      </div>
      <p className="max-w-sm text-neutral-400">
        Take the mic, get an AI-written caption, and see if it kills or bombs with the crowd.
      </p>
      <Link
        href="/captions"
        className="rounded-full bg-amber-400 px-5 py-2.5 text-sm font-medium text-neutral-950 transition-colors hover:bg-amber-300"
      >
        Step up to the stage
      </Link>
    </div>
  );
}

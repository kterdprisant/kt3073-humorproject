import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-semibold">Hello World</h1>
      <Link href="/jokes" className="underline">
        View jokes
      </Link>
    </div>
  );
}

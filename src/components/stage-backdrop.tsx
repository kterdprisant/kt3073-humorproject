import Image from "next/image";

/** The Stage's backdrop: a photo of an empty comedy club stage. */
export function StageBackdrop() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-black">
      <Image
        src="/comedy-club-stage.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-[center_10%]"
      />
    </div>
  );
}

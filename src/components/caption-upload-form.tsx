"use client";

import { useActionState, useEffect, useState } from "react";
import { uploadImageAndGenerateCaption } from "@/app/captions/actions";

const STAGES = ["Looking at your photo…", "Writing something funny…"];

export function CaptionUploadForm() {
  const [state, formAction, pending] = useActionState(
    uploadImageAndGenerateCaption,
    { error: null },
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 2500);
    return () => clearInterval(timer);
  }, [pending]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="image" className="text-sm font-medium text-neutral-200">
          Photo
        </label>
        <input
          id="image"
          name="image"
          type="file"
          accept="image/*"
          required
          onChange={(e) => {
            const file = e.target.files?.[0];
            setPreview(file ? URL.createObjectURL(file) : null);
          }}
          className="text-sm text-neutral-400 file:mr-3 file:rounded-md file:border-0 file:bg-amber-400 file:px-4 file:py-2 file:text-sm file:font-medium file:text-neutral-950 hover:file:bg-amber-300"
        />
      </div>

      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt=""
          className="aspect-square w-full rounded-xl object-cover"
        />
      )}

      {!manual ? (
        <button
          type="button"
          onClick={() => setManual(true)}
          className="self-start text-sm text-neutral-500 underline"
        >
          Gemini not working? Write your own caption instead
        </button>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="manual_caption" className="text-sm font-medium text-neutral-200">
              Your caption
            </label>
            <button
              type="button"
              onClick={() => setManual(false)}
              className="text-sm text-neutral-500 underline"
            >
              Use AI instead
            </button>
          </div>
          <input
            id="manual_caption"
            name="manual_caption"
            type="text"
            placeholder="Write a funny caption…"
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 placeholder:text-neutral-500"
          />
        </div>
      )}

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-amber-400 px-4 py-2 font-medium text-neutral-950 transition-colors hover:bg-amber-300 disabled:opacity-50"
      >
        {pending
          ? manual
            ? "Saving…"
            : STAGES[stage]
          : manual
            ? "Save caption"
            : "🎤 Take the mic"}
      </button>
    </form>
  );
}

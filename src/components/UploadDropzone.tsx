"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/Spinner";

interface Props {
  onUploaded: () => void;
}

export function UploadDropzone({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const upload = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const pdfs = Array.from(fileList).filter(
        (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
      );
      if (pdfs.length === 0) {
        setError("Only PDF files are supported.");
        return;
      }

      setBusy(true);
      setError(null);
      setNote(`Uploading and processing ${pdfs.length} file${pdfs.length > 1 ? "s" : ""}…`);

      const body = new FormData();
      pdfs.forEach((f) => body.append("files", f));

      try {
        const res = await fetch("/api/ingest", { method: "POST", body });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Upload failed.");

        const failed = (json.documents ?? []).filter(
          (d: { status?: string }) => d.status === "error",
        );
        if (failed.length > 0) {
          setError(
            `${failed.length} file(s) failed: ${failed
              .map((d: { name: string; error?: string }) => `${d.name} — ${d.error}`)
              .join("; ")}`,
          );
        }
        setNote(null);
        onUploaded();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
        setNote(null);
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onUploaded],
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void upload(e.dataTransfer.files);
        }}
        disabled={busy}
        className={cn(
          "flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
          dragging
            ? "border-indigo-400 bg-indigo-50"
            : "border-zinc-300 bg-white hover:border-zinc-400",
          busy && "cursor-wait opacity-70",
        )}
      >
        {busy ? (
          <Spinner className="h-6 w-6 text-indigo-600" />
        ) : (
          <UploadCloud className="h-6 w-6 text-zinc-400" aria-hidden />
        )}
        <span className="text-sm font-medium text-zinc-700">
          {busy ? "Processing…" : "Drop PDFs here or click to upload"}
        </span>
        <span className="text-xs text-zinc-400">
          10-Ks, annual reports, contracts · up to 32 MB each
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        hidden
        onChange={(e) => void upload(e.target.files)}
      />

      {note && <p className="mt-2 text-xs text-zinc-500">{note}</p>}
      {error && (
        <p className="mt-2 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

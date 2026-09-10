"use client";

import dynamic from "next/dynamic";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/Spinner";
import type { Citation } from "@/types";

const PdfView = dynamic(() => import("@/components/PdfView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Spinner className="h-5 w-5" />
    </div>
  ),
});

interface Props {
  citation: Citation | null;
  onClose: () => void;
}

export function SourceViewer({ citation, onClose }: Props) {
  const open = citation !== null;

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close source viewer"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/30"
        />
      )}
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-[640px] flex-col border-l border-zinc-200 bg-white shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!open}
      >
        {citation && (
          <>
            <header className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-800">
                  {citation.documentName}
                </p>
                <p className="text-xs text-zinc-500">
                  Page {citation.page} · citation [{citation.marker}]
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="border-b border-zinc-100 bg-amber-50/60 px-4 py-2 text-[13px] italic leading-snug text-zinc-600">
              &ldquo;{citation.quote || citation.context.slice(0, 200)}&rdquo;
            </div>

            <div className="min-h-0 flex-1">
              <PdfView
                documentId={citation.documentId}
                page={citation.page}
                quote={citation.quote || citation.context}
              />
            </div>
          </>
        )}
      </aside>
    </>
  );
}

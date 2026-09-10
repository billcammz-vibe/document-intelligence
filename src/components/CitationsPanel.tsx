"use client";

import { Quote, FileSearch } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Citation, RetrievedChunk } from "@/types";

interface Props {
  citations: Citation[];
  retrieved: RetrievedChunk[];
  activeMarker: number | null;
  onCiteClick: (marker: number) => void;
}

export function CitationsPanel({
  citations,
  retrieved,
  activeMarker,
  onCiteClick,
}: Props) {
  if (citations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-zinc-400">
        <FileSearch className="h-6 w-6" aria-hidden />
        Citations for the selected answer appear here.
        {retrieved.length > 0 && (
          <span className="text-xs">
            {retrieved.length} passages were retrieved but none were cited.
          </span>
        )}
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {citations.map((c) => (
        <li key={c.marker}>
          <button
            type="button"
            onClick={() => onCiteClick(c.marker)}
            className={cn(
              "w-full rounded-lg border bg-white p-3 text-left transition hover:border-indigo-300",
              activeMarker === c.marker
                ? "border-indigo-400 ring-1 ring-indigo-200"
                : "border-zinc-200",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-indigo-100 text-[11px] font-semibold text-indigo-700">
                {c.marker}
              </span>
              <span className="truncate text-xs font-medium text-zinc-700" title={c.documentName}>
                {c.documentName}
              </span>
              <span className="ml-auto shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                p. {c.page}
              </span>
            </div>
            <p className="mt-2 flex gap-1.5 text-[13px] leading-snug text-zinc-600">
              <Quote className="mt-0.5 h-3 w-3 shrink-0 text-zinc-300" aria-hidden />
              <span className="line-clamp-4 italic">{c.quote || c.context.slice(0, 240)}</span>
            </p>
            <p className="mt-1.5 text-[11px] font-medium text-indigo-600">
              Open source →
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}

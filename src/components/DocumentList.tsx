"use client";

import { FileText, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import type { DocumentSummary } from "@/types";

interface Props {
  documents: DocumentSummary[];
  loading: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function DocumentList({
  documents,
  loading,
  selectedIds,
  onToggleSelect,
  onDelete,
}: Props) {
  if (loading && documents.length === 0) {
    return (
      <div className="flex items-center gap-2 px-1 py-4 text-sm text-zinc-400">
        <Spinner /> Loading documents…
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <p className="px-1 py-4 text-sm text-zinc-400">
        No documents yet. Upload a PDF to get started.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {documents.map((doc) => {
        const selected = selectedIds.includes(doc.id);
        const selectable = doc.status === "ready";
        return (
          <li
            key={doc.id}
            className={cn(
              "group rounded-lg border bg-white px-3 py-2.5 transition",
              selected ? "border-indigo-300 ring-1 ring-indigo-200" : "border-zinc-200",
            )}
          >
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={selected}
                disabled={!selectable}
                onChange={() => onToggleSelect(doc.id)}
                className="mt-0.5 h-3.5 w-3.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40"
                aria-label={`Filter searches to ${doc.name}`}
              />
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-800" title={doc.name}>
                  {doc.name}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-400">
                  <StatusBadge status={doc.status} />
                  {doc.status === "ready" && <span>{doc.pageCount} pages</span>}
                  <span>{formatBytes(doc.byteSize)}</span>
                </div>
                {doc.status === "error" && doc.error && (
                  <p className="mt-1 text-[11px] text-red-600">{doc.error}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onDelete(doc.id)}
                className="rounded p-1 text-zinc-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                aria-label={`Delete ${doc.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import { rehypeCitations } from "@/lib/rehype-citations";
import type { Citation } from "@/types";

interface Props {
  answer: string;
  citations: Citation[];
  answered: boolean;
  activeMarker: number | null;
  onCiteClick: (marker: number) => void;
}

export function AnswerBubble({
  answer,
  citations,
  answered,
  activeMarker,
  onCiteClick,
}: Props) {
  const byMarker = new Map(citations.map((c) => [c.marker, c]));

  return (
    <div>
      {!answered && (
        <div className="mb-2 flex items-center gap-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5" />
          Not found in the uploaded documents — no grounded answer.
        </div>
      )}
      <div className="prose-answer text-[15px] text-zinc-800">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeCitations]}
          components={{
            cite({ node }) {
              const marker = Number(
                (node?.properties?.dataMarker as string | undefined) ?? "0",
              );
              const citation = byMarker.get(marker);
              return (
                <button
                  type="button"
                  onClick={() => onCiteClick(marker)}
                  title={
                    citation
                      ? `${citation.documentName} · page ${citation.page}`
                      : undefined
                  }
                  className={cn(
                    "mx-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] px-1 align-[2px] text-[11px] font-semibold not-italic transition",
                    activeMarker === marker
                      ? "bg-indigo-600 text-white"
                      : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200",
                  )}
                >
                  {marker}
                </button>
              );
            },
          }}
        >
          {answer}
        </ReactMarkdown>
      </div>
    </div>
  );
}

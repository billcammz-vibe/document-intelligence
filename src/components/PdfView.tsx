"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const normalize = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c] as string,
  );

interface Props {
  documentId: string;
  page: number;
  quote: string;
}

export default function PdfView({ documentId, page, quote }: Props) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(page);
  const [error, setError] = useState<string | null>(null);
  const [width, setWidth] = useState(540);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setPageNumber(page), [page, documentId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(Math.max(320, Math.floor(entry.contentRect.width - 32)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const file = useMemo(() => `/api/documents/${documentId}/file`, [documentId]);
  const needle = useMemo(() => normalize(quote), [quote]);

  function renderText(textItem: { str: string }): string {
    const clean = normalize(textItem.str);
    if (needle && clean.length > 3 && needle.includes(clean)) {
      return `<mark class="di-mark">${escapeHtml(textItem.str)}</mark>`;
    }
    return escapeHtml(textItem.str);
  }

  return (
    <div ref={containerRef} className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2 text-xs text-zinc-500">
        <button
          type="button"
          onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
          disabled={pageNumber <= 1}
          className="inline-flex items-center gap-1 rounded px-1.5 py-1 hover:bg-zinc-100 disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Prev
        </button>
        <span>
          Page {pageNumber}
          {numPages ? ` of ${numPages}` : ""}
        </span>
        <button
          type="button"
          onClick={() => setPageNumber((p) => (numPages ? Math.min(numPages, p + 1) : p + 1))}
          disabled={numPages > 0 && pageNumber >= numPages}
          className="inline-flex items-center gap-1 rounded px-1.5 py-1 hover:bg-zinc-100 disabled:opacity-40"
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-zinc-100 p-4">
        {error ? (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            Could not load the PDF: {error}
          </div>
        ) : (
          <Document
            file={file}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={(e) => setError(e.message)}
            loading={
              <div className="flex justify-center py-16">
                <Spinner className="h-5 w-5" />
              </div>
            }
            error={
              <div className="py-16 text-center text-sm text-red-600">
                Failed to load PDF.
              </div>
            }
          >
            <Page
              key={pageNumber}
              pageNumber={pageNumber}
              width={width}
              customTextRenderer={renderText}
              renderAnnotationLayer={false}
              className={cn("mx-auto bg-white shadow ring-1 ring-black/5")}
              loading={
                <div className="flex justify-center py-16">
                  <Spinner className="h-5 w-5" />
                </div>
              }
            />
          </Document>
        )}
      </div>
    </div>
  );
}

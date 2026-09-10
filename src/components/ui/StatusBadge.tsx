import { cn } from "@/lib/cn";
import type { DocumentStatus } from "@/types";

const STYLES: Record<DocumentStatus, string> = {
  processing: "bg-amber-100 text-amber-800 ring-amber-200",
  ready: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  error: "bg-red-100 text-red-800 ring-red-200",
};

const LABELS: Record<DocumentStatus, string> = {
  processing: "Processing",
  ready: "Ready",
  error: "Error",
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        STYLES[status],
      )}
    >
      {LABELS[status]}
    </span>
  );
}

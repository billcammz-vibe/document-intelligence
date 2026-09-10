"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { SendHorizonal, Sparkles, TriangleAlert } from "lucide-react";
import { UploadDropzone } from "@/components/UploadDropzone";
import { DocumentList } from "@/components/DocumentList";
import { AnswerBubble } from "@/components/AnswerBubble";
import { CitationsPanel } from "@/components/CitationsPanel";
import { SourceViewer } from "@/components/SourceViewer";
import { Spinner } from "@/components/ui/Spinner";
import type { Citation, DocumentSummary, QueryResult } from "@/types";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Request failed");
  return res.json();
};

interface Turn {
  id: string;
  question: string;
  loading: boolean;
  result?: QueryResult;
  error?: string;
}

interface Health {
  database: boolean;
  anthropic: boolean;
  embeddings: boolean;
  provider: string;
  model: string;
  embeddingModel: string;
}

const SAMPLE_QUESTIONS = [
  "What were total net sales and how did they change year over year?",
  "Summarize the key risk factors related to supply chain.",
  "What does the agreement say about termination and notice periods?",
];

export default function Home() {
  const { data: docData, isLoading, mutate } = useSWR<{ documents: DocumentSummary[] }>(
    "/api/documents",
    fetcher,
    {
      refreshInterval: (d) =>
        d?.documents?.some((x) => x.status === "processing") ? 2000 : 0,
    },
  );
  const { data: health } = useSWR<Health>("/api/health", fetcher, {
    refreshInterval: 15000,
  });

  const documents = useMemo(() => docData?.documents ?? [], [docData]);
  const readyDocs = useMemo(
    () => documents.filter((d) => d.status === "ready"),
    [documents],
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [open, setOpen] = useState<{ turnId: string; marker: number } | null>(null);

  const validSelected = useMemo(
    () => selectedIds.filter((id) => readyDocs.some((d) => d.id === id)),
    [selectedIds, readyDocs],
  );

  const latestResultTurn = useMemo(
    () => [...turns].reverse().find((t) => t.result),
    [turns],
  );

  const openCitation: Citation | null = useMemo(() => {
    if (!open) return null;
    const turn = turns.find((t) => t.id === open.turnId);
    return turn?.result?.citations.find((c) => c.marker === open.marker) ?? null;
  }, [open, turns]);

  const toggleSelect = (id: string) =>
    setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const onDelete = async (id: string) => {
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    setSelectedIds((s) => s.filter((x) => x !== id));
    void mutate();
  };

  const ask = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      if (q.length < 3 || readyDocs.length === 0) return;

      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now());

      setTurns((t) => [...t, { id, question: q, loading: true }]);
      setQuestion("");

      try {
        const res = await fetch("/api/query", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            question: q,
            documentIds: validSelected.length > 0 ? validSelected : undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Query failed.");
        setTurns((t) =>
          t.map((x) => (x.id === id ? { ...x, loading: false, result: json } : x)),
        );
      } catch (err) {
        setTurns((t) =>
          t.map((x) =>
            x.id === id
              ? {
                  ...x,
                  loading: false,
                  error: err instanceof Error ? err.message : "Query failed.",
                }
              : x,
          ),
        );
      }
    },
    [readyDocs.length, validSelected],
  );

  const configIssues: string[] = [];
  if (health && !health.database) configIssues.push("DATABASE_URL");
  if (health && !health.anthropic) configIssues.push("ANTHROPIC_API_KEY");
  if (health && !health.embeddings)
    configIssues.push(health.provider === "openai" ? "OPENAI_API_KEY" : "VOYAGE_API_KEY");

  return (
    <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col px-4 py-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-zinc-900">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            Document Intelligence
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Ask questions about financial PDFs. Every answer is grounded in cited
            source passages.
          </p>
        </div>
        {health && (
          <p className="text-xs text-zinc-400">
            {health.model} · embeddings: {health.embeddingModel}
          </p>
        )}
      </header>

      {configIssues.length > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Missing configuration: <strong>{configIssues.join(", ")}</strong>. Add
            it to <code className="rounded bg-amber-100 px-1">.env.local</code> and
            restart the dev server.
          </span>
        </div>
      )}

      <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)_360px]">
        {/* Left — documents */}
        <section className="flex flex-col gap-4">
          <UploadDropzone onUploaded={() => void mutate()} />
          <div>
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Documents
              </h2>
              {validSelected.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-[11px] font-medium text-indigo-600 hover:underline"
                >
                  Clear filter
                </button>
              )}
            </div>
            <DocumentList
              documents={documents}
              loading={isLoading}
              selectedIds={validSelected}
              onToggleSelect={toggleSelect}
              onDelete={onDelete}
            />
            {readyDocs.length > 0 && (
              <p className="mt-2 px-1 text-[11px] text-zinc-400">
                {validSelected.length > 0
                  ? `Searching ${validSelected.length} selected document${validSelected.length > 1 ? "s" : ""}.`
                  : "Searching all ready documents."}
              </p>
            )}
          </div>
        </section>

        {/* Center — conversation */}
        <section className="flex min-h-[60vh] flex-col rounded-xl border border-zinc-200 bg-white">
          <div className="flex-1 space-y-6 overflow-y-auto p-5">
            {turns.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <p className="max-w-sm text-sm text-zinc-500">
                  {readyDocs.length === 0
                    ? "Upload a PDF on the left to start asking questions."
                    : "Ask a question about your documents."}
                </p>
                {readyDocs.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {SAMPLE_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => void ask(q)}
                        className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 transition hover:border-indigo-300 hover:text-indigo-700"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {turns.map((turn) => (
              <div key={turn.id} className="space-y-3">
                <div className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-indigo-600 px-3.5 py-2 text-sm text-white">
                    {turn.question}
                  </p>
                </div>

                <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-zinc-200 bg-zinc-50/60 px-4 py-3">
                  {turn.loading && (
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Spinner /> Retrieving passages and generating a grounded
                      answer…
                    </div>
                  )}
                  {turn.error && (
                    <p className="text-sm text-red-600">{turn.error}</p>
                  )}
                  {turn.result && (
                    <AnswerBubble
                      answer={turn.result.answer}
                      citations={turn.result.citations}
                      answered={turn.result.answered}
                      activeMarker={
                        open?.turnId === turn.id ? open.marker : null
                      }
                      onCiteClick={(marker) => setOpen({ turnId: turn.id, marker })}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(question);
            }}
            className="border-t border-zinc-200 p-3"
          >
            <div className="flex items-end gap-2">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void ask(question);
                  }
                }}
                rows={1}
                placeholder={
                  readyDocs.length === 0
                    ? "Upload a document first…"
                    : "Ask a question…"
                }
                disabled={readyDocs.length === 0}
                className="max-h-40 min-h-[42px] flex-1 resize-y rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-zinc-50"
              />
              <button
                type="submit"
                disabled={readyDocs.length === 0 || question.trim().length < 3}
                className="inline-flex h-[42px] items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <SendHorizonal className="h-4 w-4" />
                Ask
              </button>
            </div>
          </form>
        </section>

        {/* Right — citations */}
        <section className="flex flex-col">
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Citations
          </h2>
          {latestResultTurn?.result ? (
            <CitationsPanel
              citations={latestResultTurn.result.citations}
              retrieved={latestResultTurn.result.retrieved}
              activeMarker={
                open?.turnId === latestResultTurn.id ? open.marker : null
              }
              onCiteClick={(marker) =>
                setOpen({ turnId: latestResultTurn.id, marker })
              }
            />
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-10 text-center text-sm text-zinc-400">
              Ask a question to see grounded citations here.
            </div>
          )}
        </section>
      </div>

      <SourceViewer citation={openCitation} onClose={() => setOpen(null)} />
    </div>
  );
}

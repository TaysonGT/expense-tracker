import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, CheckCircle2, Mic, RefreshCw, Square } from "lucide-react";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useCategories, useVoiceEntry, useApproveExpense } from "../lib/queries";
import type { Expense, ParsedEntity } from "../types";
import EntityCard from "../components/EntityCard";
import GroupSelector from "../components/GroupSelector";
import { useAuth } from "../context/AuthContext";

type Phase = "idle" | "recording" | "processing" | "review" | "failed" | "no-text";

/**
 * Voice Capture screen.
 *
 * Flow (per spec):
 *  idle → recording (live partial captions) → processing (LLM parse via API)
 *       → review (editable entities, approve now or approve later)
 * A failed parse/upload lands on `failed` with a retry button — nothing lost.
 */
function VoiceCapture() {
  const nav = useNavigate();
  const { currentGroup } = useAuth();
  const currencyCode = currentGroup?.currency;
  const {
    supported,
    listening,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    reset,
  } = useSpeechRecognition();

  const { data: categories = [] } = useCategories();
  const voiceEntry = useVoiceEntry();
  const approveExpense = useApproveExpense();

  const [phase, setPhase] = useState<Phase>("idle");
  const [entities, setEntities] = useState<ParsedEntity[]>([]);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [lastTranscript, setLastTranscript] = useState("");

  // Map a persisted Expense (from /voice-entry) into an editable ParsedEntity.
  const toParsedEntity = (e: Expense): ParsedEntity => ({
    id: e.id,
    title: e.title,
    cost: e.cost,
    categoryId: e.categoryId,
    categoryUncertain: e.categoryId == null,
  });

  const beginRecording = useCallback(() => {
    reset();
    setEntities([]);
    setApprovedIds(new Set());
    setPhase("recording");
    start();
  }, [reset, start]);

  const runParse = useCallback(
    async (text: string) => {
      setLastTranscript(text);
      setPhase("processing");
      try {
        const created = await voiceEntry.mutateAsync({ transcript: text });
        if (created.length === 0) {
          setPhase("no-text");
          return;
        }
        setEntities(created.map(toParsedEntity));
        setPhase("review");
      } catch {
        setPhase("failed");
      }
    },
    [voiceEntry]
  );

  const finishRecording = useCallback(() => {
    stop();
    const text = transcript.trim();
    if (!text) {
      setPhase("no-text");
      return;
    }
    void runParse(text);
  }, [stop, transcript, runParse]);

  const retry = useCallback(() => {
    if (lastTranscript) {
      void runParse(lastTranscript);
    } else {
      beginRecording();
    }
  }, [lastTranscript, runParse, beginRecording]);

  const updateEntity = useCallback((updated: ParsedEntity) => {
    setEntities((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }, []);

  const approveEntity = useCallback(
    async (entity: ParsedEntity) => {
      setLoadingIds((prev)=> new Set(prev).add(entity.id)) 
      try {
        await approveExpense.mutateAsync({
          id: entity.id,
          title: entity.title,
          cost: entity.cost ?? undefined,
          categoryId: entity.categoryId ?? undefined,
        });
        setApprovedIds((prev) => new Set(prev).add(entity.id));
      } catch {
        // Leave it un-approved so the user can retry.
      } finally {
        setLoadingIds((prev)=> {
          const updated = new Set(prev)
          updated.delete(entity.id)
          return updated
        }) 
      }
    },
    [approveExpense]
  );

  const pending = useMemo(
    () => entities.filter((e) => !approvedIds.has(e.id)),
    [entities, approvedIds]
  );

  return (
    <div className="min-h-full flex-col items-center flex bg-gray-50 pb-28">
      {/* Header */}
      <header className="sticky top-0 z-10 self-stretch flex items-center justify-between gap-3 bg-gray-50/90 px-4 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            onClick={() => nav(-1)}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-gray-100"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-semibold">Voice capture</h1>
        </div>
        <GroupSelector />
      </header>

      <main className="max-w-md w-full px-4 grow flex flex-col justify-center">
        {!supported && (
          <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-100">
            Speech recognition isn't supported in this browser. Try Chrome, or
            use “Type manually” instead.
          </p>
        )}

        {/* IDLE */}
        {phase === "idle" && (
          <div className="mt-16 flex flex-col items-center">
            <p className="mb-10 text-center text-sm text-gray-500">
              Tap the mic and say what you bought.
              <br />
              e.g. “lemons and potatoes for $1.50, and some milk”
            </p>
            <RecordButton listening={false} onClick={beginRecording} disabled={!supported} />
            <span className="mt-4 text-xs text-gray-400">Tap to start</span>
          </div>
        )}

        {/* RECORDING */}
        {phase === "recording" && (
          <div className="mt-10 flex flex-col items-center">
            <div className="min-h-28 w-full rounded-2xl bg-[#1f1f1f] p-5 text-center">
              {transcript ? (
                <p className="text-base leading-relaxed text-gray-200">
                  {transcript.replace(interimTranscript, "")}
                  <span className="text-gray-400">{interimTranscript}</span>
                </p>
              ) : (
                <p className="text-sm text-gray-400">Listening…</p>
              )}
            </div>

            <div className="mt-10 flex flex-col items-center">
              <RecordButton listening={listening} onClick={finishRecording} />
              <span className="mt-4 flex items-center gap-2 text-xs font-medium text-gray-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                Recording — tap to stop
              </span>
            </div>
          </div>
        )}

        {/* FAILED */}
        {phase === "no-text" && (
          <div className="mt-24 flex flex-col items-center">
            <div className="flex items-center justify-center rounded-full bg-red-50 text-red-500 ring-1 ring-red-100">
              <RecordButton
                listening={false}
                failed
                onClick={retry}
                />
            {/* <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500 ring-1 ring-red-100"> */}
            {/*   <RefreshCw size={22} /> */}
            </div>
            <p className="mt-5 text-sm font-medium text-gray-800">
              No input detected
            </p>
            <p className="mt-1 max-w-xs text-center text-xs text-gray-400">
              Try speaking again
            </p>
            {/* <button */}
            {/*   onClick={retry} */}
            {/*   className="mt-6 flex items-center gap-2 rounded-full bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white" */}
            {/* > */}
            {/*   <RefreshCw size={15} /> */}
            {/*   Retry */}
            {/* </button> */}
          </div>
        )}

        {/* PROCESSING */}
        {phase === "processing" && (
          <div className="mt-24 flex flex-col items-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
            <p className="mt-6 text-sm font-medium text-gray-700">
              Making sense of that…
            </p>
            <p className="mt-1 max-w-xs text-center text-xs text-gray-400">
              “{lastTranscript}”
            </p>
          </div>
        )}

        {/* FAILED */}
        {phase === "failed" && (
          <div className="mt-24 flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500 ring-1 ring-red-100">
              <RefreshCw size={22} />
            </div>
            <p className="mt-5 text-sm font-medium text-gray-800">
              {error ? `Couldn't capture that (${error}).` : "Something went wrong."}
            </p>
            <p className="mt-1 max-w-xs text-center text-xs text-gray-400">
              Nothing was lost — you can try again.
            </p>
            <button
              onClick={retry}
              className="mt-6 flex items-center gap-2 rounded-full bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white"
            >
              <RefreshCw size={15} />
              Retry
            </button>
          </div>
        )}

        {/* REVIEW */}
        {(phase === "review") &&(
          pending.length>0? (
          <div className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Review items
                </h2>
                <p className="text-xs text-gray-400">
                  {entities.length} item{entities.length === 1 ? "" : "s"} parsed
                  {pending.length > 0 && ` · ${pending.length} to review`}
                </p>
              </div>
              <button
                onClick={beginRecording}
                className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200"
              >
                <Mic size={13} />
                Redo
              </button>
            </div>

            {/* Original transcript reference */}
            <details className="mb-4 rounded-xl bg-white p-3 text-xs text-gray-500 ring-1 ring-gray-100">
              <summary className="cursor-pointer font-medium text-gray-600">
                View original transcript
              </summary>
              <p className="mt-2 leading-relaxed">{lastTranscript}</p>
            </details>

            <div className="space-y-3">
              {entities.map((entity) => (
                <EntityCard
                  key={entity.id}
                  entity={entity}
                  isLoading={loadingIds.has(entity.id)}
                  categories={categories}
                  currencyCode={currencyCode}
                  onChange={updateEntity}
                  onApprove={approveEntity}
                  approved={approvedIds.has(entity.id)}
                />
              ))}
            </div>

            {/* Approve later — sends everything to the queue as pending */}
            <button
              onClick={() => nav("/")}
              className="mt-6 w-full rounded-2xl border border-gray-200 bg-white py-3 text-sm font-medium text-gray-600"
            >
              {pending.length > 0 ? "Approve later" : "Done"}
            </button>
          </div>
          )
          :
          (
          <div className="mt-20 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 ring-1 ring-emerald-100">
              <CheckCircle2 size={30} />
            </div>
            <p className="mt-5 text-base font-medium text-gray-800">
              You're all caught up
            </p>
            <p className="mt-1 max-w-xs text-sm text-gray-500">
              No expenses waiting for review. New voice entries will show up
              here.
            </p>
            <button
              onClick={() => nav("/expenses")}
              className="mt-6 rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white"
            >
              View all expenses
            </button>
          </div>)
        )}
      </main>
    </div>
  );
}

function RecordButton({
  listening,
  onClick,
  disabled,
  failed
}: {
  listening: boolean;
  onClick: () => void;
  disabled?: boolean;
  failed?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={listening ? "Stop recording" : "Start recording"}
      className="relative cursor-pointer flex hover:scale-102 duration-200 h-24 w-24 items-center justify-center rounded-full text-white transition-transform active:scale-95 disabled:opacity-40"
      style={{
        background: failed? '#ffc107': listening ? "#ef4444" : "#111827",
        boxShadow: failed ? 
          "0 0 0 8px #ffc10744"
          : listening ? 
            "0 0 0 8px rgba(239,68,68,0.15)"
          : "0 8px 30px rgba(17,24,39,0.35)",
      }}
    >
      {listening && (
        <span className="absolute inset-0 animate-ping rounded-full bg-red-500/30" />
      )}
      {listening ? <Square size={30} fill="white" /> : <Mic size={34} />}
    </button>
  );
}

export default VoiceCapture;

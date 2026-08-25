import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, CheckCircle2, Mic, RefreshCw, X } from "lucide-react";
import { DEFAULT_SPEECH_LANG } from "../lib/speechLanguages";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import {
  useCategories,
  useVoiceEntry,
  useApproveExpense,
  useDeleteExpense,
} from "../lib/queries";
import type { Expense, ParsedEntity } from "../types";
import EntityCard from "../components/EntityCard";
import AddNotAllowed from "../components/AddNotAllowed";
import OrbComponent from "../components/OrbAnimation";
import LanguageSelector from "../components/LanguageSelector";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

type Phase =
  | "idle"
  | "recording"
  | "processing"
  | "review"
  | "failed"
  | "no-text";

/* Keyframes injected once — bars breathe via CSS only (no re-render ticks),
   and result blocks get a soft enter animation instead of popping in. */
const KEYFRAMES = `
@keyframes vc-bar {
  from { transform: scaleY(0.2); }
  to   { transform: scaleY(var(--peak, 1)); }
}
@keyframes vc-in {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

const BAR_COUNT = 40;

/**
 * Voice Capture — immersive dark capture stage.
 *
 * idle → recording (live transcript cross-fades over the prompt) →
 * processing (Siri-style orb) → review.
 *
 * The stage (prompt / transcript / orb + mic + waves) stays mounted across the
 * capture flow so everything cross-fades instead of popping. Result states
 * (review / failed / no-text) replace it with a soft enter animation.
 * No BottomNav here — the back button doubles as "cancel without processing".
 */
function VoiceCapture() {
  const nav = useNavigate();
  const { currentGroup, canWrite: isWriter } = useAuth();
  const currencyCode = currentGroup?.currency;

  const { data: categories = [] } = useCategories();
  const voiceEntry = useVoiceEntry();
  const approveExpense = useApproveExpense();
  const deleteExpense = useDeleteExpense();
  const { logo } = useTheme()

  const [phase, setPhase] = useState<Phase>("processing");
  const [entities, setEntities] = useState<ParsedEntity[]>([]);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [lastTranscript, setLastTranscript] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [lang, setLang] = useState<string>(
    () => localStorage.getItem("voiceLang") || DEFAULT_SPEECH_LANG
  );
  
  const {
    supported: speechSupported,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    reset,
  } = useSpeechRecognition(lang);
  
  useEffect(() => {
    localStorage.setItem("voiceLang", lang);
  }, [lang]);

  const active = phase === "recording";
  const processing = phase === "processing";
  const stageOn =
    isWriter && (phase === "idle" || phase === "recording" || phase === "processing");

  /* Recording timer — drives the mm:ss caption; cleans itself up. */
  useEffect(() => {
    if (phase !== "recording") return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  /* Per-bar motion profile, generated once. */
  const bars = useMemo(
    () =>
      Array.from({ length: BAR_COUNT }, (_, i) => ({
        peak: 0.5 + ((i * 37) % 50) / 100, // 0.5 … 1.0
        delay: ((i * 13) % 70) / 100, // 0 … 0.7s
        dur: 0.6 + ((i * 7) % 40) / 100, // 0.6 … 1.0s
      })),
    []
  );

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
    setApprovingIds(new Set());
    setRemovingIds(new Set());
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /** Back button while recording → cancel without processing anything. */
  const cancelRecording = useCallback(() => {
    stop();
    reset();
    setLastTranscript("");
    setPhase("idle");
  }, [stop, reset]);

  const retry = useCallback(() => {
    if (lastTranscript) {
      void runParse(lastTranscript);
    } else {
      beginRecording();
    }
  }, [lastTranscript, runParse, beginRecording]);

  const handleMic = useCallback(() => {
    if (!isWriter || !speechSupported || processing) return;
    if (active) finishRecording();
    else beginRecording();
  }, [isWriter, speechSupported, processing, active, finishRecording, beginRecording]);

  const updateEntity = useCallback((updated: ParsedEntity) => {
    setEntities((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }, []);

  const approveEntity = useCallback(
    async (entity: ParsedEntity) => {
      setApprovingIds((prev) => new Set(prev).add(entity.id));
      try {
        await approveExpense.mutateAsync({
          id: entity.id,
          title: entity.title,
          cost: entity.cost ?? undefined,
          categoryId: entity.categoryId ?? undefined,
        });
        setApprovedIds((prev) => new Set(prev).add(entity.id));
      } catch {
        /* leave un-approved so the user can retry */
      } finally {
        setApprovingIds((prev) => {
          const next = new Set(prev);
          next.delete(entity.id);
          return next;
        });
      }
    },
    [approveExpense]
  );

  const deleteEntity = useCallback(
    async (entity: ParsedEntity) => {
      setRemovingIds((prev) => new Set(prev).add(entity.id));
      try {
        await deleteExpense.mutateAsync(entity.id);
        setRemovedIds((prev) => new Set(prev).add(entity.id));
      } catch {
        /* keep it visible so the user can retry */
      } finally {
        setRemovingIds((prev) => {
          const next = new Set(prev);
          next.delete(entity.id);
          return next;
        });
      }
    },
    [deleteExpense]
  );

  const pending = useMemo(
    () => entities.filter((e) => !approvedIds.has(e.id)&&!removedIds.has(e.id)),
    [entities, approvedIds, removedIds]
  );


  useEffect(()=>{
    console.log({entities: entities.length, pending: pending.length});
  },[entities, pending])

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const caption = !speechSupported
    ? "Voice input isn't supported in this browser"
    : phase === "recording"
      ? `Listening · ${fmt(elapsed)}`
      : processing
        ? "Making sense of it…"
        : "Tap to speak";

  /* Layer visibility — all three stay mounted, only opacity/transform change. */
  const showPrompt = phase === "idle";
  const showLive = phase === "recording";

  return (
    <div className="flex h-svh overflow-y-auto flex-col bg-background text-white">
      <style>{KEYFRAMES}</style>

      {/* Header — back button + app logo, language picker on the right */}
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-background/80 px-4 py-4 backdrop-blur">
        <button
          onClick={() => {
            if (active) cancelRecording();
            else nav(-1);
          }}
          aria-label={active ? "Cancel recording" : "Back"}
          className="grid h-9 w-9 place-items-center rounded-full bg-card/8 text-primary/90 border border-border transition-colors hover:bg-card/15"
        >
          <ArrowLeft size={18} />
        </button>
        <img src={logo} alt="WhisperTrack" className="h-6 opacity-90" />
        <div className="ml-auto">
          <LanguageSelector
            value={lang}
            onChange={setLang}
            disabled={active || processing}
          />
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-md flex-1 px-4">
        {!speechSupported && isWriter && (
          <p className="absolute inset-x-4 top-2 z-20 rounded-xl bg-amber-400/10 p-3 text-xs text-amber-200 border border-amber-300/20">
            Speech recognition isn't supported here — try Chrome, or use “Type manually”.
          </p>
        )}

        {/* ------------------------- capture stage ------------------------- */}
        <section
          aria-hidden={!stageOn}
          className={`absolute inset-0 flex flex-col transition-all duration-300 ${
            stageOn ? "opacity-100" : "pointer-events-none scale-[0.98] opacity-0"
          }`}
        >
          {/* Center layers: prompt ↔ live transcript ↔ orb */}
          <div className="relative flex-1">
            {/* Prompt */}
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center px-6 text-center transition-all duration-500 ${
                showPrompt ? "opacity-100 delay-150" : "-translate-y-2 opacity-0"
              }`}
            >
              <h1 className="text-3xl font-light tracking-tight text-primary">
                Whisper your expenses.
              </h1>
              <p className="mt-3 max-w-xs text-sm text-primary/40">
                Tap the mic, say it like you'd say it out loud.
              </p>
            </div>

            {/* Live transcript */}
            <div
              className={`absolute inset-0 flex items-center justify-center px-2 transition-all duration-300 ${
                showLive ? "opacity-100" : "translate-y-2 opacity-0"
              }`}
            >
              <div className="min-h-32 w-full text-center">
                {transcript || interimTranscript ? (
                  <p className="text-lg leading-relaxed text-primary">
                    {interimTranscript
                      ? transcript.replace(interimTranscript, "")
                      : transcript}
                    <span className="text-empty-subtitle">{interimTranscript}</span>
                  </p>
                ) : (
                  <p className="pt-4 text-sm text-primary/60">Listening…</p>
                )}
              </div>
            </div>

            {/* Processing orb */}
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ${
                processing ? "scale-100 opacity-100" : "scale-90 opacity-0"
              }`}
            >
              <OrbComponent size="128px" animationDuration={6} />
              <div className="mt-6 px-4 text-center space-y-2">
                  <h3 className="text-empty-title">Making sense of it...</h3>
                  <p className="text-empty-subtitle">"{transcript}"</p>
              </div>
            </div>
          </div>

          {/* Bottom controls */}
          <div className={`flex flex-col items-center gap-3 pb-16 duration-200 ${phase==='processing'?'translate-y-1/2 opacity-0 scale-95':''}`}>
            <button
              type="button"
              onClick={handleMic}
              disabled={!speechSupported || !isWriter}
              aria-label={active ? "Stop and parse" : "Start recording"}
              className="relative grid h-16 w-16 place-items-center rounded-2xl transition-colors disabled:opacity-40"
            >
              {/* spinning square (recording) */}
              <span
                className={`absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-sm bg-primary transition-all duration-200 ${
                  active ? "scale-100 opacity-100" : "scale-50 opacity-0"
                }`}
                style={{ animationDuration: "3s" }}
              />
              {/* mic pill (idle) */}
              <span
                className={`grid h-12 w-12 place-items-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 transition-all duration-200 hover:scale-105 ${
                  active ? "scale-50 opacity-0" : "scale-100 opacity-100"
                }`}
              >
                <Mic className="h-6 w-6" />
              </span>
            </button>

            {/* Sound waves */}
            <div className="flex h-5 w-64 items-center justify-center gap-[3px]">
              {bars.map((b, i) => (
                <span
                  key={i}
                  className={`w-[3px] rounded-full transition-colors duration-300 ${
                    active ? "bg-empty-title/70" : "bg-empty-title/15"
                  }`}
                  style={{
                    height: "100%",
                    transformOrigin: "center",
                    ...(active
                      ? {
                          animation: `vc-bar ${b.dur}s ease-in-out ${b.delay}s infinite alternate`,
                          ["--peak" as string]: b.peak,
                        }
                      : { transform: "scaleY(0.18)" }),
                  }}
                />
              ))}
            </div>

            <p className="h-4 text-xs text-empty-subtitle">{caption}</p>
          </div>
        </section>

        {/* ------------------------ readonly notice ----------------------- */}
        {!isWriter && (
          <div className="flex flex-1 items-center">
            <AddNotAllowed />
          </div>
        )}

        {/* -------------------- no input detected ------------------------- */}
        {phase === "no-text" && (
          <ResultBlock
            icon={<X size={26} />}
            tone="amber"
            title="No input detected"
            subtitle="We didn't catch that — try speaking a little louder."
          >
            <button
              onClick={beginRecording}
              className="mt-6 flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              <Mic size={15} />
              Try again
            </button>
          </ResultBlock>
        )}

        {/* ---------------------- processing failure ---------------------- */}
        {phase === "failed" && (
          <ResultBlock
            icon={<RefreshCw size={24} />}
            tone="red"
            title="Couldn't process that"
            subtitle={
              error
                ? `Something went wrong (${error}). Nothing was lost.`
                : "Something went wrong on our side. Nothing was lost."
            }
          >
            <div className="mt-6 flex items-center gap-3">
              {lastTranscript && (
                <button
                  onClick={retry}
                  className="flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                >
                  <RefreshCw size={14} />
                  Retry parsing
                </button>
              )}
              <button
                onClick={beginRecording}
                className="flex items-center gap-2 rounded-full bg-card/10 px-5 py-2.5 text-sm font-semibold text-primary/90 border border-border transition-colors hover:bg-card/20"
              >
                <Mic size={14} />
                Record again
              </button>
            </div>
          </ResultBlock>
        )}

        {/* ----------------------------- review --------------------------- */}
        {phase === "review" && pending.length > 0 && (
          <div
            className="flex w-full flex-col h-full overflow-y-hidden"
            style={{ animation: "vc-in 0.3s ease-out both" }}
          >
            <div className="mb-4 flex items-center justify-between pt-2">
              <div>
                <h2 className="text-base font-semibold text-primary">Review items</h2>
                <p className="text-xs text-empty-subtitle">
                  {entities.length} item{entities.length === 1 ? "" : "s"} parsed
                  {" · "}
                  {pending.length} to review
                </p>
              </div>
              <button
                onClick={beginRecording}
                className="flex items-center gap-1.5 rounded-full bg-card/10 px-3 py-1.5 text-xs font-medium text-empty-title border border-border transition-colors hover:bg-card-hover"
              >
                <Mic size={13} />
                Redo
              </button>
            </div>

            <details className="mb-4 rounded-xl bg-card/5 p-3 text-xs  border border-border">
              <summary className="cursor-pointer font-medium text-primary">
                View original transcript
              </summary>
              <p className="mt-2 leading-relaxed text-empty-title">{lastTranscript}</p>
            </details>

            <div className="-mx-4 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
              {entities
                .filter((e) => e.id&&!removedIds.has(e.id))
                .map((entity) => (
                  <EntityCard
                    key={entity.id}
                    entity={entity}
                    isApproving={approvingIds.has(entity.id)}
                    isRemoving={removingIds.has(entity.id)}
                    categories={categories}
                    currencyCode={currencyCode}
                    onChange={updateEntity}
                    onApprove={approveEntity}
                    onRemove={deleteEntity}
                    approved={approvedIds.has(entity.id)}
                  />
                ))}
            </div>

            <button
              onClick={() => nav("/")}
              className="mb-6 mt-4 w-full rounded-2xl bg-card/5 py-3 text-sm font-medium text-white/70 border border-white/10 transition-colors hover:bg-card/10"
            >
              Approve later
            </button>
          </div>
        )}

        {/* ------------------------ all caught up ------------------------- */}
        {(phase === "review" && pending.length === 0 && entities.length > 0) && (
          <ResultBlock
            icon={<CheckCircle2 size={28} />}
            tone="emerald"
            title="You're all caught up"
            subtitle="Every parsed item was saved. New entries will show up here."
          >
            <button
              onClick={() => nav("/expenses")}
              className="mt-6 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              View all expenses
            </button>
          </ResultBlock>
        )}
      </main>
    </div>
  );
}

/* Shared centered result layout with soft enter animation. */
function ResultBlock({
  icon,
  title,
  subtitle,
  tone,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tone: "amber" | "red" | "emerald";
  children?: React.ReactNode;
}) {
  const tones: Record<typeof tone, string> = {
    amber: "bg-amber-400/10 text-amber-300 ring-amber-300/20",
    red: "bg-red-400/10 text-red-300 ring-red-300/20",
    emerald: "bg-accent/10 text-accent ring-accent-dark/20",
  };

  return (
    <div
      className="flex flex-1 flex-col items-center justify-center text-center"
      style={{ animation: "vc-in 0.3s ease-out both" }}
    >
      <div className={`grid h-16 w-16 place-items-center rounded-full ring-1 ${tones[tone]}`}>
        {icon}
      </div>
      <p className="mt-5 text-base font-medium text-primary">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-primary/45">{subtitle}</p>
      {children}
    </div>
  );
}

export default VoiceCapture;

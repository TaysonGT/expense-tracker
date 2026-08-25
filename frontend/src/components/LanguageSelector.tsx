import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { SPEECH_LANGUAGES } from "../lib/speechLanguages";

interface LanguageSelectorProps {
  /** Currently selected BCP-47 tag. */
  value: string;
  onChange: (code: string) => void;
  /** Disable the trigger (e.g. while recording/processing). */
  disabled?: boolean;
}

/**
 * Compact speech-language picker used on the voice capture stage.
 *
 * Renders the active language's label (native script where applicable) inside
 * a themed pill; opens an anchored dropdown listing every entry from
 * SPEECH_LANGUAGES with a checkmark on the active one. Closes on outside
 * click / Escape, animates with the shared scale + translate pattern.
 */
export default function LanguageSelector({
  value,
  onChange,
  disabled = false,
}: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current =
    SPEECH_LANGUAGES.find((l) => l.code === value) ?? SPEECH_LANGUAGES[0];

  /* Close on outside click / Escape. */
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Speech language"
        className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-card-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Languages size={14} className="text-empty-title" />
        <span>{current.label}</span>
        <ChevronDown
          size={12}
          className={`text-empty-subtitle transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        role="menu"
        className={`absolute right-0 top-full z-30 mt-2 w-44 origin-top-right rounded-xl border border-border bg-card py-1 shadow-xl transition-all duration-200 ${
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-95 opacity-0"
        }`}
      >
        <p className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wider text-empty-subtitle">
          Speech language
        </p>
        {SPEECH_LANGUAGES.map((l) => {
          const isActive = l.code === value;
          return (
            <button
              key={l.code}
              type="button"
              role="menuitemradio"
              aria-checked={isActive}
              onClick={() => {
                onChange(l.code);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-card-hover ${
                isActive ? "font-medium text-primary" : "text-empty-title"
              }`}
            >
              <Check
                size={14}
                className={`text-accent ${isActive ? "opacity-100" : "opacity-0"}`}
              />
              <span>{l.label}</span>
              <span className="ml-auto text-[10px] uppercase text-empty-subtitle">
                {l.code.split("-")[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

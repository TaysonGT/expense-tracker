import { useCallback, useEffect, useRef, useState } from "react";

export interface UseSpeechRecognition {
  /** Whether the browser supports the Web Speech API at all. */
  supported: boolean;
  /** Currently listening. */
  listening: boolean;
  /** Finalized transcript so far. */
  finalTranscript: string;
  /** Live, not-yet-final words being spoken. */
  interimTranscript: string;
  /** Full text (final + interim), convenient for captions. */
  transcript: string;
  /** Recognition error code, if any (e.g. "not-allowed", "no-speech"). */
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

/**
 * Thin wrapper around the Web Speech API (SpeechRecognition) providing live
 * partial captions. STT runs entirely client-side per the spec — no audio is
 * uploaded.
 */
export function useSpeechRecognition(
  lang: string = "en-US"
): UseSpeechRecognition {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [listening, setListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const SpeechRecognitionCtor =
    typeof window !== "undefined"
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : undefined;
  const supported = Boolean(SpeechRecognitionCtor);

  useEffect(() => {
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = "";
      let interim = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          final += text + " ";
        } else {
          interim += text;
        }
      }

      setFinalTranscript(final.trim());
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setError(event.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, [SpeechRecognitionCtor, lang]);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    setError(null);
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      // start() throws if already started — ignore.
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setFinalTranscript("");
    setInterimTranscript("");
    setError(null);
  }, []);

  const transcript = [finalTranscript, interimTranscript]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    supported,
    listening,
    finalTranscript,
    interimTranscript,
    transcript,
    error,
    start,
    stop,
    reset,
  };
}

import { useCallback, useEffect } from "react";
import ReactSpeechRecognition, {
  useSpeechRecognition as useReactSpeechRecognition,
} from "react-speech-recognition";
import { setupSpeechPolyfill } from "../lib/speechPolyfill";

// Kick off the (optional) Azure polyfill setup once at module load, before any
// hook instance mounts. Fire-and-forget: it lazy-loads the Azure SDK only when
// env vars are configured, and is a no-op otherwise.
void setupSpeechPolyfill();

export interface UseSpeechRecognition {
  /** Whether speech recognition is available (native or via polyfill). */
  supported: boolean;
  /** Currently listening. */
  listening: boolean;
  /** Finalized transcript so far. */
  finalTranscript: string;
  /** Live, not-yet-final words being spoken. */
  interimTranscript: string;
  /** Full text (final + interim), convenient for captions. */
  transcript: string;
  /** Whether microphone permission has been granted. */
  micAvailable: boolean;
  /** Error code, if any (currently: "not-allowed" when mic is blocked). */
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

/**
 * Wrapper around react-speech-recognition providing live partial captions.
 * STT runs entirely client-side per the spec — no audio is uploaded to our
 * backend. Cross-platform consistency comes from the optional Azure polyfill
 * (see lib/speechPolyfill.ts).
 *
 * The public shape is kept stable so callers (VoiceCapture) don't need to know
 * which engine is underneath.
 */
export function useSpeechRecognition(
  lang: string = "en-US"
): UseSpeechRecognition {
  const {
    transcript,
    interimTranscript,
    finalTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useReactSpeechRecognition();

  const start = useCallback(() => {
    void ReactSpeechRecognition.startListening({
      continuous: true,
      interimResults: true,
      language: lang,
    });
  }, [lang]);

  const stop = useCallback(() => {
    void ReactSpeechRecognition.stopListening();
  }, []);

  const reset = useCallback(() => {
    resetTranscript();
  }, [resetTranscript]);

  // Abort any in-flight recognition on unmount.
  useEffect(() => {
    return () => {
      void ReactSpeechRecognition.abortListening();
    };
  }, []);

  const error = !isMicrophoneAvailable ? "not-allowed" : null;

  return {
    supported: browserSupportsSpeechRecognition,
    listening,
    finalTranscript,
    interimTranscript,
    transcript,
    micAvailable: isMicrophoneAvailable,
    error,
    start,
    stop,
    reset,
  };
}

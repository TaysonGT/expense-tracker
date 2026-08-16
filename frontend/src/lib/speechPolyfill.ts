import SpeechRecognition from "react-speech-recognition";

/**
 * Applies the Azure Cognitive Services speech polyfill to
 * react-speech-recognition for consistent STT across browsers/platforms that
 * lack (or poorly implement) the native Web Speech API.
 *
 * Gated by env vars: the polyfill is only applied when both
 * VITE_AZURE_SPEECH_KEY and VITE_AZURE_SPEECH_REGION are present. Otherwise we
 * fall back to the browser's native SpeechRecognition (Chromium), so the app
 * never breaks when Azure credentials aren't configured.
 *
 * The heavy Azure Speech SDK is loaded lazily via dynamic import() — it is only
 * pulled into the bundle (as a separate chunk) when Azure is configured, so the
 * default native-only path stays lightweight.
 *
 * STT still runs client-side per the spec — audio goes only to the configured
 * recognition backend, never to our own server.
 */

let setupPromise: Promise<{ usingAzure: boolean }> | null = null;

export function setupSpeechPolyfill(): Promise<{ usingAzure: boolean }> {
  if (setupPromise) return setupPromise;

  setupPromise = (async () => {
    if (!azureConfigured()) {
      return { usingAzure: false };
    }

    const subscriptionKey = import.meta.env.VITE_AZURE_SPEECH_KEY as string;
    const region = import.meta.env.VITE_AZURE_SPEECH_REGION as string;

    // Lazy-load the Azure SDK only when credentials are present.
    const { createSpeechRecognitionPonyfill } = await import(
      "web-speech-cognitive-services"
    );

    const { SpeechRecognition: AzureSpeechRecognition } =
      createSpeechRecognitionPonyfill({
        credentials: { region, subscriptionKey },
      });

    SpeechRecognition.applyPolyfill(AzureSpeechRecognition);
    return { usingAzure: true };
  })();

  return setupPromise;
}

function azureConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_AZURE_SPEECH_KEY &&
      import.meta.env.VITE_AZURE_SPEECH_REGION
  );
}

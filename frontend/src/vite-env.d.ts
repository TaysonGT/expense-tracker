/// <reference types="vite/client" />
/// <reference types="dom-speech-recognition" />

declare module "*.css";

interface ImportMetaEnv {
  /** Backend base URL override (defaults to "/api" dev proxy). */
  readonly VITE_API_BASE_URL?: string;
  /** Azure Cognitive Services speech key — enables the STT polyfill. */
  readonly VITE_AZURE_SPEECH_KEY?: string;
  /** Azure Cognitive Services region (e.g. "eastus") — paired with the key. */
  readonly VITE_AZURE_SPEECH_REGION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export interface SpeechLanguageOption {
  code: string;  // BCP-47 tag passed to the recognizer
  label: string; // shown in the picker
}

export const SPEECH_LANGUAGES: SpeechLanguageOption[] = [
  { code: "en-US", label: "English" },
  { code: "ar-EG", label: "العربية" },
];

export const DEFAULT_SPEECH_LANG = SPEECH_LANGUAGES[0].code;
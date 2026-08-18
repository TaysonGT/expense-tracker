/**
 * Minimal loaders + typings for the Google Identity Services and Facebook JS
 * SDKs, loaded on demand from the Auth page. We only pull these in when the
 * corresponding client id / app id env var is configured.
 */

let googleScriptPromise: Promise<void> | null = null;
let facebookScriptPromise: Promise<void> | null = null;

export function loadGoogleScript(): Promise<void> {
  if (googleScriptPromise) return googleScriptPromise;
  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("google-gis");
    if (existing) return resolve();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.id = "google-gis";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google script"));
    document.head.appendChild(s);
  });
  return googleScriptPromise;
}

export function loadFacebookScript(): Promise<void> {
  if (facebookScriptPromise) return facebookScriptPromise;
  facebookScriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("facebook-jssdk");
    if (existing) return resolve();
    const s = document.createElement("script");
    s.src = "https://connect.facebook.net/en_US/sdk.js";
    s.async = true;
    s.defer = true;
    s.id = "facebook-jssdk";
    s.crossOrigin = "anonymous";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Facebook script"));
    document.head.appendChild(s);
  });
  return facebookScriptPromise;
}

/* ------------------------------- Typings -------------------------------- */

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (resp: GoogleCredentialResponse) => void;
  }): void;
  prompt(): void;
  renderButton(
    parent: HTMLElement,
    options: Record<string, unknown>
  ): void;
}

interface FacebookAuthResponse {
  authResponse?: { accessToken?: string } | null;
  status?: string;
}

interface FacebookSDK {
  init(config: {
    appId: string;
    cookie?: boolean;
    xfbml?: boolean;
    version: string;
  }): void;
  login(
    cb: (resp: FacebookAuthResponse) => void,
    options?: { scope?: string }
  ): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
    FB?: FacebookSDK;
    fbAsyncInit?: () => void;
  }
}

export type { GoogleCredentialResponse, FacebookAuthResponse };

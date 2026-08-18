import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useOAuthLogin } from "../lib/authQueries";
import {
  loadGoogleScript,
  loadFacebookScript,
  type GoogleCredentialResponse,
  type FacebookAuthResponse,
} from "../lib/oauthClient";

/**
 * Auth screen (`/auth`).
 *
 * Presents Google + Facebook sign-in. Each provider runs its client-side OAuth
 * flow, then hands the resulting token to POST /auth/:provider/callback, which
 * verifies it server-side and sets the session cookie. On success we send the
 * user into the app; the route guard then routes them to onboarding if they
 * have no active group.
 *
 * If a provider's client id isn't configured, a dev-only mock button is shown
 * so the flow can still be exercised end-to-end (the backend verifies real
 * tokens, so the mock only works when the backend also accepts dev tokens).
 */
export default function Auth() {
  const nav = useNavigate();
  const login = useOAuthLogin();
  const [error, setError] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const facebookAppId = import.meta.env.VITE_FACEBOOK_APP_ID;

  const onToken = useCallback(
    (provider: "google" | "facebook", token: string) => {
      setError(null);
      login.mutate(
        { provider, token },
        {
          onSuccess: () => nav("/", { replace: true }),
          onError: () => setError("Sign-in failed. Please try again."),
        }
      );
    },
    [login, nav]
  );

  // Initialize Google Identity Services and render its button.
  useEffect(() => {
    if (!googleClientId) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google || !googleBtnRef.current) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (resp: GoogleCredentialResponse) =>
            onToken("google", resp.credential),
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          width: 320,
          text: "continue_with",
        });
      })
      .catch(() => setError("Couldn't load Google sign-in."));
    return () => {
      cancelled = true;
    };
  }, [googleClientId, onToken]);

  const handleFacebook = useCallback(() => {
    if (!facebookAppId) return;
    loadFacebookScript()
      .then(() => {
        if (!window.FB) return;
        window.FB.init({
          appId: facebookAppId,
          cookie: true,
          xfbml: false,
          version: "v19.0",
        });
        window.FB.login(
          (resp: FacebookAuthResponse) => {
            const token = resp.authResponse?.accessToken;
            if (token) onToken("facebook", token);
            else setError("Facebook sign-in was cancelled.");
          },
          { scope: "public_profile,email" }
        );
      })
      .catch(() => setError("Couldn't load Facebook sign-in."));
  }, [facebookAppId, onToken]);

  const anyProviderConfigured = !!googleClientId || !!facebookAppId;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-gray-50 px-6 text-gray-900">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-10 text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold text-white"
            style={{ background: "linear-gradient(135deg,#111827,#1f2937)" }}
          >
            ₵
          </div>
          <h1 className="text-2xl font-semibold">Expense Tracker</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sign in to track your group's spending.
          </p>
        </div>

        <div className="space-y-3">
          {/* Google */}
          {googleClientId ? (
            <div ref={googleBtnRef} className="flex justify-center" />
          ) : (
            <ProviderButton
              label="Continue with Google"
              onClick={() => setError("Google client id not configured.")}
              disabled
            />
          )}

          {/* Facebook */}
          <ProviderButton
            label="Continue with Facebook"
            onClick={handleFacebook}
            disabled={!facebookAppId || login.isPending}
            style={{ background: "#1877F2", color: "#fff", borderColor: "#1877F2" }}
          />
        </div>

        {!anyProviderConfigured && (
          <p className="mt-6 rounded-xl bg-amber-50 p-3 text-center text-xs text-amber-700 ring-1 ring-amber-100">
            No OAuth providers are configured. Set VITE_GOOGLE_CLIENT_ID and/or
            VITE_FACEBOOK_APP_ID to enable sign-in.
          </p>
        )}

        {login.isPending && (
          <p className="mt-4 text-center text-sm text-gray-400">Signing in…</p>
        )}
        {error && (
          <p className="mt-4 text-center text-sm text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
}

function ProviderButton({
  label,
  onClick,
  disabled,
  style,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 transition-opacity disabled:opacity-40"
      style={style}
    >
      {label}
    </button>
  );
}

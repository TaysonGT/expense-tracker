import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useOAuthLogin, useRegisterUser, useLoginUser } from "../lib/authQueries";
import {
  loadGoogleScript,
  loadFacebookScript,
  type GoogleCredentialResponse,
  type FacebookAuthResponse,
} from "../lib/oauthClient";

type AuthMode = "login" | "register";

/**
 * Auth screen (`/auth`).
 *
 * Modern, welcoming interface supporting both OAuth (Google / Facebook) and
 * classic email/password auth.
 *
 *   - "Sign in with Google/Facebook" for existing OAuth users.
 *   - Email/password form with toggle between Login and Register.
 *
 * Edge case: if a user registered via OAuth tries to log in with email +
 * password, the backend returns 401 with `Use OAuth to log in`. We surface
 * that as a user-friendly error prompting them to use their provider instead.
 */
export default function Auth() {
  const nav = useNavigate();
  const login = useOAuthLogin();
  const register = useRegisterUser();
  const loginPwd = useLoginUser();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<AuthMode>("login");

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const googleBtnRef = useRef<HTMLDivElement>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const facebookAppId = import.meta.env.VITE_FACEBOOK_APP_ID;
  const anyProviderConfigured = !!googleClientId || !!facebookAppId;

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

  // --- Form handlers ---
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    register.mutate(
      { email, password, name },
      {
        onSuccess: () => nav("/", { replace: true }),
        onError: (err: unknown) => {
          const status =
            typeof err === "object" && err && "response" in err
              ? (err as { response?: { status?: number } }).response?.status
              : null;
          if (status === 409) {
            setError("That email is already registered. Switch to Sign in.");
            setMode("login");
          } else {
            setError("Registration failed. Please try again.");
          }
        },
      }
    );
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    loginPwd.mutate(
      { email, password },
      {
        onSuccess: () => nav("/", { replace: true }),
        onError: (err: unknown) => {
          const respData =
            typeof err === "object" && err && "response" in err
              ? (err as { response?: { data?: { message?: string } } }).response?.data
              : null;
          const msg = respData?.message || "";
          if (msg.includes("OAuth") || msg.includes("oauth")) {
            setError(
              "You signed up with Google or Facebook. Use that provider button to log in."
            );
          } else {
            setError("Invalid email or password.");
          }
        },
      }
    );
  };

  const isSubmitting = register.isPending || loginPwd.isPending;
  const toggleMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setError(null);
    setName("");
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-gray-50 px-6 text-gray-900">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex justify-center items-center">
            <img src="/default.svg" className="w-64"/>
          </div>
          {/* <h1 className="text-xl font-light">Expense Tracker with AI</h1> */}
          <p className="mt-1 text-sm text-gray-500">
            Sign in to track your group's spending.
          </p>
        </div>

        <div className="space-y-4">
          {/* OAuth buttons */}
          <div className="space-y-3">
            {googleClientId ? (
              <div ref={googleBtnRef} className="flex justify-center" />
            ) : (
              <ProviderButton
                label="Continue with Google"
                onClick={() =>
                  setError("Google client id not configured.")
                }
                disabled
              />
            )}
            <ProviderButton
              label="Continue with Facebook"
              onClick={handleFacebook}
              disabled={!facebookAppId || login.isPending}
              style={{
                background: "#1877F2",
                color: "#fff",
                borderColor: "#1877F2",
              }}
            />
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-50 px-2 text-gray-400">or</span>
            </div>
          </div>

          {/* Email/password form */}
          <form onSubmit={mode === "register" ? handleRegister : handleLogin}>
            {mode === "register" && (
              <div className="mb-3">
                <label
                  htmlFor="name"
                  className="block text-xs font-medium text-gray-700"
                >
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="mb-3">
              <label
                htmlFor="email"
                className="block text-xs font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="mb-3">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === "register" ? 8 : 1}
                className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white transition-opacity hover:bg-gray-800 disabled:opacity-60"
            >
              {mode === "register"
                ? isSubmitting
                  ? "Creating account…"
                  : "Create account"
                : isSubmitting
                  ? "Signing in…"
                  : "Sign in"}
            </button>
          </form>

          {/* Toggle login / register */}
          <div className="text-center text-sm">
            <button
              onClick={toggleMode}
              className="font-medium text-gray-700 underline-offset-2 hover:underline"
            >
              {mode === "login"
                ? "Need an account? Register"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

        {!anyProviderConfigured && (
          <p className="mt-6 rounded-xl bg-amber-50 p-3 text-center text-xs text-amber-700 ring-1 ring-amber-100">
            No OAuth providers are configured. Set VITE_GOOGLE_CLIENT_ID and/or
            VITE_FACEBOOK_APP_ID to enable social sign-in.
          </p>
        )}

        {error && (
          <p className="mt-4 text-center text-sm text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
}

type ProviderButtonStyle = React.CSSProperties;

function ProviderButton({
  label,
  onClick,
  disabled,
  style,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  style?: ProviderButtonStyle;
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

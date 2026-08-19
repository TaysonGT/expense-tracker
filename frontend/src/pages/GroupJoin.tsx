import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Check, Crown, LogIn, Users, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useGroupPreview, useJoinGroup } from "../lib/authQueries";
import { getCurrency } from "../lib/expenseFormat";

/**
 * Group join direct-link page (`/join/:code`).
 *
 * When a user opens a shared invite link, this page previews the group (name,
 * currency, member count, admin) and offers a Join button. On success we
 * activate the group and enter the app. If they're already a member, we offer
 * to switch to it instead.
 *
 * The route sits inside the protected app, so an unauthenticated visitor is
 * first bounced to /auth (and, after login, back here — the URL is preserved).
 */
export default function GroupJoin() {
  const nav = useNavigate();
  const { code } = useParams<{ code: string }>();
  const { currentGroup } = useAuth();
  const previewQuery = useGroupPreview(code);
  const join = useJoinGroup();
  const [error, setError] = useState<string | null>(null);

  const preview = previewQuery.data;

  const handleJoin = () => {
    if (!code) return;
    setError(null);
    join.mutate(code, {
      onSuccess: () => nav("/home", { replace: true }),
      onError: () => setError("Couldn't join this group. Try again."),
    });
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-gray-50 px-6 text-gray-900">
      <div className="w-full max-w-sm">
        {previewQuery.isLoading && (
          <div className="flex flex-col items-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
            <p className="mt-4 text-sm text-gray-400">Loading invite…</p>
          </div>
        )}

        {previewQuery.isError && (
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500 ring-1 ring-red-100">
              <AlertCircle size={26} />
            </div>
            <p className="mt-5 text-base font-medium text-gray-800">
              Invalid invite link
            </p>
            <p className="mt-1 text-sm text-gray-500">
              This group code doesn't exist or the link is broken.
            </p>
            <button
              onClick={() => nav("/home", { replace: true })}
              className="mt-6 rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white"
            >
              Go home
            </button>
          </div>
        )}

        {preview && (
          <div className="flex flex-col items-center text-center">
            {/* Group avatar */}
            <span
              className="flex h-20 w-20 items-center justify-center rounded-3xl text-3xl font-bold text-white"
              style={{ background: "linear-gradient(135deg,#111827,#1f2937)" }}
            >
              {preview.name.slice(0, 1).toUpperCase()}
            </span>

            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-gray-400">
              You've been invited to join
            </p>
            <h1 className="mt-1 text-2xl font-semibold">{preview.name}</h1>

            {/* Meta */}
            <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Users size={15} />
                {preview.memberCount}{" "}
                {preview.memberCount === 1 ? "member" : "members"}
              </span>
              <span className="flex items-center gap-1.5">
                {getCurrency(preview.currency).symbolNative} {preview.currency}
              </span>
            </div>

            {preview.adminName && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                <Crown size={12} className="text-emerald-600" />
                Admin: {preview.adminName}
              </p>
            )}

            {/* Action */}
            {preview.alreadyMember ? (
              <div className="mt-8 w-full">
                <p className="mb-3 text-sm text-gray-500">
                  You're already a member of this group.
                </p>
                <button
                  onClick={() => nav("/home", { replace: true })}
                  className="w-full rounded-full bg-gray-900 px-5 py-3 text-sm font-semibold text-white"
                >
                  {currentGroup?.id === preview.id
                    ? "Go to group"
                    : "Continue"}
                </button>
              </div>
            ) : (
              <button
                onClick={handleJoin}
                disabled={join.isPending}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              >
                {join.isPending ? (
                  <>
                    <Check size={16} />
                    Joining…
                  </>
                ) : (
                  <>
                    <LogIn size={16} />
                    Join as viewer
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => nav("/home", { replace: true })}
              className="mt-3 text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Not now
            </button>

            {error && (
              <p className="mt-4 text-sm text-red-500">{error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

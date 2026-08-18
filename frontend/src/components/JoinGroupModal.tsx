import { useState } from "react";
import { X } from "lucide-react";
import { useJoinGroup } from "../lib/authQueries";

interface JoinGroupModalProps {
  open: boolean;
  onClose: () => void;
  onJoined: () => void;
}

/**
 * Modal for joining an existing group by join code.
 * Reuses the same fieldset as the OnboardingGroups join panel.
 */
export default function JoinGroupModal({
  open,
  onClose,
  onJoined,
}: JoinGroupModalProps) {
  const join = useJoinGroup();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 8) {
      setError("Join codes are 8 characters.");
      return;
    }
    setError(null);
    join.mutate(trimmed, {
      onSuccess: onJoined,
      onError: (err: unknown) => {
        const status =
          typeof err === "object" && err && "response" in err
            ? (err as { response?: { status?: number } }).response?.status
            : undefined;
        setError(
          status === 404
            ? "No group found for that code."
            : "Couldn't join. Check the code and try again."
        );
      },
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-md rounded-2xl bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Join a group</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">
              Join code
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={8}
              placeholder="8-character code"
              className="mono w-full rounded-lg border border-gray-200 px-3 py-2.5 text-center text-lg tracking-[0.3em] focus:border-gray-900 focus:outline-none"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              Ask a group admin for the code. You'll join as a viewer.
            </p>
          </div>

          {error && (
            <p className="text-xs font-medium text-red-500">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={join.isPending}
              className="flex-1 rounded-full bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={join.isPending}
              className="flex-1 rounded-full bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {join.isPending ? "Joining…" : "Join group"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import currencies from "../data/currencies.json";
import type { Currency } from "../types";
import { useCreateGroup } from "../lib/authQueries";

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

/**
 * Modal for creating a new group.
 * Reuses the same fieldset as the OnboardingGroups create panel.
 */
export default function CreateGroupModal({
  open,
  onClose,
  onCreated,
}: CreateGroupModalProps) {
  const create = useCreateGroup();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [showBalance, setShowBalance] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const list = currencies as Currency[];

  const reset = () => {
    setName("");
    setCurrency("USD");
    setShowBalance(true);
    setError(null);
  };

  useEffect(()=>{
    reset()
  },[open])

  const submit = () => {
    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }
    setError(null);
    create.mutate(
      { name: name.trim(), currency, showBalance },
      {
        onSuccess: () => {
          reset();
          onCreated();
        },
        onError: () => setError("Couldn't create the group. Try again."),
      }
    );
  };

  return (
    <div
      className={`fixed h-dvh w-dvw inset-0 z-50 flex items-center justify-center bg-black/40 duration-150 ${open?'pointer-events-auto opacity-100':'pointer-events-none opacity-0'}`}
      onClick={onClose}
    >
      <div
        className={`mx-4 w-full max-w-md rounded-2xl bg-card border border-border-light p-6 duration-150 ${open?'pointer-events-auto scale-100':'pointer-events-none scale-95'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create new group</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-empty-title hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-empty-title">
              Group name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Household, Trip to Italy"
              className="w-full rounded-lg border border-border-light bg-card-light px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-empty-title">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-lg border border-border-light bg-card-light px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            >
              {list.map((c) => (
                <option key={c.code} value={c.code}>
                   {c.code} — {c.name} ({c.symbolNative})
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center justify-between rounded-lg bg-background border border-accent px-3 py-2.5">
            <span className="flex flex-col">
              <span className="text-sm font-medium text-primary">
                Show balance
              </span>
              <span className="text-xs text-empty-title">
                Display running totals to members
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={showBalance}
              onClick={() => setShowBalance((v) => !v)}
              className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
              style={{ background: showBalance ? "#00c48c" : "#d1d5db" }}
            >
              <span
                className="absolute top-0.5 h-5 w-5 rounded-full bg-card transition-transform"
                style={{
                  transform: showBalance
                    ? "translateX(0px)"
                    : "translateX(-20px)",
                }}
              />
            </button>
          </label>

          {error && (
            <p className="text-xs font-medium text-danger">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={create.isPending}
              className="flex-1 rounded-full bg-gray-100 px-4 py-2.5 text-sm font-medium text-empty-subtitle"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={create.isPending}
              className="flex-1 rounded-full bg-accent-dark px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {create.isPending ? "Creating…" : "Create group"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Check,
  LogOut,
  Plus,
  Users,
} from "lucide-react";
import currencies from "../data/currencies.json";
import type { Currency } from "../types";
import {
  useMyGroups,
  useCreateGroup,
  useJoinGroup,
  useLogout,
} from "../lib/authQueries";
import { useAuth } from "../context/AuthContext";
import { useGroupSwitch } from "../context/GroupSwitchContext";

type Tab = "mine" | "create" | "join";

/**
 * Group onboarding (`/onboarding/groups`).
 *
 * Post-login, a user must have an active group before using the app. This
 * screen offers three paths — My Groups, Create, Join — and on success the
 * backend sets the active group in the session and we navigate into the app.
 */
export default function OnboardingGroups() {
  const nav = useNavigate();
  const { currentUser } = useAuth();
  const myGroups = useMyGroups();
  const logout = useLogout();
  const { switchToGroup } = useGroupSwitch();

  const hasGroups = (myGroups.data?.length ?? 0) > 0;
  const [tab, setTab] = useState<Tab>("mine");

  // Default to the Create tab when the user has no groups yet.
  const activeTab: Tab = myGroups.isSuccess && !hasGroups && tab === "mine" ? "create" : tab;

  // Create / Join flows: the backend already activated the session, so we
  // just present the switch overlay (skipActivate) and navigate.
  const onCreated = (group: { id: string; name: string }) =>
    switchToGroup(group, { skipActivate: true });
  const onJoined = (group: { id: string; name: string }) =>
    switchToGroup(group, { skipActivate: true });

  return (
    <div className="min-h-svh bg-gray-50 text-gray-900">
      <header className="flex items-center justify-between px-5 py-4">
        <div>
          <h1 className="text-lg font-semibold">Choose a group</h1>
          {currentUser && (
            <p className="text-xs text-gray-500">Signed in as {currentUser.email}</p>
          )}
        </div>
        <button
          onClick={() => logout.mutate(undefined, { onSuccess: () => nav("/auth", { replace: true }) })}
          className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </header>

      <main className="mx-auto max-w-md px-5 pb-16">
        {/* Tabs */}
        <div className="mb-5 flex gap-1.5 rounded-full bg-gray-100 p-1">
          <TabButton active={activeTab === "mine"} onClick={() => setTab("mine")}>
            My Groups
          </TabButton>
          <TabButton active={activeTab === "create"} onClick={() => setTab("create")}>
            Create
          </TabButton>
          <TabButton active={activeTab === "join"} onClick={() => setTab("join")}>
            Join
          </TabButton>
        </div>

        {activeTab === "mine" && (
          <MyGroupsPanel
            loading={myGroups.isLoading}
            onCreate={() => setTab("create")}
          />
        )}
        {activeTab === "create" && <CreateGroupPanel onCreated={onCreated} />}
        {activeTab === "join" && <JoinGroupPanel onJoined={onJoined} />}
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors"
      style={
        active
          ? { background: "#111827", color: "#fff" }
          : { background: "transparent", color: "#6b7280" }
      }
    >
      {children}
    </button>
  );
}

/* ------------------------------- My Groups ------------------------------- */

function MyGroupsPanel({
  loading,
  onCreate,
}: {
  loading: boolean;
  onCreate: () => void;
}) {
  const { data: groups = [] } = useMyGroups();
  const { switchToGroup } = useGroupSwitch();
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const enter = (g: { id: string; name: string }) => {
    setSwitchingId(g.id);
    // Selecting an existing group runs the activate mutation (skipActivate
    // omitted), presented via the shared overlay. The provider navigates to
    // /home on success.
    switchToGroup(g);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-16 animate-pulse rounded-2xl bg-gray-200" />
        <div className="h-16 animate-pulse rounded-2xl bg-gray-200" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl bg-white p-8 text-center ring-1 ring-gray-100">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
          <Users size={26} />
        </div>
        <p className="mt-4 text-sm font-medium text-gray-800">No groups yet</p>
        <p className="mt-1 text-sm text-gray-500">
          Create your first group or join one with a code.
        </p>
        <button
          onClick={onCreate}
          className="mt-5 flex items-center gap-1.5 rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white"
        >
          <Plus size={15} />
          Create a group
        </button>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {groups.map((g) => (
        <li key={g.id}>
          <button
            onClick={() => enter(g)}
            disabled={switchingId === g.id}
            className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left ring-1 ring-gray-100 transition-transform active:scale-[0.99] disabled:opacity-60"
          >
            <span
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#111827,#1f2937)" }}
            >
              {g.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium text-gray-900">{g.name}</span>
              <span className="text-xs text-gray-400">
                {g.currency} · {g.role}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------ Create Group ----------------------------- */

function CreateGroupPanel({ onCreated }: { onCreated: (g: { id: string; name: string }) => void }) {
  const create = useCreateGroup();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [showBalance, setShowBalance] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const list = currencies as Currency[];

  const submit = () => {
    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }
    setError(null);
    create.mutate(
      { name: name.trim(), currency, showBalance },
      {
        onSuccess: (g) => onCreated({ id: g.id, name: g.name }),
        onError: () => setError("Couldn't create the group. Try again."),
      }
    );
  };

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-gray-100">
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">
          Group name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Household, Trip to Italy"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">
          Currency
        </label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
        >
          {list.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.name} ({c.symbolNative})
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
        <span className="flex flex-col">
          <span className="text-sm font-medium text-gray-800">Show balance</span>
          <span className="text-xs text-gray-400">
            Display running totals to members
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={showBalance}
          onClick={() => setShowBalance((v) => !v)}
          className="relative h-6 w-11 flex-shrink-0 rounded-full transition-colors"
          style={{ background: showBalance ? "#00c48c" : "#d1d5db" }}
        >
          <span
            className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
            style={{ transform: showBalance ? "translateX(-20px)" : "translateX(0px)" }}
          />
        </button>
      </label>

      {error && <p className="text-xs font-medium text-red-500">{error}</p>}

      <button
        onClick={submit}
        disabled={create.isPending}
        className="flex w-full items-center justify-center gap-1.5 rounded-full bg-gray-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        <Plus size={16} />
        {create.isPending ? "Creating…" : "Create group"}
      </button>
    </div>
  );
}

/* ------------------------------- Join Group ------------------------------ */

function JoinGroupPanel({ onJoined }: { onJoined: (g: { id: string; name: string }) => void }) {
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
      onSuccess: (g) => onJoined({ id: g.id, name: g.name }),
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

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-gray-100">
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

      {error && <p className="text-xs font-medium text-red-500">{error}</p>}

      <button
        onClick={submit}
        disabled={join.isPending}
        className="flex w-full items-center justify-center gap-1.5 rounded-full bg-gray-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        <Check size={16} />
        {join.isPending ? "Joining…" : "Join group"}
      </button>
    </div>
  );
}

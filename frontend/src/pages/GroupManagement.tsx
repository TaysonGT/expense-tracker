import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Check,
  Copy,
  Crown,
  Link2,
  Pencil,
  Shield,
  User as UserIcon,
  MoreVertical,
  UserCog,
} from "lucide-react";
import currencies from "../data/currencies.json";
import type { Currency, GroupMember, GroupRole } from "../types";
import { useAuth } from "../context/AuthContext";
import { useGroupMembers, useUpdateGroup, useUpdateMemberRole } from "../lib/authQueries";

/**
 * Group management page (`/group`).
 *
 * Shows the active group's members, lets an admin edit the group's info
 * (name, currency, show balance), and surfaces the join code + a shareable
 * join link. Admins can also kick members and change their roles.
 */
export default function GroupManagement() {
  const nav = useNavigate();
  const { currentGroup, isAdmin } = useAuth();
  const membersQuery = useGroupMembers(currentGroup?.id);
  const updateMemberRole = useUpdateMemberRole();

  if (!currentGroup) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-gray-50 text-gray-500">
        No active group.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28 text-gray-900">
       <header className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-gray-50/90 px-4 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            onClick={() => nav(-1)}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-gray-100"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-semibold">Group settings</h1>
        </div>
        <img src="/default-monochrome.svg" className="w-22 py-2"/>
       </header>

      <main className="mx-auto max-w-md space-y-6 px-4 pt-2">
        {/* Group info / edit */}
        <GroupInfoSection isAdmin={isAdmin} />

        {/* Invite / join code */}
        <InviteSection joinCode={currentGroup.joinCode} />

        {/* Members */}
        <section>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">
            Members{" "}
            {membersQuery.data ? `(${membersQuery.data.length})` : ""}
          </h3>
          {membersQuery.isLoading ? (
            <div className="space-y-2">
              <div className="h-16 animate-pulse rounded-2xl bg-gray-200" />
              <div className="h-16 animate-pulse rounded-2xl bg-gray-200" />
            </div>
          ) : (
            <ul className="space-y-2">
              {(membersQuery.data ?? []).map((m: GroupMember) => (
                <MemberRow
                  key={m.userId}
                  member={m}
                  isAdmin={isAdmin}
                  onRoleChange={updateMemberRole.mutate}
                />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

/* ------------------------------ Group info ------------------------------- */

function GroupInfoSection({ isAdmin }: { isAdmin: boolean }) {
  const { currentGroup } = useAuth();
  const update = useUpdateGroup();
  const [editing, setEditing] = useState(false);

  const [name, setName] = useState(currentGroup?.name ?? "");
  const [currency, setCurrency] = useState(currentGroup?.currency ?? "USD");
  const [showBalance, setShowBalance] = useState(
    currentGroup?.showBalance ?? true
  );
  const [error, setError] = useState<string | null>(null);

  const list = currencies as Currency[];

  if (!currentGroup) return null;

  const startEdit = () => {
    setName(currentGroup.name);
    setCurrency(currentGroup.currency);
    setShowBalance(currentGroup.showBalance);
    setError(null);
    setEditing(true);
  };

  const save = () => {
    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }
    setError(null);
    update.mutate(
      { groupId: currentGroup.id, name: name.trim(), currency, showBalance },
      {
        onSuccess: () => setEditing(false),
        onError: () => setError("Couldn't save changes. Try again."),
      }
    );
  };

  if (!editing) {
    return (
      <section className="rounded-2xl bg-white p-5 ring-1 ring-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#111827,#1f2937)" }}
            >
              {currentGroup.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <h2 className="text-lg font-semibold">{currentGroup.name}</h2>
              <p className="text-xs text-gray-400">
                {currentGroup.currency} ·{" "}
                {currentGroup.showBalance ? "Balance shown" : "Balance hidden"}
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={startEdit}
              aria-label="Edit group"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-500 ring-1 ring-gray-100"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-gray-100">
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">
          Group name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
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
              {c.symbolNative} — {c.name} ({c.code})
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
          className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
          style={{ background: showBalance ? "#00c48c" : "#d1d5db" }}
        >
          <span
            className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
            style={{
              transform: showBalance ? "translateX(22px)" : "translateX(2px)",
            }}
          />
        </button>
      </label>

      {error && <p className="text-xs font-medium text-red-500">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => setEditing(false)}
          disabled={update.isPending}
          className="flex-1 rounded-full bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={update.isPending}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Check size={15} />
          {update.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </section>
  );
}

/* -------------------------------- Invite --------------------------------- */

function InviteSection({ joinCode }: { joinCode: string }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const joinLink = `${window.location.origin}/join/${joinCode}`;

  const copy = (value: string, which: "code" | "link") => {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(which);
        setTimeout(() => setCopied(null), 1800);
      })
      .catch(() => {
        /* ignore clipboard errors */
      });
  };

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-gray-100">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">
        Invite members
      </h3>

      {/* Join code */}
      <div className="mb-3">
        <span className="mb-1 block text-xs text-gray-400">Join code</span>
        <div className="flex items-center gap-2">
          <code className="mono flex-1 rounded-lg bg-gray-50 px-3 py-2.5 text-center text-lg tracking-[0.3em] ring-1 ring-gray-100">
            {joinCode}
          </code>
          <button
            onClick={() => copy(joinCode, "code")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-white"
            aria-label="Copy join code"
          >
            {copied === "code" ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      {/* Shareable link */}
      <div>
        <span className="mb-1 block text-xs text-gray-400">Shareable link</span>
        <button
          onClick={() => copy(joinLink, "link")}
          className="flex w-full items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5 text-left text-sm text-gray-600 ring-1 ring-gray-100 hover:bg-gray-100"
        >
          <Link2 size={15} className="shrink-0 text-gray-400" />
          <span className="min-w-0 flex-1 truncate">{joinLink}</span>
          {copied === "link" ? (
            <Check size={15} className="shrink-0 text-emerald-500" />
          ) : (
            <Copy size={15} className="shrink-0 text-gray-400" />
          )}
        </button>
      </div>
    </section>
  );
}

/* ------------------------------- Member row ------------------------------ */

interface MemberRowProps {
  member: GroupMember;
  isAdmin: boolean;
  onRoleChange: (vars: { groupId: string; userId: string; role: "admin" | "read_write" | "readonly" }) => void;
}

function MemberRow({
  member,
  isAdmin,
  onRoleChange,
}: MemberRowProps) {
  const { currentUser } = useAuth();
  const isYou = member.userId === currentUser?.id;
  const [showActions, setShowActions] = useState<string | null>(null);

  const handleRoleChange = (newRole: "admin" | "read_write" | "readonly") => {
    onRoleChange({ groupId: "", userId: member.userId, role: newRole });
  };

  return (
    <li className="relative flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-gray-100">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-gray-400">
        {member.avatarUrl ? (
          <img
            src={member.avatarUrl}
            alt={member.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <UserIcon size={20} />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-gray-900">
          {member.name}
          {isYou && <span className="ml-1 text-xs text-gray-400">(you)</span>}
        </span>
        <span className="truncate text-xs text-gray-400">{member.email}</span>
      </div>
      <RoleBadge role={member.role} />
      {isAdmin && !isYou && (
        <div className="relative">
          <button
            onClick={() => setShowActions(member.userId === showActions ? null : member.userId)}
            aria-label="Member actions"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-500 ring-1 ring-gray-100"
          >
            <MoreVertical size={16} />
          </button>
          {showActions === member.userId && (
            <div
              className="absolute right-0 top-full z-10 mt-1 w-40 rounded-xl bg-white shadow-lg border border-gray-100 py-1"
              role="menu"
            >
              <button
                onClick={() => {
                  handleRoleChange("admin");
                  setShowActions(null);
                }}
                disabled={member.role === "admin"}
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 disabled:opacity-50"
              >
                <Crown size={14} className="text-gray-400" />
                Make admin
              </button>
              <button
                onClick={() => {
                  handleRoleChange("read_write");
                  setShowActions(null);
                }}
                disabled={member.role === "read_write"}
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 disabled:opacity-50"
              >
                <UserCog size={14} className="text-gray-400" />
                Make read/write
              </button>
              <button
                onClick={() => {
                  handleRoleChange("readonly");
                  setShowActions(null);
                }}
                disabled={member.role === "readonly"}
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 disabled:opacity-50"
              >
                <Shield size={14} className="text-gray-400" />
                Make readonly
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function RoleBadge({ role }: { role: GroupRole }) {
  const isAdmin = role === "admin";
  const isReadWrite = role === "read_write";
  const isReadonly = role === "readonly";
  return (
    <span
      className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={{
        background: isAdmin
          ? "rgba(0,196,140,0.12)"
          : isReadWrite
          ? "rgba(59,130,246,0.12)"
          : "rgba(107,114,128,0.1)",
        color: isAdmin
          ? "#047857"
          : isReadWrite
          ? "#2563eb"
          : "#6b7280",
      }}
    >
      {isAdmin && <Crown size={11} />}
      {isReadWrite && <UserCog size={11} />}
      {isReadonly && <Shield size={11} />}
      {isAdmin ? "Admin" : isReadWrite ? "Read/Write" : "Read-only"}
    </span>
  );
}
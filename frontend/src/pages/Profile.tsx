import { useNavigate } from "react-router";
import {
  ChevronRight,
  Mail,
  Settings,
  Shield,
  User,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLogout, useMyGroups } from "../lib/authQueries";
import type { Group } from "../types";
import { useGroupSwitch } from "../context/GroupSwitchContext";

/**
 * Profile page.
 *
 * Hero card with the signed-in user's name/email/avatar (from AuthContext),
 * the active group, a "My Groups" section with quick-switch, and a settings-style
 * action list including a working Log out.
 */

export default function Profile() {
  const nav = useNavigate();
  const { currentUser, currentGroup } = useAuth();
  const logout = useLogout();
  const groupsQuery = useMyGroups();

  const userName = currentUser?.name ?? "—";
  const userEmail = currentUser?.email ?? "";

  const otherGroups = (groupsQuery.data ?? []).filter(
    (g) => g.id !== currentGroup?.id
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-28 text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-gray-50/90 px-4 py-4 backdrop-blur">
        <img src="/default-monochrome.svg" className="h-7"/>
        {/* <h1 className="text-lg font-semibold">Profile</h1> */}
        {/* <Moon size={18} className="text-gray-400" /> */}

      </header>

      <main className="mx-auto max-w-md px-4">
        <div className="space-y-6">
          {/* Hero: avatar + name + group selector */}
          <section className="flex flex-col items-center rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-gray-500 ring-2 ring-gray-200">
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={userName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User size={56} />
              )}
            </div>
            <div className="mt-4">
              <h2 className="text-xl font-semibold">{userName}</h2>
              <p className="mt-0.5 flex items-center justify-center gap-1.5 text-sm text-gray-500">
                <Mail size={14} />
                {userEmail}
              </p>
              {currentGroup && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                  {currentGroup.name} · {currentGroup.currency} · {currentGroup.role}
                </p>
              )}
            </div>
          </section>

          {/* My Groups — quick-switch to other groups + manage current */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400">
                My Groups
              </h3>
              {/* {currentGroup && ( */}
              {/*   <button */}
              {/*     onClick={() => nav("/group")} */}
              {/*     className="flex items-center gap-1 text-xs font-medium text-blue-600" */}
              {/*   > */}
              {/*     <Settings size={13} /> */}
              {/*     Manage */}
              {/*   </button> */}
              {/* )} */}
            </div>
            <ul className="space-y-1.5">
              {currentGroup && (
                <li>
                  <button
                    onClick={() => nav("/group")}
                    className="flex w-full items-center gap-3 rounded-xl bg-white px-4 py-3 text-left text-sm ring-1 ring-gray-200 transition-colors hover:bg-gray-50"
                  >
                    <span
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                      style={{ background: "linear-gradient(135deg,#111827,#1f2937)" }}
                    >
                      {currentGroup.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium text-gray-900">
                      {currentGroup.name}
                    </span>
                    <button
                      onClick={() => nav("/group")}
                      className="flex items-center gap-1 text-xs font-medium text-blue-600"
                    >
                      <Settings size={13} />
                      Manage
                    </button>
                    <span className="rounded-full bg-gray-900 px-2 py-0.5 text-xs text-white">
                      Active
                    </span>
                  </button>
                </li>
              )}
              {otherGroups.map((g: Group) => (
                <GroupSwitchItem key={g.id} group={g} />
              ))}
            </ul>
          </section>

          {/* Action list */}
          <section className="space-y-1.5">
            <ActionItem
              icon={<Settings size={18} />}
              label="Settings"
              onClick={() => nav("/settings")}
            />
            <ActionItem
              icon={<Shield size={18} />}
              label="Privacy & security"
              onClick={() => {}}
            />
            <ActionItem
              icon={<HelpCircle size={18} />}
              label="Help & feedback"
              onClick={() => {}}
            />
            <ActionItem
              icon={<LogOut size={18} />}
              label="Log out"
              onClick={() =>
                logout.mutate(undefined, {
                  onSuccess: () => nav("/auth", { replace: true }),
                })
              }
              danger
            />
          </section>
        </div>
      </main>
    </div>
  );
}

function GroupSwitchItem({ group }: { group: Group }) {
  const { switchToGroup } = useGroupSwitch();
  return (
    <li>
      <button
        onClick={() => switchToGroup(group)}
        className="flex w-full items-center gap-3 rounded-xl bg-white px-4 py-3 text-left text-sm ring-1 ring-gray-100 transition-colors hover:bg-gray-50"
      >
        <span
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{
            background: "#d1d5db",
          }}
        >
          {group.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 truncate text-gray-900">
          {group.name}
        </span>
        <span className="text-xs text-gray-400">{group.currency}</span>
      </button>
    </li>
  );
}

function ActionItem({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-left ring-1 ring-gray-100 transition-colors hover:bg-gray-50"
    >
      <span className="flex items-center gap-3">
        <span
          className={`text-gray-500`}
          style={{ color: danger ? "#ef4444" : undefined }}
        >
          {icon}
        </span>
        <span
          className="text-sm font-medium"
          style={{ color: danger ? "#ef4444" : "#111827" }}
        >
          {label}
        </span>
      </span>
      <ChevronRight size={16} className="text-gray-300" />
    </button>
  );
}

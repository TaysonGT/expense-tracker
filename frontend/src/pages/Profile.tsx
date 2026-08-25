import { useNavigate } from "react-router";
import {
  ChevronRight,
  Mail,
  Settings,
  Shield,
  User,
  HelpCircle,
  LogOut,
  Moon,
  Sun
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLogout, useMyGroups } from "../lib/authQueries";
import { GroupRoleEnum, type Group } from "../types";
import { useGroupSwitch } from "../context/GroupSwitchContext";
import { useTheme } from "../context/ThemeContext";

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
  const { toggleTheme, logo, theme } = useTheme()

  const userName = currentUser?.name ?? "—";
  const userEmail = currentUser?.email ?? "";

  const otherGroups = (groupsQuery.data ?? []).filter(
    (g) => g.id !== currentGroup?.id
  );

  return (
    <div className="min-h-screen bg-background pb-28 text-primary">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background/90 px-4 py-4 backdrop-blur">
        <img src={logo} className="h-7"/>
        {/* <h1 className="text-lg font-semibold">Profile</h1> */}
        {theme==='light'?
          <Moon size={18} className="text-primary" onClick={toggleTheme} />
          :
          <Sun size={18} className="text-primary" onClick={toggleTheme} />
        }
      </header>

      <main className="mx-auto max-w-md px-4">
        <div className="space-y-6">
          {/* Hero: avatar + name + group selector */}
          <section className="flex flex-col items-center rounded-3xl bg-card p-8 text-center shadow-sm border border-border-light">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-background ring-2 ring-skeleton">
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
              <p className="mt-0.5 flex items-center justify-center gap-1.5 text-sm text-background0">
                <Mail size={14} />
                {userEmail}
              </p>
              {currentGroup && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                  {currentGroup.name} - {GroupRoleEnum[currentGroup.role]}
                </p>
              )}
            </div>
          </section>

          {/* My Groups — quick-switch to other groups + manage current */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
                    className="flex w-full items-center gap-3 rounded-xl bg-card-light px-4 py-3 text-left text-sm border border-primary transition-colors hover:bg-background"
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white border border-primary"
                      style={{ background: "linear-gradient(135deg,#111827,#1f2937)" }}
                    >
                      {currentGroup.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium text-primary">
                      {currentGroup.name}
                    </span>
                    <button
                      onClick={() => nav("/group")}
                      className="flex items-center gap-1 text-xs font-medium text-primary"
                    >
                      <Settings size={13} />
                      Manage
                    </button>
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-card-hover">
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
          <section className="space-y-1.5 pt-6 border-t border-border">
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
        className="flex w-full items-center gap-3 rounded-xl bg-card px-4 py-3 text-left text-sm border border-border transition-colors hover:bg-background"
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-background bg-primary/60 border border-primary/40"
          
        >
          {group.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 truncate text-primary">
          {group.name}
        </span>
        <span className="text-xs text-muted-foreground">{group.currency}</span>
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
      className="flex w-full items-center justify-between rounded-xl bg-card px-4 py-4 text-left border border-border-light transition-colors hover:bg-card-hover"
    >
      <span className="flex items-center gap-3">
        <span
          className={`text-primary ${danger?'text-danger!':'text-primary!'}`}
        >
          {icon}
        </span>
        <span
          className={`text-sm font-medium ${danger?'text-danger':'text-primary'}`}
        >
          {label}
        </span>
      </span>
      <ChevronRight size={16} className="text-gray-300" />
    </button>
  );
}

import { createContext, useContext, useMemo } from "react";
import { useSession, useMyGroups } from "../lib/authQueries";
import type { Group, GroupRole, User } from "../types";

/**
 * Auth/group context.
 *
 * Exposes the resolved session as a single source of truth for the app:
 *  - currentUser   — the logged-in user (or null)
 *  - currentGroup  — the active group (resolved from the session's
 *                    activeGroupId against the user's group list), or null
 *  - currentRole   — role in the active group
 *  - isAdmin       — convenience boolean
 *  - isLoading     — while the initial session check is in flight
 *
 * The backend re-validates that the session's active group is still one the
 * user belongs to on every /auth/me; if not, activeGroupId comes back null and
 * the route guard sends the user to onboarding.
 */

interface AuthContextValue {
  currentUser: User | null;
  currentGroup: Group | null;
  currentRole: GroupRole | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  hasActiveGroup: boolean;
  isLoading: boolean;
  canWrite: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const sessionQuery = useSession();
  const session = sessionQuery.data ?? null;

  const isAuthenticated = !!session?.user;

  // Only fetch the group list once authenticated.
  const groupsQuery = useMyGroups();
  const groups = isAuthenticated ? groupsQuery.data ?? [] : [];

  const value = useMemo<AuthContextValue>(() => {
    const currentUser = session?.user ?? null;
    const activeGroupId = session?.activeGroupId ?? null;
    const currentGroup =
      activeGroupId != null
        ? groups.find((g) => g.id === activeGroupId) ?? null
        : null;
    const currentRole = currentGroup?.role ?? session?.activeRole ?? null;

    return {
      currentUser,
      currentGroup,
      currentRole,
      isAdmin: currentRole === "admin",
      isAuthenticated: !!currentUser,
      canWrite: !!currentRole&&['admin','read_write'].includes(currentRole),
      hasActiveGroup: activeGroupId != null,
      // Loading until the session resolves; and, when authed with an active
      // group, until the groups list is available to resolve the group object.
      isLoading:
        sessionQuery.isLoading ||
        (isAuthenticated && activeGroupId != null && groupsQuery.isLoading),
    };
  }, [
    session,
    groups,
    sessionQuery.isLoading,
    groupsQuery.isLoading,
    isAuthenticated,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

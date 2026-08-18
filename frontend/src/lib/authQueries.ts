import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./api";
import type { Group, GroupRole, SessionInfo } from "../types";

/**
 * Auth + group session hooks.
 *
 * The session lives in an httpOnly cookie; the client mirrors it via
 * GET /auth/me (the `session` query). Login/logout/group-selection mutations
 * invalidate that query so the AuthProvider re-reads the source of truth.
 */

export const authKeys = {
  session: ["session"] as const,
  groups: ["groups"] as const,
};

const LAST_GROUP_KEY = "last_active_group";

export function getLastActiveGroup(): string | null {
  try {
    return localStorage.getItem(LAST_GROUP_KEY);
  } catch {
    return null;
  }
}

export function setLastActiveGroup(groupId: string): void {
  try {
    localStorage.setItem(LAST_GROUP_KEY, groupId);
  } catch {
    /* ignore storage errors */
  }
}

export function clearLastActiveGroup(): void {
  try {
    localStorage.removeItem(LAST_GROUP_KEY);
  } catch {
    /* ignore */
  }
}

/** Current session (user + active group/role), or null when unauthenticated. */
export function useSession() {
  return useQuery({
    queryKey: authKeys.session,
    queryFn: async (): Promise<SessionInfo | null> => {
      try {
        const { data } = await api.get<SessionInfo>("/auth/me");
        return data;
      } catch (err: unknown) {
        // 401 => not logged in; treat as null rather than an error state.
        if (
          typeof err === "object" &&
          err &&
          "response" in err &&
          (err as { response?: { status?: number } }).response?.status === 401
        ) {
          return null;
        }
        throw err;
      }
    },
    retry: false,
    staleTime: 0,
  });
}

export interface OAuthLoginInput {
  provider: "google" | "facebook";
  token: string;
}

export function useOAuthLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ provider, token }: OAuthLoginInput) => {
      const { data } = await api.post<SessionInfo>(
        `/auth/${provider}/callback`,
        { token }
      );
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: authKeys.session });
    },
  });
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

/**
 * POST /auth/register — creates a local-password user and logs them in.
 * The session has no active group yet; onboarding follows.
 * On 409 (email already registered), the caller should prompt the user to
 * switch to the login tab.
 */
export function useRegisterUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const { data } = await api.post<SessionInfo>("/auth/register", input);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: authKeys.session });
    },
  });
}

/**
 * POST /auth/login — verifies a local password and logs the user in.
 * On 401 (invalid credentials or user has no password — i.e. they registered
 * via OAuth), the caller should inform the user to sign in with their provider.
 */
export function useLoginUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data } = await api.post<SessionInfo>("/auth/login", input);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: authKeys.session });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post("/auth/logout");
    },
    onSuccess: () => {
      clearLastActiveGroup();
      void qc.invalidateQueries({ queryKey: authKeys.session });
      void qc.invalidateQueries({ queryKey: authKeys.groups });
    },
  });
}

/** Groups the current user belongs to (My Groups). */
export function useMyGroups() {
  return useQuery({
    queryKey: authKeys.groups,
    queryFn: async (): Promise<Group[]> => {
      const { data } = await api.get<Group[]>("/groups");
      return data;
    },
  });
}

export interface CreateGroupInput {
  name: string;
  currency: string;
  showBalance: boolean;
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateGroupInput): Promise<Group> => {
      const { data } = await api.post<Group>("/groups", input);
      return data;
    },
    onSuccess: (group) => {
      setLastActiveGroup(group.id);
      void qc.invalidateQueries({ queryKey: authKeys.session });
      void qc.invalidateQueries({ queryKey: authKeys.groups });
    },
  });
}

export function useJoinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (joinCode: string): Promise<Group> => {
      const { data } = await api.post<Group>("/groups/join", { joinCode });
      return data;
    },
    onSuccess: (group) => {
      setLastActiveGroup(group.id);
      void qc.invalidateQueries({ queryKey: authKeys.session });
      void qc.invalidateQueries({ queryKey: authKeys.groups });
    },
  });
}

export function useActivateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string): Promise<Group> => {
      const { data } = await api.post<Group>(`/groups/${groupId}/activate`);
      return data;
    },
    onSuccess: (group) => {
      setLastActiveGroup(group.id);
      void qc.invalidateQueries({ queryKey: authKeys.session });
      // Data changes tenant — drop cached expenses/categories.
      void qc.invalidateQueries({ queryKey: ["expenses"] });
      void qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export type { Group, GroupRole };

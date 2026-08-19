import { useNavigate } from "react-router";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { Check, Loader } from "lucide-react";
import { useActivateGroup, setLastActiveGroup } from "../lib/authQueries";
import type { Group } from "../types";

interface GroupSwitchState {
  open: boolean;
  status: "switching" | "success";
  groupName: string;
}

interface GroupSwitchContextValue {
  /** Trigger a group switch with the animated overlay. */
  switchToGroup: (group: Pick<Group, "id" | "name">) => void;
}

const GroupSwitchContext = createContext<GroupSwitchContextValue>({
  switchToGroup: () => {},
});

export function useGroupSwitch() {
  return useContext(GroupSwitchContext);
}

/**
 * Provides a shared "group switch" overlay.
 *
 * Any component that switches the active group should call
 * `useGroupSwitch().switchToGroup(group)` instead of invoking
 * `useActivateGroup` directly. The provider runs the activate mutation,
 * displays an animated fullscreen overlay ("Switching to {name}" →
 * "Successfully switched"), then closes.
 *
 * The overlay is rendered once here (one layer for the whole app) so it can
 * be invoked from anywhere: Profile "My Groups", the GroupSelector dropdown,
 * OnboardingGroups, etc. After a successful switch it navigates to /home.
 */
export function GroupSwitchProvider({ children }: { children: ReactNode }) {
  const nav = useNavigate();
  const activate = useActivateGroup();
  const [state, setState] = useState<GroupSwitchState>({
    open: false,
    status: "switching",
    groupName: "",
  });

  const switchToGroup = useCallback(
    (group: Pick<Group, "id" | "name">) => {
      setState({ open: true, status: "switching", groupName: group.name });

      activate.mutate(group.id, {
        onSuccess: (g: Group) => {
          setLastActiveGroup(g.id);
          setState({ open: true, status: "success", groupName: group.name });
          setTimeout(() => {
            setState((s) => ({ ...s, open: false }));
            nav("/home", { replace: true });
          }, 900);
        },
        onError: () => {
          setState((s) => ({ ...s, open: false }));
        },
      });
    },
    [activate, nav],
  );

  return (
    <GroupSwitchContext.Provider value={{ switchToGroup }}>
      {children}
      <GroupSwitchOverlay state={state} />
    </GroupSwitchContext.Provider>
  );
}

function GroupSwitchOverlay({ state }: { state: GroupSwitchState }) {
  const spinning = state.status === "switching";
  const label = spinning ? "Switching to group…" : "Successfully switched";
  const sub = spinning ? state.groupName : "Redirecting…";

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${
        state.open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div
        className={`flex flex-col items-center justify-center gap-4 rounded-3xl bg-white p-8 shadow-xl transition-all duration-300 ${
          state.open
            ? "scale-100 opacity-100"
            : "scale-95 opacity-0"
        }`}
      >
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 text-white ${
            spinning ? "animate-spin" : ""
          }`}
        >
          {spinning ? <Loader size={22} /> : <Check size={26} />}
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="mt-0.5 text-xs text-gray-500">{sub}</p>
        </div>
      </div>
    </div>
  );
}

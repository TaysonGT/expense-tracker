import { useState } from "react";
import { ChevronDown, Plus, Users } from "lucide-react";
import type { Group } from "../types";
import {
  useMyGroups,
  useActivateGroup,
} from "../lib/authQueries";
import { useAuth } from "../context/AuthContext";
import CreateGroupModal from "./CreateGroupModal";
import JoinGroupModal from "./JoinGroupModal";

interface GroupSelectorProps {
  currencyCode?: string;
}

/**
 * GroupSelector — a compact dropdown placed in the page header.
 *
 * Shows the active group's name (with its currency) as the trigger.
 * Opens a menu listing:
 *   - "My Groups" — all groups the user belongs to, with activate on click
 *   - "Create new group" — opens the creation modal
 *   - "Join a group" — opens the join modal
 *
 * This component reads the current group + groups list from AuthContext.
 */
export default function GroupSelector({ currencyCode }: GroupSelectorProps) {
  const { currentGroup } = useAuth();
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const groupName = currentGroup?.name ?? "No group";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-gray-800 ring-1 ring-gray-200 hover:bg-gray-50"
      >
        <span
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{
            background: "linear-gradient(135deg,#111827,#1f2937)",
          }}
        >
          {groupName.slice(0, 1).toUpperCase() || "·"}
        </span>
        <span className="truncate max-w-[140px]">{groupName}</span>
        {currencyCode && (
          <span className="text-xs text-gray-400">{currencyCode}</span>
        )}
        <ChevronDown size={14} className="text-gray-400" />
      </button>

      {open && (
        <GroupDropdown
          onClose={() => setOpen(false)}
          onCreate={() => {
            setShowCreate(true);
            setOpen(false);
          }}
          onJoin={() => {
            setShowJoin(true);
            setOpen(false);
          }}
        />
      )}

      <CreateGroupModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => setShowCreate(false)}
      />
      <JoinGroupModal
        open={showJoin}
        onClose={() => setShowJoin(false)}
        onJoined={() => setShowJoin(false)}
      />
    </div>
  );
}

function GroupDropdown({
  onClose,
  onCreate,
  onJoin,
}: {
  onClose: () => void;
  onCreate: () => void;
  onJoin: () => void;
}) {
  const { currentGroup } = useAuth();
  const groupsQuery = useMyGroups();
  const activate = useActivateGroup();
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const handleActivate = (groupId: string) => {
    setActivatingId(groupId);
    activate.mutate(groupId, {
      onSuccess: () => {
        onClose();
      },
      onSettled: () => setActivatingId(null),
    });
  };

  return (
    <div
      className="absolute top-full left-0 mt-2 w-64 rounded-xl bg-white shadow-lg ring-1 ring-gray-200"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-2">
        <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-gray-400">
          My Groups
        </div>
        {groupsQuery.isLoading ? (
          <div className="p-3 text-center text-sm text-gray-400">
            Loading…
          </div>
        ) : (
          <ul className="space-y-1">
            {(groupsQuery.data ?? []).map((g: Group) => (
              <li key={g.id}>
                <button
                  onClick={() => handleActivate(g.id)}
                  disabled={activatingId === g.id}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                    g.id === currentGroup?.id
                      ? "bg-gray-100 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{
                      background:
                        g.id === currentGroup?.id
                          ? "linear-gradient(135deg,#111827,#1f2937)"
                          : "#d1d5db",
                    }}
                  >
                    {g.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="truncate">{g.name}</span>
                  <span className="ml-auto text-xs text-gray-400">
                    {g.currency}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-1 border-t border-gray-100 p-2">
        <button
          onClick={onCreate}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Plus size={14} />
          Create
        </button>
        <button
          onClick={onJoin}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Users size={14} />
          Join
        </button>
      </div>
    </div>
  );
}

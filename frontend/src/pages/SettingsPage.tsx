import { useState } from "react";
import { ChevronRight, Tags } from "lucide-react";
import CategoryManagementModal from "../components/CategoryManagementModal";
import { useTheme } from "../context/ThemeContext";

/**
 * Settings screen (placeholder for v1) — currently just the entry point into
 * category management, which opens the shared modal on top of this screen.
 */
export default function SettingsPage() {
  const [managing, setManaging] = useState(false);
  const { logo } = useTheme()

  return (
    <div className="min-h-screen bg-background pb-28 text-primary">
      <header className="sticky top-0 z-10 bg-background/90 px-4 py-4 backdrop-blur flex items-center justify-between">
        <img src={logo} className="w-30"/>
        <h1 className="text-lg font-semibold">Settings</h1>
      </header>

      <main className="mx-auto max-w-md px-4">
        <ul className="mt-2 space-y-2">
          <li>
            <button
              onClick={() => setManaging(true)}
              className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left border border-border transition-transform active:scale-[0.99]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background border border-border">
                <Tags size={18} />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold text-primary">
                  Manage categories
                </span>
                <span className="text-xs text-empty-title">
                  Add, rename, or remove categories
                </span>
              </span>
              <ChevronRight size={18} className="ml-auto text-empty-title" />
            </button>
          </li>
        </ul>
      </main>

      <CategoryManagementModal
        open={managing}
        onClose={() => setManaging(false)}
      />
    </div>
  );
}

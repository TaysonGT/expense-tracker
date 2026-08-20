import { useState } from "react";
import { ChevronRight, Tags } from "lucide-react";
import CategoryManagementModal from "../components/CategoryManagementModal";

/**
 * Settings screen (placeholder for v1) — currently just the entry point into
 * category management, which opens the shared modal on top of this screen.
 */
export default function SettingsPage() {
  const [managing, setManaging] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 pb-28 text-gray-900">
      <header className="sticky top-0 z-10 bg-gray-50/90 px-4 py-4 backdrop-blur flex items-center justify-between">
        <h1 className="text-lg font-semibold">Settings</h1>
        <img src="/default-monochrome.svg" className="h-6"/>
      </header>

      <main className="mx-auto max-w-md px-4">
        <ul className="mt-2 space-y-2">
          <li>
            <button
              onClick={() => setManaging(true)}
              className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left border border-[#e6e6e6] transition-transform active:scale-[0.99]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-600 border border-[#e6e6e6]">
                <Tags size={18} />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900">
                  Manage categories
                </span>
                <span className="text-xs text-gray-400">
                  Add, rename, or remove categories
                </span>
              </span>
              <ChevronRight size={18} className="ml-auto text-gray-300" />
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

import { House, Settings, User, Wallet } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import AddMenu from "./AddMenu";

type Page = "home" | "expenses" | "profile" | "settings";

function BottomNav() {
  const nav = useNavigate()
  const onAddPress=()=>{setAddMenuOpen(prev=>!prev)}
  const location = useLocation()
  const isActive = (path: string)=> location.pathname.split('/')[1] === path
  const onNavigate=(p:Page)=>nav(p)
  const [addMenuOpen, setAddMenuOpen]= useState(false)
  return (
    <>
    <AddMenu open={addMenuOpen} onClose={() => setAddMenuOpen(false)} />
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 flex items-end justify-around px-2 pt-3 pb-6 z-20"
      style={{ boxShadow: "0 -1px 0 0 #e5e7eb, 0 -8px 24px rgba(0,0,0,0.04)" }}
    >
      <NavItem icon={<House />} label="Home" active={isActive('home')} onClick={() => onNavigate("home")} />
      <NavItem icon={<Wallet />} label="Expenses" active={isActive('expenses')} onClick={() => onNavigate("expenses")} />

      {/* Center Add Button */}
      <div className="relative flex flex-col items-center -mt-6">
        <button
          onClick={onAddPress}
          className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 cursor-pointer"
          style={{
            background: addMenuOpen ? "#1f2937" : "#111827",
            boxShadow: "0 4px 20px rgba(17,24,39,0.35)",
          }}
          aria-label="Add expense"
        >
          <span
            className="text-2xl font-light transition-transform duration-200"
            style={{ transform: addMenuOpen ? "rotate(45deg)" : "rotate(0deg)", display: "block", lineHeight: 1 }}
          >
            +
          </span>
        </button>
        <span className="text-[10px] text-gray-400 mt-1.5 font-medium">Add</span>
      </div>

      <NavItem icon={<User />} label="Profile" active={isActive('profile')} onClick={() => onNavigate("profile")} />
      <NavItem icon={<Settings />} label="Settings" active={isActive('settings')} onClick={() => onNavigate("settings")} />
    </nav>
    </>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors cursor-pointer"
      style={{ color: active ? "#00c48c" : "#9ca3af" }}
    >
      <span className="w-6 h-6 flex items-center justify-center">{icon}</span>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}


export default BottomNav

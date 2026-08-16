import { Mic, PenLine } from "lucide-react";
import { useNavigate } from "react-router";

interface AddMenuProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Popup shown when the center (+) button is tapped. Presents the two capture
 * choices vertically: "Record voice" and "Type manually".
 */
function AddMenu({ open, onClose }: AddMenuProps) {
  const nav = useNavigate();

  if (!open) return null;

  const go = (path: string) => {
    onClose();
    nav(path);
  };

  return (
    <>
      {/* Backdrop */}
      <button
        aria-label="Close menu"
        onClick={onClose}
        className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[1px]"
      />

      {/* Vertical choices, anchored above the center button */}
      <div className="fixed bottom-28 left-1/2 z-40 flex -translate-x-1/2 flex-col items-stretch gap-3 w-[min(20rem,calc(100%-3rem))]">
        <MenuChoice
          icon={<Mic size={20} />}
          title="Record voice"
          subtitle="Speak your expenses"
          accent="#00c48c"
          onClick={() => go("/voice")}
        />
        <MenuChoice
          icon={<PenLine size={20} />}
          title="Type manually"
          subtitle="Fill in the details"
          accent="#111827"
          onClick={() => go("/manual")}
        />
      </div>
    </>
  );
}

function MenuChoice({
  icon,
  title,
  subtitle,
  accent,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-left shadow-lg ring-1 ring-gray-100 transition-transform active:scale-[0.98]"
    >
      <span
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-white"
        style={{ background: accent }}
      >
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        <span className="text-xs text-gray-400">{subtitle}</span>
      </span>
    </button>
  );
}

export default AddMenu;

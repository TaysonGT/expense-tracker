import { Mic, PenLine, ShieldOff } from "lucide-react";
import { useNavigate } from "react-router";

interface AddMenuProps {
  open: boolean;
  onClose: () => void;
  canWrite: boolean
}

/**
 * Popup shown when the center (+) button is tapped. Presents the two capture
 * choices vertically: "Record voice" and "Type manually".
 *
 * The panel and backdrop animate in/out using Tailwind transitions driven by a
 * visibility flag that lags `open` by one frame on close — so the choices can
 * animate upward/fade out instead of vanishing instantly.
 */
function AddMenu({ open, onClose, canWrite }: AddMenuProps) {
  const nav = useNavigate();

  const go = (path: string) => {
    onClose();
    nav(path);
  };

  const backdrop =
    "fixed inset-0 z-30 bg-black/30 backdrop-blur-[1px] transition-opacity duration-200";
  const panel =
    "fixed bottom-28 left-1/2 z-40 flex -translate-x-1/2 flex-col items-stretch gap-3 w-[min(20rem,calc(100%-3rem))] transition-all duration-200";

  return (
    <>
      {/* Backdrop */}
      <button
        aria-label="Close menu"
        onClick={onClose}
        className={`${backdrop} ${!open ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"} cursor-default!`}
      />

      {/* Vertical choices, anchored above the center button */}
      <div
        className={`${panel} ${!open ? "translate-y-4 opacity-0 pointer-events-none" : "translate-y-0 opacity-100 pointer-events-auto"}`}
      >
        {
          canWrite?
            <>
              <MenuChoice
                icon={<Mic size={20} />}
                title="Record voice"
                subtitle="Speak your expenses"
                accent="#00c48c"
                variant='accent'
                onClick={() => go("/voice")}
              />
              <MenuChoice
                icon={<PenLine size={20} />}
                title="Type manually"
                subtitle="Fill in the details"
                accent="#111825"
                variant="light"
                onClick={() => go("/manual")}
              />
            </>
          :
          (
            <MenuChoice
              icon={<ShieldOff size={20} />}
              title="Not Allowed"
              subtitle="You don't have the permissions to add expenses to this group"
              accent="#ffaa22"
              variant='warning'
            />
        )}
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
  variant='light'
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accent: string;
  onClick?: () => void;
  variant?: 'light' | 'accent' | 'warning';
}) {
  const tones = {
    'light': ``,
    'accent':'',
    warning: ''
  }
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left shadow-lg border border-border transition-transform active:scale-[0.98] ${!onClick&&'cursor-not-allowed!'}`}
      style={{
        background: accent
      }}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-black border border-white bg-white ${tones[variant]}`}
        style={{
          // background: accent
        }}
      >
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-semibold text-white">{title}</span>
        <span className="text-xs text-white/80">{subtitle}</span>
      </span>
    </button>
  );
}

export default AddMenu;

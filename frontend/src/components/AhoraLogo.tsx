import { Sparkles } from "lucide-react";

/**
 * "Ahora" — the product wordmark.
 *
 * A compact styled brand used in unobtrusive header spots: the auth screen
 * and the Group Management page. We avoid a logo image and instead use a
 * gradient letter + an AI accent sparkle to keep the UI from feeling crowded.
 */
export default function AhoraLogo({
  size = "default",
}: {
  size?: "lg" | "compact" | "default";
}) {
  const text = size === "compact" ? "text-base" : size === 'lg'? 'text-3xl' : "text-xl";
  const icon = size === "compact" ? 14 : size === 'lg'? 26 : 18;
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold ${text}
        bg-gradient-to-l from-gray-900 via-emerald-600 to-emerald-400 bg-clip-text
        text-transparent`}
    >
      <Sparkles
        size={icon}
        className="text-emerald-400"
        aria-hidden
      />
      <span>Ahora</span>
      <span className="text-xs font-normal opacity-70 text-black">AI</span>
    </span>
  );
}

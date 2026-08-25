import { X } from "lucide-react";
import type { DateRange, DateRangeKey } from "./ExpenseFilters";
import { computeRange } from "./ExpenseFilters";

interface DateFilterModalProps {
  open: boolean;
  onClose: () => void;
  range: DateRange;
  onChangeRange: (range: DateRange) => void;
}

const PRESETS: { key: Exclude<DateRangeKey, "custom">; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
];

/**
 * Modal for selecting a date range on the Expenses screen.
 *
 * Shows preset chips (All / Today / This week / This month) plus a custom
 * range with start/end date pickers. The selected range is applied on choose
 * and the modal is dismissed.
 */
export default function DateFilterModal({
  open,
  onClose,
  range,
  onChangeRange,
}: DateFilterModalProps) {
  const selectPreset = (key: Exclude<DateRangeKey, "custom">) => {
    onChangeRange({ key, ...computeRange(key) });
    onClose();
  };

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeRange({
      ...range,
      key: "custom",
      startDate: e.target.value,
    });
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeRange({
      ...range,
      key: "custom",
      endDate: e.target.value,
    });
  };

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      onClick={handleBackdrop}
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/40 transition-opacity duration-200 ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div
        className={`w-full max-w-sm rounded-t-3xl bg-background p-5 shadow-xl transition-transform duration-200 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Grabber */}
        <div className="mb-4 flex items-center justify-center">
          <span className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        {/* Done row */}
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-background0">Date range</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-empty-title hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Presets */}
        <div className="mb-5 space-y-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => selectPreset(p.key)}
              className={`block w-full rounded-2xl bg-card px-4 py-3 text-left text-sm font-medium shadow-sm border transition-colors ${
                range.key === p.key
                  ? "border-primary"
                  : "border-border hover:bg-card-hover"
              }`}
            >
              <span
                className={`mr-2 inline-block h-2 w-2 rounded-full ${
                  range.key === p.key ? "bg-primary" : "bg-border-light"
                }`}
              />
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom */}
        <div className="space-y-2">
          <button
            onClick={() =>
              onChangeRange({ key: "custom", ...computeRange("custom", range) })
            }
            className={`block w-full rounded-2xl bg-card px-4 py-3 text-left text-sm font-medium shadow-sm border transition-colors ${
              range.key === "custom"
                ? "border-primary"
                : "border-border-light hover:bg-background"
            }`}
          >
            <span
              className={`mr-2 inline-block h-2 w-2 rounded-full ${
                range.key === "custom" ? "bg-primary" : "bg-border-light"
              }`}
            />
            Custom
          </button>

          {range.key === "custom" && (
            <div className="flex items-center gap-2 rounded-2xl bg-card p-3 shadow-sm border border-border">
              <input
                type="date"
                value={range.startDate ?? ""}
                onChange={handleStartChange}
                className="min-w-0 flex-1 rounded-lg border border-skeleton px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
              />
              <span className="text-xs text-empty-title">to</span>
              <input
                type="date"
                value={range.endDate ?? ""}
                onChange={handleEndChange}
                className="min-w-0 flex-1 rounded-lg border border-skeleton px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

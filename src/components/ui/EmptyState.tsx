import React from "react";
import { SearchX, CalendarX2, Trophy, Inbox } from "lucide-react";

const ICONS = {
  search: SearchX,
  calendar: CalendarX2,
  trophy: Trophy,
  inbox: Inbox,
} as const;

interface EmptyStateProps {
  icon?: keyof typeof ICONS;
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
}

// Illustrated empty state with optional recovery action.
// Replaces bare gray text boxes across news, matches, live, gallery, admin.
export default function EmptyState({ icon = "inbox", title, hint, actionLabel, onAction }: EmptyStateProps) {
  const Icon = ICONS[icon];
  return (
    <div className="p-12 text-center rounded-2xl border border-dashed border-white/10 bg-[#121215]/40">
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
        <Icon className="h-6 w-6 text-slate-400" />
      </span>
      <p className="text-sm font-black text-slate-200">{title}</p>
      {hint && <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{hint}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="focus-ring mt-4 rounded-xl bg-emerald-500 px-5 py-2 text-xs font-black text-black hover:bg-emerald-400 transition active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

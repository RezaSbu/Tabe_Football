import React from "react";
import { formatStatNumber } from "../utils";

export interface SeasonOption {
  id: string;
  name: string;
  label?: string | null;
  isActive?: boolean;
  status?: string | null;
}

interface SeasonSwitcherProps {
  seasons?: SeasonOption[];
  value: string;
  onChange: (seasonId: string) => void;
  allowCareer?: boolean;
  careerLabel?: string;
  className?: string;
}

// Season picker shared by League/Player/Coach/Team/Stats surfaces.
// value is a season id, or "career" for the all-time view (when allowed).
// News and Gallery stay global and never use this component.
export default function SeasonSwitcher({
  seasons = [],
  value,
  onChange,
  allowCareer = true,
  careerLabel = "کارنامه (همه فصل‌ها)",
  className = "",
}: SeasonSwitcherProps) {
  const sorted = [...seasons].sort((a, b) => String(b.name || "").localeCompare(String(a.name || "")));
  if (sorted.length === 0 && !allowCareer) return null;
  return (
    <label className={`inline-flex items-center gap-2 text-[11px] text-slate-400 font-bold ${className}`}>
      <span className="shrink-0">فصل:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-[11px] font-black text-white focus:outline-none focus:border-emerald-500 transition cursor-pointer font-mono"
      >
        {sorted.map((s) => (
          <option key={s.id} value={s.id}>
            {formatStatNumber(s.name)}{s.isActive || s.status === "current" ? " (جاری)" : ""}
          </option>
        ))}
        {allowCareer && <option value="career">{careerLabel}</option>}
      </select>
    </label>
  );
}

// Default selection: the active season, else the newest season, else career.
export function defaultSeasonValue(seasons: SeasonOption[] | undefined, allowCareer = true): string {
  if (Array.isArray(seasons) && seasons.length > 0) {
    const active = seasons.find((s) => s.isActive || s.status === "current");
    if (active) return String(active.id);
    const sorted = [...seasons].sort((a, b) => String(b.name || "").localeCompare(String(a.name || "")));
    if (sorted[0]) return String(sorted[0].id);
  }
  return allowCareer ? "career" : "";
}

import React from "react";
import { TeamItem } from "../types";
import { Shield, Home, UserCheck, Calendar } from "lucide-react";

interface TeamCardProps {
  team: TeamItem;
  onClick: (id: string) => void;
  highlightedRank?: number;
}

export default function TeamCard({ team, onClick, highlightedRank }: TeamCardProps) {
  return (
    <div
      onClick={() => onClick(team.id)}
      className="group relative rounded-xl border border-white/5 bg-[#18181c]/40 p-4 transition-all hover:bg-[#18181c] hover:border-emerald-500/30 cursor-pointer shadow-md select-none flex flex-col justify-between"
      dir="rtl"
    >
      {/* Absolute badge for league position rank if present */}
      {highlightedRank !== undefined && (
        <span className="absolute top-3 left-3 flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-950 font-bold text-xs text-emerald-400 border border-emerald-900/30">
          {highlightedRank}
        </span>
      )}

      <div>
        {/* Logo and Name */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#121215] text-2xl shadow group-hover:scale-105 transition-all">
            {team.logo || "🛡️"}
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white group-hover:text-emerald-400 transition-all">
              {team.name}
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">تاسیس: {team.founded || "۱۳۰۰"} هجری</p>
          </div>
        </div>

        {/* Coach & Stadium Specs */}
        <div className="space-y-2 text-[11px] text-slate-300">
          <div className="flex items-center gap-2">
            <UserCheck className="h-3.5 w-3.5 text-slate-500" />
            <span>سرمربی: <strong className="text-slate-200">{team.coach || "کادر فنی"}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Home className="h-3.5 w-3.5 text-slate-500" />
            <span className="truncate" title={team.stadium}>ورزشگاه: {team.stadium || "استادیوم اختصاصی"}</span>
          </div>
        </div>
      </div>

      {/* Visual form gauge */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
        <span className="text-[10px] text-slate-500">وضعیت بازی‌های اخیر:</span>
        <div className="flex gap-1.5" dir="ltr">
          {team.recentForm && team.recentForm.slice(-5).map((result, idx) => (
            <span
              key={idx}
              className={`h-4.5 w-4.5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                result === "W"
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-900/40"
                  : result === "D"
                  ? "bg-slate-800 text-slate-400 border border-slate-700/40"
                  : "bg-red-950 text-red-500 border border-red-900/40"
              }`}
            >
              {result}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

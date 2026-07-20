import React, { useState } from "react";
import { MatchItem } from "../types";
import MatchCard from "./MatchCard";
import { CalendarRange, Activity, ShieldAlert, CheckCircle } from "lucide-react";

interface FixturesWidgetProps {
  matches: MatchItem[];
  predictions?: any;
  onVote?: (matchId: string, prediction: "home" | "draw" | "away", score: string) => void;
  onSelectTeam?: (name: string) => void;
}

export default function FixturesWidget({
  matches = [],
  predictions,
  onVote,
  onSelectTeam
}: FixturesWidgetProps) {
  const [filter, setFilter] = useState<"all" | "scheduled" | "live" | "finished">("all");

  const filteredMatches = matches.filter((m) => {
    if (filter === "scheduled") return m.status === "not-started";
    if (filter === "live") return m.status === "live";
    if (filter === "finished") return m.status === "finished";
    return true;
  });

  return (
    <div className="w-full bg-[#18181c]/50 border border-white/5 rounded-2xl p-4 text-white" dir="rtl">
      {/* Tab bar header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 pb-2.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-emerald-450 text-emerald-500" />
          <h3 className="font-extrabold text-sm text-slate-100">برنامه زمان‌بندی و نتایج بازی‌ها</h3>
        </div>

        {/* Tab triggers */}
        <div className="flex bg-[#121215] p-1 rounded-xl border border-white/5 text-[10px]">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 cursor-pointer font-bold rounded-lg transition ${
              filter === "all" ? "bg-emerald-500 text-black" : "text-slate-400 hover:text-white"
            }`}
          >
            همه بازی‌ها
          </button>
          <button
            onClick={() => setFilter("live")}
            className={`px-3 py-1 cursor-pointer font-bold rounded-lg transition ${
              filter === "live" ? "bg-red-500 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            زنده
          </button>
          <button
            onClick={() => setFilter("scheduled")}
            className={`px-3 py-1 cursor-pointer font-bold rounded-lg transition ${
              filter === "scheduled" ? "bg-[#18181c] text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            برگزارنشده
          </button>
          <button
            onClick={() => setFilter("finished")}
            className={`px-3 py-1 cursor-pointer font-bold rounded-lg transition ${
              filter === "finished" ? "bg-[#18181c] text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            پایان‌یافته
          </button>
        </div>
      </div>

      {/* Grid of matches */}
      {filteredMatches.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredMatches.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              predictions={predictions}
              onVote={onVote}
              onSelectTeam={onSelectTeam}
            />
          ))}
        </div>
      ) : (
        <div className="p-10 text-center text-xs text-slate-550 border border-white/5 border-dashed rounded-xl bg-[#121215]/30">
          هیچ رویدادی مطابق با فیلتر ترجیحی صادر نگردیده است.
        </div>
      )}
    </div>
  );
}

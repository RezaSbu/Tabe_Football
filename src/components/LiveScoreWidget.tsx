import React, { useEffect, useState } from "react";
import { MatchItem } from "../types";
import { Activity, Tv, Volume2 } from "lucide-react";

interface LiveScoreWidgetProps {
  matches: MatchItem[];
  onSelectMatch?: (m: MatchItem) => void;
  onSubscribeTeam?: (team: string) => void;
  subscribedTeams?: string[];
}

export default function LiveScoreWidget({
  matches = [],
  onSelectMatch,
  onSubscribeTeam,
  subscribedTeams = []
}: LiveScoreWidgetProps) {
  const liveMatches = matches.filter((m) => m.status === "live");

  return (
    <div className="w-full bg-[#18181c]/50 border border-white/5 rounded-2xl p-4 text-white" dir="rtl">
      <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-red-505 animate-pulse text-red-500" />
          <h3 className="font-extrabold text-sm text-slate-100">نتایج زنده هم‌اکنون</h3>
        </div>
        <span className="text-[10px] bg-red-950 text-red-400 font-bold px-2 py-0.5 rounded-full border border-red-900/30 animate-pulse">
          {liveMatches.length} بازی در جریان
        </span>
      </div>

      {liveMatches.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {liveMatches.map((m) => {
            const isSubscribedHome = subscribedTeams.includes(m.teamHome);
            const isSubscribedAway = subscribedTeams.includes(m.teamAway);

            return (
              <div
                key={m.id}
                onClick={() => onSelectMatch?.(m)}
                className="relative bg-black/35 rounded-xl border border-white/5 p-3.5 hover:border-red-500/20 cursor-pointer transition flex flex-col justify-between group"
              >
                {/* Score panel */}
                <div className="flex items-center justify-between gap-1">
                  {/* Home and Goal notifications subscription */}
                  <div className="flex items-center gap-2 truncate flex-1 justify-end">
                    <span className="font-extrabold text-xs text-slate-200 group-hover:text-red-400 transition truncate">{m.teamHome}</span>
                    <span className="text-sm">{m.teamHomeLogo}</span>
                  </div>

                  {/* Dynamic central score */}
                  <div className="px-3 py-1 bg-[#121215] rounded font-mono font-black text-sm text-red-450 tracking-wider flex items-center gap-1.5 border border-white/5 text-red-400 text-center mx-2.5">
                    <span>{m.scoreHome}</span>
                    <span className="text-slate-600 font-normal">:</span>
                    <span>{m.scoreAway}</span>
                  </div>

                  {/* Away */}
                  <div className="flex items-center gap-2 truncate flex-1">
                    <span className="text-sm">{m.teamAwayLogo}</span>
                    <span className="font-extrabold text-xs text-slate-200 group-hover:text-red-400 transition truncate">{m.teamAway}</span>
                  </div>
                </div>

                {/* Sub row specs */}
                <div className="flex items-center justify-between text-[9px] text-slate-500 font-bold mt-3.5 pt-2 border-t border-white/[0.02]">
                  <span className="text-red-450 animate-pulse text-red-550 text-red-500 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                    دقیقه {m.minutes || "۷۵"}'
                  </span>

                  {/* Push alert toggles */}
                  {onSubscribeTeam && (
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); onSubscribeTeam(m.teamHome); }}
                        className={`px-1.5 py-0.5 rounded transition ${isSubscribedHome ? "bg-red-950 text-red-400 border border-red-900/30" : "bg-white/5 text-slate-400"}`}
                        title={`دریافت هشدار گل‌های ${m.teamHome}`}
                      >
                        زنگ {m.teamHome}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onSubscribeTeam(m.teamAway); }}
                        className={`px-1.5 py-0.5 rounded transition ${isSubscribedAway ? "bg-red-950 text-red-400 border border-red-900/30" : "bg-white/5 text-slate-400"}`}
                        title={`دریافت هشدار گل‌های ${m.teamAway}`}
                      >
                        زنگ {m.teamAway}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-slate-500 bg-black/20 rounded-xl border border-white/5 border-dashed">
          در حال حاضر مسابقه زنده‌ای در جریان نیست. برنامه بازی‌های آتی را مشاهده نمایید.
        </div>
      )}
    </div>
  );
}

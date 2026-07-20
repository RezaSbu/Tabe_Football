import React from "react";
import { MatchItem } from "../types";
import { Calendar, MapPin, Clock, Vote } from "lucide-react";
import { isTeamInDb, convertGregorianToShamsi } from "../utils";

interface MatchCardProps {
  key?: string | number;
  match: MatchItem;
  predictions?: any;
  onVote?: (matchId: string, prediction: "home" | "draw" | "away", score: string) => void;
  onSelectTeam?: (name: string) => void;
}

export default function MatchCard({ match, predictions, onVote, onSelectTeam }: MatchCardProps) {
  const pStats = predictions?.[match.id];

  const handleTeamClick = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    if (onSelectTeam && isTeamInDb(name)) {
      onSelectTeam(name);
    }
  };

  return (
    <div
      className="p-4 rounded-xl border border-white/5 bg-[#18181c]/35 flex flex-col justify-between gap-4"
      dir="rtl"
    >
      {/* Top Banner Tag */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
        <span className="rounded bg-white/5 px-2 py-0.5 border border-white/5">
          {match.league === "pro-league" 
            ? "لیگ برتر خلیج فارس" 
            : match.league === "hazfi-cup" 
            ? "جام حذفی باشگاه‌ها" 
            : "لیگ آزادگان"}
        </span>
        <div className="flex items-center gap-1.5 font-mono">
          <Clock className="h-3.5 w-3.5 text-slate-500" />
          <span>{match.time} • {convertGregorianToShamsi(match.date)}</span>
        </div>
      </div>

      {/* Main Score Board Row */}
      <div className="grid grid-cols-7 items-center gap-1 text-center py-2">
        {/* Home Team */}
        {(() => {
          const homeExists = isTeamInDb(match.teamHome);
          return (
            <div 
              onClick={(e) => {
                if (homeExists) {
                  handleTeamClick(e, match.teamHome);
                }
              }}
              className={`col-span-2 flex flex-col items-center gap-2 ${homeExists ? "cursor-pointer group" : "cursor-default opacity-85"}`}
            >
              <div className={`h-10 w-10 flex items-center justify-center rounded-xl bg-black/40 text-xl ${homeExists ? "group-hover:scale-105 transition" : ""}`}>
                {match.teamHomeLogo || "🔴"}
              </div>
              <span className={`font-extrabold text-xs text-slate-200 truncate max-w-full ${homeExists ? "group-hover:text-emerald-400 transition" : ""}`}>
                {match.teamHome}
              </span>
            </div>
          );
        })()}

        {/* Mid score indicators */}
        <div className="col-span-3 flex flex-col items-center justify-center">
          {match.status === "live" ? (
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-red-950 text-red-500 border border-red-950 px-2.5 py-0.5 text-[9px] font-black animate-pulse">
                • زنده {match.minutes}'
              </span>
              <div className="text-xl font-mono font-black text-white">
                {match.scoreHome} - {match.scoreAway}
              </div>
            </div>
          ) : match.status === "finished" ? (
            <div className="space-y-1">
              <span className="rounded bg-slate-800 text-slate-400 px-2 py-0.5 text-[9px] font-bold">
                پایان یافته
              </span>
              <div className="text-xl font-mono font-black text-slate-300">
                {match.scoreHome} - {match.scoreAway}
              </div>
            </div>
          ) : (
            <div className="rounded bg-emerald-950 text-emerald-400 px-2 py-0.5 text-[10px] font-bold border border-emerald-900/10">
              {match.time}
            </div>
          )}
        </div>

        {/* Away Team */}
        {(() => {
          const awayExists = isTeamInDb(match.teamAway);
          return (
            <div 
              onClick={(e) => {
                if (awayExists) {
                  handleTeamClick(e, match.teamAway);
                }
              }}
              className={`col-span-2 flex flex-col items-center gap-2 ${awayExists ? "cursor-pointer group" : "cursor-default opacity-85"}`}
            >
              <div className={`h-10 w-10 flex items-center justify-center rounded-xl bg-black/40 text-xl ${awayExists ? "group-hover:scale-105 transition" : ""}`}>
                {match.teamAwayLogo || "🔵"}
              </div>
              <span className={`font-extrabold text-xs text-slate-200 truncate max-w-full ${awayExists ? "group-hover:text-emerald-400 transition" : ""}`}>
                {match.teamAway}
              </span>
            </div>
          );
        })()}
      </div>

      {match.venue && (
        <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 font-medium">
          <MapPin className="h-3 w-3 text-slate-600" />
          <span>{match.venue}</span>
        </div>
      )}

      {/* Inline quick fan prediction prediction panels */}
      {onVote && match.status !== "finished" && (
        <div className="pt-2 border-t border-white/[0.03] space-y-2">
          <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold">
            <span>پیش‌بینی نتیجه مسابقه توسط هواداران:</span>
            {pStats && <span>{pStats.totalVotes.toLocaleString("fa-IR")} رای ثبت شده</span>}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => onVote(match.id, "home", "")}
              className="py-1 px-2 rounded-lg bg-[#121215] border border-white/5 text-[9px] hover:border-emerald-500 transition text-slate-300"
            >
              برد {match.teamHome}
            </button>
            <button
              onClick={() => onVote(match.id, "draw", "")}
              className="py-1 px-2 rounded-lg bg-[#121215] border border-white/5 text-[9px] hover:border-slate-400 transition text-slate-300"
            >
              مساوی
            </button>
            <button
              onClick={() => onVote(match.id, "away", "")}
              className="py-1 px-2 rounded-lg bg-[#121215] border border-white/5 text-[9px] hover:border-cyan-500 transition text-slate-300"
            >
              برد {match.teamAway}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

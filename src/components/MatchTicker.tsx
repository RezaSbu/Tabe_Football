import React, { useState } from "react";
import { MatchItem } from "../types";
import { Calendar, MapPin, AlignLeft, Trophy, ChevronRight, ChevronLeft } from "lucide-react";

interface MatchTickerProps {
  matches: MatchItem[];
  selectedLeagueFilter?: string;
  onSelectMatch?: (match: MatchItem) => void;
}

export default function MatchTicker({ matches, selectedLeagueFilter, onSelectMatch }: MatchTickerProps) {
  const BASE_DATE = new Date();
  
  const getOffsetDateString = (offsetDays: number) => {
    const date = new Date(BASE_DATE);
    date.setDate(date.getDate() + offsetDays);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const getDayNamePersian = (offsetDays: number) => {
    if (offsetDays === -2) return "۲ روز قبل";
    if (offsetDays === -1) return "دیروز";
    if (offsetDays === 0) return "امروز";
    if (offsetDays === 1) return "فردا";
    if (offsetDays === 2) return "۲ روز بعد";
    return "";
  };

  const getWeekdayPersian = (offsetDays: number) => {
    const date = new Date(BASE_DATE);
    date.setDate(date.getDate() + offsetDays);
    const options: Intl.DateTimeFormatOptions = { weekday: "long" };
    return date.toLocaleDateString("fa-IR", options);
  };

  const getPersianDateString = (offsetDays: number) => {
    const date = new Date(BASE_DATE);
    date.setDate(date.getDate() + offsetDays);
    return date.toLocaleDateString("fa-IR", { day: "numeric", month: "long" });
  };

  // Generate 5 days: -2, -1, 0, 1, 2
  const datesToToggle = [-2, -1, 0, 1, 2].map((offset) => ({
    offset,
    key: getOffsetDateString(offset),
    dayLabel: getDayNamePersian(offset),
    weekday: getWeekdayPersian(offset),
    dateText: getPersianDateString(offset)
  }));

  const [activeDateKey, setActiveDateKey] = useState<string>(getOffsetDateString(0));
  const [activeLeagueFilter, setActiveLeagueFilter] = useState<string>("all");

  // Filtering matches
  const filteredMatches = matches.filter((match) => {
    const matchesDate = match.date === activeDateKey;
    const matchesLeague = activeLeagueFilter === "all" || match.league === activeLeagueFilter;
    const matchesGlobalLeague = !selectedLeagueFilter || selectedLeagueFilter === "all" || match.league === selectedLeagueFilter;
    return matchesDate && matchesLeague && matchesGlobalLeague;
  });

  const getLeagueBadgeName = (league: string) => {
    switch (league) {
      case "pro-league": return "لیگ برتر ایران";
      case "league-1": return "لیگ یک (آزادگان)";
      case "league-2": return "لیگ دو ایران";
      case "hazfi-cup": return "جام حذفی ایران";
      default: return "فوتبال ایران";
    }
  };

  return (
    <div className="rounded-2xl bg-[#121215] p-4 border border-white/5 shadow-xl" dir="rtl" id="match-ticker-box">
      {/* Title Header */}
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-emerald-400" />
          <h2 className="font-bold text-lg text-white">برنامه و نتایج زنده بازی‌ها</h2>
        </div>
        
        {/* League Selector inside widget */}
        {!selectedLeagueFilter && (
          <div className="flex flex-wrap gap-1">
            {[
              { id: "all", label: "همه لیگ‌ها" },
              { id: "pro-league", label: "لیگ برتر" },
              { id: "league-1", label: "لیگ ۱" },
              { id: "league-2", label: "لیگ ۲" },
              { id: "hazfi-cup", label: "جام حذفی" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveLeagueFilter(tab.id)}
                className={`rounded-lg px-3 py-1 text-xs transition ${
                  activeLeagueFilter === tab.id
                    ? "bg-emerald-500 text-black font-semibold"
                    : "bg-[#0a0a0c] text-gray-400 border border-white/5 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Date Carousel (5 tabs representing 2 days ago up to 2 days ahead) */}
      <div className="mb-5 grid grid-cols-5 gap-1.5 border-b border-white/5 pb-3 overflow-x-auto min-w-[320px]">
        {datesToToggle.map((day) => {
          const isSelected = activeDateKey === day.key;
          return (
            <button
              key={day.key}
              onClick={() => setActiveDateKey(day.key)}
              className={`flex flex-col items-center rounded-xl p-2.5 transition text-center ${
                isSelected
                  ? "bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-950/20 font-bold scale-102 border-b-2 border-emerald-500"
                  : "bg-[#0a0a0c]/70 text-gray-400 hover:bg-[#0a0a0c] hover:text-white"
              }`}
            >
              <span className="text-[10px] font-semibold opacity-75">{day.dayLabel}</span>
              <span className="text-xs sm:text-sm font-bold mt-0.5">{day.weekday}</span>
              <span className="text-[10px] sm:text-xs mt-0.5 opacity-90">{day.dateText}</span>
            </button>
          );
        })}
      </div>

      {/* Matches List Grid */}
      {filteredMatches.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl bg-[#0a0a0c]/40 py-10 border border-white/5 text-center">
          <AlignLeft className="h-8 w-8 text-gray-600 mb-2" />
          <p className="text-sm text-gray-400">هیچ مسابقه‌ای برای تاریخ انتخابی در این بخش ثبت نشده است.</p>
          <p className="text-[11px] text-gray-500 mt-1">از پنل مدیریت می‌توانید مسابقه جدید اضافه نمایید.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredMatches.map((match) => {
            const isLive = match.status === "live";
            const isFinished = match.status === "finished";
            
            return (
              <div 
                key={match.id} 
                onClick={() => onSelectMatch?.(match)}
                className={`relative flex flex-col justify-between rounded-xl p-4 transition-all hover:border-emerald-500/20 bg-[#0a0a0c]/60 border cursor-pointer hover:scale-[1.01] ${
                  isLive 
                    ? "border-emerald-500/30 hover:border-emerald-500/50 bg-gradient-to-l from-emerald-950/10 to-transparent" 
                    : "border-white/5 hover:border-red-500/20"
                }`}
              >
                {/* Header: League & Status */}
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="flex items-center gap-1 rounded bg-[#0a0a0c] px-2 py-0.5 text-[10px] font-bold text-slate-400 border border-white/5">
                    <Trophy className="h-2.5 w-2.5 text-emerald-400" />
                    {getLeagueBadgeName(match.league)}
                  </span>
                  
                  {isLive && (
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-950 border border-emerald-800 px-2.5 py-0.5 text-[10px] font-black text-emerald-400">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      </span>
                      <span>زنده (دقیقه {match.minutes})</span>
                    </span>
                  )}

                  {isFinished && (
                    <span className="rounded bg-[#0a0a0c] border border-white/5 px-2 py-0.5 text-[10px] font-semibold text-gray-400">
                      پایان یافته
                    </span>
                  )}

                  {match.status === "not-started" && (
                    <span className="rounded bg-cyan-950/30 border border-cyan-900/40 px-2 py-0.5 text-[10px] font-semibold text-cyan-400">
                      ساعت: {match.time}
                    </span>
                  )}
                </div>

                {/* Score Panel Grid */}
                <div className="my-3 flex items-center justify-between px-2">
                  {/* Home Team */}
                  <div className="flex w-1/3 flex-col items-center gap-1.5 text-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0a0a0c] text-lg shadow-inner border border-white/5">
                      {match.teamHomeLogo || "⚽"}
                    </span>
                    <span className="text-xs font-bold text-white line-clamp-1">{match.teamHome}</span>
                  </div>

                  {/* Score Mid Column */}
                  <div className="flex w-1/3 flex-col items-center justify-center">
                    {!isFinished && match.status === "not-started" ? (
                      <div className="rounded-lg bg-[#0a0a0c] border border-white/5 px-3 py-1 text-xs font-mono font-bold text-gray-300">
                        VS
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className={`text-xl font-black font-mono px-2.5 py-1 rounded bg-[#0a0a0c] border ${isLive ? "text-emerald-400 border-emerald-500/40" : "text-white border border-white/5"}`}>
                          {match.scoreHome}
                        </span>
                        <span className="text-gray-600 font-bold">:</span>
                        <span className={`text-xl font-black font-mono px-2.5 py-1 rounded bg-[#0a0a0c] border ${isLive ? "text-emerald-400 border-emerald-500/40" : "text-white border border-white/5"}`}>
                          {match.scoreAway}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Away Team */}
                  <div className="flex w-1/3 flex-col items-center gap-1.5 text-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0a0a0c] text-lg shadow-inner border border-white/5">
                      {match.teamAwayLogo || "⚽"}
                    </span>
                    <span className="text-xs font-bold text-white line-clamp-1">{match.teamAway}</span>
                  </div>
                </div>

                {/* Footer: Venue Info */}
                <div className="mt-2 flex items-center gap-1 border-t border-white/5 pt-2.5 text-[10px] text-gray-500">
                  <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
                  <span className="truncate">{match.venue || "ورزشگاه استادیوم ایران"}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

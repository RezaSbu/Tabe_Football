import React from "react";
import { MatchItem } from "../types";
import { Flame, Clock, Award, MapPin, ChevronLeft } from "lucide-react";

interface FeaturedGamesWidgetProps {
  featureGames: any[];
  onSelectMatch: (match: any) => void;
}

export default function FeaturedGamesWidget({ featureGames, onSelectMatch }: FeaturedGamesWidgetProps) {
  if (!featureGames || featureGames.length === 0) return null;

  return (
    <div className="rounded-2xl border border-red-500/10 bg-gradient-to-l from-red-950/15 via-[#121215] to-[#121215] p-5 shadow-2xl relative overflow-hidden" dir="rtl">
      {/* Glow backdrop */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-red-650/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative mb-4 flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-red-500 animate-pulse" />
          <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">مسابقات پپیش‌رو و دیدارهای منتخب ویژه</h3>
        </div>
        <span className="rounded-full bg-red-550/10 border border-red-500/20 px-2.5 py-0.5 text-[9px] font-bold text-red-400">
          SPOTLIGHT GAMES
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featureGames.map((game) => (
          <div
            key={game.id}
            onClick={() => onSelectMatch(game)}
            className="group relative rounded-xl border border-white/5 bg-[#0a0a0c]/80 p-4 transition-all duration-300 hover:scale-[1.015] hover:border-red-500/30 hover:bg-[#0a0a0c] cursor-pointer flex flex-col justify-between"
          >
            <div>
              {/* Header: league & hot topic info */}
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded bg-slate-950 px-2 py-0.5 text-[9px] font-black text-gray-400 border border-white/5">
                  {game.league === "pro-league" ? "لیگ برتر خلیج فارس" : game.league === "futsal" ? "لیگ برتر فوتسال" : "رقابت‌های کشوری"}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold">
                  <Clock className="h-3 w-3" />
                  {game.time}
                </span>
              </div>

              {/* Spotlight topic */}
              <p className="text-[10px] text-red-400 font-semibold mb-3 leading-relaxed bg-red-950/20 px-2 py-1 rounded border border-red-500/10">
                {game.hotTopic || "دیدار حساس و تعیین‌کننده جدول"}
              </p>

              {/* Match Face-off */}
              <div className="flex items-center justify-between px-2 py-1 bg-black/20 rounded-lg mb-3">
                {/* Home */}
                <div className="flex flex-col items-center gap-1 w-[40%] text-center">
                  <span className="text-xl">{game.teamHomeLogo || "⚽"}</span>
                  <span className="text-[11px] font-bold text-slate-200 truncate w-full">{game.teamHome}</span>
                </div>

                {/* VS */}
                <div className="text-[9px] font-black text-gray-500 bg-slate-950 px-2 py-1 rounded border border-white/5">
                  VS
                </div>

                {/* Away */}
                <div className="flex flex-col items-center gap-1 w-[40%] text-center">
                  <span className="text-xl">{game.teamAwayLogo || "⚽"}</span>
                  <span className="text-[11px] font-bold text-slate-200 truncate w-full">{game.teamAway}</span>
                </div>
              </div>
            </div>

            {/* Stadium / Venue footer */}
            <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-2 text-[10px] text-gray-500">
              <span className="flex items-center gap-1 truncate w-[75%]">
                <MapPin className="h-3 w-3 text-red-500" />
                {game.venue || "ورزشگاه استادیوم برگزیده"}
              </span>
              <span className="text-[9px] text-emerald-400 font-bold group-hover:translate-x-[-2px] transition-transform flex items-center gap-0.5">
                جزئیات Sofa ★
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import React from "react";
import { PlayerItem } from "../types";
import { Award, Zap, Flame, User } from "lucide-react";

interface PlayerCardProps {
  player: PlayerItem;
  onClick: (id: string) => void;
}

export default function PlayerCard({ player, onClick }: PlayerCardProps) {
  return (
    <div
      onClick={() => onClick(player.id)}
      className="group relative rounded-xl border border-white/5 bg-[#18181c]/45 p-4 hover:border-cyan-500/30 hover:bg-[#18181c] cursor-pointer transition shadow-md flex flex-col justify-between"
      dir="rtl"
    >
      {/* Absolute standard kit number */}
      <span className="absolute top-4 left-4 font-mono font-black text-2xl text-white/5 group-hover:text-cyan-500/10 transition">
        #{player.number}
      </span>

      <div>
        {/* Core Roster Header */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="h-11 w-11 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 transition-all">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-100 group-hover:text-cyan-400 transition">
              {player.name}
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">{player.teamName} • پست: {player.position}</p>
          </div>
        </div>

        {/* Dynamic Season Leaderboard Stats */}
        <div className="grid grid-cols-3 gap-2 bg-[#121215]/50 rounded-lg p-2.5 text-center">
          <div>
            <span className="block text-[9px] text-slate-500 font-semibold">بازی‌ها</span>
            <span className="text-xs font-mono font-bold text-slate-300">{player.seasonStats.matches}</span>
          </div>
          <div>
            <span className="block text-[9px] text-slate-500 font-semibold">
              {player.position.includes("دروازه") ? "کلین‌شیت" : "گل زده"}
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {player.position.includes("دروازه") 
                ? (player.seasonStats.cleanSheets || 0) 
                : player.seasonStats.goals}
            </span>
          </div>
          <div>
            <span className="block text-[9px] text-slate-500 font-semibold">پاس گل</span>
            <span className="text-xs font-mono font-bold text-cyan-400">{player.seasonStats.assists}</span>
          </div>
        </div>
      </div>

      {/* Brief Footer Card Info */}
      <div className="mt-3.5 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
        <span className="flex items-center gap-1.5 font-bold">
          <span>سن: {player.age} سال</span>
        </span>
        <span className="text-cyan-400 font-medium">مشاهده کارنامه بازی</span>
      </div>
    </div>
  );
}

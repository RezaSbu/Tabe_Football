import React, { useState } from "react";
import { StatsData } from "../types";
import { BarChart3, Goal, Shuffle, ShieldCheck } from "lucide-react";
import { isPlayerInDb } from "../utils";

interface StatisticsWidgetProps {
  stats: StatsData;
  onSelectPlayerName?: (name: string) => void;
}

export default function StatisticsWidget({ stats, onSelectPlayerName }: StatisticsWidgetProps) {
  const [tab, setTab] = useState<"scorers" | "assists" | "cleansheets">("scorers");

  const scorers = stats?.scorers || [];
  const assists = stats?.assists || [];
  const cleansheets = stats?.cleansheets || [];

  return (
    <div className="w-full bg-[#18181c]/50 border border-white/5 rounded-2xl p-4 text-white" dir="rtl">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 pb-2.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-emerald-500" />
          <h3 className="font-extrabold text-sm text-slate-100">آمار بازیکنان و برترین‌ها</h3>
        </div>

        {/* Tab layout selector */}
        <div className="flex bg-[#121215] p-1 rounded-xl border border-white/5 text-[10px]">
          <button
            onClick={() => setTab("scorers")}
            className={`px-3 py-1 cursor-pointer font-extrabold rounded-lg transition ${
              tab === "scorers" ? "bg-emerald-500 text-black" : "text-slate-400 hover:text-white"
            }`}
          >
            آقای گل
          </button>
          <button
            onClick={() => setTab("assists")}
            className={`px-3 py-1 cursor-pointer font-extrabold rounded-lg transition ${
              tab === "assists" ? "bg-emerald-500 text-black" : "text-slate-400 hover:text-white"
            }`}
          >
            پاس گل
          </button>
          <button
            onClick={() => setTab("cleansheets")}
            className={`px-3 py-1 cursor-pointer font-extrabold rounded-lg transition ${
              tab === "cleansheets" ? "bg-emerald-500 text-black" : "text-slate-400 hover:text-white"
            }`}
          >
            کلین‌شیت
          </button>
        </div>
      </div>

      {/* Render list items depends on active tab selector */}
      <div className="space-y-2">
        {tab === "scorers" && scorers.map((p, idx) => {
          const exists = isPlayerInDb(p.name);
          return (
            <div
              key={idx}
              onClick={() => {
                if (exists) {
                  onSelectPlayerName?.(p.name);
                }
              }}
              className={`p-2.5 bg-black/35 rounded-xl border border-white/5 flex items-center justify-between transition ${
                exists 
                  ? "hover:border-emerald-500/25 cursor-pointer" 
                  : "cursor-default opacity-85"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-bold text-slate-500 bg-[#121215] h-5 w-5 flex items-center justify-center rounded">
                  {p.rank}
                </span>
                <div>
                  <strong className={`text-xs text-slate-200 block ${exists ? "hover:text-emerald-400 hover:underline" : ""}`}>{p.name}</strong>
                  <span className="text-[10px] text-slate-500 font-semibold">{p.team}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 font-mono" dir="ltr">
                <span className="text-xs font-black text-emerald-400">{p.goals}⚽</span>
                {p.penalties > 0 && <span className="text-[9px] text-slate-500">({p.penalties} پنالتی)</span>}
              </div>
            </div>
          );
        })}

        {tab === "assists" && assists.map((p, idx) => {
          const exists = isPlayerInDb(p.name);
          return (
            <div
              key={idx}
              onClick={() => {
                if (exists) {
                  onSelectPlayerName?.(p.name);
                }
              }}
              className={`p-2.5 bg-black/35 rounded-xl border border-white/5 flex items-center justify-between transition ${
                exists 
                  ? "hover:border-emerald-500/25 cursor-pointer" 
                  : "cursor-default opacity-85"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-bold text-slate-500 bg-[#121215] h-5 w-5 flex items-center justify-center rounded">
                  {p.rank}
                </span>
                <div>
                  <strong className={`text-xs text-slate-200 block ${exists ? "hover:text-emerald-400 hover:underline" : ""}`}>{p.name}</strong>
                  <span className="text-[10px] text-slate-500 font-semibold">{p.team}</span>
                </div>
              </div>
              <div className="text-xs font-mono font-black text-cyan-400" dir="ltr">
                {p.assists} پاس گل🎯
              </div>
            </div>
          );
        })}

        {tab === "cleansheets" && cleansheets.map((p, idx) => {
          const exists = isPlayerInDb(p.name);
          return (
            <div
              key={idx}
              onClick={() => {
                if (exists) {
                   onSelectPlayerName?.(p.name);
                }
              }}
              className={`p-2.5 bg-black/35 rounded-xl border border-white/5 flex items-center justify-between transition ${
                exists 
                  ? "hover:border-emerald-500/25 cursor-pointer" 
                  : "cursor-default opacity-85"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-bold text-slate-500 bg-[#121215] h-5 w-5 flex items-center justify-center rounded">
                  {p.rank}
                </span>
                <div>
                  <strong className={`text-xs text-slate-200 block ${exists ? "hover:text-emerald-400 hover:underline" : ""}`}>{p.name}</strong>
                  <span className="text-[10px] text-slate-500 font-semibold">{p.team}</span>
                </div>
              </div>
              <div className="text-xs font-mono font-black text-amber-500" dir="ltr">
                {p.cleanSheets} کلین‌شیت🧤
              </div>
            </div>
          );
        })}

        {((tab === "scorers" && scorers.length === 0) ||
          (tab === "assists" && assists.length === 0) ||
          (tab === "cleansheets" && cleansheets.length === 0)) && (
          <div className="p-8 text-center text-xs text-slate-500">آماری یافت نشد.</div>
        )}
      </div>
    </div>
  );
}

import React from "react";
import { StandingRow } from "../types";
import { Award, Eye, ShieldCheck } from "lucide-react";
import { isTeamInDb } from "../utils";

interface LeagueTableWidgetProps {
  standings: StandingRow[];
  highlightedTeam?: string;
  onSelectTeam?: (name: string) => void;
}

export default function LeagueTableWidget({
  standings = [],
  highlightedTeam = "",
  onSelectTeam
}: LeagueTableWidgetProps) {
  return (
    <div className="w-full bg-[#18181c]/50 border border-white/5 rounded-2xl p-4 text-white" dir="rtl">
      <div className="flex items-center gap-2 mb-3.5 border-b border-white/[0.04] pb-2.5">
        <Award className="h-4 w-4 text-emerald-450 text-emerald-500" />
        <h3 className="font-extrabold text-sm text-slate-100">جدول رده‌بندی رقابت‌ها</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="text-slate-450 text-[10px] text-slate-400 border-b border-white/5">
              <th className="py-2.5 text-center font-bold">رتبه</th>
              <th className="py-2.5 font-bold">تیم</th>
              <th className="py-2.5 text-center font-mono font-bold">بازی</th>
              <th className="py-2.5 text-center font-mono font-bold">برد</th>
              <th className="py-2.5 text-center font-mono font-bold">تفاضل</th>
              <th className="py-2.5 text-center font-mono font-bold">امتیاز</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => {
              const isMatchSelected = highlightedTeam && row.team.includes(highlightedTeam);
              const exists = isTeamInDb(row.team);
              return (
                <tr
                  key={row.rank}
                  onClick={() => {
                    if (exists && onSelectTeam) {
                      onSelectTeam(row.team);
                    }
                  }}
                  className={`border-b border-white/[0.02] hover:bg-white/[0.01] transition-all ${
                    exists ? "cursor-pointer" : "cursor-default opacity-85"
                  } ${
                    isMatchSelected 
                      ? "bg-emerald-950/40 text-emerald-405 border-emerald-900/30 text-emerald-400 font-extrabold" 
                      : ""
                  }`}
                >
                  <td className="py-3 text-center">
                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-mono font-bold ${
                      row.rank === 1 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                        : "bg-black/35 text-slate-400"
                    }`}>
                      {row.rank}
                    </span>
                  </td>
                  <td className="py-3 font-bold pr-1">
                    <span className="hover:text-emerald-455 transition">
                      {row.team}
                    </span>
                  </td>
                  <td className="py-3 text-center font-mono font-bold text-slate-400">{row.played}</td>
                  <td className="py-3 text-center font-mono text-slate-500">{row.won}</td>
                  <td className={`py-3 text-center font-mono font-bold ${row.goalDifference > 0 ? "text-emerald-500" : row.goalDifference < 0 ? "text-red-500" : "text-slate-400"}`}>
                    {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                  </td>
                  <td className="py-3 text-center font-mono font-black text-white">{row.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

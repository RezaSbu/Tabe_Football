import React, { useState } from "react";
import { Flame, Zap, Award, ArrowLeft } from "lucide-react";
import { StatsData } from "../types";

interface TopStatsWidgetProps {
  stats: Record<string, StatsData>;
  onShowAll: (leagueId: string) => void;
}

const LEAGUES = [
  { id: "pro-league", label: "لیگ برتر" },
  { id: "league-1", label: "لیگ یک" },
  { id: "league-2", label: "لیگ دو" },
  { id: "futsal", label: "فوتسال" },
  { id: "hazfi-cup", label: "جام حذفی" },
];

const TOP_N = 5;

interface MiniColumnProps {
  title: string;
  icon: React.ReactNode;
  valueColor: string;
  items: any[];
  valueRenderer: (p: any) => string;
  onShowAll: () => void;
}

function MiniColumn({
  title,
  icon,
  valueColor,
  items,
  valueRenderer,
  onShowAll,
}: MiniColumnProps) {
  return (
    <div className="rounded-2xl bg-gray-900 p-3.5 border border-white/5 shadow space-y-2.5">
      <div className="flex items-center gap-1.5 border-b border-white/5 pb-2">
        {icon}
        <h3 className="font-black text-xs text-white">{title}</h3>
      </div>
      <div className="space-y-2 font-bold">
        {items.length === 0 ? (
          <p className="text-center text-gray-500 py-3 text-[11px]">
            اطلاعاتی ثبت نشده
          </p>
        ) : (
          items.slice(0, TOP_N).map((p: any, idx: number) => (
            <div
              key={`${p.name}-${idx}`}
              className="flex justify-between items-center text-[11px] text-gray-300 border-b border-white/5 pb-1.5 last:border-0 last:pb-0"
            >
              <span className="font-bold flex items-center gap-1.5 truncate">
                <span className="text-gray-550 font-mono text-[9px]">
                  {p.rank || idx + 1}.
                </span>
                <span className="truncate max-w-[100px]">{p.name}</span>
                <span className="text-[9px] text-gray-500 truncate max-w-[60px]">
                  ({p.team})
                </span>
              </span>
              <span className={`font-mono font-black ${valueColor} bg-gray-950 border border-white/5 px-1.5 py-0.5 rounded text-[10px] shrink-0`}>
                {valueRenderer(p)}
              </span>
            </div>
          ))
        )}
      </div>

      {items.length > 0 && (
        <button
          onClick={onShowAll}
          className="w-full py-1.5 rounded-lg bg-[#0a0a0c] hover:bg-gray-950 border border-white/5 text-[10px] font-bold text-red-400 hover:text-white transition active:scale-98 cursor-pointer flex items-center justify-center gap-1"
        >
          <span>نمایش همه</span>
          <ArrowLeft className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export default function TopStatsWidget({ stats, onShowAll }: TopStatsWidgetProps) {
  const [league, setLeague] = useState("pro-league");
  const data = stats[league];
  const hasData =
    data &&
    ((data.scorers && data.scorers.length > 0) ||
      (data.assists && data.assists.length > 0) ||
      (data.cleansheets && data.cleansheets.length > 0));

  return (
    <section
      className="space-y-4 bg-[#121215] p-4 rounded-2xl border border-white/5"
      dir="rtl"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-red-500" />
          <h2 className="font-black text-lg text-white">
            آمار و ارقام برتر بازیکنان
          </h2>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {LEAGUES.map((l) => (
            <button
              key={l.id}
              onClick={() => setLeague(l.id)}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition cursor-pointer ${
                league === l.id
                  ? "bg-red-655 text-white shadow"
                  : "bg-gray-950 text-gray-300 hover:text-white border border-white/5"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <p className="text-center text-gray-500 py-8 text-xs font-bold bg-gray-900/30 rounded-2xl border border-white/5">
          آماری برای این لیگ ثبت نگردیده است.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <MiniColumn
            title="گلزنان برتر (آقای گل)"
            icon={<Flame className="h-4 w-4 text-red-500 animate-pulse" />}
            valueColor="text-red-500"
            items={data.scorers || []}
            valueRenderer={(p: any) =>
              `${p.goals} گل${p.penalties > 0 ? ` (${p.penalties})` : ""}`
            }
            onShowAll={() => onShowAll(league)}
          />

          <MiniColumn
            title="مهندسان پاسِ گل"
            icon={<Zap className="h-4 w-4 text-sky-400" />}
            valueColor="text-sky-400"
            items={data.assists || []}
            valueRenderer={(p: any) => `${p.assists} پاس`}
            onShowAll={() => onShowAll(league)}
          />

          <MiniColumn
            title="دستکش طلایی (کلین‌شیت دروازه‌بان)"
            icon={<Award className="h-4 w-4 text-amber-500" />}
            valueColor="text-amber-550"
            items={data.cleansheets || []}
            valueRenderer={(p: any) => `${p.cleanSheets} کلین‌شیت`}
            onShowAll={() => onShowAll(league)}
          />
        </div>
      )}
    </section>
  );
}

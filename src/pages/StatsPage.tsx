import React, { useState } from "react";
import { Flame, Zap, Award, ChevronDown, ChevronUp } from "lucide-react";
import { StatsData } from "../types";
import { normalizePersianString } from "../utils";

interface StatsPageProps {
  stats: Record<string, StatsData>;
  archives: any[];
  statsSeason: string;
  setStatsSeason: (s: string) => void;
  selectedLeagueFilterOnStats: string;
  setSelectedLeagueFilterOnStats: (s: string) => void;
  currentSeason: string;
  toPersianDigits: (s: string) => string;
  onSelectPlayer?: (id: string) => void;
  onSelectTeam?: (id: string) => void;
  players?: any[];
}

const VISIBLE_DEFAULT = 10;

interface StatColumnProps {
  title: string;
  icon: React.ReactNode;
  valueColor: string;
  items: any[];
  valueRenderer: (p: any) => string;
  expanded: boolean;
  onToggle: () => void;
  onSelectPlayer?: (id: string) => void;
  onSelectTeam?: (id: string) => void;
  players?: any[];
}

function StatColumn({
  title,
  icon,
  valueColor,
  items,
  valueRenderer,
  expanded,
  onToggle,
  onSelectPlayer,
  onSelectTeam,
  players,
}: StatColumnProps) {
  const shown = expanded ? items : items.slice(0, VISIBLE_DEFAULT);

  const resolveId = (item: any): string => {
    if (item.playerId) return item.playerId;
    if (!players || !item.name) return "";
    const nName = normalizePersianString(item.name);
    const found = players.find((p: any) => normalizePersianString(p.name || "") === nName);
    return found ? String(found.id) : "";
  };
  return (
    <div className="rounded-2xl bg-gray-900 p-4 border border-white/5 shadow space-y-3">
      <div className="flex items-center gap-1.5 border-b border-white/5 pb-2.5">
        {icon}
        <h3 className="font-black text-sm text-white">{title}</h3>
      </div>
      <div className="space-y-2.5 font-bold">
        {items.length === 0 ? (
          <p className="text-center text-gray-500 py-4 text-xs">
            اطلاعاتی ثبت نشده
          </p>
        ) : (
          shown.map((p: any, idx: number) => (
            <div
              key={`${p.name}-${idx}`}
              className="flex justify-between items-center text-xs text-gray-300 border-b border-white/5 pb-2 last:border-0 last:pb-0"
            >
              <span className="font-bold flex items-center gap-1.5">
                <span className="text-gray-550 font-mono text-[10px]">
                  {p.rank || idx + 1}.
                </span>
                {(() => {
                  const resolvedId = resolveId(p);
                  return resolvedId && onSelectPlayer ? (
                    <button
                      onClick={() => onSelectPlayer(resolvedId)}
                      className="hover:text-emerald-400 transition cursor-pointer truncate"
                    >
                      {p.name}
                    </button>
                  ) : (
                    <span className="truncate">{p.name}</span>
                  );
                })()}
                <span className="text-[10px] text-gray-500">
                  ({p.team})
                </span>
              </span>
              <span className={`font-mono font-black ${valueColor} bg-gray-950 border border-white/5 px-2.5 py-0.5 rounded text-[11px] shrink-0`}>
                {valueRenderer(p)}
              </span>
            </div>
          ))
        )}
      </div>

      {items.length > VISIBLE_DEFAULT && (
        <button
          onClick={onToggle}
          className="w-full mt-1 py-2 rounded-xl bg-[#0a0a0c] hover:bg-gray-950 border border-white/5 text-[11px] font-bold text-emerald-400 hover:text-white transition active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span>
            {expanded
              ? "کوچک کردن لیست"
              : `نمایش بیشتر (${items.length} نفر)`}
          </span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  );
}

export default function StatsPage({
  stats,
  archives,
  statsSeason,
  setStatsSeason,
  selectedLeagueFilterOnStats,
  setSelectedLeagueFilterOnStats,
  currentSeason,
  toPersianDigits,
  onSelectPlayer,
  onSelectTeam,
  players,
}: StatsPageProps) {
  const availableSeasons = (archives || [])
    .filter((a: any) => a.type === "stats")
    .map((a: any) => a.season_tag);
  const uniqueSeasons = (Array.from(new Set(availableSeasons)) as string[]).sort(
    (a, b) => b.localeCompare(a)
  );

  const getActiveStatsData = () => {
    if (statsSeason === currentSeason) {
      return stats[selectedLeagueFilterOnStats];
    }
    const statsArchive = archives?.find(
      (a: any) => a.type === "stats" && a.season_tag === statsSeason
    );
    if (
      statsArchive &&
      statsArchive.data &&
      statsArchive.data[selectedLeagueFilterOnStats]
    ) {
      return statsArchive.data[selectedLeagueFilterOnStats];
    }
    return null;
  };

  const activeStatsData = getActiveStatsData();

  const [expandedCols, setExpandedCols] = useState<Record<string, boolean>>({});
  const toggleCol = (key: string) =>
    setExpandedCols((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div
      className="space-y-6 animate-in fade-in"
      dir="rtl"
      id="stats-dashboard"
    >
      <div className="rounded-2xl bg-gradient-to-l from-red-950/20 via-gray-900 to-gray-900 p-5 border border-white/5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-2xl text-white">
            📊 آمار و ارقام برتر فوتبال ایران
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            جدول دقیق گلزنان، پاس گل و دروازه‌بانان کشور
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950/50 border border-white/5 rounded-xl px-3 py-1.5 w-fit text-xs text-slate-300">
          <span className="text-gray-400 font-bold">فصل رقابت‌ها:</span>
          <select
            value={statsSeason}
            onChange={(e) => setStatsSeason(e.target.value)}
            className="bg-transparent focus:outline-none text-white font-extrabold cursor-pointer pr-1"
          >
            <option value={currentSeason} className="bg-slate-900 text-white">
              فصل جاری ({toPersianDigits(currentSeason)})
            </option>
            {uniqueSeasons.map((season) => (
              <option
                key={season}
                value={season}
                className="bg-slate-900 text-white"
              >
                فصل {toPersianDigits(season)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-1.5 border-b border-white/5 pb-2 overflow-x-auto select-none no-scrollbar">
        {[
          { id: "pro-league", label: "لیگ برتر خلیج فارس" },
          { id: "league-1", label: "لیگ آزادگان (دسته یک)" },
          { id: "league-2", label: "لیگ دسته دوم" },
          { id: "hazfi-cup", label: "جام حذفی" },
          { id: "futsal", label: "لیگ برتر فوتسال" },
        ].map((subTab) => (
          <button
            key={subTab.id}
            onClick={() => setSelectedLeagueFilterOnStats(subTab.id)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              selectedLeagueFilterOnStats === subTab.id
                ? "bg-red-600 text-white shadow"
                : "text-gray-400 hover:text-white hover:bg-gray-900/40"
            }`}
          >
            {subTab.label}
          </button>
        ))}
      </div>

      {!activeStatsData ? (
        <p className="text-center text-gray-400 py-12 text-xs font-bold bg-gray-900/30 rounded-2xl border border-white/5">
          آماری برای این فصل یا لیگ ثبت نگردیده است.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StatColumn
            title="گلزنان برتر (آقای گل)"
            icon={<Flame className="h-5 w-5 text-red-500 animate-pulse" />}
            valueColor="text-red-500"
            items={activeStatsData.scorers || []}
            valueRenderer={(p: any) =>
              `${p.goals} گل${p.penalties > 0 ? ` (${p.penalties} پنالتی)` : ""}`
            }
            expanded={!!expandedCols.scorers}
            onToggle={() => toggleCol("scorers")}
            onSelectPlayer={onSelectPlayer}
            onSelectTeam={onSelectTeam}
            players={players}
          />

          <StatColumn
            title="مهندسان پاسِ گل"
            icon={<Zap className="h-5 w-5 text-sky-400" />}
            valueColor="text-sky-400"
            items={activeStatsData.assists || []}
            valueRenderer={(p: any) => `${p.assists} پاس`}
            expanded={!!expandedCols.assists}
            onToggle={() => toggleCol("assists")}
            onSelectPlayer={onSelectPlayer}
            onSelectTeam={onSelectTeam}
            players={players}
          />

          <StatColumn
            title="دستکش طلایی (کلین‌شیت دروازه‌بان)"
            icon={<Award className="h-5 w-5 text-amber-500" />}
            valueColor="text-amber-550"
            items={activeStatsData.cleansheets || []}
            valueRenderer={(p: any) => `${p.cleanSheets} کلین‌شیت`}
            expanded={!!expandedCols.cleansheets}
            onToggle={() => toggleCol("cleansheets")}
            onSelectPlayer={onSelectPlayer}
            onSelectTeam={onSelectTeam}
            players={players}
          />
        </div>
      )}
    </div>
  );
}

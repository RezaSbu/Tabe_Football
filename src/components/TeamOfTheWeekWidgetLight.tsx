import React, { useState } from "react";
import { SelectedCombination, SelectedCombinationPlayer } from "../types";
import { toPersianDigits, getSafeImageUrl } from "../utils";
import { Award, Calendar, Layers, Star, Shield, HelpCircle, Trophy } from "lucide-react";

interface TeamOfTheWeekWidgetLightProps {
  combinations: SelectedCombination[];
  allPlayers?: any[];
  onSelectPlayer?: (playerId: string) => void;
}

export default function TeamOfTheWeekWidgetLight({ combinations = [], allPlayers = [], onSelectPlayer }: TeamOfTheWeekWidgetLightProps) {
  const [selectedLeague, setSelectedLeague] = useState<string>("pro-league");

  const leagueCombinations = combinations.filter(
    c => c.leagueKey === selectedLeague && c.players && Object.keys(c.players).length > 0
  );

  const activeWeeks = Array.from(new Set(leagueCombinations.map(c => c.week))).sort((a, b) => a - b);

  const defaultWeek = activeWeeks[activeWeeks.length - 1] || 1;
  const [selectedWeek, setSelectedWeek] = useState<number>(defaultWeek);

  const currentWeek = activeWeeks.includes(selectedWeek)
    ? selectedWeek
    : (activeWeeks[activeWeeks.length - 1] || 1);

  const activeCombination = combinations.find(
    c => c.leagueKey === selectedLeague && c.week === currentWeek
  ) || leagueCombinations[0];

  const leagues = [
    { key: "pro-league", label: "لیگ برتر فوتبال" },
    { key: "league-1", label: "لیگ آزادگان (یک)" },
    { key: "league-2", label: "لیگ دسته دو" }
  ];

  const positionConfig: Record<string, { x: string; y: string; title: string; shortCode: string }> = {
    gk: { x: "50%", y: "89%", title: "دروازه‌بان", shortCode: "GK" },
    cb1: { x: "22%", y: "73%", title: "مدافع چپ", shortCode: "LCB" },
    cb2: { x: "50%", y: "65%", title: "مدافع وسط", shortCode: "CB" },
    cb3: { x: "78%", y: "73%", title: "مدافع راست", shortCode: "RCB" },
    lm: { x: "11%", y: "43%", title: "هافبک چپ", shortCode: "LM" },
    cm1: { x: "33%", y: "49%", title: "هافبک چپ‌وسط", shortCode: "LCM" },
    cm2: { x: "50%", y: "33%", title: "هافبک بازیساز", shortCode: "CAM" },
    cm3: { x: "67%", y: "49%", title: "هافبک راست‌وسط", shortCode: "RCM" },
    rm: { x: "89%", y: "43%", title: "هافبک راست", shortCode: "RM" },
    st1: { x: "32%", y: "14%", title: "مهاجم چپ", shortCode: "LS" },
    st2: { x: "68%", y: "14%", title: "مهاجم راست", shortCode: "RS" }
  };

  const positionBadge: Record<string, string> = {
    gk: "bg-emerald-500",
    cb1: "bg-sky-500",
    cb2: "bg-sky-500",
    cb3: "bg-sky-500",
    lm: "bg-amber-500",
    cm1: "bg-amber-500",
    cm2: "bg-amber-500",
    cm3: "bg-amber-500",
    rm: "bg-amber-500",
    st1: "bg-rose-500",
    st2: "bg-rose-500"
  };

  const rawActivePlayers = activeCombination?.players || {};

  const activePlayers = React.useMemo(() => {
    if (!rawActivePlayers) return {};
    const resolved: Record<string, any> = {};
    Object.entries(rawActivePlayers).forEach(([posKey, player]) => {
      if (!player) {
        resolved[posKey] = null;
        return;
      }
      const livePlayer = allPlayers?.find(p => p.id?.toString() === player.id?.toString());
      if (livePlayer) {
        resolved[posKey] = {
          ...player,
          name: livePlayer.name || player.name,
          image: livePlayer.image || player.image,
          teamName: livePlayer.teamName || player.teamName,
          rating: Number(livePlayer.rating) || Number(player.rating) || 7.0,
        };
      } else {
        resolved[posKey] = {
          ...player,
          rating: Number(player.rating) || 7.0,
        };
      }
    });
    return resolved;
  }, [rawActivePlayers, allPlayers]);

  return (
    <div
      dir="rtl"
      id="team-of-the-week-section"
      className="team-of-week-light relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_12px_32px_-12px_rgba(15,23,42,0.16)] select-none"
    >
      {/* Top accent bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-l from-emerald-600 via-emerald-400 to-emerald-700" />
      {/* Soft decorative glows */}
      <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 bg-emerald-200/40 rounded-full blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 w-72 h-72 bg-amber-200/40 rounded-full blur-[110px]" />

      {/* TITLE ROW */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 pb-5 border-b border-slate-100 relative z-10">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-600/25 shrink-0">
              <Award className="h-6 w-6 stroke-[2px]" />
            </div>
            <div>
              <h2 className="font-black text-xl text-slate-900 flex items-center gap-2">
                <span>ترکیب منتخب هفته</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-1">تیم منتخب برترین و تأثیرگذارترین بازیکنان هفته باشگاهی</p>
            </div>
          </div>
        </div>

        {/* League Selection Pills */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-stretch md:self-auto shadow-inner overflow-x-auto scrollbar-none">
          {leagues.map(l => (
            <button
              key={l.key}
              onClick={() => {
                setSelectedLeague(l.key);
                const leagueCombs = combinations.filter(c => c.leagueKey === l.key && c.players && Object.keys(c.players).length > 0);
                const leagueWeeks = Array.from(new Set(leagueCombs.map(c => c.week))).sort((a, b) => a - b);
                const latestWeek = leagueWeeks[leagueWeeks.length - 1] || 1;
                setSelectedWeek(latestWeek);
              }}
              className={`flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                selectedLeague === l.key
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-black shadow-md shadow-emerald-600/20"
                  : "text-slate-500 hover:text-slate-900 hover:bg-white"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* WIDE HORIZONTAL WEEK SLIDER CONTAINER */}
      <div className="py-5 border-b border-slate-100 relative z-10">
        <div className="flex items-center justify-between mb-2.5 text-xs font-bold text-slate-500">
          <span className="flex items-center gap-1.5 text-emerald-700">
            <Calendar className="h-4 w-4" />
            <span>انتخاب هفته رقابت‌های فوتبال</span>
          </span>
          <span className="text-[10px] text-slate-400 hidden sm:inline">جهت تغییر هفته، روی دکمه مربوطه کلیک کنید</span>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
          {activeWeeks.length === 0 ? (
            <div className="text-xs text-slate-500 py-3 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 w-full text-center">
              هنوز هیچ مجوزی برای تیم منتخب هفته‌ی این لیگ صادر نشده است.
            </div>
          ) : (
            activeWeeks.map((weekNum) => {
              const isSelected = currentWeek === weekNum;
              return (
                <button
                  key={weekNum}
                  onClick={() => setSelectedWeek(weekNum)}
                  className={`shrink-0 px-5 py-3 rounded-2xl text-xs font-black transition-all flex flex-col items-center justify-center min-w-[85px] border cursor-pointer ${
                    isSelected
                      ? "bg-gradient-to-b from-emerald-600 to-emerald-700 border-emerald-700 text-white shadow-md shadow-emerald-600/25"
                      : "bg-white border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-700 shadow-sm"
                  }`}
                >
                  <span className="text-[9px] font-medium text-slate-400">هفته</span>
                  <span className="text-sm font-black mt-0.5">{toPersianDigits(weekNum)}</span>
                  <span className={`h-1.5 w-1.5 rounded-full mt-1 ${isSelected ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" : "bg-emerald-500"}`} />
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* CORE GRID: SQUAD ROSTER VS GRAPHICAL HALF PITCH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 relative z-10">

        {/* LEFT COLUMN: SELECTED PLAYERS ROSTER DATA (lg:col-span-4) - Order-last on mobile for pitch-first immersion */}
        <div className="lg:col-span-4 space-y-4 order-2 lg:order-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-2 border-b border-slate-100">
            <span className="flex items-center gap-2">
              <Layers className="h-4.5 w-4.5 text-emerald-600" />
              <span>لیست بازیکنان منتخب هفته {toPersianDigits(currentWeek)}</span>
            </span>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold">۱۱ بازیکن برگزیده</span>
          </div>

          {Object.keys(activePlayers).length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center p-6">
              <Trophy className="h-8 w-8 text-slate-300 mb-2 stroke-[1.5px]" />
              <p className="text-xs text-slate-600 font-bold">ترکیب بازی‌های این هفته هنوز توسط ادمین کامل نشده است.</p>
              <p className="text-[10px] text-slate-400 mt-1">مدیران از پنل مدیریت می‌توانند ۱۱ بازیکن ارنج این هفته را انتخاب کنند.</p>
            </div>
          ) : (
            <div className="max-h-[480px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {Object.entries(positionConfig).map(([posKey, posInfo]) => {
                const player = activePlayers[posKey];
                if (!player) return null;
                return (
                  <div
                    key={posKey}
                    onClick={() => player.id && onSelectPlayer?.(player.id)}
                    className="group flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 transition shadow-sm cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <img loading="lazy" decoding="async"
                          src={getSafeImageUrl(player.image)}
                          alt={player.name}
                          className="w-10 h-10 rounded-full border-2 border-white shadow-md object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <span className={`absolute -bottom-1 -right-1 ${positionBadge[posKey] || "bg-emerald-500"} text-white text-[8px] px-1.5 rounded font-black`}>
                          {posInfo.shortCode}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-800 group-hover:text-emerald-700 transition-colors leading-tight">{player.name}</div>
                        <div className="text-[9px] text-slate-500 font-bold flex items-center gap-1.5 mt-1">
                          <span className="text-slate-600">{player.teamName}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-emerald-700">{posInfo.title}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-1 rounded-xl border border-amber-200 flex items-center gap-1 shadow-sm">
                        <span>منتخب</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: BRIGHT HALF PITCH CANVAS (lg:col-span-8) - Order-first on mobile for immediate visual payoff */}
        <div className="lg:col-span-8 flex flex-col justify-center order-1 lg:order-2">
          <div className="relative aspect-[1.1] sm:aspect-[1.25] md:aspect-[1.3] lg:aspect-[1.35] w-full rounded-2xl overflow-hidden bg-gradient-to-b from-[#57bf7e] via-[#2f9c58] to-[#166838] border border-emerald-800/40 shadow-[0_16px_40px_-16px_rgba(6,78,59,0.55)] flex flex-col justify-end p-4 select-none pb-6">

            {/* Sun sheen + soft ground shading */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.30),_transparent_60%)] pointer-events-none" />
            <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/25 to-transparent pointer-events-none z-10" />

            {/* Alternating field striping pattern */}
            <div className="absolute inset-0 flex flex-col pointer-events-none">
              {Array.from({ length: 10 }).map((_, index) => (
                <div
                  key={index}
                  className={`flex-1 w-full ${index % 2 === 0 ? "bg-white/10" : "bg-transparent"}`}
                />
              ))}
            </div>

            {/* Stadium Pitch Markings Layout */}
            <div className="absolute inset-4 border-2 border-white/50 rounded-xl pointer-events-none" />
            <div className="absolute top-4 left-4 right-4 h-[2px] bg-white/50 pointer-events-none" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[65%] h-[35%] border-t-2 border-x-2 border-white/50 pointer-events-none shadow-inner" />
            <div className="absolute bottom-[39%] left-1/2 -translate-x-1/2 w-40 h-16 border-t-2 border-white/50 rounded-t-full pointer-events-none" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[30%] h-[13%] border-t-2 border-x-2 border-white/50 pointer-events-none" />
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-44 h-22 border-b-2 border-x-2 border-white/50 rounded-b-full pointer-events-none" />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[24%] h-5 bg-white/20 border-t-2 border-x-2 border-dashed border-white/60 rounded-t-lg pointer-events-none" />

            {/* PLAYERS FORMATION NODES */}
            {Object.keys(positionConfig).map(posKey => {
              const pos = positionConfig[posKey];
              const player: SelectedCombinationPlayer | null | undefined = activePlayers[posKey];

              return (
                <div
                  key={posKey}
                  style={{ left: pos.x, top: pos.y }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center text-center group z-20"
                >
                  {player ? (
                    <div
                      onClick={() => player.id && onSelectPlayer?.(player.id)}
                      className="cursor-pointer flex flex-col items-center relative"
                    >
                      {/* Ivory/Gold FUT Card Shield format */}
                      <div className="relative w-[50px] h-[65px] sm:w-[68px] sm:h-[88px] md:w-[74px] md:h-[96px] flex flex-col items-center justify-between p-0.5 sm:p-1 rounded-lg sm:rounded-xl bg-gradient-to-b from-[#ffe9a8] via-[#ffd56b] to-[#e09a2f] border border-amber-800/40 shadow-[0_10px_24px_-6px_rgba(5,46,22,0.45)] transition duration-300 transform group-hover:-translate-y-2 group-hover:scale-105 group-hover:shadow-[0_14px_28px_-6px_rgba(4,120,87,0.55)]">
                        <div className="absolute inset-[0.5px] sm:inset-[1px] rounded-[7px] sm:rounded-[10px] bg-gradient-to-b from-[#fffdf6] to-[#f6e7c8] overflow-hidden flex flex-col justify-between p-0.5 sm:p-1 border border-white/70">

                          {/* Inner gold glow */}
                          <div className="absolute -top-8 -left-8 w-16 h-16 bg-amber-400/40 rounded-full blur-xl pointer-events-none" />

                          {/* Upper position display */}
                          <div className="flex justify-between items-center w-full pr-0.5 pt-0.5">
                            <span className="text-[7px] sm:text-[9px] text-amber-800 font-black tracking-tight uppercase">
                              {pos.shortCode}
                            </span>
                            <Star className="h-2.5 w-2.5 text-amber-600 fill-amber-500/60 animate-pulse" />
                          </div>

                          {/* Clipped headshot frame */}
                          <div className="w-[26px] h-[26px] sm:w-[40px] sm:h-[40px] rounded-full overflow-hidden bg-white border border-amber-200 relative z-10 mx-auto mt-0.5 shadow-inner">
                            <img loading="lazy" decoding="async"
                              src={getSafeImageUrl(player.image)}
                              alt={player.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>

                          {/* Small team name at the bottom */}
                          <div className="text-center w-full mt-0.5">
                            <span className="block text-[5.5px] sm:text-[8px] text-emerald-900 font-black truncate max-w-[34px] sm:max-w-[56px] mx-auto scale-95 leading-none">
                              {player.teamName}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Display player name below the FUT card */}
                      <div className="mt-1.5 bg-white/95 backdrop-blur-md text-slate-800 border border-slate-200 py-0.5 px-1.5 sm:px-2 rounded-lg sm:rounded-xl shadow-lg min-w-[52px] sm:min-w-[70px] max-w-[75px] sm:max-w-[110px] transition group-hover:border-emerald-400">
                        <span className="block text-[7px] sm:text-[9.5px] font-black truncate leading-tight group-hover:text-emerald-700 transition-colors">
                          {player.name}
                        </span>
                      </div>
                    </div>
                  ) : (
                    // Light glass empty slot outline placeholder
                    <div className="flex flex-col items-center">
                      <div className="w-[48px] h-[62px] sm:w-[62px] sm:h-[80px] md:w-[68px] md:h-[88px] rounded-lg sm:rounded-xl border-2 border-dashed border-white/60 bg-white/15 backdrop-blur-sm flex flex-col items-center justify-center text-white transition duration-300 group-hover:border-white/90 group-hover:bg-white/25">
                        <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white/80 stroke-[1.5px] mb-0.5 group-hover:text-amber-200" />
                        <span className="text-[6px] sm:text-[7.5px] text-white/90 font-black uppercase">{pos.shortCode}</span>
                      </div>
                      <div className="mt-1 bg-white/85 text-[6px] sm:text-[7px] text-emerald-900 px-1.5 py-0.5 rounded-lg font-bold">
                        {pos.title}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

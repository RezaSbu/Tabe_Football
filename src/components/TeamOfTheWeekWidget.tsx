import React, { useState } from "react";
import { SelectedCombination, SelectedCombinationPlayer } from "../types";
import { toPersianDigits, getSafeImageUrl } from "../utils";
import { Award, Calendar, Layers, Star, Shield, HelpCircle, Trophy } from "lucide-react";

interface TeamOfTheWeekWidgetProps {
  combinations: SelectedCombination[];
  allPlayers?: any[];
  onSelectPlayer?: (playerId: string) => void;
}

export default function TeamOfTheWeekWidget({ combinations = [], allPlayers = [], onSelectPlayer }: TeamOfTheWeekWidgetProps) {
  const [selectedLeague, setSelectedLeague] = useState<string>("pro-league");
  
  // Find available week combinations with live/populated rosters for the selected league
  const leagueCombinations = combinations.filter(
    c => c.leagueKey === selectedLeague && c.players && Object.keys(c.players).length > 0
  );
  
  const activeWeeks = Array.from(new Set(leagueCombinations.map(c => c.week))).sort((a, b) => a - b);

  // Default selected week is the latest available week, or fallback to 1
  const defaultWeek = activeWeeks[activeWeeks.length - 1] || 1;
  const [selectedWeek, setSelectedWeek] = useState<number>(defaultWeek);

  // Sync / safeguard week in case selectedWeek becomes stale across league transitions
  const currentWeek = activeWeeks.includes(selectedWeek) 
    ? selectedWeek 
    : (activeWeeks[activeWeeks.length - 1] || 1);

  // Get active combination
  const activeCombination = combinations.find(
    c => c.leagueKey === selectedLeague && c.week === currentWeek
  ) || leagueCombinations[0];

  const leagues = [
    { key: "pro-league", label: "لیگ برتر فوتبال" },
    { key: "league-1", label: "لیگ آزادگان (یک)" },
    { key: "league-2", label: "لیگ دسته دو" }
  ];

  // Perfectly balanced 3-5-2 Formation Coordinates on Half-field Pitch (from GK bottom to ST top)
  // Re-designed percentages to guarantee absolute ZERO overlap across all screen dimensions!
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
    <div className="bg-gradient-to-b from-[#0c0d12] to-[#07070a] border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden select-none" dir="rtl" id="team-of-the-week-section">
      {/* Outer Atmospheric lighting overlays */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[300px] bg-amber-500/[0.03] rounded-full blur-[130px] pointer-events-none animate-pulse duration-5000" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] bg-emerald-500/[0.03] rounded-full blur-[120px] pointer-events-none animate-pulse duration-7000" />

      {/* TITLE ROW */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 pb-5 border-b border-white/5 relative z-10">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/10 shrink-0">
              <Award className="h-6 w-6 stroke-[2px]" />
            </div>
            <div>
              <h2 className="font-black text-xl text-white flex items-center gap-2">
                <span>ترکیب منتخب هفته</span>
              </h2>
              <p className="text-[11px] text-gray-400 mt-1">تیم منتخب برترین و تأثیرگذارترین بازیکنان هفته باشگاهی</p>
            </div>
          </div>
        </div>

        {/* League Selection Glass Tabs */}
        <div className="flex bg-gray-950/80 p-1.5 rounded-2xl border border-white/5 self-stretch md:self-auto shadow-inner overflow-x-auto scrollbar-none">
          {leagues.map(l => (
            <button
              key={l.key}
              onClick={() => {
                setSelectedLeague(l.key);
                const leagueCombs = combinations.filter(c => c.leagueKey === l.key && c.players && Object.keys(c.players).length > 0);
                const leagueWeeks = Array.from(new Set(leagueCombs.map(c => c.week))).sort((a,b)=>a-b);
                const latestWeek = leagueWeeks[leagueWeeks.length - 1] || 1;
                setSelectedWeek(latestWeek);
              }}
              className={`flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                selectedLeague === l.key
                  ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/15 translate-y-0"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* WIDE HORIZONTAL WEEK SLIDER CONTAINER */}
      <div className="py-5 border-b border-white/5 relative z-10">
        <div className="flex items-center justify-between mb-2.5 text-xs font-bold text-gray-400">
          <span className="flex items-center gap-1.5 text-amber-400">
            <Calendar className="h-4 w-4" />
            <span>انتخاب هفته رقابت‌های فوتبال</span>
          </span>
          <span className="text-[10px] text-gray-500 hidden sm:inline">جهت تغییر هفته، روی دکمه مربوطه کلیک کنید</span>
        </div>

        {/* Majestic wide scrollable week tape - Only showing weeks created by the admin */}
        <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {activeWeeks.length === 0 ? (
            <div className="text-xs text-gray-500 py-3 px-4 bg-gray-950/30 rounded-2xl border border-white/5 w-full text-center">
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
                      ? "bg-gradient-to-b from-amber-500/20 to-amber-500/5 border-amber-500 text-amber-300 shadow-md shadow-amber-950/30 scale-102"
                      : "bg-gray-900/60 border-white/5 text-gray-200 hover:bg-gray-850 hover:text-white hover:border-white/10"
                  }`}
                >
                  <span className="text-[9px] font-medium text-gray-400">هفته</span>
                  <span className="text-sm font-black mt-0.5">{toPersianDigits(weekNum)}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1 shadow-[0_0_8px_#f59e0b]" />
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
          <div className="flex items-center justify-between text-xs font-bold text-gray-300 pb-2 border-b border-white/5">
            <span className="flex items-center gap-2">
              <Layers className="h-4.5 w-4.5 text-amber-400" />
              <span>لیست بازیکنان منتخب هفته {toPersianDigits(currentWeek)}</span>
            </span>
            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 font-bold">۱۱ بازیکن برگزیده</span>
          </div>

          {Object.keys(activePlayers).length === 0 ? (
            <div className="text-center py-16 bg-gray-950/40 rounded-2xl border border-white/5 flex flex-col items-center justify-center p-6">
              <HelpCircle className="h-8 w-8 text-gray-600 mb-2 stroke-[1.5px]" />
              <p className="text-xs text-gray-400 font-bold">ترکیب بازی‌های این هفته هنوز توسط ادمین کامل نشده است.</p>
              <p className="text-[10px] text-gray-500 mt-1">مدیران از پنل مدیریت می‌توانند ۱۱ بازیکن ارنج این هفته را انتخاب کنند.</p>
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
                    className="group flex items-center justify-between p-3 rounded-2xl bg-gray-950/40 hover:bg-gray-950 border border-white/5 hover:border-amber-500/30 transition shadow-sm cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <img loading="lazy" decoding="async" 
                          src={getSafeImageUrl(player.image)} 
                          alt={player.name}
                          className="w-10 h-10 rounded-full border border-white/10 object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute -bottom-1 -right-1 bg-gray-950 border border-white/10 text-[8px] px-1 rounded font-black text-gray-400">
                          {posInfo.shortCode}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-black text-white group-hover:text-amber-300 transition-colors leading-tight">{player.name}</div>
                        <div className="text-[9px] text-gray-400 font-bold flex items-center gap-1.5 mt-1">
                          <span className="text-gray-300">{player.teamName}</span>
                          <span className="text-gray-600">•</span>
                          <span className="text-amber-400">{posInfo.title}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-1 rounded-xl border border-amber-500/10 flex items-center gap-1 shadow-sm">
                        <span>منتخب</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: MAGNIFICENT HALF PITCH PITCH CANVAS (lg:col-span-8) - Order-first on mobile for immediate visual payoff */}
        <div className="lg:col-span-8 flex flex-col justify-center order-1 lg:order-2">
          {/* Main Stadium container with comfortable widescreen ratios stretched responsively for portrait devices */}
          <div className="relative aspect-[1.1] sm:aspect-[1.25] md:aspect-[1.3] lg:aspect-[1.35] w-full rounded-2xl overflow-hidden bg-gradient-to-b from-[#092e13] via-[#041d0b] to-[#021307] border border-emerald-500/20 shadow-2xl flex flex-col justify-end p-4 select-none pb-6">
            
            {/* Spotlight Vignettes and Midfield Lighting glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-[#0a3a18]/25 to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(135deg,_rgba(0,0,0,0.4)_0%,_transparent_50%,_rgba(0,0,0,0.4)_100%)] pointer-events-none" />
            <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/85 to-transparent pointer-events-none z-10" />

            {/* Alternating field striping pattern */}
            <div className="absolute inset-0 flex flex-col pointer-events-none">
              {Array.from({ length: 10 }).map((_, index) => (
                <div 
                  key={index} 
                  className={`flex-1 w-full ${index % 2 === 0 ? "bg-[#115e27]/5" : "bg-[#115e27]/1"}`}
                />
              ))}
            </div>

            {/* Stadium Pitch Markings Layout */}
            {/* Outer Pitch Boundary Line */}
            <div className="absolute inset-4 border-2 border-white/10 rounded-xl pointer-events-none" />
            
            {/* Midfield Line */}
            <div className="absolute top-4 left-4 right-4 h-[2px] bg-white/10 pointer-events-none" />
            
            {/* Penalty Box (Large external box) */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[65%] h-[35%] border-t-2 border-x-2 border-white/10 pointer-events-none shadow-inner" />
            
            {/* Penalty Arc Guard Area */}
            <div className="absolute bottom-[39%] left-1/2 -translate-x-1/2 w-40 h-16 border-t-2 border-white/10 rounded-t-full pointer-events-none" />
            
            {/* Goalkeeper Small Box (6-yard area) */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[30%] h-[13%] border-t-2 border-x-2 border-white/10 pointer-events-none" />
            
            {/* Center Circle Arc at the top */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-44 h-22 border-b-2 border-x-2 border-white/10 rounded-b-full pointer-events-none" />
            
            {/* Goal Line Post Shadow Overlay */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[24%] h-5 bg-emerald-500/[0.04] border-t-2 border-x-2 border-dashed border-emerald-450/10 rounded-t-lg pointer-events-none" />

            {/* SPATE PLAYERS FORMATION NODES (Never touching or cramped, fully responsive sizes) */}
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
                      {/* FUT Card Shield format - Highly responsive size scaling */}
                      <div className="relative w-[50px] h-[65px] xs:w-[58px] xs:h-[75px] sm:w-[68px] sm:h-[88px] md:w-[74px] md:h-[96px] flex flex-col items-center justify-between p-0.5 xs:p-1 rounded-lg xs:rounded-xl bg-gradient-to-b from-amber-400 via-amber-550 to-amber-700/60 border border-amber-400/30 shadow-2xl transition duration-300 transform group-hover:-translate-y-2 group-hover:scale-108 group-hover:brightness-105 group-hover:shadow-[0_8px_24px_rgba(245,158,11,0.3)]">
                        {/* Golden FUT Card internal styling */}
                        <div className="absolute inset-[0.5px] xs:inset-[1px] rounded-[7px] xs:rounded-[10px] bg-[#101014] bg-gradient-to-b from-[#1c1c24] to-[#0c0c0e] overflow-hidden flex flex-col justify-between p-0.5 xs:p-1">
                          
                          {/* Inner gold glow */}
                          <div className="absolute -top-10 -left-10 w-20 h-20 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />

                          {/* Upper position display */}
                          <div className="flex justify-between items-center w-full pr-0.5 pt-0.5">
                            <span className="text-[7px] xs:text-[9px] text-amber-400 font-black tracking-tight uppercase">
                              {pos.shortCode}
                            </span>
                            <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400/30 animate-pulse" />
                          </div>

                          {/* Clipped headshot frame */}
                          <div className="w-[26px] h-[26px] xs:w-8 xs:h-8 sm:w-[40px] sm:h-[40px] rounded-full overflow-hidden bg-slate-900 border border-white/5 relative z-10 mx-auto mt-0.5">
                            <img loading="lazy" decoding="async" 
                              src={getSafeImageUrl(player.image)} 
                              alt={player.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>

                          {/* Small team name at the bottom */}
                          <div className="text-center w-full mt-0.5">
                            <span className="block text-[5.5px] xs:text-[7.5px] sm:text-[8px] text-amber-500 font-black truncate max-w-[34px] xs:max-w-[48px] sm:max-w-[56px] mx-auto scale-95 leading-none">
                              {player.teamName}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Display player name below the FUT card */}
                      <div className="mt-1.5 bg-gray-950/90 backdrop-blur-md text-white border border-white/10 py-0.5 px-1.5 xs:px-2 rounded-lg xs:rounded-xl shadow-lg min-w-[52px] xs:min-w-[62px] sm:min-w-[70px] max-w-[75px] xs:max-w-[90px] sm:max-w-[110px] transition group-hover:border-amber-500/40 group-hover:bg-slate-900">
                        <span className="block text-[7px] xs:text-[8px] sm:text-[9.5px] font-black truncate leading-tight group-hover:text-amber-300 transition-colors">
                          {player.name}
                        </span>
                      </div>
                    </div>
                  ) : (
                    // Beautiful empty slot outline placeholder
                    <div className="flex flex-col items-center">
                      <div className="w-[48px] h-[62px] xs:w-[54px] xs:h-[70px] sm:w-[62px] sm:h-[80px] md:w-[68px] md:h-[88px] rounded-lg xs:rounded-xl border border-dashed border-white/10 bg-black/45 flex flex-col items-center justify-center text-white/15 transition duration-300 group-hover:border-amber-500/25 group-hover:bg-black/60">
                        <Shield className="h-3.5 w-3.5 xs:h-4 xs:w-4 text-white/5 stroke-[1.5px] mb-0.5 group-hover:text-amber-500/20" />
                        <span className="text-[6px] xs:text-[7px] sm:text-[7.5px] text-white/35 font-black uppercase">{pos.shortCode}</span>
                      </div>
                      <div className="mt-1 bg-black/40 text-[6px] xs:text-[7px] text-white/45 px-1.5 py-0.5 rounded-lg">
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

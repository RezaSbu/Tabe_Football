import React from "react";
import { Trophy, Calendar, Sparkles, Medal, ArrowDown, ArrowUp, Crown, Tv, Activity, Eye } from "lucide-react";
import { TeamItem, MatchItem } from "../types";
import { isTeamInDb, convertGregorianToShamsi, toPersianDigits } from "../utils";
import TeamLogo from "./TeamLogo";

const formatSeasonRange = (s?: string): string => {
  if (!s) return "۱۴۰۴";
  const en = String(s).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  const m = en.match(/\d{4}/);
  if (!m) return String(s);
  return `${toPersianDigits(m[0])}-${toPersianDigits(String(parseInt(m[0], 10) + 1))}`;
};

interface HazfiCupBracketProps {
  bracket: {
    round16: any[];
    quarterFinals: any[];
    semiFinals: any[];
    final: any;
  } | null;
  onSelectTeam?: (name: string) => void;
  onSelectMatch?: (match: MatchItem) => void;
  teams?: TeamItem[];
  matches?: MatchItem[];
  currentSeason?: string;
}

export default function HazfiCupBracket({ bracket, onSelectTeam, onSelectMatch, teams = [], matches = [], currentSeason }: HazfiCupBracketProps) {
  if (!bracket) {
    return (
      <div className="w-full text-center py-16 text-xs text-slate-400 bg-slate-950/40 border border-white/5 border-dashed rounded-3xl" id="bracket-loading">
        <Activity className="h-5 w-5 text-purple-500 animate-spin mx-auto mb-2" />
        درحال بارگذاری درخت حذفی جام معتبر کشور...
      </div>
    );
  }

  // Double resolution function: Always match against latest/fresh entries inside the database matches pool
  const getDynamicMatch = (m: any) => {
    if (!m || !m.id || m.id.includes("placeholder")) return m;
    const fresh = matches.find((dm) => String(dm.id) === String(m.id));
    if (fresh) {
      return {
        ...fresh,
        winner: m.winner || fresh.winner || ""
      };
    }
    return m;
  };

  const r16 = (bracket.round16 || []).map(getDynamicMatch);
  const qf = (bracket.quarterFinals || []).map(getDynamicMatch);
  const sf = (bracket.semiFinals || []).map(getDynamicMatch);
  const f = getDynamicMatch(bracket.final || { id: "f-1", teamHome: "", teamAway: "", scoreHome: 0, scoreAway: 0, date: "", status: "not-started", winner: "" });

  // Helper lookups for team database info (logos & IDs)
  const getTeamInfo = (name: string) => {
    if (!name || name === "نامشخص") return { logo: "⚽", id: "", exists: false };
    const found = teams.find(
      (t) => t.name?.trim().toLowerCase() === name.trim().toLowerCase() || t.id === name
    );
    if (found) {
      return { logo: found.logo || "⚽", id: found.id, exists: true };
    }
    // Static fallback guess
    return { logo: "⚽", id: "", exists: isTeamInDb(name) };
  };

  const handleTeamClick = (teamName: string) => {
    if (!teamName || teamName === "نامشخص") return;
    const info = getTeamInfo(teamName);
    if (info.exists && onSelectTeam) {
      onSelectTeam(info.id || teamName);
    }
  };

  // Divide into Upper half and Lower half
  const topR16 = r16.slice(0, 4);
  const bottomR16 = r16.slice(4, 8);

  const topQf = qf.slice(0, 2);
  const bottomQf = qf.slice(2, 4);

  const topSf = sf.slice(0, 1);
  const bottomSf = sf.slice(1, 2);

  const renderTeamRow = (teamName: string, score: number | string, isWinner: boolean, isFinished: boolean) => {
    const isPlaceholder = !teamName || teamName === "نامشخص" || teamName.startsWith("??");
    const info = getTeamInfo(teamName);

    return (
      <div
        onClick={(e) => {
          if (!isPlaceholder) {
            e.stopPropagation(); // prevent triggering match click
            handleTeamClick(teamName);
          }
        }}
        className={`flex justify-between items-center p-2 rounded-xl transition-all duration-200 ${
          !isPlaceholder && info.exists
            ? "cursor-pointer hover:bg-white/10 active:scale-95"
            : "cursor-default text-slate-500"
        } ${isWinner ? "bg-emerald-500/15 text-emerald-300 font-extrabold border-2 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.15)]" : "text-slate-300 border border-transparent"}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <TeamLogo logo={info.logo} fallback="⚽" size="xs" className="shrink-0" />
          <span className="text-[11px] font-extrabold leading-normal whitespace-normal break-words">
            {isPlaceholder ? "نامشخص (معوقه)" : teamName}
          </span>
          {isWinner && (
            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded font-black shrink-0">
              صعود 🟢
            </span>
          )}
          {!isPlaceholder && info.exists && (
            <span className="text-[8px] bg-slate-850 text-slate-400 px-1 py-0.5 rounded tracking-tighter shrink-0 hover:bg-slate-700 hover:text-white transition">
              پروفایل
            </span>
          )}
        </div>
        {isFinished && !isPlaceholder && (
          <span className="font-mono font-black text-xs px-2 text-slate-100 bg-black/40 rounded py-0.5 border border-white/[0.03] shrink-0">
            {score}
          </span>
        )}
      </div>
    );
  };

  const renderMatchCard = (m: any, isFinished: boolean, stageLabel: string, flowDirection: "down" | "up" = "down") => {
    if (!m) return null;
    const isWinnerHome = m.winner && String(m.winner).trim().toLowerCase() === String(m.teamHome).trim().toLowerCase();
    const isWinnerAway = m.winner && String(m.winner).trim().toLowerCase() === String(m.teamAway).trim().toLowerCase();
    const isReal = m.id && !m.id.includes("placeholder");
    const isLive = m.status === "live";

    return (
      <div
        key={m.id}
        onClick={() => {
          if (isReal && onSelectMatch) {
            onSelectMatch(m);
          }
        }}
        className={`bg-slate-900/60 border rounded-2xl p-3.5 space-y-3 text-xs transition-all relative group ${
          isReal 
            ? "border-white/5 hover:border-emerald-500/30 hover:bg-slate-900/90 hover:scale-[1.02] hover:shadow-xl cursor-pointer" 
            : "border-white/5 border-dashed opacity-50"
        }`}
      >
        {/* Status bar */}
        <div className="flex justify-between items-center text-[10px] text-slate-400">
          <span className="bg-slate-850 text-slate-300 px-2 py-0.5 rounded-lg font-bold border border-white/5">
            {stageLabel}
          </span>
          <div className="flex items-center gap-1.5 font-mono">
            {isLive ? (
              <span className="flex items-center gap-1 text-[9px] text-red-100 font-black px-1.5 py-0.5 bg-red-950/50 rounded-md border border-red-500/20 animate-pulse">
                <span className="h-1 w-1 bg-red-500 rounded-full animate-ping" />
                زنده {m.minutes ? `${m.minutes}'` : ""}
              </span>
            ) : (
              <span>{convertGregorianToShamsi(m.date) || m.time || "طبق برنامه"}</span>
            )}
          </div>
        </div>

        {/* Home & Away team row */}
        <div className="space-y-1.5">
          {renderTeamRow(m.teamHome, m.scoreHome, !!isWinnerHome, isFinished || m.status === "finished")}
          {renderTeamRow(m.teamAway, m.scoreAway, !!isWinnerAway, isFinished || m.status === "finished")}
        </div>

        {/* Venue Footer inside card */}
        <div className="text-[9px] text-slate-500 pt-1.5 border-t border-white/[0.03] flex justify-between items-center">
          {m.venue ? (
            <span className="truncate max-w-[120px]">🏟️ {m.venue}</span>
          ) : (
            <span>ورزشگاه نامشخص</span>
          )}
          {isReal && onSelectMatch && (
            <span className="text-[9px] text-emerald-400 font-bold opacity-0 group-hover:opacity-100 transition whitespace-nowrap flex items-center gap-1">
              <span>جزئیات بازی</span>
              <Eye className="h-2.5 w-2.5" />
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-10 select-none" dir="rtl" id="hazfi-bracket-vertical-funnel">
      {/* Symmetrical Tournament Heading */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-850/10 via-[#0d0d11] to-[#121215] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500 animate-pulse" />
            <h2 className="font-extrabold text-white text-base md:text-lg">درخت قرعه‌کشی رقابت‌های جام حذفی کشور</h2>
          </div>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            فرمت نوین <strong className="text-purple-400">فلو عمودی بالا + پایین به سمت مرکز (فینال طلایی آزادی)</strong>. با کلیک بر روی هر تیم معتبر، جزئیات پروفایل و عملکرد آن را به‌صورت آنی دنبال نمایید.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-purple-500/15 border border-purple-500/25 px-4 py-2 rounded-xl font-bold text-[11px] text-purple-300 shrink-0">
          <Medal className="h-4 w-4 text-purple-400 animate-spin" />
          <span>فرمت مستقیم حذفی تکراری | فصل جاری {formatSeasonRange(currentSeason)}</span>
        </div>
      </div>

      {/* NEW INTEGRAL LAYOUT: TOP + BOTTOM -> CENTER */}
      <div className="space-y-8 bg-[#090b11]/25 p-4 rounded-3xl border border-white/[0.03] shadow-md">
        
        {/* ========================================================== */}
        {/* A. UPPER BRACKET HALF (Downwards flow) */}
        {/* ========================================================== */}
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <span className="text-[10px] text-purple-400 font-black tracking-widest bg-purple-950/40 px-2.5 py-1 rounded-md border border-purple-800/20">
              نیمه بالایی جدول (Upper Bracket)
            </span>
            <span className="text-[9px] text-slate-500 font-bold">مراحل صعود به فینال</span>
          </div>

          {/* A1. Round of 16 (Top 4 Matches side-by-side) */}
          <div className="space-y-2">
            <div className="text-right text-[10px] text-slate-400 font-bold flex items-center gap-1 px-1">
              <span className="h-1.5 w-1.5 bg-slate-500 rounded-full" />یک‌هشتم نهایی (بالا)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {topR16.length > 0 ? (
                topR16.map((m, idx) => renderMatchCard(m, m.status === "finished", `بازی ${idx + 1}`, "down"))
              ) : (
                Array(4).fill(null).map((_, i) => (
                  <div key={i} className="p-5 border border-dashed border-white/5 bg-slate-900/10 rounded-2xl text-center text-[10px] text-slate-600">
                    بازی {i + 1}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Connective arrows: Row of 16 DOWN to Row of 8 */}
          <div className="flex justify-around items-center h-5 text-purple-500/20">
            <ArrowDown className="h-4 w-4 hover:text-purple-500 transition duration-300" />
            <ArrowDown className="h-4 w-4 hover:text-purple-500 transition duration-300" />
            <ArrowDown className="h-4 w-4 hover:text-purple-500 transition duration-300" />
            <ArrowDown className="h-4 w-4 hover:text-purple-500 transition duration-300" />
          </div>

          {/* A2. Quarter Finals (Top 2 Matches side-by-side) */}
          <div className="space-y-2 max-w-4xl mx-auto">
            <div className="text-right text-[10px] text-cyan-400 font-bold flex items-center gap-1 px-1">
              <span className="h-1.5 w-1.5 bg-cyan-400 rounded-full" />یک‌چهارم نهایی (بالا)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {topQf.length > 0 ? (
                topQf.map((m, idx) => renderMatchCard(m, m.status === "finished", `یک‌چهارم ${idx + 1}`, "down"))
              ) : (
                Array(2).fill(null).map((_, i) => (
                  <div key={i} className="p-5 border border-dashed border-white/5 bg-slate-900/10 rounded-2xl text-center text-[10px] text-slate-600">
                    یک‌چهارم {i + 1}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Connective arrows: Quarter DOWN to Semi */}
          <div className="flex justify-around items-center h-5 text-cyan-500/20">
            <ArrowDown className="h-4 w-4 hover:text-cyan-500 transition duration-300 mx-auto" />
            <ArrowDown className="h-4 w-4 hover:text-cyan-500 transition duration-300 mx-auto" />
          </div>

          {/* A3. Semi Finals (Top 1 Match Centered) */}
          <div className="space-y-2 max-w-md mx-auto">
            <div className="text-center text-[10px] text-amber-500 font-bold flex items-center justify-center gap-1">
              <span className="h-1.5 w-1.5 bg-amber-500 rounded-full" />نیمه‌نهایی (بالا)
            </div>
            <div>
              {topSf.length > 0 && topSf[0] ? (
                renderMatchCard(topSf[0], topSf[0].status === "finished", "نیمه‌نهایی ۱", "down")
              ) : (
                <div className="p-8 border border-dashed border-white/5 bg-slate-900/10 rounded-2xl text-center text-xs text-slate-600">
                  منتظر صعود فینالیست اول بالا
                </div>
              )}
            </div>
          </div>

          {/* Connective arrows: Semi DOWN to Golden Central Final */}
          <div className="flex justify-center py-2">
            <div className="flex flex-col items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3.5 py-1 rounded-full text-[10px] font-black">
              <span>گروه بالا به مرکز</span>
              <ArrowDown className="h-3 w-3 animate-bounce" />
            </div>
          </div>

        </div>

        {/* ========================================================== */}
        {/* B. CENTRAL THE PLATINUM FINAL SHOWDOWN */}
        {/* ========================================================== */}
        <div className="relative py-6 my-4 border-y border-white/[0.04]" id="central-final-section">
          {/* Spotlight glowing effect */}
          <div className="absolute inset-0 bg-yellow-500/[0.02] blur-3xl rounded-full" />

          <div className="hazfi-final-card relative max-w-xl mx-auto bg-gradient-to-b from-slate-900 via-slate-950 to-[#0e1017] border-2 border-yellow-500/40 rounded-3xl p-5 md:p-6 text-center shadow-2xl space-y-4">
            
            <div className="flex items-center justify-center gap-2">
              <Crown className="h-6 w-6 text-yellow-500 animate-spin" />
              <span className="text-xs font-black tracking-widest text-yellow-400 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/25">
                🏆 فینال بزرگ آزادی تهران 🏆
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 max-w-md mx-auto">
              {renderTeamRow(
                f.teamHome || "فینالیست اول نیمه بالا",
                f.scoreHome,
                f.winner && String(f.winner).trim().toLowerCase() === String(f.teamHome).trim().toLowerCase(),
                f.status === "finished"
              )}
              
              <div className="text-[10px] text-yellow-500/45 font-black uppercase tracking-widest py-1 flex items-center justify-center gap-2">
                <span className="h-[1px] w-12 bg-white/5" />
                رزم نهایی قهرمانی
                <span className="h-[1px] w-12 bg-white/5" />
              </div>
              
              {renderTeamRow(
                f.teamAway || "فینالیست دوم نیمه پایین",
                f.scoreAway,
                f.winner && String(f.winner).trim().toLowerCase() === String(f.teamAway).trim().toLowerCase(),
                f.status === "finished"
              )}
            </div>

            {f.winner && f.winner !== "نامشخص" && (
              <div className="p-3 bg-gradient-to-r from-emerald-900/30 to-slate-900 border border-emerald-500/30 rounded-2xl text-xs text-emerald-400 font-extrabold flex items-center justify-center gap-2 shadow animate-pulse">
                <Sparkles className="h-4 w-4 animate-bounce" />
                <span>برگ زرین افتخار؛ قهرمان جام حذفی کشور: {f.winner}</span>
              </div>
            )}

            <div className="pt-4 border-t border-white/[0.03] text-[9.5px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
              <span>تاریخ فینال: {f.date || `جام حذفی ${formatSeasonRange(currentSeason)}`}</span>
              <span className="sm:text-left text-slate-300">محل برگزاری: تهران، استلادیوم مجهز آزادی</span>
            </div>
          </div>
        </div>

        {/* ========================================================== */}
        {/* C. LOWER BRACKET HALF (Upwards flow) */}
        {/* ========================================================== */}
        <div className="space-y-6">
          
          {/* Connective arrows: Semi UP to Golden Central Final */}
          <div className="flex justify-center py-2">
            <div className="flex flex-col items-center gap-1 bg-pink-500/10 text-pink-400 border border-pink-500/20 px-3.5 py-1 rounded-full text-[10px] font-black">
              <ArrowUp className="h-3 w-3 animate-bounce" />
              <span>گروه پایین به مرکز</span>
            </div>
          </div>

          {/* C3. Semi Finals (Bottom 1 Match Centered) */}
          <div className="space-y-2 max-w-md mx-auto">
            <div className="text-center text-[10px] text-amber-500 font-bold flex items-center justify-center gap-1">
              <span className="h-1.5 w-1.5 bg-amber-500 rounded-full" />نیمه‌نهایی (پایین)
            </div>
            <div>
              {bottomSf.length > 0 && bottomSf[0] ? (
                renderMatchCard(bottomSf[0], bottomSf[0].status === "finished", "نیمه‌نهایی ۲", "up")
              ) : (
                <div className="p-8 border border-dashed border-white/5 bg-slate-900/10 rounded-2xl text-center text-xs text-slate-600">
                  منتظر صعود فینالیست دوم پایین
                </div>
              )}
            </div>
          </div>

          {/* Connective arrows: Quarter UP to Semi */}
          <div className="flex justify-around items-center h-5 text-cyan-500/20">
            <ArrowUp className="h-4 w-4 hover:text-cyan-500 transition duration-300 mx-auto" />
            <ArrowUp className="h-4 w-4 hover:text-cyan-500 transition duration-300 mx-auto" />
          </div>

          {/* C2. Quarter Finals (Bottom 2 Matches side-by-side) */}
          <div className="space-y-2 max-w-4xl mx-auto">
            <div className="text-right text-[10px] text-cyan-400 font-bold flex items-center gap-1 px-1">
              <span className="h-1.5 w-1.5 bg-cyan-400 rounded-full" />یک‌چهارم نهایی (پایین)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {bottomQf.length > 0 ? (
                bottomQf.map((m, idx) => renderMatchCard(m, m.status === "finished", `یک‌چهارم ${idx + 3}`, "up"))
              ) : (
                Array(2).fill(null).map((_, i) => (
                  <div key={i} className="p-5 border border-dashed border-white/5 bg-slate-900/10 rounded-2xl text-center text-[10px] text-slate-600">
                    یک‌چهارم {i + 3}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Connective arrows: Row of 16 UP to Row of 8 */}
          <div className="flex justify-around items-center h-5 text-purple-500/20">
            <ArrowUp className="h-4 w-4 hover:text-purple-500 transition duration-300" />
            <ArrowUp className="h-4 w-4 hover:text-purple-500 transition duration-300" />
            <ArrowUp className="h-4 w-4 hover:text-purple-500 transition duration-300" />
            <ArrowUp className="h-4 w-4 hover:text-purple-500 transition duration-300" />
          </div>

          {/* C1. Round of 16 (Bottom 4 Matches side-by-side) */}
          <div className="space-y-2">
            <div className="text-right text-[10px] text-slate-400 font-bold flex items-center gap-1 px-1">
              <span className="h-1.5 w-1.5 bg-slate-500 rounded-full" />یک‌هشتم نهایی (پایین)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {bottomR16.length > 0 ? (
                bottomR16.map((m, idx) => renderMatchCard(m, m.status === "finished", `بازی ${idx + 5}`, "up"))
              ) : (
                Array(4).fill(null).map((_, i) => (
                  <div key={i} className="p-5 border border-dashed border-white/5 bg-slate-900/10 rounded-2xl text-center text-[10px] text-slate-600">
                    بازی {i + 5}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-4">
            <span className="text-[10px] text-pink-400 font-black tracking-widest bg-pink-950/40 px-2.5 py-1 rounded-md border border-pink-800/20">
              نیمه پایینی جدول (Bottom Half)
            </span>
            <span className="text-[9px] text-slate-550">تکمیل درخت تورنمنت</span>
          </div>

        </div>

      </div>

    </div>
  );
}

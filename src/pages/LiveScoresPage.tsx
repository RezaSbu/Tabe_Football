import React from "react";
import { MatchItem } from "../types";
import TeamLogo from "../components/TeamLogo";

interface LiveGoal {
  id: string;
  scoringTeam: string;
  scorerName: string;
  minute: string;
  teamHome: string;
  scoreHome: number;
  scoreAway: number;
  teamAway: string;
}

interface LiveScoresPageProps {
  matches: MatchItem[];
  liveGoals: LiveGoal[];
  subscribedTeams: string[];
  livescoreFilter: string;
  setLivescoreFilter: React.Dispatch<React.SetStateAction<string>>;
  setSelectedMatch: React.Dispatch<React.SetStateAction<any | null>>;
  getRelativeDateLabel: (date: string) => string;
  convertGregorianToShamsi: (date: string) => string;
  toPersianDigits: (input: string | number) => string;
}

export default function LiveScoresPage({
  matches,
  liveGoals,
  subscribedTeams,
  livescoreFilter,
  setLivescoreFilter,
  setSelectedMatch,
  getRelativeDateLabel,
  convertGregorianToShamsi,
  toPersianDigits,
}: LiveScoresPageProps) {
  return (
    <div className="space-y-6 animate-in fade-in" dir="rtl">
      <div className="rounded-2xl bg-gradient-to-r from-red-950/20 via-slate-900 to-slate-900 p-5 border border-white/5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4 mb-5">
          <div>
            <h2 className="font-extrabold text-2xl text-white flex items-center gap-2">
              <span className="w-2.5 h-6 rounded bg-red-600 animate-pulse" />
              <span>نتایج زنده مسابقات فوتبال ایران</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">پوشش لحظه‌ای نتایج لیگ برتر، لیگ آزادگان، جام حذفی و لژیونرها با سیستم اعلانات رادیویی</p>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1 text-xs text-red-400 font-bold flex items-center gap-1.5 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              سیستم هوشمند رادیویی
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <button
            onClick={() => setLivescoreFilter("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              livescoreFilter === "all"
                ? "bg-red-600 text-white shadow-lg shadow-red-900/35 scale-[1.02]"
                : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            همه بازی‌های امروز
          </button>
          <button
            onClick={() => setLivescoreFilter("live")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              livescoreFilter === "live"
                ? "bg-red-600 text-white shadow-lg shadow-red-900/35 scale-[1.02]"
                : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            در حال برگزاری (زنده)
          </button>
          <button
            onClick={() => setLivescoreFilter("finished")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              livescoreFilter === "finished"
                ? "bg-red-600 text-white shadow-lg shadow-red-900/35 scale-[1.02]"
                : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            خاتمه یافته
          </button>
          <button
            onClick={() => setLivescoreFilter("not-started")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              livescoreFilter === "not-started"
                ? "bg-red-600 text-white shadow-lg shadow-red-900/35 scale-[1.02]"
                : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            پیش رو (امروز)
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {matches
            .filter((m) => {
              const d = new Date();
              const yyyy = d.getFullYear();
              const mm = String(d.getMonth() + 1).padStart(2, "0");
              const dd = String(d.getDate()).padStart(2, "0");
              const todayStr = `${yyyy}-${mm}-${dd}`;
              
              const isToday = m.date === todayStr;
              if (!isToday) return false;

              if (livescoreFilter === "all") return true;
              return m.status === livescoreFilter;
            }).length === 0 ? (
              <div className="col-span-full py-12 text-center rounded-2xl bg-slate-900/40 border border-dashed border-white/5">
                <p className="text-sm text-slate-400">هیچ مسابقه‌ای در این دسته‌بندی برای امروز یافت نشد.</p>
              </div>
            ) : (
              matches
                .filter((m) => {
                  const d = new Date();
                  const yyyy = d.getFullYear();
                  const mm = String(d.getMonth() + 1).padStart(2, "0");
                  const dd = String(d.getDate()).padStart(2, "0");
                  const todayStr = `${yyyy}-${mm}-${dd}`;
                  
                  const isToday = m.date === todayStr;
                  if (!isToday) return false;

                  if (livescoreFilter === "all") return true;
                  return m.status === livescoreFilter;
                })
                .map((m) => {
                  const isSubbedHome = subscribedTeams.includes(m.teamHome);
                  const isSubbedAway = subscribedTeams.includes(m.teamAway);
                  return (
                    <div 
                      key={m.id} 
                      onClick={() => setSelectedMatch(m)}
                      className="rounded-2xl border border-white/5 bg-gray-900/10 p-4 relative overflow-hidden flex flex-col justify-between hover:border-red-500/25 hover:scale-[1.005] cursor-pointer transition-all duration-200"
                    >
                      <div className="flex justify-between items-center text-[10px] text-gray-550 border-b border-white/5 pb-2 mb-3">
                        <span className="font-extrabold text-red-400 bg-red-950/20 px-2 py-0.5 rounded border border-red-500/15">
                          {m.league === "pro-league" ? "لیگ برتر خلیج فارس" : m.league === "league-1" ? "لیگ آزادگان" : m.league === "league-2" ? "لیگ دسته دو" : "جام حذفی"}
                        </span>
                        <span className="font-mono text-gray-400 flex items-center gap-1.5">
                          <span className="bg-white/10 text-amber-400 font-bold px-1.5 py-0.5 rounded border border-white/5">{getRelativeDateLabel(m.date)}</span>
                          <span>{convertGregorianToShamsi(m.date)} | ساعت {toPersianDigits(m.time)}</span>
                        </span>
                      </div>

                      <div className="my-2.5 flex items-center justify-between px-1">
                        <div className="flex items-center gap-2 w-5/12">
                          <span className="text-sm font-black text-white truncate">{m.teamHome}</span>
                          <TeamLogo logo={m.teamHomeLogo} fallback="🥅" size="sm" />
                          {isSubbedHome && <span className="h-2 w-2 rounded-full bg-red-500 animate-ping inline-block" title="اعلانات گل فعال است" />}
                        </div>

                        <div className="flex flex-col items-center shrink-0">
                          {m.status === "live" ? (
                            <div className="space-y-1 text-center">
                              <span className="font-mono font-black text-sm bg-red-600 text-white px-2.5 py-1 rounded animate-pulse">
                                {m.scoreHome} - {m.scoreAway}
                              </span>
                              <span className="block text-[9px] text-emerald-400 font-extrabold">
                                دقیقه زنده {m.minutes || "۹۰"}'
                              </span>
                            </div>
                          ) : m.status === "finished" ? (
                            <div className="space-y-1 text-center">
                              <span className="font-mono font-black text-sm bg-gray-950 border border-white/5 text-gray-300 px-2.5 py-1 rounded">
                                {m.scoreHome} - {m.scoreAway}
                              </span>
                              {(m as any).tag === "اعمال نشده" ? (
                                <span className="block text-[8px] text-amber-500 font-black bg-amber-950/20 px-1 py-0.5 rounded border border-amber-500/10">
                                  ⚠️ اعمال نشده
                                </span>
                              ) : (
                                <span className="block text-[9px] text-gray-500 font-bold">پایان بازی</span>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1 text-center">
                              <span className="font-mono font-bold text-xs bg-[#121215] border border-white/5 text-sky-400 px-3.5 py-1 rounded">
                                VS
                              </span>
                              <span className="block text-[9px] text-gray-400 font-semibold mt-1">برگزار نشده</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-2 w-5/12 text-left">
                          {isSubbedAway && <span className="h-2 w-2 rounded-full bg-red-500 animate-ping inline-block" title="اعلانات گل فعال است" />}
                          <TeamLogo logo={m.teamAwayLogo} fallback="🥅" size="sm" />
                          <span className="text-sm font-black text-white truncate">{m.teamAway}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-gray-400 border-t border-white/5 pt-2 mt-2.5">
                        <span className="truncate text-slate-400">ورزشگاه: {m.venue}</span>
                      </div>
                    </div>
                  );
                })
            )}
        </div>
      </div>

      <div className="p-4 rounded-xl border border-white/5 bg-[#0a0a0c]/60">
        <h4 className="font-extrabold text-xs text-white mb-3 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          <span>گزارش زنده رویدادهای گلزنی مسابقات (آرشیو زنده امروز)</span>
        </h4>
        {liveGoals.length === 0 ? (
          <p className="text-[11px] text-slate-500 text-center py-2">هنوز گلی در دیدارهای امروز به ثبت نرسیده است.</p>
        ) : (
          <div className="space-y-2">
            {liveGoals.map((lg: any) => (
              <div key={lg.id} className="flex justify-between items-center bg-[#0a0a0c]/80 border border-white/5 p-2.5 rounded-lg text-[11px]">
                <span className="text-emerald-400 font-black">⚽ گل برای {lg.scoringTeam} توسط {lg.scorerName} در دقیقه {lg.minute}</span>
                <span className="font-sans text-[10px] text-slate-400 font-bold bg-[#121215] px-2 py-0.5 rounded border border-white/5">{lg.teamHome} {lg.scoreHome} - {lg.scoreAway} {lg.teamAway}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

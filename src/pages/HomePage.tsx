import React, { useState } from "react";
import { Trophy, ChevronLeft, Newspaper, Users, Flame, Activity, Star, Zap, TrendingUp, ChevronDown } from "lucide-react";
import NewsSlider from "../components/NewsSlider";
import MatchTicker from "../components/MatchTicker";
import TeamOfTheWeekWidget from "../components/TeamOfTheWeekWidget";

interface HomePageProps {
  matches: any[];
  news: any[];
  transfers: any[];
  stats: any;
  liveGoals: any;
  setSelectedMatch: (match: any) => void;
  setActiveArticle: (article: any) => void;
  handleTabChangeSubmit: (tab: string) => void;
  getRelativeDateLabel: (d: string) => string;
  convertGregorianToShamsi: (d: string) => string;
  toPersianDigits: (n: any) => string;
  getSafeImageUrl: (url: string) => string;
  currentSeason: string;
  selectedLeagueFilterOnStats: string;
  setSelectedLeagueFilterOnStats: (v: string) => void;
  archives: any[];
  standings: Record<string, any[]>;
  players: any[];
  selectedCombinations: any[];
  setSelectedPlayerId: (id: string | null) => void;
  setSelectedTeamId: (id: string | null) => void;
  adConfig: any;
}

const getPersianCategory = (cat: string) => {
  const map: Record<string, string> = {
    "pro-league": "لیگ برتر",
    "league-1": "لیگ یک",
    "league-2": "لیگ دو",
    "hazfi-cup": "جام حذفی",
    "futsal": "فوتسال",
    "transfer": "نقل و انتقالات",
    "general": "عمومی",
    "world-football": "فوتبال جهان",
    "tactical": "تاکتیکی",
    "analysis": "تحلیلی",
  };
  return map[cat] || cat;
};

export default function HomePage({
  matches,
  news,
  transfers,
  stats,
  liveGoals,
  setSelectedMatch,
  setActiveArticle,
  handleTabChangeSubmit,
  getRelativeDateLabel,
  convertGregorianToShamsi,
  toPersianDigits,
  getSafeImageUrl,
  currentSeason,
  selectedLeagueFilterOnStats,
  setSelectedLeagueFilterOnStats,
  archives,
  standings,
  players,
  selectedCombinations,
  setSelectedPlayerId,
  setSelectedTeamId,
  adConfig,
}: HomePageProps) {
  const [newsCategoryFilter, setNewsCategoryFilter] = useState("all");
  const [visibleNewsCount, setVisibleNewsCount] = useState(6);
  const [newsSearch, setNewsSearch] = useState("");
  const [sidebarLeagueTab, setSidebarLeagueTab] = useState("pro-league");

  const filteredNewsList = news.filter((art) => {
    const matchesSearch = art.title.toLowerCase().includes(newsSearch.toLowerCase()) ||
      art.summary.toLowerCase().includes(newsSearch.toLowerCase()) ||
      art.tags.some((t: string) => t.toLowerCase().includes(newsSearch.toLowerCase()));
    const matchesCat = newsCategoryFilter === "all" || art.category === newsCategoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6" dir="rtl" id="home-dashboard-container">
      <div className="group overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-r from-red-950/15 via-slate-900/80 to-gray-950 px-5 py-3.5 relative shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4 transition hover:border-red-950/30 animate-in fade-in duration-300">
        <span className="absolute top-2 left-2 rounded bg-[#0a0a0c] px-1.5 py-0.5 text-[8px] font-black tracking-widest text-emerald-400 shadow uppercase">حمایت ویژه پورتال</span>

        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 font-bold text-base text-black shadow shadow-emerald-900/20">
            {adConfig.adPromo ? adConfig.adPromo.slice(0, 2) : "SN"}
          </div>
          <div>
            <h4 className="font-black text-sm text-emerald-400 flex items-center gap-2">
              <span>{adConfig.adTitle}</span>
              <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[8px] font-black text-emerald-455">تخفیف هواداران تب فوتبال</span>
            </h4>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {adConfig.adDesc} {adConfig.adPromo && <span>با کد اختصاصی: <strong className="text-white font-mono bg-gray-900/60 border border-white/5 px-1 py-0.5 rounded">{adConfig.adPromo}</strong></span>}
            </p>
          </div>
        </div>

        <a
          href={adConfig.adLink || "https://snapp.ir"}
          target="_blank"
          referrerPolicy="no-referrer"
          className="rounded-xl bg-emerald-500 hover:bg-emerald-450 active:scale-98 text-slate-950 font-black text-xs px-5 py-2 shrink-0 shadow-md transition cursor-pointer flex items-center gap-1"
        >
          <span>{adConfig.adBtnText || "ورود و دریافت کد طلایی"}</span>
        </a>
      </div>

      <div className="grid gap-6 lg:grid-cols-12" id="home-dashboard-layout font-sans">
        <div className="lg:col-span-8 space-y-6">
          <NewsSlider news={news} transfers={transfers} onSelectNews={setActiveArticle} />
          <MatchTicker matches={matches} onSelectMatch={setSelectedMatch} />

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#121215] p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-red-500" />
                <h2 className="font-black text-lg text-white">آخرین خبرها و سناریوهای داغ</h2>
              </div>

              <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                {[
                  { id: "all", label: "همه" },
                  { id: "pro-league", label: "لیگ برتر" },
                  { id: "league-1", label: "لیگ یک" },
                  { id: "league-2", label: "لیگ دو" },
                  { id: "hazfi-cup", label: "جام حذفی" },
                  { id: "futsal", label: "فوتسال" }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setNewsCategoryFilter(cat.id)}
                    className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${
                      newsCategoryFilter === cat.id
                        ? "bg-red-655 text-white active:scale-95"
                        : "bg-gray-950 text-gray-300 hover:text-white border border-white/5"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="جستجوی سریع بین اخبار..."
                value={newsSearch}
                onChange={(e) => setNewsSearch(e.target.value)}
                className="w-full rounded-xl bg-gray-900 px-4 py-2 text-xs text-white placeholder-gray-50 border border-white/5 focus:outline-none focus:border-red-650"
              />
            </div>

            {filteredNewsList.length === 0 ? (
              <p className="text-center py-6 text-xs text-gray-500">خبر یا گزارشی پیدا نشد.</p>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4">
                  {filteredNewsList.slice(0, visibleNewsCount).map((art) => (
                    <div
                      key={art.id}
                      onClick={() => {
                        setActiveArticle(art);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="group flex flex-col sm:flex-row gap-4 rounded-xl bg-gray-900 border border-white/5 p-3.5 hover:border-gray-800 transition cursor-pointer shadow hover:shadow-lg"
                    >
                      <div className="sm:w-48 h-32 w-full shrink-0 overflow-hidden rounded-lg bg-gray-950 border border-white/5">
                        <img loading="lazy" decoding="async"                           src={getSafeImageUrl(art.image)}
                          alt={art.title}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover transition group-hover:scale-102"
                        />
                      </div>

                      <div className="flex flex-col justify-between py-1 flex-1">
                        <div>
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold mb-1.5 flex-wrap">
                            <span className="rounded bg-gray-950 border border-white/5 px-2 py-0.5 text-red-400 font-black">
                              {getPersianCategory(art.category)}
                            </span>
                            <span>{new Date(art.createdAt).toLocaleDateString("fa-IR")}</span>
                            <span>•</span>
                            <span>{art.viewCount.toLocaleString("fa-IR")} بازدید</span>
                          </div>
                          <h3 className="font-extrabold text-sm text-white group-hover:text-red-400 transition leading-snug line-clamp-2">{art.title}</h3>
                          <p className="mt-1.5 text-xs text-gray-400 line-clamp-2 leading-relaxed">{art.summary}</p>
                        </div>

                        {art.tags && art.tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {art.tags.slice(0, 3).map((tg: string) => (
                              <span key={tg} className="rounded bg-gray-955 text-[9px] text-gray-500 border border-white/5 px-1.5 py-0.5">
                                #{tg}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {filteredNewsList.length > visibleNewsCount && (
                  <div className="pt-3 flex justify-center">
                    <button
                      onClick={() => setVisibleNewsCount((prev) => prev + 6)}
                      className="rounded-xl bg-[#121215] hover:bg-[#0a0a0c] px-6 py-3 text-xs text-slate-350 font-bold border border-white/5 hover:text-white transition active:scale-98 cursor-pointer flex items-center gap-2"
                    >
                      <span>مشاهده و بارگذاری سایر خبرها و گزارش‌ها</span>
                      <ChevronDown className="h-4 w-4 text-emerald-400" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="space-y-4 bg-[#121215] p-4.5 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-1.5">
                <Trophy className="h-5 w-5 text-red-500" />
                <h2 className="font-bold text-sm text-white">جدول زنده رقابت‌های فوتبال</h2>
              </div>
              <button onClick={() => handleTabChangeSubmit(sidebarLeagueTab)} className="text-[10px] font-bold text-red-400 hover:text-red-300">نمایش همه</button>
            </div>

            <div className="flex gap-1 bg-gray-950 p-1 rounded-lg border border-white/5">
              <button
                onClick={() => setSidebarLeagueTab("pro-league")}
                className={`flex-1 rounded py-1.5 text-[10px] font-bold transition-all ${
                  sidebarLeagueTab === "pro-league" ? "bg-red-655 text-white shadow-sm font-black" : "text-gray-400 hover:text-white"
                }`}
              >
                لیگ برتر
              </button>
              <button
                onClick={() => setSidebarLeagueTab("league-1")}
                className={`flex-1 rounded py-1.5 text-[10px] font-bold transition-all ${
                  sidebarLeagueTab === "league-1" ? "bg-red-655 text-white shadow-sm font-black" : "text-gray-400 hover:text-white"
                }`}
              >
                لیگ یک
              </button>
              <button
                onClick={() => setSidebarLeagueTab("league-2-group-a")}
                className={`flex-1 rounded py-1.5 text-[10px] font-bold transition-all ${
                  sidebarLeagueTab === "league-2-group-a" ? "bg-red-655 text-white shadow-sm font-black" : "text-gray-400 hover:text-white"
                }`}
              >
                لیگ دو
              </button>
            </div>

            {(() => {
              const rows = standings[sidebarLeagueTab] || [];
              if (rows.length === 0) {
                return (
                  <div className="py-8 text-center text-[10px] text-gray-500 bg-gray-901/40 rounded-xl border border-white/5">
                    اطلاعاتی یافت نشد. ادمین می‌تواند جدول را تکمیل کند.
                  </div>
                );
              }
              return (
                <div className="rounded-xl border border-white/5 p-2 bg-gray-900/30 animate-in face-in duration-200">
                  <table className="w-full text-right text-[11px] text-gray-300">
                    <thead className="bg-[#0a0a0c] text-gray-500 text-[9px] border-b border-white/5">
                      <tr>
                        <th className="py-1.5 px-2 text-center w-8">رتبه</th>
                        <th className="py-1.5">تیم</th>
                        <th className="py-1.5 text-center w-10 font-normal">بازی</th>
                        <th className="py-1.5 text-center w-10 font-normal">تفاضل</th>
                        <th className="py-1.5 text-center w-10 text-red-400 font-bold">امتیاز</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 6).map((row: any) => (
                        <tr key={row.team} className="border-b border-white/5 hover:bg-gray-950/20">
                          <td className="py-2 text-center font-mono font-bold text-gray-400">{row.rank}</td>
                          <td className="py-2 text-white font-black truncate max-w-[110px]">{row.team}</td>
                          <td className="py-2 text-center font-mono text-slate-400">{row.played}</td>
                          <td className="py-2 text-center font-mono">
                            <span className={row.goalDifference > 0 ? "text-emerald-400 font-bold" : row.goalDifference < 0 ? "text-red-500" : "text-gray-400"}>
                              {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                            </span>
                          </td>
                          <td className="py-2 text-center font-black text-red-500">{row.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>

          <div className="rounded-xl border border-white/5 bg-gray-950/80 p-3.5 flex justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <h4 className="text-[11px] font-black text-white">پخش مستقیم مسابقات در آنتن</h4>
                <p className="text-[9px] text-gray-500">پخش زنده کیفیت عالی لیگ آزادگان</p>
              </div>
            </div>
            <span className="rounded bg-amber-500/10 border border-amber-900/30 px-2 py-0.5 text-[8px] font-black uppercase text-amber-400">آنتن زنده</span>
          </div>

          <div className="bg-gradient-to-br from-[#121625] to-[#0d0f19] border border-blue-500/10 hover:border-blue-500/25 p-5 rounded-2xl flex flex-col justify-between aspect-square relative overflow-hidden group select-none shadow-xl transition-all duration-300">
            <div className="absolute -top-12 -left-12 h-36 w-36 rounded-full bg-blue-600/10 blur-3xl group-hover:bg-blue-600/20 transition-all duration-300" />
            <div className="absolute -bottom-12 -right-12 h-36 w-36 rounded-full bg-emerald-600/10 blur-3xl group-hover:bg-emerald-600/20 transition-all duration-300" />

            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="flex justify-between items-start">
                <span className="bg-blue-500/15 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded text-[9px] font-black tracking-wide">رعایت بازی جوانمردانه</span>
                <span className="text-[9px] text-gray-500 font-bold bg-white/5 px-2 py-0.5 rounded">اسپانسر رسمی</span>
              </div>

              <div className="my-auto text-center space-y-2">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 p-[1px] shadow-lg animate-bounce duration-1000">
                  <div className="h-full w-full rounded-full bg-[#0d0f19] flex items-center justify-center">
                    <Trophy className="h-5.5 w-5.5 text-emerald-400" />
                  </div>
                </div>
                <h3 className="font-extrabold text-white text-sm leading-relaxed">
                  کمپین بزرگ پیش‌بینی نتایج تب فوتبال
                </h3>
                <p className="text-[10px] text-gray-400 leading-relaxed font-bold">
                  برنده خوش‌شانس خودروی شاسی‌بلند و ۱ میلیارد تومان وجه نقد باشید!
                </p>
              </div>

              <button
                onClick={() => {
                  handleTabChangeSubmit("predictions");
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 py-3 rounded-xl text-center text-[11px] text-white font-black shadow-lg shadow-blue-900/20 active:scale-98 transition duration-200 cursor-pointer"
              >
                ثبت رایگان پیش‌بینی مسابقه بعدی
              </button>
            </div>
          </div>

          <div className="sticky top-24 space-y-6 select-none" id="sticky-sidebar-balance">
            <div className="space-y-3 bg-[#121215]/50 border border-white/5 p-4 rounded-2xl">
              <div className="flex items-center gap-1.5 border-b border-white/5 pb-2">
                <TrendingUp className="h-5 w-5 text-red-500" />
                <h3 className="font-bold text-sm text-white">برترین‌های گلزنی لیگ برتر</h3>
              </div>

              {stats["pro-league"]?.scorers && (
                <div className="space-y-2">
                  {stats["pro-league"].scorers.slice(0, 3).map((scorer: any, idx: number) => (
                    <div key={`${scorer.name}-${idx}`} className="flex justify-between items-center text-xs text-gray-200 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                      <div>
                        <h5 className="font-bold text-white">{scorer.name}</h5>
                        <p className="text-[10px] text-gray-550 mt-0.5">{scorer.team}</p>
                      </div>
                      <span className="font-mono font-black text-xs text-red-500 bg-gray-950 border border-white/5 px-2 py-0.5 rounded">
                        {scorer.goals} گل
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 bg-[#121215]/50 border border-white/5 p-4 rounded-2xl animate-in fade-in" dir="rtl">
              <div className="flex items-center gap-1.5 border-b border-white/5 pb-2">
                <Trophy className="h-4.5 w-4.5 text-amber-500" />
                <h3 className="font-bold text-sm text-white">تأثیرگذارترین‌های فصل (لیگ برتر)</h3>
              </div>

              {(() => {
                const proTeams = standings["pro-league"] || [];
                const proTeamNames = proTeams.map((t: any) => t.team);

                const proPlayers = players.filter((p: any) => {
                  return proTeamNames.some((tn: string) => tn === p.teamName || p.teamName?.includes(tn) || tn.includes(p.teamName)) ||
                    ["پرسپولیس", "استقلال", "سپاهان", "تراکتور", "ملوان", "ذوب آهن", "فولاد", "گل گهر", "نساجی", "چادرملو", "شمس آذر", "مس رفسنجان", "آلومینیوم", "هوادار", "خیبر"].some((tn: string) => p.teamName?.includes(tn));
                });

                const mappedPlayers = proPlayers.map((p: any) => {
                  const goals = p.leagueStats?.goals || 0;
                  const assists = p.leagueStats?.assists || 0;
                  const total = goals + assists;
                  const rating = parseFloat(p.averageRating || p.rating) || 7.0;
                  return {
                    ...p,
                    goals,
                    assists,
                    total,
                    rating
                  };
                });

                const impactful = mappedPlayers
                  .filter((p: any) => p.total > 0)
                  .sort((a: any, b: any) => b.total - a.total || b.goals - a.goals || b.rating - a.rating)
                  .slice(0, 5);

                const topByRating = mappedPlayers
                  .sort((a: any, b: any) => b.rating - a.rating)
                  .slice(0, 5);

                if (mappedPlayers.length === 0) {
                  return (
                    <div className="text-center py-6 text-gray-400 text-xs bg-white/[0.01] rounded-xl border border-dashed border-white/5 p-4">
                      <p className="font-bold mb-1 text-slate-300">پایگاه داده بازیکنان خالی است</p>
                      <p className="text-[10px] leading-relaxed">برای نمایش تأثیرگذارترین‌ها، لطفاً از پنل مدیریت بازیکنان جدیدی برای تیم‌های لیگ برتر ثبت کنید.</p>
                    </div>
                  );
                }

                if (impactful.length === 0) {
                  return (
                    <div className="space-y-2.5">
                      <span className="text-[10px] text-emerald-400 font-bold block mb-1">⭐ برترین‌های لیگ برتر بر اساس نمره (بروزرسانی زنده)</span>
                      {topByRating.map((p: any, idx: number) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedPlayerId(p.id);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="flex justify-between items-center text-xs border-b border-white/[0.03] pb-1.5 last:border-0 last:pb-0 cursor-pointer hover:bg-white/[0.02] p-1 rounded transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500 font-mono text-[10px]">{idx + 1}.</span>
                            <span className="text-slate-100 font-black hover:text-red-400 transition-colors">{p.name}</span>
                            <span className="text-[9px] text-gray-500">({p.teamName})</span>
                          </div>
                          <span className="font-mono font-black text-slate-100 text-[10px] bg-slate-900 border border-white/5 px-2 py-0.5 rounded flex items-center gap-1.5">
                            <span className="text-emerald-400">نمره {toPersianDigits(p.rating.toFixed(1))}</span>
                            <span className="text-gray-550 text-[8px]">(بدون گل و پاس‌گل)</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }

                return (
                  <div className="space-y-2.5">
                    <span className="text-[10px] text-emerald-400 font-bold block mb-1">🎯 مجموع گل و پاس‌گل (بروزرسانی زنده)</span>
                    {impactful.map((p: any, idx: number) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPlayerId(p.id);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="flex justify-between items-center text-xs border-b border-white/[0.03] pb-1.5 last:border-0 last:pb-0 cursor-pointer hover:bg-white/[0.02] p-1 rounded transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-500 font-mono text-[10px]">{idx + 1}.</span>
                          <span className="text-slate-100 font-black hover:text-red-400 transition-colors">{p.name}</span>
                          <span className="text-[9px] text-gray-500">({p.teamName})</span>
                        </div>
                        <span className="font-mono font-black text-slate-100 text-[10px] bg-slate-900 border border-white/5 px-2 py-0.5 rounded flex items-center gap-1" dir="rtl">
                          <span className="text-emerald-400">{toPersianDigits(p.goals)} گل</span>
                          <span className="text-slate-500">+</span>
                          <span className="text-emerald-400">{toPersianDigits(p.assists)} پاس گل</span>
                          <span className="text-slate-500">=</span>
                          <span className="text-white font-black bg-white/5 px-1.5 py-0.5 rounded">{toPersianDigits(p.total)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      <TeamOfTheWeekWidget
        combinations={selectedCombinations}
        allPlayers={players}
        onSelectPlayer={(id: string) => {
          setSelectedPlayerId(id);
          setSelectedTeamId(null);
          setSelectedMatch(null);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </div>
  );
}

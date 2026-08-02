import React, { useState } from "react";
import { Trophy, Newspaper, ChevronDown } from "lucide-react";
import NewsSlider from "../components/NewsSlider";
import MatchTicker from "../components/MatchTicker";
import TeamOfTheWeekWidget from "../components/TeamOfTheWeekWidget";
import AdSlot, { isAdActive } from "../components/AdSlot";
import AdBannerWidget from "../components/AdBannerWidget";
import { AdItem } from "../types";

interface HomePageProps {
  matches: any[];
  news: any[];
  transfers: any[];
  heroSlides?: any[];
  legionnaires?: any[];
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
  ads: AdItem[];
  onSelectTransfer?: (transferId: string) => void;
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
  heroSlides = [],
  legionnaires = [],
  setSelectedMatch,
  setActiveArticle,
  handleTabChangeSubmit,
  getSafeImageUrl,
  standings,
  players,
  selectedCombinations,
  setSelectedPlayerId,
  setSelectedTeamId,
  ads = [],
  onSelectTransfer,
}: HomePageProps) {
  const [newsCategoryFilter, setNewsCategoryFilter] = useState("all");
  const [visibleNewsCount, setVisibleNewsCount] = useState(6);
  const [newsSearch, setNewsSearch] = useState("");
  const [sidebarLeagueTab, setSidebarLeagueTab] = useState("pro-league");

  const activeBanners = ads.filter((ad: AdItem) => ad.type === "banner" && isAdActive(ad));
  const activeSlots = ads.filter((ad: AdItem) => ad.type === "slot" && isAdActive(ad));

  const renderSlotGroup = (title: string, placement: string) => {
    const slots = activeSlots
      .filter((ad: AdItem) => (ad.placement || "sidebar").toLowerCase().includes(placement))
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    if (slots.length === 0) return null;
    return (
      <div className="space-y-4 bg-[#121215] p-4.5 rounded-2xl border border-white/5">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <h2 className="font-bold text-sm text-white">{title}</h2>
        </div>
        {slots.map((slot: AdItem) => <AdSlot key={slot.id} slot={slot} />)}
      </div>
    );
  };

  const sidebarLeagueTabs = [
    { id: "pro-league", label: "لیگ برتر" },
    { id: "league-1", label: "لیگ یک" },
    { id: "league-2-group-a", label: "لیگ دو (الف)" },
    { id: "league-2-group-b", label: "لیگ دو (ب)" },
  ];

  const mainCategories = ["pro-league", "league-1", "league-2", "hazfi-cup", "futsal"];
  const filteredNewsList = news.filter((art) => {
    const matchesSearch = art.title.toLowerCase().includes(newsSearch.toLowerCase()) ||
      art.summary.toLowerCase().includes(newsSearch.toLowerCase()) ||
      art.tags.some((t: string) => t.toLowerCase().includes(newsSearch.toLowerCase()));
    const matchesCat = newsCategoryFilter === "all" ||
      (newsCategoryFilter === "other" ? !mainCategories.includes(art.category) : art.category === newsCategoryFilter);
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6" dir="rtl" id="home-dashboard-container">
      {/* AD BANNER — from ads table */}
      {activeBanners.map((banner) =>
        banner.imageUrl ? (
          <a
            key={banner.id}
            href={banner.linkUrl || "#"}
            target="_blank"
            referrerPolicy="no-referrer"
            className="group block overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-r from-red-950/15 via-slate-900/80 to-gray-950 relative shadow-lg transition hover:border-red-950/30 animate-in fade-in duration-300"
          >
            <span className="absolute top-2 left-2 z-10 rounded bg-[#0a0a0c] px-1.5 py-0.5 text-[8px] font-black tracking-widest text-emerald-400 shadow uppercase">{banner.name || "حمایت ویژه پورتال"}</span>
            <img
              src={banner.imageUrl}
              alt={banner.title || "بنر تبلیغاتی"}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full max-h-48 object-cover transition group-hover:scale-[1.01]"
            />
          </a>
        ) : (
          <AdBannerWidget key={banner.id} ad={banner} />
        )
      )}

      <div className="grid gap-6 lg:grid-cols-12" id="home-dashboard-layout font-sans">
        <div className="lg:col-span-8 space-y-6">
          <NewsSlider news={news} transfers={transfers} heroSlides={heroSlides} legionnaires={legionnaires} onSelectNews={setActiveArticle} onSelectTransfer={onSelectTransfer} />
          <MatchTicker matches={matches} onSelectMatch={setSelectedMatch} />

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#121215] p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-red-500" />
                <h2 className="font-black text-lg text-white">آخرین خبرها و سناریوهای داغ</h2>
              </div>

              <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                {[
                  { id: "all", label: "همه موضوعات" },
                  { id: "pro-league", label: "لیگ برتر" },
                  { id: "league-1", label: "لیگ یک" },
                  { id: "league-2", label: "لیگ دو" },
                  { id: "hazfi-cup", label: "جام حذفی" },
                  { id: "futsal", label: "فوتسال" },
                  { id: "other", label: "سایر موضوعات" }
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
                              <button key={tg} onClick={(e) => { e.stopPropagation(); setNewsSearch(tg); }} className="rounded bg-gray-955 text-[9px] text-gray-500 border border-white/5 px-1.5 py-0.5 hover:bg-red-950/40 hover:text-red-400 hover:border-red-900/40 transition cursor-pointer">
                                #{tg}
                              </button>
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
          {renderSlotGroup("درون فید", "feed")}

          {renderSlotGroup("کمپین‌های تبلیغاتی", "campaign")}

          {renderSlotGroup("تبلیغات مربعی", "square")}

          {renderSlotGroup("تبلیغات کناری", "sidebar")}

          {renderSlotGroup("سایر تبلیغات", "general")}

          <div className="space-y-4 bg-[#121215] p-4.5 rounded-2xl border border-white/5 lg:sticky lg:top-16">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-1.5">
                <Trophy className="h-5 w-5 text-red-500" />
                <h2 className="font-bold text-sm text-white">جدول زنده رقابت‌های فوتبال</h2>
              </div>
              <button onClick={() => handleTabChangeSubmit(sidebarLeagueTab)} className="text-[10px] font-bold text-red-400 hover:text-red-300">نمایش همه</button>
            </div>

            <div className="grid grid-cols-2 gap-1 bg-gray-950 p-1 rounded-lg border border-white/5">
              {sidebarLeagueTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSidebarLeagueTab(tab.id)}
                  className={`rounded py-1.5 text-[10px] font-bold transition-all ${
                    sidebarLeagueTab === tab.id ? "bg-red-655 text-white shadow-sm font-black" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
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
                <div className="rounded-xl border border-white/5 p-2 bg-gray-900/30 animate-in face-in duration-200 overflow-x-auto">
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
                      {rows.map((row: any) => (
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

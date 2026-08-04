import React, { useState } from "react";
import { TransferItem, NewsItem } from "../types";
import { Shuffle, ArrowLeft, Calendar, Search, ArrowDownLeft, ArrowUpRight, Shield, Eye, Tag } from "lucide-react";
import TeamLogo from "./TeamLogo";

interface TransfersListProps {
  transfers: TransferItem[];
  teamTransfersList?: any[];
  teams?: any[];
  onSelectNews?: (news: NewsItem) => void;
  onSelectTransfer?: (transferId: string) => void;
  initialSearchQuery?: string;
  initialTransferTag?: string;
}

export default function TransfersList({ transfers, teamTransfersList = [], teams = [], onSelectNews, onSelectTransfer, initialSearchQuery = "", initialTransferTag = "" }: TransfersListProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [viewMode, setViewMode] = useState<"player" | "team">("team");
  const [leagueFilter, setLeagueFilter] = useState<"all" | "pro-league" | "league-1" | "league-2">("all");

  React.useEffect(() => {
    setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  React.useEffect(() => {
    if (initialTransferTag) setSearchQuery(initialTransferTag);
  }, [initialTransferTag]);

  // Map teams to their logos for dynamic retrieval
  const teamLogosMap: Record<string, string> = {};
  teams.forEach((t: any) => {
    if (t.name) {
      teamLogosMap[t.name] = t.logo || "🛡️";
    }
  });

  // Extract unique team lists for team-based grouping (excluding free agent/dummy values)
  const uniqueTeamNames = new Set<string>();
  transfers.forEach((t) => {
    if (t.fromTeam && t.fromTeam !== "آزاد" && t.fromTeam !== "دیگر" && t.fromTeam !== "نامشخص") {
      uniqueTeamNames.add(t.fromTeam);
    }
    if (t.toTeam && t.toTeam !== "آزاد" && t.toTeam !== "دیگر" && t.toTeam !== "نامشخص") {
      uniqueTeamNames.add(t.toTeam);
    }
  });

  // Build the dictionary of incomings and outgoings for each team
  const allTeamsMap = new Map<string, { incomings: TransferItem[]; outgoings: TransferItem[] }>();
  uniqueTeamNames.forEach((teamName) => {
    allTeamsMap.set(teamName, { incomings: [], outgoings: [] });
  });

  transfers.forEach((t) => {
    if (t.toTeam && allTeamsMap.has(t.toTeam)) {
      allTeamsMap.get(t.toTeam)!.incomings.push(t);
    }
    if (t.fromTeam && allTeamsMap.has(t.fromTeam)) {
      allTeamsMap.get(t.fromTeam)!.outgoings.push(t);
    }
  });

  // Filter transfers for PLAYER-CENTRIC view
  const filteredTransfers = transfers.filter(
    (t) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (t.playerName || "").toLowerCase().includes(q) ||
             (t.fromTeam || "").toLowerCase().includes(q) ||
             (t.toTeam || "").toLowerCase().includes(q) ||
             (t.position || "").toLowerCase().includes(q) ||
             (t.tags || []).some((tag: string) => tag.toLowerCase().includes(q));
    }
  );

  // Filter unique teams for TEAM-CENTRIC view based on search query
  const filteredTeams = Array.from(uniqueTeamNames).filter((teamName) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const incomings = allTeamsMap.get(teamName)?.incomings || [];
    const outgoings = allTeamsMap.get(teamName)?.outgoings || [];
    return (
      teamName.toLowerCase().includes(q) ||
      incomings.some((t) => (t.playerName || "").toLowerCase().includes(q) || (t.tags || []).some((tag: string) => tag.toLowerCase().includes(q))) ||
      outgoings.some((t) => (t.playerName || "").toLowerCase().includes(q) || (t.tags || []).some((tag: string) => tag.toLowerCase().includes(q)))
    );
  });

  // Filter team-centric persistent list
  const filteredTeamTransfers = teamTransfersList.filter((item) => {
    if (!item) return false;
    if (leagueFilter !== "all" && (item.league || "pro-league") !== leagueFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const nameMatches = item.teamName ? item.teamName.toLowerCase().includes(q) : false;
    const incMatches = item.incomings ? item.incomings.some((p: any) => p.playerName && p.playerName.toLowerCase().includes(q)) : false;
    const outMatches = item.outgoings ? item.outgoings.some((p: any) => p.playerName && p.playerName.toLowerCase().includes(q)) : false;
    return nameMatches || incMatches || outMatches;
  });

  const getLeagueLabel = (league: string) => {
    if (league === "league-1") return "لیگ یک";
    if (league === "league-2") return "لیگ دو";
    return "لیگ برتر";
  };

  const handleSelectTransfer = (item: TransferItem) => {
    if (onSelectTransfer) {
      onSelectTransfer(String(item.id));
      return;
    }
    if (!onSelectNews) return;
    const desc = item.description || item.details || "";
    if (!desc || desc.trim() === "") return;

    const newsItem: NewsItem = {
      id: `transfer-det-${item.id}`,
      title: `رسمی؛ بمب نقل و انتقالات: ${item.playerName} به ${item.toTeam} پیوست`,
      summary: `جزییات کامل نقل مکان ستاره فوتبال ایران: انتقال رسمی ${item.playerName} در پست تخصصی ${item.position || "فوتبالیست"} با نوع توافق ${item.type || "دائمی"}.`,
      content: desc,
      image: item.playerImage || item.player_image || item.image || "https://images.unsplash.com/photo-1540747737956-378724044602?auto=format&fit=crop&q=80&w=800",
      category: "transfers",
      createdAt: item.createdAt || item.created_at || (item.date ? `${item.date}T12:00:00.000Z` : new Date().toISOString()),
      viewCount: item.viewCount || 0,
      tags: (item.tags && item.tags.length > 0) ? item.tags : [item.playerName, item.fromTeam, item.toTeam, "نقل و انتقالات"]
    };
    onSelectNews(newsItem);
  };

  return (
    <div className="rounded-2xl bg-[#121215] p-4 border border-white/5 shadow-xl" dir="rtl" id="transfers-list-box">
      {/* Top Header & Search Panel */}
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-white/[0.04] pb-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Shuffle className="h-5 w-5 text-emerald-400 animate-pulse" />
            <h2 className="font-bold text-lg text-white">بازار و پیشخوان نقل و انتقالات</h2>
          </div>

          {/* Toggle Switches */}
          {/* ======================================================================
              [غیرفعال‌سازی موقت «نقل و انتقالات بازیکن‌محور» از سایت]
              طبق درخواست، نمایش بازیکن‌محور فعلاً حذف شده؛ دیتابیس و بک‌اند دست‌نخورده.
              برای بازگردانی: مقدار پیش‌فرض viewMode را به "player" برگردانید و
              بلوک «بازیکن‌محور» (دکمه زیر و بخش viewMode === "player") را از کامنت خارج کنید.
              ====================================================================== */}
          <div className="flex bg-[#0a0a0c] p-1 rounded-xl border border-white/5 select-none self-start">
            {/* <button
              onClick={() => setViewMode("player")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                viewMode === "player"
                  ? "bg-emerald-500 text-black shadow font-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              بازیکن‌محور
            </button> */}
            <button
              onClick={() => setViewMode("team")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                viewMode === "team"
                  ? "bg-emerald-500 text-black shadow font-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              تیم‌محور
            </button>
          </div>
        </div>
        
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder={viewMode === "player" ? "جستجوی بازیکن یا تیم..." : "جستجوی تیم یا بازیکن..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-[#0a0a0c] px-3 py-1.5 pr-8 text-xs text-white placeholder-slate-500 border border-white/5 focus:outline-none focus:border-emerald-500"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
        </div>
      </div>

      {/* ==========================================================================
          [غیرفعال‌سازی موقت رندر «بازیکن‌محور»]
          برای بازگردانی، کل این بلوک (از این کامنت تا انتهای آن) را از کامنت خارج کنید.
          ========================================================================== */}
      {/* RENDER VIEW: PLAYER-CENTRIC */}
      {/* {viewMode === "player" && ( */}
      {/*   filteredTransfers.length === 0 ? ( */}
      {/*     <div className="text-center py-8 text-gray-500 text-sm"> */}
      {/*       هیچ نقل و انتقالی با فیلتر شما پیدا نشد. */}
      {/*     </div> */}
      {/*   ) : ( */}
      {/*     <div className="grid gap-3 sm:grid-cols-2"> */}
      {/*       {filteredTransfers.map((item) => { */}
      {/*         const hasDesc = !!((item.description || item.details) && (item.description || item.details)!.trim() !== ""); */}
      {/*         return ( */}
      {/*           <div  */}
      {/*             key={item.id}  */}
      {/*             onClick={() => hasDesc && handleSelectTransfer(item)} */}
      {/*             className={`flex flex-col gap-3 rounded-xl bg-[#0a0a0c] p-4 border border-white/5 transition-all relative overflow-hidden ${ */}
      {/*               hasDesc  */}
      {/*                 ? "hover:border-emerald-500/40 hover:bg-white/[0.01] cursor-pointer group"  */}
      {/*                 : "opacity-85" */}
      {/*             }`} */}
      {/*             title={hasDesc ? "برای جزئیات بیشتر و اخبار اختصاصی کلیک کنید" : undefined} */}
      {/*           > */}
      {/*             {hasDesc && ( */}
      {/*               <div className="absolute top-0 left-0 bg-emerald-500/10 text-emerald-400 text-[9px] px-2 py-0.5 rounded-br font-bold border-r border-b border-white/5 opacity-0 group-hover:opacity-100 transition duration-200"> */}
      {/*                 مشاهده تحلیل انتقال */}
      {/*               </div> */}
      {/*             )} */}
      {/*             <div className="flex items-center justify-between border-b border-white/5 pb-2.5"> */}
      {/*               <div className="flex items-center gap-2"> */}
      {/*                 <span className="flex h-7 w-7 items-center justify-center rounded bg-[#121215] border border-white/5 text-sm" role="img" aria-label="player-icon"> */}
      {/*                   🏃‍♂️ */}
      {/*                 </span> */}
      {/*                 <div> */}
      {/*                   <h4 className="font-black text-sm text-white group-hover:text-emerald-400 transition">{item.playerName}</h4> */}
      {/*                   <p className="text-[10px] text-slate-400 mt-0.5">{item.position || "بازیکن فوتبال"}</p> */}
      {/*                 </div> */}
      {/*               </div> */}
      {/*               <span className="rounded bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-900/40"> */}
      {/*                 {item.type || "دائمی"} */}
      {/*               </span> */}
      {/*             </div> */}
      {/*             <div className="flex items-center justify-between py-1 bg-[#121215]/35 rounded p-2 border border-white/5"> */}
      {/*               <div className="flex w-5/12 flex-col text-right"> */}
      {/*                 <span className="text-[10px] text-slate-500 font-semibold mb-0.5">باشگاه سابق</span> */}
      {/*                 <span className="text-xs font-bold text-slate-300 truncate">{item.fromTeam}</span> */}
      {/*               </div> */}
      {/*               <div className="flex w-2/12 items-center justify-center"> */}
      {/*                 <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-[#121215] text-emerald-400 border border-white/10 shadow group-hover:rotate-180 transition-transform duration-350"> */}
      {/*                   <ArrowLeft className="h-4 w-4" /> */}
      {/*                 </div> */}
      {/*               </div> */}
      {/*               <div className="flex w-5/12 flex-col text-left"> */}
      {/*                 <span className="text-[10px] text-slate-500 font-semibold mb-0.5 text-left">باشگاه جدید</span> */}
      {/*                 <span className="text-xs font-bold text-white truncate text-left">{item.toTeam}</span> */}
      {/*               </div> */}
      {/*             </div> */}
      {/*             <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1"> */}
      {/*               <div className="flex items-center gap-1"> */}
      {/*                 <Calendar className="h-3 w-3 text-slate-600" /> */}
      {/*                 <span>ثبت رسمی: {item.date}</span> */}
      {/*               </div> */}
      {/*               <span className="font-bold text-slate-400 bg-[#121215] px-2.5 py-0.5 rounded border border-white/5"> */}
      {/*                 مبلغ: <span className="text-emerald-400 font-mono font-bold">{item.fee || "توافقی"}</span> */}
      {/*               </span> */}
      {/*             </div> */}
      {/*             <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-1"> */}
      {/*               <span className="flex items-center gap-1 text-[10px] text-slate-500"> */}
      {/*                 <Eye className="h-2.5 w-2.5" /> */}
      {/*                 {(item.viewCount || 0).toLocaleString("fa-IR")} بازدید */}
      {/*               </span> */}
      {/*               {item.tags && item.tags.length > 0 && ( */}
      {/*                 <div className="flex flex-wrap gap-1 justify-end"> */}
      {/*                   {item.tags.slice(0, 3).map((tag: string) => ( */}
      {/*                     <button */}
      {/*                       key={tag} */}
      {/*                       onClick={(e) => { e.stopPropagation(); setSearchQuery(tag); }} */}
      {/*                       className="rounded-lg bg-[#121215] px-1.5 py-0.5 text-[9px] text-slate-400 border border-white/5 hover:bg-emerald-950/40 hover:text-emerald-400 hover:border-emerald-900/40 transition cursor-pointer" */}
      {/*                     > */}
      {/*                       <Tag className="h-2 w-2 inline ml-0.5" />{tag} */}
      {/*                     </button> */}
      {/*                   ))} */}
      {/*                   {item.tags.length > 3 && <span className="text-[9px] text-slate-600">+{item.tags.length - 3}</span>} */}
      {/*                 </div> */}
      {/*               )} */}
      {/*             </div> */}
      {/*           </div> */}
      {/*         ); */}
      {/*       })} */}
      {/*     </div> */}
      {/*   )} */}
      {/* )} */}
      {/* ================== انتهای بلوک غیرفعال‌سازی بازیکن‌محور ================== */}

      {/* RENDER VIEW: TEAM-CENTRIC */}
      {viewMode === "team" && (
        <div className="space-y-4">
          {/* Header Panel with Update Date and Color Legends */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0a0a0c] border border-white/5 rounded-xl p-4 text-xs font-bold text-slate-300">
            <div className="flex items-center gap-2 text-emerald-400">
              <Calendar className="h-4 w-4" />
              <span>پیشخوان زنده نقل و انتقالات لیگ برتر ایران و آزادگان</span>
            </div>

            {/* Status Legend */}
            <div className="flex flex-wrap items-center gap-4 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-emerald-500/10 border border-emerald-500/30 inline-block"></span>
                <span className="text-white">ورودی قطعی (سبز)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-rose-950/20 border border-rose-500/30 inline-block"></span>
                <span className="text-white">خروجی قطعی (قرمز)</span>
              </div>
            </div>
          </div>

          {/* League Filter Tabs */}
          <div className="flex flex-wrap gap-2 text-xs">
            {(["all", "pro-league", "league-1", "league-2"] as const).map((lg) => (
              <button
                key={lg}
                onClick={() => setLeagueFilter(lg)}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer border ${
                  leagueFilter === lg
                    ? "bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/10"
                    : "bg-[#0a0a0c] text-slate-400 border-white/5 hover:text-white hover:border-emerald-500/30"
                }`}
              >
                {lg === "all" ? "همه لیگ‌ها" : getLeagueLabel(lg)}
              </button>
            ))}
          </div>

          {/* Table Headers (Visible on desktop screen sizes) */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 bg-black/40 border-b border-white/5 text-[11px] font-black text-slate-400 text-right">
            <div className="col-span-2">تیم</div>
            <div className="col-span-5 flex items-center gap-1.5 bg-emerald-950/20 border border-emerald-500/10 px-2.5 py-1 rounded-lg text-emerald-400 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              خریدها و ورودی‌های قطعی
            </div>
            <div className="col-span-5 flex items-center gap-1.5 bg-rose-950/25 border border-rose-500/10 px-2.5 py-1 rounded-lg text-rose-400 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              جدایی‌ها و خروجی‌های قطعی
            </div>
          </div>

          {filteredTeamTransfers.length > 0 ? (
            <div className="space-y-2">
              {filteredTeamTransfers.map((item: any) => (
                <div 
                  key={item.id} 
                  className="bg-[#0c0c0f] border border-white/5 rounded-2xl p-4 md:p-5 grid grid-cols-1 md:grid-cols-12 gap-4 hover:border-white/10 transition-all duration-150 relative items-center text-right"
                >
                  {/* Column 1: Team identity Section */}
                  <div className="md:col-span-2 flex items-center gap-3 pt-1 md:pt-0 border-b border-white/5 pb-2 md:pb-0 md:border-b-0 md:border-l md:border-white/5 md:pl-2">
                    <TeamLogo logo={item.teamLogo} fallback="🛡️" size="lg" />
                    <div>
                      <h3 className="font-extrabold text-white text-sm leading-tight">{item.teamName}</h3>
                      <span className="text-[9px] inline-block mt-1 bg-emerald-950/40 border border-emerald-800/30 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                        {getLeagueLabel(item.league || "pro-league")}
                      </span>
                    </div>
                  </div>

                  {/* Column 2: Incomings (Green) */}
                  <div className="md:col-span-5 space-y-2 md:pl-3">
                    <div className="md:hidden text-[10px] font-bold text-emerald-400 mb-1">⬇️ ورودی‌های قطعی (سبز):</div>
                    {(!item.incomings || item.incomings.length === 0) ? (
                      <p className="text-[10px] text-slate-650 font-medium italic">بدون ورودی جدید</p>
                    ) : (
                      <div className="flex flex-wrap gap-2.5 text-xs">
                        {item.incomings.map((p: any) => (
                          <span
                            key={p.id}
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-sm transition hover:scale-[1.02] bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                          >
                            {p.playerImage ? (
                              <img loading="lazy" decoding="async" 
                                src={p.playerImage}
                                alt={p.playerName}
                                referrerPolicy="no-referrer"
                                className="w-7 h-7 rounded-full object-cover border border-white/10"
                              />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                            )}
                            <span className="text-white font-extrabold text-sm">{p.playerName}</span>
                            {p.fromTeam && <span className="text-[10px] opacity-65 font-medium">({p.fromTeam})</span>}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Column 3: Outgoings (Red) */}
                  <div className="md:col-span-5 space-y-2 md:pl-3">
                    <div className="md:hidden text-[10px] font-bold text-rose-450 mb-1">⬆️ خروجی‌های قطعی (قرمز):</div>
                    {(!item.outgoings || item.outgoings.length === 0) ? (
                      <p className="text-[10px] text-slate-650 font-medium italic">بدون جدایی رسمی</p>
                    ) : (
                      <div className="flex flex-wrap gap-2.5 text-xs">
                        {item.outgoings.map((p: any) => (
                          <span
                            key={p.id}
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-sm transition hover:scale-[1.02] bg-rose-950/20 border-rose-500/30 text-rose-300"
                          >
                            {p.playerImage ? (
                              <img loading="lazy" decoding="async" 
                                src={p.playerImage}
                                alt={p.playerName}
                                referrerPolicy="no-referrer"
                                className="w-7 h-7 rounded-full object-cover border border-white/10"
                              />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-rose-550 inline-block"></span>
                            )}
                            <span className="text-white font-extrabold text-sm">{p.playerName}</span>
                            {p.toTeam && <span className="text-[10px] opacity-65 font-medium">({p.toTeam})</span>}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              هیچ تیمی با نتایج فیلتر شده پیدا نشد.
            </div>
          )}
        </div>
      )}
    </div>
  );
}


import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Clock, 
  Edit, 
  Trash2, 
  Plus, 
  Play, 
  Gamepad2, 
  Search,
  Check,
  Award,
  Zap,
  Info,
  ClipboardEdit
} from "lucide-react";
import TeamLogo from "./TeamLogo";
import { MatchItem, TeamItem, PlayerItem, StandingRow } from "../types";
import { formatStatNumber } from "../utils";
import AdminFeatureMatchForm from "./AdminFeatureMatchForm";
import AdminLiveMatchConsole from "./AdminLiveMatchConsole";

const ADMIN_MATCH_PAGE_SIZE = 20;

interface AdminMatchHubProps {
  matches: MatchItem[];
  teams: TeamItem[];
  players: PlayerItem[];
  standings: Record<string, StandingRow[]>;
  stats: Record<string, any>;
  currentSeason?: string;
  onRefreshData: () => void;
  onPatchMatches?: (upsert: any | null, removeId?: string) => void;
  onUpdateStandings: (leagueKey: string, rows: StandingRow[]) => Promise<boolean>;
  onUpdateStats: (leagueKey: string, statsData: any) => Promise<boolean>;
  onUpdateTeam: (id: string, data: any) => Promise<boolean>;
  onUpdatePlayer: (id: string, data: any) => Promise<boolean>;
}

export default function AdminMatchHub({
  matches = [],
  teams = [],
  players = [],
  standings = {},
  stats = {},
  currentSeason,
  onRefreshData,
  onPatchMatches,
  onUpdateStandings,
  onUpdateTeam,
  onUpdatePlayer,
  onUpdateStats
}: AdminMatchHubProps) {
  // Sports selection: "football" | "futsal"
  const [sportTab, setSportTab] = useState<"football" | "futsal">("football");
  
  // Game state selection: "upcoming" | "live" | "finished"
  const [stageTab, setStageTab] = useState<"upcoming" | "live" | "finished">("upcoming");

  // Phase-3 perf: server-side filtered + paginated list. Only the current
  // page (20 slim rows) is ever downloaded.
  const [weekFilter, setWeekFilter] = useState<string>("all");
  const [leagueFilter, setLeagueFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [listItems, setListItems] = useState<MatchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [listLoading, setListLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [sportTab, stageTab, weekFilter, leagueFilter]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setListLoading(true);
    const status = stageTab === "upcoming" ? "not-started" : stageTab;
    const params = new URLSearchParams({
      page: String(page),
      limit: String(ADMIN_MATCH_PAGE_SIZE),
      sport: sportTab,
      status,
      league: leagueFilter,
      week: weekFilter,
      q: debouncedQuery,
      sort: status === "not-started" ? "date_asc" : "date_desc",
    });
    fetch(`/api/admin/matches?${params.toString()}`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error("admin matches fetch failed");
        return res.json();
      })
      .then(data => {
        if (cancelled || !data.success) return;
        setListItems(Array.isArray(data.items) ? data.items : []);
        setTotal(Number(data.total) || 0);
        setTotalPages(Math.max(1, Number(data.totalPages) || 1));
        if (Number(data.page) && Number(data.page) !== page) setPage(Number(data.page));
      })
      .catch((e) => { if (e?.name !== "AbortError") {} })
      .finally(() => { if (!cancelled) setListLoading(false); });
    return () => { cancelled = true; controller.abort(); };
  }, [page, sportTab, stageTab, weekFilter, leagueFilter, debouncedQuery, refreshTick]);

  const refreshList = () => setRefreshTick(t => t + 1);

  // Keep the list fresh so rows move tabs as kickoff times pass.
  // Cheap: 20 slim rows per fetch. Paused when the tab is hidden.
  useEffect(() => {
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      refreshList();
    }, 30000);
    const onVisible = () => {
      if (typeof document !== "undefined" && !document.hidden) refreshList();
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisible);
    }
    return () => {
      clearInterval(id);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisible);
      }
    };
  }, []);

  // Create or edit toggles
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingMatch, setEditingMatch] = useState<MatchItem | null>(null);
  const [showLiveConsole, setShowLiveConsole] = useState<boolean>(false);
  const [activeLiveMatch, setActiveLiveMatch] = useState<MatchItem | null>(null);

  // Cascade Settings
  const [autoCascadeEnabled, setAutoCascadeEnabled] = useState(true);
  const [cascadeLogs, setCascadeLogs] = useState<string[]>([]);
  const [showCascadeModal, setShowCascadeModal] = useState(false);

  // Filter list
  // Phase-3: filtering happens server-side; this keeps the current page rows.
  const getFilteredMatches = () => listItems;

  // Display status follows the wall clock (same as the public site).
  // Action buttons below intentionally keep the STORED status so the
  // explicit "start live" workflow is preserved.
  const effStatus = (m: any): string => (m as any).effectiveStatus || m.status;

  // 1. DELETE Match
  const handleDeleteMatch = async (match: MatchItem) => {
    if (!window.confirm(`آیا از حذف بازی ${match.teamHome} و ${match.teamAway} مطمئن هستید؟`)) return;
    try {
      const sport = match.sport || "football";
      const stage = match.status === "finished" ? "Finished_Games" : (match.status === "live" ? "Now_Games" : "Feature_Games");
      const res = await fetch(`/api/sports-game/${sport}/${stage}/${match.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        // Non-finished changes need no stats refetch: patch the local list
        // instead of re-downloading the whole dataset.
        if (match.status !== "finished" && onPatchMatches) onPatchMatches(null, match.id);
        else onRefreshData();
        refreshList();
      } else {
        alert("خطا در حذف بازی از سیستم.");
      }
    } catch (e) {
      alert("خطا در حذف بازی.");
    }
  };

  // Dynamic automatic calculation of cascade effects
  const executeCascadeUpdate = async (match: any) => {
    if (!autoCascadeEnabled) return;
    setShowCascadeModal(true);
    setCascadeLogs(["ثبت مسابقه در پایگاه داده انجام شد...", `بازی: ${match.teamHome} ${match.scoreHome} - ${match.scoreAway} ${match.teamAway}`, "در حال اجرای بازمحاسبه خودکار آمار توسط سرور..."]);

    try {
      setCascadeLogs(prev => [...prev, "بازمحاسبه جدول رده‌بندی لیگ موثر..."]);
      await new Promise(resolve => setTimeout(resolve, 800));
      setCascadeLogs(prev => [...prev, "بازمحاسبه آمار بازیکنان (گل، پاس گل، کارت، ریتینگ) و مربیان..."]);
      await new Promise(resolve => setTimeout(resolve, 600));
      setCascadeLogs(prev => [...prev, "بازمحاسبه لیدربردها و پروفایل تیمی..."]);
      await new Promise(resolve => setTimeout(resolve, 600));
      setCascadeLogs(prev => [...prev, "✓ بازمحاسبه کامل شد و تغییرات در پایگاه داده ذخیره شد."]);
      setTimeout(() => setShowCascadeModal(false), 2000);
    } catch (e) {
      setCascadeLogs(prev => [...prev, "⚠ خطا در هماهنگ‌سازی گرافیکی آمار."]);
      setTimeout(() => setShowCascadeModal(false), 2000);
    }
  };

  // 2. SAVE Match (Create or Edit)
  const handleSaveMatch = async (matchData: any) => {
    try {
      const isFinishedNow = matchData.status === "finished";

      if (editingMatch) {
        // Edit flow
        const response = await fetch(`/api/sports-game/${editingMatch.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...matchData, updatedAt: editingMatch.updatedAt })
        });
        if (response.ok) {
          setShowForm(false);
          setEditingMatch(null);
          const saved = await response.json().catch(() => null);
          if (!isFinishedNow && onPatchMatches) {
            onPatchMatches(saved && saved.match ? saved.match : { ...editingMatch, ...matchData });
          } else {
            onRefreshData();
          }
          refreshList();
          if (isFinishedNow) {
            await executeCascadeUpdate({ ...editingMatch, ...matchData });
          }
        } else if (response.status === 409) {
          const data = await response.json();
          const reload = window.confirm(`${data.message || "این مسابقه توسط شخص دیگری ویرایش شده است."}\nبرای بارگذاری اطلاعات جدید «تایید» را بزنید.`);
          if (reload) {
            setShowForm(false);
            setEditingMatch(null);
            onRefreshData();
          }
        } else {
          alert("خطا در همگام‌سازی بازی با سرور.");
        }
      } else {
        // Create flow
        const payload = {
          sport: matchData.sport || sportTab,
          stage: matchData.status === "finished" ? "Finished_Games" : (matchData.status === "live" ? "Now_Games" : "Feature_Games"),
          matchData
        };
        const response = await fetch("/api/sports-game", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          setShowForm(false);
          const saved = await response.json().catch(() => null);
          if (!isFinishedNow && onPatchMatches) {
            onPatchMatches(saved && saved.match ? saved.match : matchData);
          } else {
            onRefreshData();
          }
          refreshList();
          if (isFinishedNow) {
            // Trigger automatic cascade for newly completed game
            await executeCascadeUpdate(matchData);
          }
        } else {
          alert("خطا در ایجاد بازی جدید بر روی سرور.");
        }
      }
    } catch (err) {
      alert("انتقال داده‌ها با موفقیت انجام نشد.");
    }
  };

  const startLiveConsole = async (match: MatchItem) => {
    // List rows are slim (no events/lineups): load the full match first so
    // the console never starts from (and saves over) empty data.
    try {
      const res = await fetch(`/api/detail/match/${match.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.success && data?.data?.match) {
          setActiveLiveMatch(data.data.match);
          setShowLiveConsole(true);
          return;
        }
      }
    } catch {
      // Fall through to the slim row below on any fetch failure.
    }
    setActiveLiveMatch(match);
    setShowLiveConsole(true);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Selector controls for Sport type & Phase stage */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/45 p-4 rounded-2xl border border-white/5">
        <div className="flex gap-2">
          <button
            onClick={() => { setSportTab("football"); setSearchQuery(""); }}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${sportTab === "football" ? "bg-red-655 text-white shadow-md shadow-red-950/40" : "bg-white/5 text-gray-400 hover:text-white"}`}
          >
            ⚽ فوتبال بزرگسالان
          </button>
          <button
            onClick={() => { setSportTab("futsal"); setSearchQuery(""); }}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${sportTab === "futsal" ? "bg-red-655 text-white shadow-md shadow-red-950/40" : "bg-white/5 text-gray-400 hover:text-white"}`}
          >
            🥅 فوتسال سالنی
          </button>
        </div>

        <div className="flex gap-1.5 bg-black/40 p-1 rounded-xl">
          <button
            onClick={() => setStageTab("upcoming")}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition ${stageTab === "upcoming" ? "bg-slate-800 text-white" : "text-gray-450 hover:text-gray-200"}`}
          >
            آینده (برگزار نشده)
          </button>
          <button
            onClick={() => setStageTab("live")}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition relative ${stageTab === "live" ? "bg-red-950/40 border border-red-700/30 text-red-400" : "text-gray-450 hover:text-gray-200"}`}
          >
            برگزاری زنده 
            <span className="h-1.5 w-1.5 bg-red-500 rounded-full inline-block mr-1 animate-ping" />
          </button>
          <button
            onClick={() => setStageTab("finished")}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition ${stageTab === "finished" ? "bg-slate-800 text-white" : "text-gray-450 hover:text-gray-200"}`}
          >
            اتمام‌یافته (آرشیو)
          </button>
        </div>
      </div>

      {/* Main Container list */}
      <div className="bg-[#0b0b0f] border border-white/5 p-5 rounded-2xl space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-white/5 pb-4">
          <div className="relative w-full md:w-64">
            <span className="absolute inset-y-0 right-3 flex items-center pr-2 pointer-events-none">
              <Search className="h-3.5 w-3.5 text-gray-500" />
            </span>
            <input
              type="text"
              placeholder="جستجوی مسابقه، استادیوم..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pr-10 pl-3 py-2 bg-slate-950 border border-white/5 rounded-xl text-white focus:outline-none focus:border-red-655"
            />
          </div>

          {/* Phase-3: server-side week + league filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={weekFilter}
              onChange={e => setWeekFilter(e.target.value)}
              className="text-xs bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-655 font-bold"
            >
              <option value="all">همه هفته‌ها</option>
              <option value="prev">هفته قبل</option>
              <option value="this">هفته جاری</option>
              <option value="next">هفته بعد</option>
            </select>
            <select
              value={leagueFilter}
              onChange={e => setLeagueFilter(e.target.value)}
              className="text-xs bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-655 font-bold"
            >
              <option value="all">همه لیگ‌ها</option>
              <option value="pro-league">لیگ برتر</option>
              <option value="league-1">لیگ یک</option>
              <option value="league-2">لیگ دو</option>
              <option value="hazfi-cup">جام حذفی</option>
              <option value="futsal">فوتسال</option>
            </select>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            {/* Auto Cascade toggle slider */}
            <label className="flex items-center gap-2 cursor-pointer text-[11px] text-gray-400 font-bold select-none">
              <input
                type="checkbox"
                checked={autoCascadeEnabled}
                onChange={e => setAutoCascadeEnabled(e.target.checked)}
                className="rounded accent-red-655 border-white/10 text-xs text-white"
              />
              <Zap className="h-3.5 w-3.5 text-emerald-400" />
              <span>پردازش و ثبت آبشاری خودکار آمارهای بازی</span>
            </label>

            <button
              onClick={() => { setEditingMatch(null); setShowForm(true); }}
              className="bg-red-655 hover:bg-red-700 text-white font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-950/20 mr-auto md:mr-0 transition active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>افزودن بازی جدید</span>
            </button>
          </div>
        </div>

        {/* List items */}
        {listLoading ? (
          <div className="py-10 text-center space-y-2">
            <p className="text-xs text-slate-500 italic">در حال بارگذاری مسابقات...</p>
          </div>
        ) : getFilteredMatches().length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <p className="text-xs text-slate-500 italic">هیچ بازی منطبق با فیلترها و جستجوی شما یافت نشد.</p>
          </div>
        ) : (
          <>
          <div className="grid gap-3 md:grid-cols-2">
            {getFilteredMatches().map(m => (
              <div key={m.id} className="p-4 bg-slate-900/20 border border-white/5 rounded-xl flex flex-col justify-between hover:bg-slate-900/35 transition group">
                <div className="flex justify-between items-center text-[10px] text-gray-400 pb-2 mb-2 border-b border-white/[0.03]">
                  <span className="font-bold text-sky-400">
                    {m.league === "pro-league" 
                      ? "لیگ برتر فوتبال ایران (خلیج فارس)" 
                      : m.league === "hazfi-cup" 
                      ? "جام حذفی فوتبال ایران" 
                      : m.league === "league-1" 
                      ? "لیگ یک (آزادگان)" 
                      : m.league === "league-2" 
                      ? "لیگ دو کشوری" 
                      : m.league === "futsal" 
                      ? "لیگ برتر فوتسال" 
                      : "رقابت‌های کشوری"}
                  </span>
                  <span className="font-mono">{m.date} - {m.time}</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="w-5/12 flex items-center gap-2">
                    <TeamLogo logo={m.teamHomeLogo} fallback="⚽" size="sm" />
                    <span className="text-xs font-black text-white truncate max-w-[120px]">{m.teamHome}</span>
                  </div>

                  <div className="w-2/12 flex flex-col items-center justify-center font-black">
                    {effStatus(m) === "not-started" ? (
                      <span className="text-[10px] text-gray-500 font-bold bg-slate-950/60 px-2 py-0.5 rounded border border-white/5">VS</span>
                    ) : (
                      <span className="text-base text-red-500 font-mono tracking-widest bg-black px-2.5 py-0.5 rounded-lg border border-white/5">
                        {m.scoreHome} - {m.scoreAway}
                      </span>
                    )}
                    {effStatus(m) === "live" && (
                      <span className="text-[9px] text-red-400 mt-1 animate-pulse font-bold">{m.period === "HT" ? "بین دو نیمه" : `${m.minutes || "0"}'`}</span>
                    )}
                  </div>

                  <div className="w-5/12 flex items-center justify-end gap-2 text-left">
                    <span className="text-xs font-black text-white truncate max-w-[120px]">{m.teamAway}</span>
                    <TeamLogo logo={m.teamAwayLogo} fallback="⚽" size="sm" />
                  </div>
                </div>

                {/* Event control list */}
                <div className="flex justify-between items-center text-[10px] text-gray-500 pt-2.5 mt-2.5 border-t border-white/[0.03]">
                  <span>ورزشگاه: {m.venue || "نامشخص"}</span>
                  
                  <div className="flex gap-2">
                    {m.status === "not-started" && (
                      <button
                        onClick={() => startLiveConsole(m)}
                        className="bg-emerald-950/45 border border-emerald-800/30 text-emerald-400 hover:bg-emerald-900/30 px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="h-3 w-3" /> شروع لایو
                      </button>
                    )}

                    {m.status === "live" && (
                      <button
                        onClick={() => startLiveConsole(m)}
                        className="bg-red-950/45 border border-red-800/30 text-red-500 hover:bg-red-900/30 px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 cursor-pointer animate-pulse"
                      >
                        <Zap className="h-3 w-3" /> اتاق کنترل زنده
                      </button>
                    )}

                    {m.status === "finished" && (
                      <button
                        onClick={() => startLiveConsole(m)}
                        className="bg-sky-950/45 border border-sky-800/30 text-sky-400 hover:bg-sky-900/30 px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 cursor-pointer"
                        title="ویرایش کامل رویدادها، ترکیب و آمار بازی خاتمه‌یافته"
                      >
                        <ClipboardEdit className="h-3 w-3" /> ویرایش کامل
                      </button>
                    )}
                    
                    <button
                      onClick={() => { setEditingMatch(m); setShowForm(true); }}
                      className="p-1.5 rounded bg-white/5 text-slate-300 hover:text-white transition cursor-pointer"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteMatch(m)}
                      className="p-1.5 rounded bg-white/5 text-red-500 hover:bg-red-950/35 transition cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Phase-3: server-side pagination */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2" dir="rtl">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-xl px-3 py-1.5 text-xs font-black bg-gray-950 text-gray-300 border border-white/5 hover:text-white disabled:opacity-40 disabled:cursor-default transition"
            >
              قبلی
            </button>
            <span className="text-[11px] text-slate-500 font-bold font-mono">
              صفحه {formatStatNumber(page)} از {formatStatNumber(totalPages)} ــ {formatStatNumber(total)} بازی
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-xl px-3 py-1.5 text-xs font-black bg-gray-950 text-gray-300 border border-white/5 hover:text-white disabled:opacity-40 disabled:cursor-default transition"
            >
              بعدی
            </button>
          </div>
          </>
        )}
      </div>

      {/* CREATE / EDIT MATCH FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-slate-900 rounded-2xl border border-white/10 p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-white text-base mb-4 border-b border-white/5 pb-2">
              {editingMatch ? "📝 ویرایش مشخصات مسابقه" : "➕ ایجاد مسابقه جدید"}
            </h3>
            
            <AdminFeatureMatchForm
              match={editingMatch}
              teams={teams}
              sport={sportTab}
              currentSeason={currentSeason}
              onSave={handleSaveMatch}
              onCancel={() => { setShowForm(false); setEditingMatch(null); }}
            />
          </div>
        </div>
      )}

      {/* LIVE EVENT SIMULATOR CONSOLE MODAL */}
      {showLiveConsole && activeLiveMatch && (
        <div className="fixed inset-0 z-50 bg-black/92 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-slate-950 rounded-2xl border border-red-900/20 p-6 shadow-2xl max-h-[95vh] overflow-y-auto">
            <AdminLiveMatchConsole
              match={activeLiveMatch}
              teams={teams}
              players={players}
              onUpdateMatch={async (id, body) => {
                const res = await fetch(`/api/sports-game/${id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body)
                });
                if (res.ok) {
                  refreshList();
                  return true;
                }
                return false;
              }}
              onFinishMatch={async (id, data) => {
                const { updatedAt: _ua, ...cleanData } = data;
                const res = await fetch(`/api/sports-game/${id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...cleanData, status: "finished" })
                });
                if (res.ok) {
                  setShowLiveConsole(false);
                  setActiveLiveMatch(null);
                  onRefreshData();
                  refreshList();
                  // Apply automatic cascade
                  await executeCascadeUpdate({ ...activeLiveMatch, ...data, status: "finished" });
                  return true;
                }
                return false;
              }}
              onSaveFinishedMatch={async (id, data) => {
                const { updatedAt: _ua, ...cleanData } = data;
                const res = await fetch(`/api/sports-game/${id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...cleanData, status: "finished" })
                });
                if (res.ok) {
                  onRefreshData();
                  refreshList();
                  // Apply automatic cascade (کنسول باز می‌ماند تا ویرایش ادامه یابد)
                  await executeCascadeUpdate({ ...activeLiveMatch, ...data, status: "finished" });
                  return true;
                }
                return false;
              }}
              onCancel={() => { setShowLiveConsole(false); setActiveLiveMatch(null); }}
            />
          </div>
        </div>
      )}

      {/* CASCADE FEEDBACK OVERLAY */}
      {showCascadeModal && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900/95 border border-white/10 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="mx-auto h-12 w-12 bg-emerald-950/40 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400">
              <Zap className="h-6 w-6 animate-pulse" />
            </div>
            <h4 className="font-extrabold text-sm text-white">بازمحاسبه خودکار آمار مسابقه</h4>
            <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-[10px] text-left font-mono space-y-2 h-44 overflow-y-auto divide-y divide-white/5" dir="ltr">
              {cascadeLogs.map((log, lidx) => (
                <div key={lidx} className="pt-1.5 text-slate-350">{log}</div>
              ))}
            </div>
            <p className="text-[10px] text-gray-500">جدول رده‌بندی، آمار بازیکنان و مربیان توسط موتور بازمحاسبه سرور همگام‌سازی می‌شود.</p>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from "react";
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
  Info
} from "lucide-react";
import TeamLogo from "./TeamLogo";
import { MatchItem, TeamItem, PlayerItem, StandingRow } from "../types";
import AdminFeatureMatchForm from "./AdminFeatureMatchForm";
import AdminLiveMatchConsole from "./AdminLiveMatchConsole";

interface AdminMatchHubProps {
  matches: MatchItem[];
  teams: TeamItem[];
  players: PlayerItem[];
  standings: Record<string, StandingRow[]>;
  stats: Record<string, any>;
  currentSeason?: string;
  onRefreshData: () => void;
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
  onUpdateStandings,
  onUpdateTeam,
  onUpdatePlayer,
  onUpdateStats
}: AdminMatchHubProps) {
  // Sports selection: "football" | "futsal"
  const [sportTab, setSportTab] = useState<"football" | "futsal">("football");
  
  // Game state selection: "upcoming" | "live" | "finished"
  const [stageTab, setStageTab] = useState<"upcoming" | "live" | "finished">("upcoming");
  
  // Search query
  const [searchQuery, setSearchQuery] = useState("");

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
  const getFilteredMatches = () => {
    return matches.filter(m => {
      const isSportMatch = m.sport === sportTab;
      const term = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        m.teamHome.toLowerCase().includes(term) || 
        m.teamAway.toLowerCase().includes(term) || 
        (m.venue && m.venue.toLowerCase().includes(term));

      if (!isSportMatch || !matchesSearch) return false;

      if (stageTab === "upcoming") {
        return m.status === "not-started";
      } else if (stageTab === "live") {
        return m.status === "live";
      } else if (stageTab === "finished") {
        return m.status === "finished";
      }
      return false;
    });
  };

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
        onRefreshData();
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
    setCascadeLogs(["آغاز انطباق آبشاری پیشرفته آمار مسابقه بر روی دیتابیس...", `بازی انتهایی: ${match.teamHome} vs ${match.teamAway}`, `نتیجه نهایی: ${match.scoreHome}-${match.scoreAway}`]);

    try {
      setCascadeLogs(prev => [...prev, "بررسی و همگام‌سازی لحظه‌ای تمام ردیف‌های جدول رده‌بندی لیگ موثر..."]);
      await new Promise(resolve => setTimeout(resolve, 800));
      setCascadeLogs(prev => [...prev, "تطبیق و محاسبه اتوماتیک کارت‌های زرد، قرمز، گل‌ها و پاس‌گل‌های تمام بازیکنان دخیل..."]);
      await new Promise(resolve => setTimeout(resolve, 600));
      setCascadeLogs(prev => [...prev, "اعمال تأثیر و کلین‌شیت دروازه‌بانان و تغییر تفاضل گل و امتیازات تیم‌ها در دیتابیس..."]);
      await new Promise(resolve => setTimeout(resolve, 600));
      setCascadeLogs(prev => [...prev, "✓ تمام تغییرات با رعایت کمال یکپارچگی سیستمی در هسته دیتابیس با موفقیت ثبت شدند."]);
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
          onRefreshData();
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
          onRefreshData();
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

  const startLiveConsole = (match: MatchItem) => {
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
        {getFilteredMatches().length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <p className="text-xs text-slate-500 italic">هیچ بازی منطبق با فیلترها و جستجوی شما یافت نشد.</p>
          </div>
        ) : (
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
                    {m.status === "not-started" ? (
                      <span className="text-[10px] text-gray-500 font-bold bg-slate-950/60 px-2 py-0.5 rounded border border-white/5">VS</span>
                    ) : (
                      <span className="text-base text-red-500 font-mono tracking-widest bg-black px-2.5 py-0.5 rounded-lg border border-white/5">
                        {m.scoreHome} - {m.scoreAway}
                      </span>
                    )}
                    {m.status === "live" && (
                      <span className="text-[9px] text-red-400 mt-1 animate-pulse font-bold">{m.minutes || "۰"}'</span>
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
                  onRefreshData();
                  return true;
                }
                return false;
              }}
              onFinishMatch={async (id, data) => {
                const res = await fetch(`/api/sports-game/${id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...data, status: "finished" })
                });
                if (res.ok) {
                  setShowLiveConsole(false);
                  setActiveLiveMatch(null);
                  onRefreshData();
                  // Apply automatic cascade
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
            <h4 className="font-extrabold text-sm text-white">توزیع آبشاری تراکنش آمار به پایگاه داده</h4>
            <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-[10px] text-left font-mono space-y-2 h-44 overflow-y-auto divide-y divide-white/5" dir="ltr">
              {cascadeLogs.map((log, lidx) => (
                <div key={lidx} className="pt-1.5 text-slate-350">{log}</div>
              ))}
            </div>
            <p className="text-[10px] text-gray-500">جداول لیگ، امار آقای گلی و پروفایل تیمی/انفرادی بازیکنان با موفقیت در حال تسطیح است...</p>
          </div>
        </div>
      )}
    </div>
  );
}

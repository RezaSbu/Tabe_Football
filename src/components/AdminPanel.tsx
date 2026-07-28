import React, { useState, Suspense } from "react";
import { NewsItem, MatchItem, StandingRow, TransferItem, ImageItem, ContactSubmission, HeroSlideItem } from "../types";
import { 
  Lock, 
  Database,
  Trophy,
  Flame,
  Users,
  Megaphone,
  Activity,
  Layout,
  Sliders,
  Settings,
  ShieldCheck,
  Award,
  Zap,
  Power,
  Tv,
  FileImage,
  Menu,
  X
} from "lucide-react";
import AdminDashboard from "./AdminDashboard";
import AdminMatchHub from "./AdminMatchHub";
import AdminDirectOverrides from "./AdminDirectOverrides";
import DiagnosticsPanel from "./DiagnosticsPanel";
import AdminPortalHub from "./AdminPortalHub";
import AdminSelectedCombinations from "./AdminSelectedCombinations";
import AdminPlayerProfiles from "./AdminPlayerProfiles";
import AdminTeamProfiles from "./AdminTeamProfiles";
import AdminCoachProfiles from "./AdminCoachProfiles";
import AdminBracketManager from "./AdminBracketManager";
import AdminMediaFiles from "./AdminMediaFiles";
import { AdminArchiveManager } from "./AdminArchiveManager";
import AdminHeroSlides from "./AdminHeroSlides";

interface AdminPanelProps {
  news: NewsItem[];
  matches: MatchItem[];
  standings: Record<string, StandingRow[]>;
  transfers: TransferItem[];
  teamTransfersList?: any[];
  images: ImageItem[];
  submissions: ContactSubmission[];
  heroSlides?: HeroSlideItem[];
  legionnaires: any[];
  stats: Record<string, any>;
  teams: any[];
  players: any[];
  coaches?: any[];
  bracket: any;
  selectedCombinations?: any[];
  adConfig: any;
  archives?: any[];
  currentSeason?: string;
  onUpdateArchives?: (newArchives: any[]) => void;
  onUpdateStandings: (leagueKey: string, rows: StandingRow[]) => Promise<boolean>;
  onUpdateStats: (leagueKey: string, statsData: any) => Promise<boolean>;
  onUpdateAdConfig: (configData: any) => Promise<boolean>;
  onCentralSync: () => Promise<boolean>;
  isAdminLoggedIn: boolean;
  onLogin: (token: string) => void;
  onRefreshData: () => void;
  onLogout?: () => void;
}

export default function AdminPanel({
  news = [],
  matches = [],
  standings = {},
  transfers = [],
  teamTransfersList = [],
  images = [],
  submissions = [],
  heroSlides = [],
  legionnaires = [],
  stats = {},
  teams = [],
  players = [],
  coaches = [],
  bracket,
  selectedCombinations = [],
  adConfig,
  archives = [],
  currentSeason = "1404",
  onUpdateArchives,
  onUpdateStandings,
  onUpdateStats,
  onUpdateAdConfig,
  onCentralSync,
  isAdminLoggedIn,
  onLogin,
  onRefreshData,
  onLogout
}: AdminPanelProps) {
  // Authentication Form States
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active Main Tab State
  const [activeMainTab, setActiveMainTab] = useState<"dashboard" | "matches" | "overrides" | "diagnostics" | "portal" | "selected-combination" | "players" | "coaches" | "teams" | "bracket" | "media" | "archive" | "hero-slides">("dashboard");
  const [successMessage, setSuccessMessage] = useState("");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const showShortSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 4000);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        onLogin(data.token);
        showShortSuccess("ورود موفقیت‌آمیز به آکادمی وب مدیریت تب فوتبال انجام شد.");
      } else {
        setAuthError(data.message || "اطلاعات ورود اشتباه است.");
      }
    } catch (err) {
      setAuthError("خطا در برقراری ارتباط با پکیج احراز هویت سرور دیتابیس.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct Team & Player Put override API calls
  const handleUpdateTeam = async (id: string, updatedFields: any) => {
    try {
      const res = await fetch(`/api/teams/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields)
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const handleUpdatePlayer = async (id: string, updatedFields: any) => {
    try {
      const res = await fetch(`/api/players/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields)
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const handleAddNewsDirectly = async (newsPayload: any) => {
    try {
      const res = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newsPayload)
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  // RENDER LOGIN GATEWAY IF UNLINKED
  if (!isAdminLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] px-4" dir="rtl">
        <div className="w-full max-w-md p-6 sm:p-8 bg-slate-900/90 backdrop-blur-xl border border-white/5 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 bg-red-655/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="text-center space-y-3 mb-6 relative z-10">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-red-655/10 border border-red-500/15 text-red-500 shadow-lg shadow-red-950/20">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-black text-white tracking-tight">پنل ویژه نظارت و مدیریت کلان پورتال تب فوتبال</h2>
            <p className="text-[11px] text-gray-400">خواهشمند است گذرواژه امنیتی را جهت دسترسی به ترازهای ورزشی وارد کنید.</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4 relative z-10">
            <div>
              <label className="block text-[11px] text-slate-400 font-bold mb-1.5">کد کاربری ادمین</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655 font-mono"
                placeholder="admin"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 font-bold mb-1.5">گذرواژه امنیتی سیستم</label>
              <input
                type="password"
                value={password}
                required
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655 font-mono"
                placeholder="••••••••"
              />
            </div>

            {authError && (
              <p className="text-[10px] text-red-400 font-bold bg-red-950/20 border border-red-800/30 p-2.5 rounded-lg">
                ⚠ {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-red-655 hover:bg-red-700 hover:shadow-lg hover:shadow-red-950/30 text-white font-black text-xs py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <span>{isSubmitting ? "در حال احراز هویت..." : "ثبت و ورود امن به پایگاه تخصصی"}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        className="md:hidden w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0b0b0f] border border-white/5 text-xs font-bold text-slate-400 hover:text-white transition"
      >
        {isMobileSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        <span>{isMobileSidebarOpen ? "بستن منوی مدیریت" : "باز کردن منوی مدیریت"}</span>
      </button>

      <div className="grid gap-6 md:grid-cols-12">
      {/* Sidebar */}
      <div className={`${isMobileSidebarOpen ? 'block' : 'hidden'} md:block md:col-span-3 bg-[#0b0b0f] border border-white/5 p-4 rounded-3xl h-fit space-y-4 relative`}>
        <div className="absolute top-0 right-0 h-20 w-20 bg-red-655/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <ShieldCheck className="h-5 w-5 text-red-500" />
          <div>
            <h3 className="font-extrabold text-xs text-white">ترمینال ادمین پرسابقه تب فوتبال</h3>
            <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
              <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-ping" />
              اتصال فرکانس سرور برقرار است
            </span>
          </div>
        </div>

        {/* Sidebar Navigation Options */}
        <div className="space-y-1 text-xs">
          <button
            onClick={() => { setActiveMainTab("dashboard"); setIsMobileSidebarOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold transition cursor-pointer text-right ${activeMainTab === "dashboard" ? "bg-red-655 text-white shadow-md shadow-red-950/40" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
          >
            <Layout className="h-4 w-4" />
            <span>پیشخوان و تطبیق هوشمند</span>
          </button>

          <button
            onClick={() => { setActiveMainTab("matches"); setIsMobileSidebarOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold transition cursor-pointer text-right ${activeMainTab === "matches" ? "bg-red-655 text-white shadow-md shadow-red-950/40" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
          >
            <Tv className="h-4 w-4" />
            <span>مدیریت مسابقات و آمار</span>
          </button>

          <button
            onClick={() => { setActiveMainTab("bracket"); setIsMobileSidebarOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold transition cursor-pointer text-right ${activeMainTab === "bracket" ? "bg-red-655 text-white shadow-md shadow-red-950/40" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
            id="tab-bracket"
          >
            <Trophy className="h-4 w-4 text-yellow-500" />
            <span>مدیریت نمودار جام حذفی</span>
          </button>

          <button
            onClick={() => { setActiveMainTab("overrides"); setIsMobileSidebarOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold transition cursor-pointer text-right ${activeMainTab === "overrides" ? "bg-red-655 text-white shadow-md shadow-red-950/40" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
          >
            <Sliders className="h-4 w-4" />
            <span>بازنویسی مستقیم دیتابیس</span>
          </button>

          <button
            onClick={() => { setActiveMainTab("diagnostics"); setIsMobileSidebarOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold transition cursor-pointer text-right ${activeMainTab === "diagnostics" ? "bg-red-655 text-white shadow-md shadow-red-950/40" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
          >
            <Activity className="h-4 w-4" />
            <span>لاگ و تست سیستم</span>
          </button>

          <button
            onClick={() => { setActiveMainTab("portal"); setIsMobileSidebarOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold transition cursor-pointer text-right ${activeMainTab === "portal" ? "bg-red-655 text-white shadow-md shadow-red-950/40" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
          >
            <Megaphone className="h-4 w-4" />
            <span>محتوای رسانه و تبلیغات</span>
          </button>

          <button
            onClick={() => { setActiveMainTab("media"); setIsMobileSidebarOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold transition cursor-pointer text-right ${activeMainTab === "media" ? "bg-red-655 text-white shadow-md shadow-red-950/40" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
          >
            <FileImage className="h-4 w-4" />
            <span>مدیریت تصاویر دیتابیس</span>
          </button>

          <button
            onClick={() => { setActiveMainTab("hero-slides"); setIsMobileSidebarOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold transition cursor-pointer text-right ${activeMainTab === "hero-slides" ? "bg-red-655 text-white shadow-md shadow-red-950/40" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
          >
            <Sliders className="h-4 w-4 text-cyan-400" />
            <span>اسلایدر اصلی صفحه</span>
          </button>

          <div className="my-2 border-t border-white/5" />

          <button
            onClick={() => { setActiveMainTab("selected-combination"); setIsMobileSidebarOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold transition cursor-pointer text-right ${activeMainTab === "selected-combination" ? "bg-amber-600 text-white shadow-md shadow-amber-950/40" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
          >
            <Award className="h-4 w-4 text-amber-500" />
            <span>ترکیب منتخب هفته</span>
          </button>

          <button
            onClick={() => { setActiveMainTab("players"); setIsMobileSidebarOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold transition cursor-pointer text-right ${activeMainTab === "players" ? "bg-red-655 text-white shadow-md shadow-red-950/40" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
          >
            <Users className="h-4 w-4" />
            <span>تعریف و مدیریت بازیکنان</span>
          </button>

          <button
            onClick={() => { setActiveMainTab("coaches"); setIsMobileSidebarOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold transition cursor-pointer text-right ${activeMainTab === "coaches" ? "bg-red-655 text-white shadow-md shadow-red-950/40" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
          >
            <Users className="h-4 w-4" />
            <span>تعریف و مدیریت مربیان</span>
          </button>

          <button
            onClick={() => { setActiveMainTab("teams"); setIsMobileSidebarOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold transition cursor-pointer text-right ${activeMainTab === "teams" ? "bg-red-655 text-white shadow-md shadow-red-950/40" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>تعریف و مدیریت تیم‌ها</span>
          </button>

          <button
            onClick={() => { setActiveMainTab("archive"); setIsMobileSidebarOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold transition cursor-pointer text-right ${activeMainTab === "archive" ? "bg-red-655 text-white shadow-md shadow-red-950/40" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
          >
            <Database className="h-4 w-4 text-rose-450" />
            <span>بایگانی و شروع فصل جدید</span>
          </button>
        </div>

        {/* Global synchronization / Force save to db.json endpoint button */}
        <div className="pt-4 border-t border-white/10 space-y-2">
          <button
            onClick={async () => {
              const success = await onCentralSync();
              if (success) {
                showShortSuccess("همگام‌سازی فیزیکی و فلاش هارد با db.json با موفقیت کامل انجام شد.");
              } else {
                alert("عدم پاسخگویی هارد دیسک سرور لینوکس.");
              }
            }}
            className="w-full bg-emerald-900/30 hover:bg-emerald-900/40 border border-emerald-800/30 text-emerald-400 font-bold text-[10px] py-2 rounded-xl transition cursor-pointer text-center flex items-center justify-center gap-1.5"
          >
            <Database className="h-3.5 w-3.5 animate-pulse" />
            <span>فلاش هماهنگی فیزیکی دیتابیس</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full bg-white/5 hover:bg-red-950/30 text-slate-400 hover:text-red-400 font-bold text-[10px] py-1.5 rounded-xl transition cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              <Power className="h-3.5 w-3.5" />
              <span>خروج از حساب</span>
            </button>
          )}
        </div>
      </div>

      {/* Main workspace container block */}
      <div className="md:col-span-9 space-y-6">
        {/* Short success notification block */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-700/30 text-xs font-black text-emerald-450 animate-bounce flex items-center gap-2">
            <ShieldCheck className="h-4.5 w-4.5 text-emerald-450" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab 1: DASHBOARD MONITOR & SCANNER */}
        {activeMainTab === "dashboard" && (
          <AdminDashboard
            matches={matches}
            standings={standings}
            teams={teams}
            players={players}
            submissions={submissions}
            newsCount={news.length}
            onUpdateStandings={onUpdateStandings}
            onUpdateTeam={handleUpdateTeam}
            onUpdatePlayer={handleUpdatePlayer}
            onRefreshData={onRefreshData}
          />
        )}

        {/* Tab 2: SPORTS HUB lifecycle (Matches) */}
        {activeMainTab === "matches" && (
          <AdminMatchHub
            matches={matches}
            teams={teams}
            players={players}
            standings={standings}
            stats={stats}
            onRefreshData={onRefreshData}
            onUpdateStandings={onUpdateStandings}
            onUpdateStats={onUpdateStats}
            onUpdateTeam={handleUpdateTeam}
            onUpdatePlayer={handleUpdatePlayer}
          />
        )}

        {/* Tab 3: DIRECT OVERRIDES GRID SHEET */}
        {activeMainTab === "overrides" && (
          <AdminDirectOverrides
            standings={standings}
            teams={teams}
            players={players}
            stats={stats}
            onUpdateStandings={onUpdateStandings}
            onUpdateStats={onUpdateStats}
            onUpdateTeam={handleUpdateTeam}
            onUpdatePlayer={handleUpdatePlayer}
            onRefreshData={onRefreshData}
          />
        )}

        {/* Tab 4: DIAGNOSTICS */}
        {activeMainTab === "diagnostics" && (
          <Suspense fallback={<div className="p-8 text-center text-sm text-gray-400">در حال بارگذاری...</div>}>
            <DiagnosticsPanel />
          </Suspense>
        )}

        {/* Tab 5: GENERAL PORTAL CONTENT */}
        {activeMainTab === "portal" && (
          <AdminPortalHub
            news={news}
            transfers={transfers}
            teamTransfersList={teamTransfersList}
            images={images}
            submissions={submissions}
            legionnaires={legionnaires}
            adConfig={adConfig}
            onUpdateAdConfig={onUpdateAdConfig}
            onRefreshData={onRefreshData}
          />
        )}

        {/* Tab 6: Selected weekly team combination */}
        {activeMainTab === "selected-combination" && (
          <AdminSelectedCombinations
            combinations={selectedCombinations}
            players={players}
            teams={teams}
            onRefreshData={onRefreshData}
            showShortSuccess={showShortSuccess}
          />
        )}

        {/* Tab 7: Manage Player Profiles */}
        {activeMainTab === "players" && (
          <AdminPlayerProfiles
            players={players}
            teams={teams}
            onRefreshData={onRefreshData}
            showShortSuccess={showShortSuccess}
          />
        )}

        {/* Tab 8: Manage Coach Profiles */}
        {activeMainTab === "coaches" && (
          <AdminCoachProfiles
            coaches={coaches}
            teams={teams}
            onRefreshData={onRefreshData}
            showShortSuccess={showShortSuccess}
          />
        )}

        {/* Tab 9: Manage Team Profiles */}
        {activeMainTab === "teams" && (
          <AdminTeamProfiles
            teams={teams}
            onRefreshData={onRefreshData}
            showShortSuccess={showShortSuccess}
          />
        )}

        {/* Tab 9: Manage Hazfi Cup Bracket */}
        {activeMainTab === "bracket" && (
          <AdminBracketManager
            bracket={bracket}
            matches={matches}
            onRefreshData={onRefreshData}
            showShortSuccess={showShortSuccess}
          />
        )}

        {/* Tab 10: Database Image Storage and Migration */}
        {activeMainTab === "media" && (
          <AdminMediaFiles />
        )}

        {/* Tab: Hero Slider Management */}
        {activeMainTab === "hero-slides" && (
          <AdminHeroSlides
            heroSlides={heroSlides}
            news={news}
            transfers={transfers}
            legionnaires={legionnaires}
            images={images}
            onRefreshData={onRefreshData}
            showShortSuccess={showShortSuccess}
          />
        )}

        {/* Tab 11: Archive and Season resets */}
        {activeMainTab === "archive" && (
          <AdminArchiveManager
            archives={archives}
            currentSeason={currentSeason}
            onArchiveCreated={(newArcs) => {
              if (onUpdateArchives) onUpdateArchives(newArcs);
              onRefreshData();
            }}
            onArchiveDeleted={(newArcs) => {
              if (onUpdateArchives) onUpdateArchives(newArcs);
              onRefreshData();
            }}
          />
        )}
      </div>
      </div>
    </div>
  );
}

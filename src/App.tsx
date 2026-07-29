import React, { Suspense, useEffect, useState } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import {
  NewsItem,
  MatchItem,
  StandingRow,
  TransferItem,
  ImageItem,
  ContactSubmission,
  StatsData,
  TeamTransferItem
} from "./types";
import Navbar from "./components/Navbar";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { useAppData } from "./hooks/useAppData";
import { useGoalNotifications } from "./hooks/useGoalNotifications";
import { GoalNotification } from "./components/GoalNotification";
import PopupAd from "./components/PopupAd";
import FloatingAd from "./components/FloatingAd";
import BottomBarAd from "./components/BottomBarAd";
import SlideInAd from "./components/SlideInAd";
import SEO from "./components/SEO";

const LeagueTables = React.lazy(() => import("./components/LeagueTables"));
const FutsalPage = React.lazy(() => import("./components/FutsalPage"));
const TransfersList = React.lazy(() => import("./components/TransfersList"));
const PhotoGallery = React.lazy(() => import("./components/PhotoGallery"));
const AdminPanel = React.lazy(() => import("./components/AdminPanel"));
const HomePage = React.lazy(() => import("./pages/HomePage"));
const LiveScoresPage = React.lazy(() => import("./pages/LiveScoresPage"));
const NewsPage = React.lazy(() => import("./pages/NewsPage"));
const LegionnairesPage = React.lazy(() => import("./pages/LegionnairesPage"));
const StatsPage = React.lazy(() => import("./pages/StatsPage"));

const NewsDetailPage = React.lazy(() => import("./pages/NewsDetailPage"));
const TeamDetailPage = React.lazy(() => import("./pages/TeamDetailPage"));
const PlayerDetailPage = React.lazy(() => import("./pages/PlayerDetailPage"));
const MatchDetailPage = React.lazy(() => import("./pages/MatchDetailPage"));
const CoachDetailPage = React.lazy(() => import("./pages/CoachDetailPage"));
const LegionnaireDetailPage = React.lazy(() => import("./pages/LegionnaireDetailPage"));
const TransferDetailPage = React.lazy(() => import("./pages/TransferDetailPage"));

import { getSafeImageUrl, getRelativeDateLabel, convertGregorianToShamsi, toPersianDigits } from "./utils";

const PATH_TO_TAB: Record<string, string> = {
  "/": "home",
  "/news": "news",
  "/pro-league": "pro-league",
  "/league-1": "league-1",
  "/league-2": "league-2",
  "/hazfi-cup": "hazfi-cup",
  "/futsal": "futsal",
  "/transfers": "transfers",
  "/legionnaires": "legionnaires",
  "/stats": "stats",
  "/live-scores": "live-scores",
  "/gallery": "images",
  "/admin": "admin",
};

const TAB_TO_PATH: Record<string, string> = Object.fromEntries(
  Object.entries(PATH_TO_TAB).map(([path, tab]) => [tab, path])
);

const DETAIL_PREFIXES = ["/news/", "/team/", "/player/", "/match/", "/coach/", "/legionnaire/", "/transfer/"];

function isDetailPath(pathname: string) {
  return DETAIL_PREFIXES.some(p => pathname.startsWith(p));
}

const loadingFallback = (
  <div className="flex items-center justify-center min-h-[40vh]">
    <div className="text-center space-y-3">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-sm text-slate-400">در حال بارگذاری...</p>
    </div>
  </div>
);

function TabContent({ d, triggerMockGoalNotification }: { d: ReturnType<typeof useAppData>; triggerMockGoalNotification: any }) {
  const navigate = useNavigate();
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const leagueCallbacks = (art: NewsItem) => {
    navigate(`/news/${art.id}`);
  };

  const renderLeagueTables = (leagueKey: "pro-league" | "league-1" | "league-2" | "hazfi-cup") => (
    <LeagueTables
      leagueKey={leagueKey}
      bracket={d.bracket}
      standings={d.standings}
      news={d.news}
      matches={d.matches}
      teams={d.teams}
      players={d.players}
      stats={d.stats}
      historicalData={d.historicalData}
      archives={d.archives}
      currentSeason={d.currentSeason}
      onSelectNews={(art: NewsItem) => navigate(`/news/${art.id}`)}
      onSelectTeam={(nameOrId: string) => {
        const tm = d.teams.find((t: any) => t.id === nameOrId || t.name.includes(nameOrId));
        if (tm) navigate(`/team/${tm.id}`);
      }}
      onSelectPlayer={(id: string) => navigate(`/player/${id}`)}
      onSelectMatch={(match: any) => navigate(`/match/${match.id}`)}
    />
  );

  return (
    <Suspense fallback={loadingFallback}>
      <div className="space-y-6">
        {d.activeTab === "home" && (
          <>
            <SEO
              title="پورتال جامع فوتبال ایران"
              description="پورتال جامع فوتبال ایران - اخبار لحظه‌ای، نتایج زنده، جدول رده‌بندی لیگ برتر، آمار بازیکنان، نقل و انتقالات"
              url="/"
              structuredData={{
                "@context": "https://schema.org",
                "@type": "WebSite",
                "name": "تب فوتبال",
                "url": "https://tabefootball.com",
                "description": "پورتال جامع فوتبال ایران",
                "potentialAction": {
                  "@type": "SearchAction",
                  "target": "https://tabefootball.com/news?q={search_term_string}",
                  "query-input": "required name=search_term_string"
                }
              }}
            />
            <HomePage matches={d.matches} news={d.news} transfers={d.transfers} heroSlides={d.heroSlides} legionnaires={d.legionnaires} stats={d.stats}
              liveGoals={d.liveGoals} setSelectedMatch={(m: any) => navigate(`/match/${m.id}`)} setActiveArticle={(a: any) => navigate(`/news/${a.id}`)}
              handleTabChangeSubmit={d.handleTabChangeSubmit} getRelativeDateLabel={getRelativeDateLabel}
              convertGregorianToShamsi={convertGregorianToShamsi} toPersianDigits={toPersianDigits}
              getSafeImageUrl={getSafeImageUrl} currentSeason={d.currentSeason}
              selectedLeagueFilterOnStats={d.selectedLeagueFilterOnStats}
              setSelectedLeagueFilterOnStats={d.setSelectedLeagueFilterOnStats} archives={d.archives}
              standings={d.standings} players={d.players} selectedCombinations={d.selectedCombinations}
              setSelectedPlayerId={(id: string | null) => id && navigate(`/player/${id}`)} setSelectedTeamId={(id: string | null) => id && navigate(`/team/${id}`)}
              adConfig={d.adConfig} onSelectTransfer={(id: string) => navigate(`/transfer/${id}`)} />
          </>
        )}

        {d.activeTab === "live-scores" && (
          <>
            <SEO title="نتایج زنده فوتبال" description="پیگیری نتایج زنده مسابقات فوتبال ایران و لیگ‌های مختلف به صورت لحظه‌ای" url="/live-scores" />
            <LiveScoresPage matches={d.matches} liveGoals={d.liveGoals} subscribedTeams={d.subscribedTeams}
              livescoreFilter={d.livescoreFilter} setLivescoreFilter={d.setLivescoreFilter}
              setSelectedMatch={(m: any) => navigate(`/match/${m.id}`)}
              getRelativeDateLabel={getRelativeDateLabel} convertGregorianToShamsi={convertGregorianToShamsi}
              toPersianDigits={toPersianDigits} />
          </>
        )}

        {d.activeTab === "pro-league" && (
          <>
            <SEO title="لیگ برتر خلیج فارس" description="جدول رده‌بندی، نتایج و آمار لیگ برتر خلیج فارس فوتبال ایران" url="/pro-league" />
            {renderLeagueTables("pro-league")}
          </>
        )}

        {d.activeTab === "league-1" && (
          <>
            <SEO title="لیگ دسته اول آزادگان" description="جدول رده‌بندی و نتایج لیگ دسته اول فوتبال ایران (آزادگان)" url="/league-1" />
            {renderLeagueTables("league-1")}
          </>
        )}

        {d.activeTab === "league-2" && (
          <>
            <SEO title="لیگ دسته دوم کشوری" description="جدول رده‌بندی و نتایج لیگ دسته دوم فوتبال ایران" url="/league-2" />
            {renderLeagueTables("league-2")}
          </>
        )}

        {d.activeTab === "hazfi-cup" && (
          <>
            <SEO title="جام حذفی فوتبال ایران" description="نتایج و جدول مسابقات جام حذفی فوتبال ایران" url="/hazfi-cup" />
            {renderLeagueTables("hazfi-cup")}
          </>
        )}

        {d.activeTab === "futsal" && (
          <>
            <SEO title="فوتسال ایران" description="اخبار، نتایج و آمار فوتسال ایران و لیگ برتر فوتسال" url="/futsal" />
            <FutsalPage standings={d.standings} news={d.news} matches={d.matches} teams={d.teams}
              players={d.players} stats={d.stats} archives={d.archives}
              historicalData={d.historicalData} currentSeason={d.currentSeason}
              onSelectNews={(art: NewsItem) => navigate(`/news/${art.id}`)}
              onSelectTeam={(id: string) => navigate(`/team/${id}`)}
              onSelectPlayer={(id: string) => navigate(`/player/${id}`)}
              onSelectMatch={(match: any) => navigate(`/match/${match.id}`)} />
          </>
        )}

        {d.activeTab === "news" && (
          <>
            <SEO title="آخرین اخبار فوتبال ایران" description="آخرین اخبار فوتبال ایران، لیگ برتر، نقل و انتقالات و اخبار ورزشی" url="/news" />
            <NewsPage news={d.news} newsCategoryFilter={d.newsCategoryFilter}
              setNewsCategoryFilter={d.setNewsCategoryFilter} newsSearch={d.newsSearch}
              setNewsSearch={d.setNewsSearch} setActiveArticle={(a: any) => navigate(`/news/${a.id}`)} />
          </>
        )}

        {d.activeTab === "legionnaires" && (
          <>
            <SEO title="لژیونرهای ایرانی" description="عملکرد و اخبار لژیونرهای ایرانی در لیگ‌های خارجی" url="/legionnaires" />
            <LegionnairesPage legionnaires={d.legionnaires} legionnairesSearch={d.legionnairesSearch}
              setLegionnairesSearch={d.setLegionnairesSearch}
              handleSelectLegionnaire={(leg: any) => navigate(`/legionnaire/${leg.id}`)} getSafeImageUrl={getSafeImageUrl} />
          </>
        )}

        {d.activeTab === "transfers" && (
          <>
            <SEO title="نقل و انتقالات فوتبال ایران" description="آخرین اخبار نقل و انتقالات فوتبال ایران، لیگ برتر و لیگ یک" url="/transfers" />
            <div className="animate-in fade-in">
              <TransfersList transfers={d.transfers} teams={d.teams} teamTransfersList={d.teamTransfersList}
                onSelectNews={(art: NewsItem) => navigate(`/news/${art.id}`)} onSelectTransfer={(id: string) => navigate(`/transfer/${id}`)} initialSearchQuery={d.transfersSearch} />
            </div>
          </>
        )}

        {d.activeTab === "images" && (
          <>
            <SEO title="گالری تصاویر فوتبال" description="گالری تصاویر بازیکنان، مسابقات و رویدادهای فوتبال ایران" url="/gallery" />
            <div className="animate-in fade-in">
              <PhotoGallery images={d.images} initialSearchTag={d.gallerySearchTag} />
            </div>
          </>
        )}

        {d.activeTab === "stats" && (
          <>
            <SEO title="آمار بازیکنان فوتبال ایران" description="آمار پیشرفته بازیکنان فوتبال ایران، گلزنان، پاسورها و بهترین بازیکنان فصل" url="/stats" />
            <StatsPage stats={d.stats} archives={d.archives} statsSeason={d.statsSeason}
              setStatsSeason={d.setStatsSeason} selectedLeagueFilterOnStats={d.selectedLeagueFilterOnStats}
              setSelectedLeagueFilterOnStats={d.setSelectedLeagueFilterOnStats}
              currentSeason={d.currentSeason} toPersianDigits={toPersianDigits} />
          </>
        )}

        {d.activeTab === "admin" && (
          <div className="animate-in fade-in">
            <SEO title="پنل مدیریت" description="پنل مدیریت پورتال تب فوتبال" url="/admin" />
            <AdminPanel news={d.news} matches={d.matches} standings={d.standings}
              transfers={d.transfers} teamTransfersList={d.teamTransfersList} images={d.images}
              submissions={d.submissions} heroSlides={d.heroSlides} legionnaires={d.legionnaires} stats={d.stats}
              teams={d.teams} players={d.players} bracket={d.bracket}
              selectedCombinations={d.selectedCombinations} adConfig={d.adConfig}
              archives={d.archives} currentSeason={d.currentSeason}
              onUpdateArchives={d.setArchives} onUpdateStandings={d.handleUpdateStandings}
              onUpdateStats={d.handleUpdateStats} onUpdateAdConfig={d.handleUpdateAdConfig}
              onCentralSync={d.handleCentralSync} onLogout={d.handleAdminLogout}
              isAdminLoggedIn={d.isAdminLoggedIn} onLogin={d.handleAdminLogin}
              onRefreshData={d.fetchData} />
          </div>
        )}
      </div>
    </Suspense>
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const d = useAppData();
  const { triggerMockGoalNotification } = useGoalNotifications({
    activeGoalEvent: d.activeGoalEvent,
    setActiveGoalEvent: d.setActiveGoalEvent,
    matches: d.matches,
    subscribedTeams: d.subscribedTeams,
  });

  const [initialSyncDone, setInitialSyncDone] = useState(false);

  useEffect(() => {
    const pathTab = PATH_TO_TAB[location.pathname];
    if (pathTab && pathTab !== d.activeTab) {
      d.setActiveTab(pathTab);
    }
    setInitialSyncDone(true);
  }, [location.pathname]);

  useEffect(() => {
    if (!initialSyncDone) return;
    if (isDetailPath(location.pathname)) return;
    const path = TAB_TO_PATH[d.activeTab] || "/";
    if (location.pathname !== path) {
      navigate(path, { replace: true });
    }
  }, [d.activeTab, initialSyncDone]);

  if (d.isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-950 text-white" dir="rtl">
        <div className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-t-red-650 border-r-transparent border-gray-800" />
          <h1 className="font-bold text-lg">در حال بارگذاری پورتال تب فوتبال...</h1>
          <p className="text-xs text-gray-500">در حال همگام‌سازی با سرور مرکزی...</p>
        </div>
      </div>
    );
  }

  if (d.isAdminLoggedIn && d.activeTab === "admin" && !isDetailPath(location.pathname)) {
    return (
      <div className="min-h-screen bg-gray-950 font-sans text-gray-200 antialiased py-6 px-4 sm:px-6" dir="rtl" id="standalone-admin-lock">
        <SEO title="پنل مدیریت" description="پنل مدیریت پورتال تب فوتبال" url="/admin" />
        <div className="mx-auto max-w-7xl">
          <AdminPanel news={d.news} matches={d.matches} standings={d.standings} transfers={d.transfers}
            teamTransfersList={d.teamTransfersList} images={d.images} submissions={d.submissions}
            heroSlides={d.heroSlides} legionnaires={d.legionnaires} stats={d.stats} teams={d.teams} players={d.players} coaches={d.coaches}
            bracket={d.bracket} selectedCombinations={d.selectedCombinations} adConfig={d.adConfig}
            archives={d.archives} currentSeason={d.currentSeason}
            onUpdateStandings={d.handleUpdateStandings} onUpdateStats={d.handleUpdateStats}
            onUpdateAdConfig={d.handleUpdateAdConfig} onCentralSync={d.handleCentralSync}
            isAdminLoggedIn={d.isAdminLoggedIn} onLogin={d.handleAdminLogin}
            onRefreshData={d.fetchData} onLogout={d.handleAdminLogout} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 font-sans text-gray-200 antialiased" style={{ contentVisibility: "auto" }}>
      <Header
        news={d.news} teams={d.teams} players={d.players} coaches={d.coaches}
        onSelectArticle={(art: any) => navigate(`/news/${art.id}`)}
        onSelectTeam={(id: string) => navigate(`/team/${id}`)}
        onSelectPlayer={(id: string) => navigate(`/player/${id}`)}
        onSelectCoach={(id: string) => navigate(`/coach/${id}`)}
        setActiveTab={d.handleTabChangeSubmit}
      />

      <Navbar activeTab={d.activeTab} setActiveTab={d.handleTabChangeSubmit} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Routes>
          <Route path="/news/:id" element={
            <Suspense fallback={loadingFallback}><NewsDetailPage /></Suspense>
          } />
          <Route path="/team/:id" element={
            <Suspense fallback={loadingFallback}><TeamDetailPage /></Suspense>
          } />
          <Route path="/player/:id" element={
            <Suspense fallback={loadingFallback}><PlayerDetailPage /></Suspense>
          } />
          <Route path="/match/:id" element={
            <Suspense fallback={loadingFallback}><MatchDetailPage /></Suspense>
          } />
          <Route path="/coach/:id" element={
            <Suspense fallback={loadingFallback}><CoachDetailPage /></Suspense>
          } />
          <Route path="/legionnaire/:id" element={
            <Suspense fallback={loadingFallback}><LegionnaireDetailPage /></Suspense>
          } />
          <Route path="/transfer/:id" element={
            <Suspense fallback={loadingFallback}><TransferDetailPage /></Suspense>
          } />
          <Route path="*" element={<TabContent d={d} triggerMockGoalNotification={triggerMockGoalNotification} />} />
        </Routes>
      </main>

      <Footer setActiveTab={d.handleTabChangeSubmit} />

      <GoalNotification activeGoalEvent={d.activeGoalEvent} setActiveGoalEvent={d.setActiveGoalEvent} />

      {d.adConfig?.popupAd?.enabled && <PopupAd ad={d.adConfig.popupAd} />}
      {d.adConfig?.floatingAd?.enabled && <FloatingAd ad={d.adConfig.floatingAd} />}
      {d.adConfig?.bottomBarAd?.enabled && <BottomBarAd ad={d.adConfig.bottomBarAd} />}
      {d.adConfig?.slideInAd?.enabled && <SlideInAd ad={d.adConfig.slideInAd} />}
    </div>
  );
}

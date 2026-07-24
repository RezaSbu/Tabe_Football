import React, { Suspense } from "react";
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

const LeagueTables = React.lazy(() => import("./components/LeagueTables"));
const FutsalPage = React.lazy(() => import("./components/FutsalPage"));
const TransfersList = React.lazy(() => import("./components/TransfersList"));
const PhotoGallery = React.lazy(() => import("./components/PhotoGallery"));
const AdminPanel = React.lazy(() => import("./components/AdminPanel"));
const FanPredictions = React.lazy(() => import("./components/FanPredictions"));
const DiagnosticsPanel = React.lazy(() => import("./components/DiagnosticsPanel"));
const TeamDetail = React.lazy(() => import("./components/TeamDetail"));
const PlayerDetail = React.lazy(() => import("./components/PlayerDetail"));
const CoachDetail = React.lazy(() => import("./components/CoachDetail"));
const MatchDetailView = React.lazy(() => import("./components/MatchDetailView"));
const HomePage = React.lazy(() => import("./pages/HomePage"));
const LiveScoresPage = React.lazy(() => import("./pages/LiveScoresPage"));
const NewsPage = React.lazy(() => import("./pages/NewsPage"));
const LegionnairesPage = React.lazy(() => import("./pages/LegionnairesPage"));
const StatsPage = React.lazy(() => import("./pages/StatsPage"));
const ArticleDetailPage = React.lazy(() => import("./pages/ArticleDetailPage"));

import { getSafeImageUrl, getRelativeDateLabel, convertGregorianToShamsi, toPersianDigits } from "./utils";


export default function App() {
  const d = useAppData();
  const { triggerMockGoalNotification } = useGoalNotifications({
    activeGoalEvent: d.activeGoalEvent,
    setActiveGoalEvent: d.setActiveGoalEvent,
    matches: d.matches,
    subscribedTeams: d.subscribedTeams,
  });

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const leagueCallbacks = (art: NewsItem) => {
    d.setActiveArticle(art);
    scrollToTop();
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
      onSelectNews={leagueCallbacks}
      onSelectTeam={(nameOrId: string) => {
        const tm = d.teams.find((t: any) => t.id === nameOrId || t.name.includes(nameOrId));
        if (tm) { d.setSelectedTeamId(tm.id); scrollToTop(); }
      }}
      onSelectPlayer={(id: string) => { d.setSelectedPlayerId(id); scrollToTop(); }}
      onSelectMatch={d.setSelectedMatch}
    />
  );

  if (d.isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-950 text-white" dir="rtl">
        <div className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-t-red-650 border-r-transparent border-gray-800" />
          <h2 className="font-bold text-lg">در حال بارگذاری پورتال تب فوتبال...</h2>
          <p className="text-xs text-gray-500">در حال همگام‌سازی با سرور مرکزی...</p>
        </div>
      </div>
    );
  }

  if (d.isAdminLoggedIn && d.activeTab === "admin") {
    return (
      <div className="min-h-screen bg-gray-950 font-sans text-gray-200 antialiased py-6 px-4 sm:px-6" dir="rtl" id="standalone-admin-lock">
        <div className="mx-auto max-w-7xl">
          <AdminPanel news={d.news} matches={d.matches} standings={d.standings} transfers={d.transfers}
            teamTransfersList={d.teamTransfersList} images={d.images} submissions={d.submissions}
            legionnaires={d.legionnaires} stats={d.stats} teams={d.teams} players={d.players} coaches={d.coaches}
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
        onAdminOpen={() => d.handleTabChangeSubmit("admin")} isAdminLoggedIn={d.isAdminLoggedIn}
        onLogout={d.handleAdminLogout} news={d.news} teams={d.teams} players={d.players} coaches={d.coaches}
        onSelectArticle={(art) => { d.setActiveArticle(art); scrollToTop(); }}
        onSelectTeam={(id) => { d.setSelectedTeamId(id); scrollToTop(); }}
        onSelectPlayer={(id) => { d.setSelectedPlayerId(id); scrollToTop(); }}
        onSelectCoach={(id) => { d.setSelectedCoachId(id); scrollToTop(); }}
        setActiveTab={d.handleTabChangeSubmit}
      />

      <Navbar activeTab={d.activeTab} setActiveTab={d.handleTabChangeSubmit}
        onAdminOpen={() => d.handleTabChangeSubmit("admin")} isAdminLoggedIn={d.isAdminLoggedIn}
        onLogout={d.handleAdminLogout} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {d.selectedMatch ? (
          <MatchDetailView match={d.selectedMatch} allMatches={d.matches} players={d.players} allTeams={d.teams}
            onBack={() => d.setSelectedMatch(null)}
            onSelectPlayer={(id: string) => { d.setSelectedPlayerId(id); d.setSelectedMatch(null); scrollToTop(); }}
          />
        ) : d.selectedTeamId ? (
          <TeamDetail team={d.teams.find((t: any) => t.id === d.selectedTeamId)} players={d.players} coaches={d.coaches}
            allStandings={d.standings} allNews={d.news} allMatches={d.matches}
            onBack={() => d.setSelectedTeamId(null)}
            onSelectPlayer={(id: string) => { d.setSelectedPlayerId(id); d.setSelectedTeamId(null); }}
            onSelectCoach={(id: string) => { d.setSelectedCoachId(id); d.setSelectedTeamId(null); }}
            onSelectArticle={(art: NewsItem) => d.setActiveArticle(art)}
            onSelectMatch={(matchId: string) => { d.setSelectedMatch(d.matches.find((m: MatchItem) => String(m.id) === String(matchId)) || null); scrollToTop(); }}
          />
        ) : d.selectedPlayerId ? (
          <PlayerDetail player={d.findPlayerById(d.selectedPlayerId)} allMatches={d.matches} allTeams={d.teams}
            onBack={() => d.setSelectedPlayerId(null)}
            onSelectTeam={(teamName: string) => {
              const tm = d.teams.find((t: any) => t.name.includes(teamName) || teamName.includes(t.name));
              if (tm) { d.setSelectedTeamId(tm.id); d.setSelectedPlayerId(null); }
            }}
            onSelectMatch={(matchId: string) => { d.setSelectedMatch(d.matches.find((m: MatchItem) => String(m.id) === String(matchId)) || null); scrollToTop(); }}
          />
        ) : d.selectedCoachId ? (
          <CoachDetail coach={d.findCoachById(d.selectedCoachId)} allMatches={d.matches}
            onBack={() => d.setSelectedCoachId(null)}
            onSelectTeam={(teamName: string) => {
              const tm = d.teams.find((t: any) => t.name.includes(teamName) || teamName.includes(t.name));
              if (tm) { d.setSelectedTeamId(tm.id); d.setSelectedCoachId(null); }
            }}
          />
        ) : d.activeArticle ? (
          <ArticleDetailPage article={d.activeArticle} setActiveArticle={d.setActiveArticle} toPersianDigits={toPersianDigits} getSafeImageUrl={getSafeImageUrl} />
        ) : (
          <Suspense fallback={<div className="flex items-center justify-center min-h-[40vh]"><div className="text-center space-y-3"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" /><p className="text-sm text-slate-400">در حال بارگذاری...</p></div></div>}>
            <div className="space-y-6">
              {d.activeTab === "home" && (
                <HomePage matches={d.matches} news={d.news} transfers={d.transfers} stats={d.stats}
                  liveGoals={d.liveGoals} setSelectedMatch={d.setSelectedMatch} setActiveArticle={d.setActiveArticle}
                  handleTabChangeSubmit={d.handleTabChangeSubmit} getRelativeDateLabel={getRelativeDateLabel}
                  convertGregorianToShamsi={convertGregorianToShamsi} toPersianDigits={toPersianDigits}
                  getSafeImageUrl={getSafeImageUrl} currentSeason={d.currentSeason}
                  selectedLeagueFilterOnStats={d.selectedLeagueFilterOnStats}
                  setSelectedLeagueFilterOnStats={d.setSelectedLeagueFilterOnStats} archives={d.archives}
                  standings={d.standings} players={d.players} selectedCombinations={d.selectedCombinations}
                  setSelectedPlayerId={d.setSelectedPlayerId} setSelectedTeamId={d.setSelectedTeamId}
                  adConfig={d.adConfig} />
              )}

              {d.activeTab === "live-scores" && (
                <LiveScoresPage matches={d.matches} liveGoals={d.liveGoals} subscribedTeams={d.subscribedTeams}
                  livescoreFilter={d.livescoreFilter} setLivescoreFilter={d.setLivescoreFilter}
                  setSelectedMatch={d.setSelectedMatch} handleTabChangeSubmit={d.handleTabChangeSubmit}
                  getRelativeDateLabel={getRelativeDateLabel} convertGregorianToShamsi={convertGregorianToShamsi}
                  toPersianDigits={toPersianDigits} />
              )}

              {d.activeTab === "pro-league" && renderLeagueTables("pro-league")}
              {d.activeTab === "league-1" && renderLeagueTables("league-1")}
              {d.activeTab === "league-2" && renderLeagueTables("league-2")}
              {d.activeTab === "hazfi-cup" && renderLeagueTables("hazfi-cup")}

              {d.activeTab === "futsal" && (
                <FutsalPage standings={d.standings} news={d.news} matches={d.matches} teams={d.teams}
                  players={d.players} stats={d.stats} archives={d.archives}
                  historicalData={d.historicalData} currentSeason={d.currentSeason}
                  onSelectNews={leagueCallbacks}
                  onSelectTeam={(id: string) => { d.setSelectedTeamId(id); scrollToTop(); }}
                  onSelectPlayer={(id: string) => { d.setSelectedPlayerId(id); scrollToTop(); }}
                  onSelectMatch={d.setSelectedMatch} />
              )}

              {d.activeTab === "news" && (
                <NewsPage news={d.news} newsCategoryFilter={d.newsCategoryFilter}
                  setNewsCategoryFilter={d.setNewsCategoryFilter} newsSearch={d.newsSearch}
                  setNewsSearch={d.setNewsSearch} setActiveArticle={d.setActiveArticle} />
              )}

              {d.activeTab === "legionnaires" && (
                <LegionnairesPage legionnaires={d.legionnaires} legionnairesSearch={d.legionnairesSearch}
                  setLegionnairesSearch={d.setLegionnairesSearch}
                  handleSelectLegionnaire={d.handleSelectLegionnaire} getSafeImageUrl={getSafeImageUrl} />
              )}

              {d.activeTab === "transfers" && (
                <div className="animate-in fade-in">
                  <TransfersList transfers={d.transfers} teams={d.teams} teamTransfersList={d.teamTransfersList}
                    onSelectNews={(art: NewsItem) => d.setActiveArticle(art)} initialSearchQuery={d.transfersSearch} />
                </div>
              )}

              {d.activeTab === "images" && (
                <div className="animate-in fade-in">
                  <PhotoGallery images={d.images} initialSearchTag={d.gallerySearchTag} />
                </div>
              )}

              {d.activeTab === "stats" && (
                <StatsPage stats={d.stats} archives={d.archives} statsSeason={d.statsSeason}
                  setStatsSeason={d.setStatsSeason} selectedLeagueFilterOnStats={d.selectedLeagueFilterOnStats}
                  setSelectedLeagueFilterOnStats={d.setSelectedLeagueFilterOnStats}
                  currentSeason={d.currentSeason} toPersianDigits={toPersianDigits} />
              )}

              {d.activeTab === "predictions" && (
                <div className="animate-in fade-in">
                  <FanPredictions matches={d.matches} predictionsData={d.predictions}
                    onVote={d.handlePredictionVote} subscribedTeams={d.subscribedTeams}
                    onToggleSubscription={d.handleToggleSubscription}
                    triggerMockGoalNotification={triggerMockGoalNotification} />
                </div>
              )}

              {d.activeTab === "diagnostics" && (
                <div className="space-y-6 animate-in fade-in"><DiagnosticsPanel /></div>
              )}

              {d.activeTab === "admin" && (
                <div className="animate-in fade-in">
                  <AdminPanel news={d.news} matches={d.matches} standings={d.standings}
                    transfers={d.transfers} teamTransfersList={d.teamTransfersList} images={d.images}
                    submissions={d.submissions} legionnaires={d.legionnaires} stats={d.stats}
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
        )}
      </main>

      <Footer setActiveTab={d.setActiveTab} />

      <GoalNotification activeGoalEvent={d.activeGoalEvent} setActiveGoalEvent={d.setActiveGoalEvent} />

      {d.adConfig?.popupAd?.enabled && <PopupAd ad={d.adConfig.popupAd} />}
      {d.adConfig?.floatingAd?.enabled && <FloatingAd ad={d.adConfig.floatingAd} />}
      {d.adConfig?.bottomBarAd?.enabled && <BottomBarAd ad={d.adConfig.bottomBarAd} />}
      {d.adConfig?.slideInAd?.enabled && <SlideInAd ad={d.adConfig.slideInAd} />}
    </div>
  );
}

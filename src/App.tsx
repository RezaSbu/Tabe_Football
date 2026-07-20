import React, { useState, useEffect, Suspense } from "react";
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

import { getSafeImageUrl, computeDynamicAppletStats, getRelativeDateLabel, convertGregorianToShamsi, toPersianDigits } from "./utils";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("home");
  
  // App state loaded from /api/data
  const [news, setNews] = useState<NewsItem[]>([]);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [standings, setStandings] = useState<Record<string, StandingRow[]>>({});
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [teamTransfersList, setTeamTransfersList] = useState<TeamTransferItem[]>([]);
  const [legionnaires, setLegionnaires] = useState<any[]>([]);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [stats, setStats] = useState<Record<string, StatsData>>({});
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [lastScraped, setLastScraped] = useState<string>("");
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [bracket, setBracket] = useState<any>(null);
  const [selectedCombinations, setSelectedCombinations] = useState<any[]>([]);
  const [archives, setArchives] = useState<any[]>([]);

  // Deep View States
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);

  // New persistent fan states
  const [predictions, setPredictions] = useState<Record<string, any>>({});
  const [liveGoals, setLiveGoals] = useState<any[]>([]);
  const [subscribedTeams, setSubscribedTeams] = useState<string[]>([]);
  const [lastSeenGoalTimestamp, setLastSeenGoalTimestamp] = useState<number>(Date.now());
  const [activeGoalEvent, setActiveGoalEvent] = useState<any | null>(null);
  
  // Dynamic server values populated from db.json / Mock.json
  const [weeklyPoll, setWeeklyPoll] = useState<any>(null);
  const [popularTeams, setPopularTeams] = useState<any[]>([]);
  const [historicalData, setHistoricalData] = useState<any>({});
  const [featureGames, setFeatureGames] = useState<any[]>([]);

  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [activeArticle, setActiveArticle] = useState<NewsItem | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [selectedLeagueFilterOnStats, setSelectedLeagueFilterOnStats] = useState("pro-league");
  const [currentSeason, setCurrentSeason] = useState<string>("1404");
  const [statsSeason, setStatsSeason] = useState<string>("1404");
  const [sidebarLeagueTab, setSidebarLeagueTab] = useState("pro-league");

  // Search/Filter for articles list
  const [newsSearch, setNewsSearch] = useState("");
  const [transfersSearch, setTransfersSearch] = useState("");
  const [legionnairesSearch, setLegionnairesSearch] = useState("");
  const [gallerySearchTag, setGallerySearchTag] = useState("");
  const [newsCategoryFilter, setNewsCategoryFilter] = useState("all");
  const [visibleNewsCount, setVisibleNewsCount] = useState(6);

  const [livescoreFilter, setLivescoreFilter] = useState<string>("all");
  const [adConfig, setAdConfig] = useState<any>({
    adTitle: "سامانه خدمات آنلاین اسنپ، حامی لیگ برتر",
    adPromo: "F360",
    adDesc: "با ثبت نام با کد تخفیف F360، اولین سفر خود را کاملأ رایگان اسنپ باشید!",
    adLink: "https://snapp.ir",
    adBtnText: "نصب اسنپ",
    customBannerUrl: ""
  });

  const playGoalSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const whistle = (time: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(2200, audioCtx.currentTime + time);
        gain.gain.setValueAtTime(0, audioCtx.currentTime + time);
        gain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + time + 0.35);
        osc.start(audioCtx.currentTime + time);
        osc.stop(audioCtx.currentTime + time + 0.35);
      };
      
      whistle(0);
      whistle(0.35);
      
      const bufferSize = audioCtx.sampleRate * 2;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      
      const whiteNoise = audioCtx.createBufferSource();
      whiteNoise.buffer = buffer;
      
      const filter = audioCtx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(500, audioCtx.currentTime);
      filter.Q.setValueAtTime(1.5, audioCtx.currentTime);
      
      const gainNode = audioCtx.createGain();
      whiteNoise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      gainNode.gain.setValueAtTime(0.01, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + 0.15);
      gainNode.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + 1.25);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2);
      
      whiteNoise.start(audioCtx.currentTime + 0.1);
      whiteNoise.stop(audioCtx.currentTime + 2.15);
    } catch (e) {
      console.warn("Audio context failure: ", e);
    }
  };

  const showSystemNotification = (title: string, body: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=150"
      });
    }
  };

  const triggerMockGoalNotification = () => {
    const firstMatch = matches[0];
    const teamHome = firstMatch ? firstMatch.teamHome : "تیم میزبان";
    const teamAway = firstMatch ? firstMatch.teamAway : "تیم مهمان";

    const mockGoal = {
      id: `mock-${Date.now()}`,
      teamHome,
      teamAway,
      scoringTeam: teamHome,
      scorerName: "گلزن",
      scoreHome: 1,
      scoreAway: 0,
      minute: "۷۷'",
      timestamp: Date.now()
    };
    setActiveGoalEvent(mockGoal);
    playGoalSound();
    showSystemNotification(`⚽ گل طلایی برای ${teamHome}!`, `یک گل تماشایی در دقیقه ۷۷ وارد دروازه شد! ${teamHome} ۱ - ۰ ${teamAway}`);
  };

  const applyFetchedData = (data: any) => {
    setNews(data.news || []);
    const rawMatches = data.matches || [];
    const mappedMatches = rawMatches.map((m: any) => {
      if (m.date && m.date.startsWith("day")) {
        const offset = parseInt(m.date.replace("day", ""), 10);
        if (!isNaN(offset)) {
          const d = new Date();
          d.setDate(d.getDate() + offset);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          return { ...m, date: `${yyyy}-${mm}-${dd}` };
        }
      }
      return m;
    });
    const loadedTeams = data.teams || [];
    const loadedPlayers = data.players || [];

    const statsResult = computeDynamicAppletStats(
      mappedMatches,
      loadedTeams,
      loadedPlayers,
      data.standings || {},
      data.stats || {}
    );

    setMatches(statsResult.processedMatches);
    setTeams(statsResult.processedTeams);
    setPlayers(statsResult.processedPlayers);
    setStandings(statsResult.processedStandings);
    setStats(statsResult.processedStats);

    setTransfers(data.transfers || []);
    setTeamTransfersList(data.teamTransfersList || []);
    setLegionnaires(data.legionnaires || []);
    setImages(data.images || []);
    setPredictions(data.predictions || {});
    
    setWeeklyPoll(data.weeklyPoll || null);
    setPopularTeams(data.popularTeams || []);
    setHistoricalData(data.historicalData || {});
    setFeatureGames(data.Feature_Games || []);
    (window as any).db_teams = statsResult.processedTeams;
    (window as any).db_players = statsResult.processedPlayers;
    (window as any).db_coaches = data.coaches || [];
    setCoaches(data.coaches || []);
    setBracket(data.bracket || null);
    setSelectedCombinations(data.selectedCombinations || []);
    setArchives(data.archives || []);
    if (data.currentSeason) {
      setCurrentSeason(data.currentSeason);
      if (statsSeason === "1404") {
        setStatsSeason(data.currentSeason);
      }
    }
    if (data.config) {
      setAdConfig(data.config);
    }
    setSubmissions(data.submissions || []);
    setLastScraped(data.lastScraped || "");

    const newGoals = data.liveGoals || [];
    setLiveGoals(newGoals);
    if (newGoals.length > 0) {
      const maxTs = Math.max(...newGoals.map((g: any) => g.timestamp));
      setLastSeenGoalTimestamp(maxTs);
    }
  };

  const fetchData = async () => {
    try {
      const response = await fetch("/api/data");
      const data = await response.json();
      if (response.ok && data.status === "ok") {
        applyFetchedData(data);
      }
    } catch (err) {
      console.error("Error drawing application state:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDataQuietly = async () => {
    try {
      const response = await fetch("/api/data");
      const data = await response.json();
      if (response.ok && data.status === "ok") {
        applyFetchedData(data);

        const newGoals = data.liveGoals || [];
        if (newGoals.length > 0) {
          const freshGoals = newGoals.filter((g: any) => g.timestamp > lastSeenGoalTimestamp);
          if (freshGoals.length > 0) {
            const subscribedGoals = freshGoals.filter((g: any) => subscribedTeams.includes(g.scoringTeam));
            if (subscribedGoals.length > 0) {
              const targetGoal = subscribedGoals[0];
              setActiveGoalEvent(targetGoal);
              playGoalSound();
              showSystemNotification(
                `⚽ گل برای ${targetGoal.scoringTeam}!`,
                `${targetGoal.scorerName} دقیقه ${targetGoal.minute} گلزنی کرد! نتیجه: ${targetGoal.teamHome} ${targetGoal.scoreHome} - ${targetGoal.scoreAway} ${targetGoal.teamAway}`
              );
            }
            const maxTs = Math.max(...freshGoals.map((g: any) => g.timestamp));
            setLastSeenGoalTimestamp(maxTs);
          }
        }
      }
    } catch (err) {
      console.warn("Quiet fetching err:", err);
    }
  };

  const handleSelectLegionnaire = (leg: any) => {
    const perf = leg.performance || leg.description || leg.details || "";
    if (!perf || perf.trim() === "") return; // Don't trigger if empty as requested by user

    const newsItem: NewsItem = {
      id: `legionnaire-det-${leg.id}`,
      title: `گزارش: آنالیز عملکرد ستاره لیگ‌پوش: ${leg.name} در لیگ ${leg.league}`,
      summary: `بررسی عملکرد کیفی و شایسته فنی ${leg.name} در باشگاه ${leg.team} (${leg.league}) به همراه ارزیابی کارشناسان فوتبال برتر.`,
      content: perf,
      image: leg.image || "https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&w=800",
      category: "legionnaires",
      createdAt: leg.createdAt || leg.created_at || new Date().toISOString(),
      viewCount: leg.viewCount || 0,
      tags: (leg.tags && leg.tags.length > 0) ? leg.tags : [leg.name, leg.team, leg.league, "لژیونرها"]
    };
    setActiveArticle(newsItem);
  };

  useEffect(() => {
    fetchData();
    
    const savedToken = localStorage.getItem("football360_admin_token");
    if (savedToken && savedToken.startsWith("eyJ")) {
      setIsAdminLoggedIn(true);
    }

    const savedSubs = localStorage.getItem("subscribed_team_preferences");
    if (savedSubs) {
      try {
        setSubscribedTeams(JSON.parse(savedSubs));
      } catch (e) {
        setSubscribedTeams([]);
      }
    } else {
      setSubscribedTeams([]);
      localStorage.setItem("subscribed_team_preferences", JSON.stringify([]));
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchDataQuietly();
    }, 10000);
    return () => clearInterval(interval);
  }, [subscribedTeams, lastSeenGoalTimestamp]);

  useEffect(() => {
    if (activeGoalEvent) {
      const timer = setTimeout(() => {
        setActiveGoalEvent(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [activeGoalEvent]);

  // Real-time news article view increment persistence
  useEffect(() => {
    if (activeArticle) {
      const incrementViewCount = async () => {
        try {
          const res = await fetch(`/api/news/${activeArticle.id}/view`, { method: "POST" });
          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              if (activeArticle.id.startsWith("transfer-det-")) {
                const trId = activeArticle.id.replace("transfer-det-", "");
                setTransfers(prev => prev.map(t => String(t.id) === String(trId) ? { ...t, viewCount: data.viewCount } : t));
              } else if (activeArticle.id.startsWith("legionnaire-det-")) {
                const legId = activeArticle.id.replace("legionnaire-det-", "");
                setLegionnaires(prev => prev.map(l => String(l.id) === String(legId) ? { ...l, viewCount: data.viewCount } : l));
              } else {
                setNews(prev => prev.map(n => n.id === activeArticle.id ? { ...n, viewCount: data.viewCount } : n));
              }
              setActiveArticle(prev => prev && prev.id === activeArticle.id ? { ...prev, viewCount: data.viewCount } : prev);
            }
          }
        } catch (e) {
          console.error("Failed to log view count:", e);
        }
      };
      incrementViewCount();
    }
  }, [activeArticle?.id]);

  // Scroll to top automatically when any tab or detailed profile is loaded
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab, selectedMatch, selectedTeamId, selectedPlayerId, activeArticle]);

  const handlePredictionVote = async (matchId: string, prediction: "home" | "draw" | "away", score: string) => {
    try {
      const res = await fetch("/api/predictions/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, prediction, score })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPredictions(data.predictions);
      }
    } catch (e) {
      console.error("Voting fail:", e);
    }
  };

  const handleToggleSubscription = (team: string) => {
    let updated: string[];
    if (subscribedTeams.includes(team)) {
      updated = subscribedTeams.filter(t => t !== team);
    } else {
      updated = [...subscribedTeams, team];
    }
    setSubscribedTeams(updated);
    localStorage.setItem("subscribed_team_preferences", JSON.stringify(updated));
  };

  const handleUpdateStandings = async (leagueKey: string, rows: StandingRow[]) => {
    try {
      const response = await fetch(`/api/standings/${leagueKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows })
      });
      if (response.ok) {
        await fetchDataQuietly();
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  const handleUpdateStats = async (leagueKey: string, statsData: StatsData) => {
    try {
      const response = await fetch(`/api/stats/${leagueKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: statsData })
      });
      if (response.ok) {
        await fetchDataQuietly();
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  const handleUpdateAdConfig = async (configData: any) => {
    try {
      const response = await fetch(`/api/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configData)
      });
      if (response.ok) {
        await fetchDataQuietly();
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  const handleCentralSync = async () => {
    try {
      const response = await fetch("/api/sync", { method: "POST" });
      const data = await response.json();
      if (response.ok && data.success) {
        await fetchData();
        return true;
      }
    } catch (e) {
      console.error("Central physical sync failed:", e);
    }
    return false;
  };

  const handleAdminLogin = (token: string) => {
    localStorage.setItem("football360_admin_token", token);
    setIsAdminLoggedIn(true);
  };

  const handleAdminLogout = () => {
    localStorage.removeItem("football360_admin_token");
    setIsAdminLoggedIn(false);
  };

  const handleTriggerScrape = async () => {
    setIsScraping(true);
    try {
      const response = await fetch("/api/scrape/trigger", { method: "POST" });
      const data = await response.json();
      if (response.ok && data.success) {
        setLastScraped(data.lastScraped);
        await fetchData();
      }
    } catch (err) {
      console.error("Scraping trigger malfunctioned:", err);
    } finally {
      setIsScraping(false);
    }
  };

  const getPersianCategory = (cat: string) => {
    switch (cat) {
      case "pro-league": return "لیگ برتر";
      case "league-1": return "لیگ آزادگان";
      case "league-2": return "لیگ دسته دو";
      case "hazfi-cup": return "جام حذفی";
      case "futsal": return "فوتسال";
      case "legionnaires": return "لژیونرها";
      case "transfers": return "نقل و انتقالات";
      default: return "ورزشی";
    }
  };

  const handleTagClick = (tag: string) => {
    if (activeArticle) {
      const category = activeArticle.category as string;
      if (category === "transfers") {
        setTransfersSearch(tag);
        setActiveTab("transfers");
      } else if (category === "legionnaires") {
        setLegionnairesSearch(tag);
        setActiveTab("legionnaires");
      } else if (category === "images" || category === "gallery") {
        setGallerySearchTag(tag);
        setActiveTab("images");
      } else {
        setNewsSearch(tag);
        setActiveTab("news");
      }
      setActiveArticle(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Switch tabs cleanly, closing detailed article views
  const handleTabChangeSubmit = (tabId: string) => {
    setActiveTab(tabId);
    setActiveArticle(null);
    setSelectedTeamId(null);
    setSelectedPlayerId(null);
    setSelectedCoachId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // News Filtering
  const filteredNewsList = news.filter((art) => {
    const matchesSearch = art.title.toLowerCase().includes(newsSearch.toLowerCase()) || 
                          art.summary.toLowerCase().includes(newsSearch.toLowerCase()) ||
                          art.tags.some(t => t.toLowerCase().includes(newsSearch.toLowerCase()));
    const matchesCat = newsCategoryFilter === "all" || art.category === newsCategoryFilter;
    return matchesSearch && matchesCat;
  });

  if (isLoading) {
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

  if (isAdminLoggedIn && activeTab === "admin") {
    return (
      <div className="min-h-screen bg-gray-950 font-sans text-gray-200 antialiased py-6 px-4 sm:px-6" dir="rtl" id="standalone-admin-lock">
        <div className="mx-auto max-w-7xl">
          <AdminPanel
            news={news}
            matches={matches}
            standings={standings}
            transfers={transfers}
            teamTransfersList={teamTransfersList}
            images={images}
            submissions={submissions}
            legionnaires={legionnaires}
            stats={stats}
            teams={teams}
            players={players}
            coaches={coaches}
            bracket={bracket}
            selectedCombinations={selectedCombinations}
            adConfig={adConfig}
            archives={archives}
            currentSeason={currentSeason}
            onUpdateStandings={handleUpdateStandings}
            onUpdateStats={handleUpdateStats}
            onUpdateAdConfig={handleUpdateAdConfig}
            onCentralSync={handleCentralSync}
            isAdminLoggedIn={isAdminLoggedIn}
            onLogin={handleAdminLogin}
            onRefreshData={fetchData}
            onLogout={handleAdminLogout}
          />
        </div>
      </div>
    );
  }

  const findPlayerById = (id: string | null) => {
    if (!id) return null;
    
    // 1. Try finding in the primary players array
    let found = players.find(p => String(p.id) === String(id));
    if (found) return found;

    // Search in archives if a past season is selected
    if (statsSeason !== currentSeason) {
      const playerArchive = archives?.find((a: any) => a.type === "players" && a.season_tag === statsSeason);
      if (playerArchive && Array.isArray(playerArchive.data)) {
        found = playerArchive.data.find((p: any) => String(p.id) === String(id) || String(p.name) === String(id));
        if (found) return found;
      }
    }

    // 2. Fallback: Search inside selected combinations for mock or extra players
    for (const c of selectedCombinations) {
      if (c && c.players) {
        for (const [posKey, player] of Object.entries(c.players)) {
          if (player && (String((player as any).id) === String(id) || String((player as any).name) === String(id))) {
            const positionMap: Record<string, string> = {
              gk: "دروازه‌بان",
              cb1: "مدافع وسط",
              cb2: "مدافع وسط",
              cb3: "مدافع وسط",
              lm: "هافبک چپ",
              cm1: "هافبک وسط",
              cm2: "هافبک هجومی",
              cm3: "هافبک وسط",
              rm: "هافبک راست",
              st1: "مهاجم",
              st2: "مهاجم"
            };
            return {
              id: (player as any).id || `player-mock-${Date.now()}`,
              name: (player as any).name,
              teamName: (player as any).teamName || "تیم منتخب",
              position: positionMap[posKey.toLowerCase()] || "بازیکن",
              image: (player as any).image || "https://images.unsplash.com/photo-1540747737956-378724044602?auto=format&fit=crop&q=80&w=800",
              averageRating: Number((player as any).rating) || 7.5,
              rating: Number((player as any).rating) || 7.5,
              age: "۲۴",
              nationality: "ایرانی",
              foot: "راست",
              height: "۱۸۰ سانتی‌متر",
              number: "۱۰",
              seasonStats: {
                matches: 12,
                goals: posKey.toLowerCase().startsWith("st") ? 4 : 1,
                assists: posKey.toLowerCase().startsWith("cm") || posKey.toLowerCase().startsWith("rm") || posKey.toLowerCase().startsWith("lm") ? 3 : 0,
                cleanSheets: posKey.toLowerCase() === "gk" || posKey.toLowerCase().startsWith("cb") ? 5 : 0,
                yellowCards: 1,
                redCards: 0
              },
              ratingsHistory: [
                { matchId: "f-1", matchOpponent: "تیم حریف", rating: Number((player as any).rating) || 7.5, date: "۱۴۰۴/۰۷/۱۰", isMvp: true }
              ]
            };
          }
        }
      }
    }

    // 3. Last fallback: Check if any player's name matches exactly or partially
    found = players.find(p => String(p.name) === String(id));
    if (found) return found;

    return null;
  };

  const findCoachById = (id: string | null) => {
    if (!id) return null;
    let found = coaches.find(c => String(c.id) === String(id));
    if (found) return found;

    // Search in archives if a past season is selected
    if (statsSeason !== currentSeason) {
      const coachArchive = archives?.find((a: any) => a.type === "coaches" && a.season_tag === statsSeason);
      if (coachArchive && Array.isArray(coachArchive.data)) {
        found = coachArchive.data.find((c: any) => String(c.id) === String(id) || String(c.name) === String(id));
        if (found) return found;
      }
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-950 font-sans text-gray-200 antialiased" style={{ contentVisibility: "auto" }}>
      {/* Top Branding Header */}
      <Header
        onAdminOpen={() => handleTabChangeSubmit("admin")}
        isAdminLoggedIn={isAdminLoggedIn}
        onLogout={handleAdminLogout}
        news={news}
        teams={teams}
        players={players}
        coaches={coaches}
        onSelectArticle={(art) => {
          setActiveArticle(art);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onSelectTeam={(id) => {
          setSelectedTeamId(id);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onSelectPlayer={(id) => {
          setSelectedPlayerId(id);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onSelectCoach={(id) => {
          setSelectedCoachId(id);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        setActiveTab={handleTabChangeSubmit}
      />

      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChangeSubmit}
        onAdminOpen={() => handleTabChangeSubmit("admin")}
        isAdminLoggedIn={isAdminLoggedIn}
        onLogout={handleAdminLogout}
      />

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        
        {/* --- DYNAMIC MATCH / TEAM / PLAYER DETAIL STORIES LAYOUT --- */}
        {selectedMatch ? (
          <MatchDetailView
            match={selectedMatch}
            allMatches={matches}
            players={players}
            allTeams={teams}
            onBack={() => setSelectedMatch(null)}
            onSelectPlayer={(id) => {
              setSelectedPlayerId(id);
              setSelectedMatch(null);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        ) : selectedTeamId ? (
          <TeamDetail
            team={teams.find(t => t.id === selectedTeamId)}
            players={players}
            coaches={coaches}
            allStandings={standings}
            allNews={news}
            allMatches={matches}
            onBack={() => setSelectedTeamId(null)}
            onSelectPlayer={(id) => {
              setSelectedPlayerId(id);
              setSelectedTeamId(null);
            }}
            onSelectCoach={(id) => {
              setSelectedCoachId(id);
              setSelectedTeamId(null);
            }}
            onSelectArticle={(art) => setActiveArticle(art)}
            onSelectMatch={(matchId) => {
              setSelectedMatch(matches.find(m => String(m.id) === String(matchId)));
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        ) : selectedPlayerId ? (
          <PlayerDetail
            player={findPlayerById(selectedPlayerId)}
            allMatches={matches}
            allTeams={teams}
            onBack={() => setSelectedPlayerId(null)}
            onSelectTeam={(teamName) => {
              const tm = teams.find(t => t.name.includes(teamName) || teamName.includes(t.name));
              if (tm) {
                setSelectedTeamId(tm.id);
                setSelectedPlayerId(null);
              }
            }}
            onSelectMatch={(matchId) => {
              setSelectedMatch(matches.find(m => String(m.id) === String(matchId)));
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        ) : selectedCoachId ? (
          <CoachDetail
            coach={findCoachById(selectedCoachId)}
            allMatches={matches}
            onBack={() => setSelectedCoachId(null)}
            onSelectTeam={(teamName) => {
              const tm = teams.find(t => t.name.includes(teamName) || teamName.includes(t.name));
              if (tm) {
                setSelectedTeamId(tm.id);
                setSelectedCoachId(null);
              }
            }}
          />
        ) : activeArticle ? (
          <ArticleDetailPage article={activeArticle} setActiveArticle={setActiveArticle} toPersianDigits={toPersianDigits} getSafeImageUrl={getSafeImageUrl} />
        ) : (
          /* --- MAIN VIEWS ROUTER DIRECTIVE --- */
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-[40vh]">
              <div className="text-center space-y-3">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-slate-400">در حال بارگذاری...</p>
              </div>
            </div>
          }>
          <div className="space-y-6">

            {activeTab === "home" && (
              <HomePage
                matches={matches}
                news={news}
                transfers={transfers}
                stats={stats}
                liveGoals={liveGoals}
                setSelectedMatch={setSelectedMatch}
                setActiveArticle={setActiveArticle}
                handleTabChangeSubmit={handleTabChangeSubmit}
                getRelativeDateLabel={getRelativeDateLabel}
                convertGregorianToShamsi={convertGregorianToShamsi}
                toPersianDigits={toPersianDigits}
                getSafeImageUrl={getSafeImageUrl}
                currentSeason={currentSeason}
                selectedLeagueFilterOnStats={selectedLeagueFilterOnStats}
                setSelectedLeagueFilterOnStats={setSelectedLeagueFilterOnStats}
                archives={archives}
                standings={standings}
                players={players}
                selectedCombinations={selectedCombinations}
                setSelectedPlayerId={setSelectedPlayerId}
                setSelectedTeamId={setSelectedTeamId}
                adConfig={adConfig}
              />
            )}

            {activeTab === "live-scores" && (
              <LiveScoresPage
                matches={matches}
                liveGoals={liveGoals}
                subscribedTeams={subscribedTeams}
                livescoreFilter={livescoreFilter}
                setLivescoreFilter={setLivescoreFilter}
                setSelectedMatch={setSelectedMatch}
                handleTabChangeSubmit={handleTabChangeSubmit}
                getRelativeDateLabel={getRelativeDateLabel}
                convertGregorianToShamsi={convertGregorianToShamsi}
                toPersianDigits={toPersianDigits}
              />
            )}
            {/* 2. PRO LEAGUE DETAILED TAB */}
            {activeTab === "pro-league" && (
              <LeagueTables
                leagueKey="pro-league"
                bracket={bracket}
                standings={standings}
                news={news}
                matches={matches}
                teams={teams}
                players={players}
                stats={stats}
                historicalData={historicalData}
                archives={archives}
                currentSeason={currentSeason}
                onSelectNews={(art) => {
                  setActiveArticle(art);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onSelectTeam={(nameOrId) => {
                  const tm = teams.find(t => t.id === nameOrId || t.name.includes(nameOrId));
                  if (tm) {
                    setSelectedTeamId(tm.id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                onSelectPlayer={(id) => {
                  setSelectedPlayerId(id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onSelectMatch={setSelectedMatch}
              />
            )}

            {/* 3. LEAGUE 1 DETAILED TAB */}
            {activeTab === "league-1" && (
              <LeagueTables
                leagueKey="league-1"
                bracket={bracket}
                standings={standings}
                news={news}
                matches={matches}
                teams={teams}
                players={players}
                stats={stats}
                historicalData={historicalData}
                archives={archives}
                currentSeason={currentSeason}
                onSelectNews={(art) => {
                  setActiveArticle(art);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onSelectTeam={(nameOrId) => {
                  const tm = teams.find(t => t.id === nameOrId || t.name.includes(nameOrId));
                  if (tm) {
                    setSelectedTeamId(tm.id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                onSelectPlayer={(id) => {
                  setSelectedPlayerId(id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onSelectMatch={setSelectedMatch}
              />
            )}

            {/* 4. LEAGUE 2 DETAILED TAB */}
            {activeTab === "league-2" && (
              <LeagueTables
                leagueKey="league-2"
                bracket={bracket}
                standings={standings}
                news={news}
                matches={matches}
                teams={teams}
                players={players}
                stats={stats}
                historicalData={historicalData}
                archives={archives}
                currentSeason={currentSeason}
                onSelectNews={(art) => {
                  setActiveArticle(art);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onSelectTeam={(nameOrId) => {
                  const tm = teams.find(t => t.id === nameOrId || t.name.includes(nameOrId));
                  if (tm) {
                    setSelectedTeamId(tm.id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                onSelectPlayer={(id) => {
                  setSelectedPlayerId(id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onSelectMatch={setSelectedMatch}
              />
            )}

            {/* 5. HAZFI CUP DETAILED TAB */}
            {activeTab === "hazfi-cup" && (
              <LeagueTables
                leagueKey="hazfi-cup"
                bracket={bracket}
                standings={standings}
                news={news}
                matches={matches}
                teams={teams}
                players={players}
                stats={stats}
                historicalData={historicalData}
                archives={archives}
                currentSeason={currentSeason}
                onSelectNews={(art) => {
                  setActiveArticle(art);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onSelectTeam={(nameOrId) => {
                  const tm = teams.find(t => t.id === nameOrId || t.name.includes(nameOrId));
                  if (tm) {
                    setSelectedTeamId(tm.id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                onSelectPlayer={(id) => {
                  setSelectedPlayerId(id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onSelectMatch={setSelectedMatch}
              />
            )}

            {/* 5.1 FUTSAL LEAGUE DETAILED TAB */}
            {activeTab === "futsal" && (
              <FutsalPage
                standings={standings}
                news={news}
                matches={matches}
                teams={teams}
                players={players}
                stats={stats}
                archives={archives}
                historicalData={historicalData}
                currentSeason={currentSeason}
                onSelectNews={(art) => {
                  setActiveArticle(art);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onSelectTeam={(id) => {
                  setSelectedTeamId(id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onSelectPlayer={(id) => {
                  setSelectedPlayerId(id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onSelectMatch={setSelectedMatch}
              />
            )}

            {activeTab === "news" && (
              <NewsPage
                news={news}
                newsCategoryFilter={newsCategoryFilter}
                setNewsCategoryFilter={setNewsCategoryFilter}
                newsSearch={newsSearch}
                setNewsSearch={setNewsSearch}
                setActiveArticle={setActiveArticle}
              />
            )}

            {activeTab === "legionnaires" && (
              <LegionnairesPage
                legionnaires={legionnaires}
                legionnairesSearch={legionnairesSearch}
                setLegionnairesSearch={setLegionnairesSearch}
                handleSelectLegionnaire={handleSelectLegionnaire}
                getSafeImageUrl={getSafeImageUrl}
              />
            )}

            {/* 7. TRANSFERS DETAILED TAB */}
            {activeTab === "transfers" && (
              <div className="animate-in fade-in">
                <TransfersList transfers={transfers} teams={teams} teamTransfersList={teamTransfersList} onSelectNews={(art) => setActiveArticle(art)} initialSearchQuery={transfersSearch} />
              </div>
            )}

            {/* 8. PHOTO GALLERY DETAILED TAB */}
            {activeTab === "images" && (
              <div className="animate-in fade-in">
                <PhotoGallery images={images} initialSearchTag={gallerySearchTag} />
              </div>
            )}

            {activeTab === "stats" && (
              <StatsPage
                stats={stats}
                archives={archives}
                statsSeason={statsSeason}
                setStatsSeason={setStatsSeason}
                selectedLeagueFilterOnStats={selectedLeagueFilterOnStats}
                setSelectedLeagueFilterOnStats={setSelectedLeagueFilterOnStats}
                currentSeason={currentSeason}
                toPersianDigits={toPersianDigits}
              />
            )}


            {/* FAN PREDICTIONS TAB */}
            {activeTab === "predictions" && (
              <div className="animate-in fade-in">
                <FanPredictions
                  matches={matches}
                  predictionsData={predictions}
                  onVote={handlePredictionVote}
                  subscribedTeams={subscribedTeams}
                  onToggleSubscription={handleToggleSubscription}
                  triggerMockGoalNotification={triggerMockGoalNotification}
                />
              </div>
            )}


            {/* DIAGNOSTICS & SYSTEM LOGS TAB */}
            {activeTab === "diagnostics" && (
              <div className="space-y-6 animate-in fade-in">
                <DiagnosticsPanel />
              </div>
            )}


            {/* 11. ADMIN PANEL CONTROL TAB */}
            {activeTab === "admin" && (
              <div className="animate-in fade-in">
                <AdminPanel
                  news={news}
                  matches={matches}
                  standings={standings}
                  transfers={transfers}
                  teamTransfersList={teamTransfersList}
                  images={images}
                  submissions={submissions}
                  legionnaires={legionnaires}
                  stats={stats}
                  teams={teams}
                  players={players}
                  bracket={bracket}
                  selectedCombinations={selectedCombinations}
                  adConfig={adConfig}
                  archives={archives}
                  currentSeason={currentSeason}
                  onUpdateArchives={setArchives}
                  onUpdateStandings={handleUpdateStandings}
                  onUpdateStats={handleUpdateStats}
                  onUpdateAdConfig={handleUpdateAdConfig}
                  onCentralSync={handleCentralSync}
                  onLogout={handleAdminLogout}
                  isAdminLoggedIn={isAdminLoggedIn}
                  onLogin={handleAdminLogin}
                  onRefreshData={fetchData}
                />
              </div>
            )}

          </div>
          </Suspense>
        )}

      </main>

      <Footer setActiveTab={setActiveTab} />

      {/* REAL-TIME GOAL EVENT POP-UP ALERT */}
      <AnimatePresence>
        {activeGoalEvent && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900/95 backdrop-blur-xl border border-red-500/30 rounded-2xl p-4 shadow-2xl shadow-red-950/40 text-right"
            dir="rtl"
          >
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-red-600/10 flex items-center justify-center text-red-500 shrink-0 border border-red-500/20">
                <span className="text-lg font-bold">⚽</span>
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block" />
                    خبر گل زده!
                  </span>
                  <span className="text-[10px] text-gray-550 font-sans font-medium">{activeGoalEvent.minute || "دقیقه زده"}</span>
                </div>
                
                <h4 className="text-sm font-bold text-white">
                  گل برای {activeGoalEvent.scoringTeam}!
                </h4>
                
                <p className="text-xs text-slate-300 leading-snug">
                  توسط مهاجم خلاق <span className="font-bold text-yellow-400">{activeGoalEvent.scorerName}</span> دروازه باز گردید.
                </p>
                
                <div className="pt-2 text-xs font-bold font-sans text-gray-305 bg-slate-950/50 px-2.5 py-1 rounded flex justify-between">
                  <span>{activeGoalEvent.teamHome} {activeGoalEvent.scoreHome}</span>
                  <span className="text-gray-600">-</span>
                  <span>{activeGoalEvent.teamAway} {activeGoalEvent.scoreAway}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setActiveGoalEvent(null)}
                className="text-[10px] font-bold text-gray-300 hover:text-white bg-slate-800 hover:bg-slate-700/85 px-2.5 py-1 rounded-lg transition cursor-pointer"
              >
                بستن اعلان
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

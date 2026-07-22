import { useState, useEffect } from "react";
import {
  NewsItem,
  MatchItem,
  StandingRow,
  TransferItem,
  ImageItem,
  ContactSubmission,
  StatsData,
  TeamTransferItem,
} from "../types";
import { computeDynamicAppletStats } from "../utils";
import { playGoalSound, showSystemNotification } from "./useGoalSound";

export function useAppData() {
  const [activeTab, setActiveTab] = useState<string>("home");
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

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);

  const [predictions, setPredictions] = useState<Record<string, any>>({});
  const [liveGoals, setLiveGoals] = useState<any[]>([]);
  const [subscribedTeams, setSubscribedTeams] = useState<string[]>([]);
  const [lastSeenGoalTimestamp, setLastSeenGoalTimestamp] = useState<number>(Date.now());
  const [activeGoalEvent, setActiveGoalEvent] = useState<any | null>(null);

  const [weeklyPoll, setWeeklyPoll] = useState<any>(null);
  const [popularTeams, setPopularTeams] = useState<any[]>([]);
  const [historicalData, setHistoricalData] = useState<any>({});
  const [featureGames, setFeatureGames] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [activeArticle, setActiveArticle] = useState<NewsItem | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [selectedLeagueFilterOnStats, setSelectedLeagueFilterOnStats] = useState("pro-league");
  const [currentSeason, setCurrentSeason] = useState<string>("1404");
  const [statsSeason, setStatsSeason] = useState<string>("1404");
  const [sidebarLeagueTab, setSidebarLeagueTab] = useState("pro-league");

  const [newsSearch, setNewsSearch] = useState("");
  const [transfersSearch, setTransfersSearch] = useState("");
  const [legionnairesSearch, setLegionnairesSearch] = useState("");
  const [gallerySearchTag, setGallerySearchTag] = useState("");
  const [newsCategoryFilter, setNewsCategoryFilter] = useState("all");
  const [visibleNewsCount, setVisibleNewsCount] = useState(6);

  const [livescoreFilter, setLivescoreFilter] = useState<string>("all");
  const [adConfig, setAdConfig] = useState<any>({
    adTitle: "",
    adPromo: "",
    adDesc: "",
    adLink: "",
    adBtnText: "",
    customBannerUrl: "",
    adSlots: [],
    bannerLabel: "تخفیف هواداران تب فوتبال",
    bannerLabelVisible: true,
    bannerTagText: "حمایت ویژه پورتال",
    bannerVisible: true,
    popupAd: { enabled: false },
    floatingAd: { enabled: false },
    bottomBarAd: { enabled: false },
    slideInAd: { enabled: false }
  });

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
    if (!perf || perf.trim() === "") return;

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

  const handleTabChangeSubmit = (tabId: string) => {
    setActiveTab(tabId);
    setActiveArticle(null);
    setSelectedTeamId(null);
    setSelectedPlayerId(null);
    setSelectedCoachId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredNewsList = news.filter((art) => {
    const matchesSearch = art.title.toLowerCase().includes(newsSearch.toLowerCase()) ||
                          art.summary.toLowerCase().includes(newsSearch.toLowerCase()) ||
                          art.tags.some(t => t.toLowerCase().includes(newsSearch.toLowerCase()));
    const matchesCat = newsCategoryFilter === "all" || art.category === newsCategoryFilter;
    return matchesSearch && matchesCat;
  });

  const findPlayerById = (id: string | null) => {
    if (!id) return null;

    let found = players.find(p => String(p.id) === String(id));
    if (found) return found;

    if (statsSeason !== currentSeason) {
      const playerArchive = archives?.find((a: any) => a.type === "players" && a.season_tag === statsSeason);
      if (playerArchive && Array.isArray(playerArchive.data)) {
        found = playerArchive.data.find((p: any) => String(p.id) === String(id) || String(p.name) === String(id));
        if (found) return found;
      }
    }

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

    found = players.find(p => String(p.name) === String(id));
    if (found) return found;

    return null;
  };

  const findCoachById = (id: string | null) => {
    if (!id) return null;
    let found = coaches.find(c => String(c.id) === String(id));
    if (found) return found;

    if (statsSeason !== currentSeason) {
      const coachArchive = archives?.find((a: any) => a.type === "coaches" && a.season_tag === statsSeason);
      if (coachArchive && Array.isArray(coachArchive.data)) {
        found = coachArchive.data.find((c: any) => String(c.id) === String(id) || String(c.name) === String(id));
        if (found) return found;
      }
    }
    return null;
  };

  return {
    activeTab, setActiveTab,
    news, matches, standings, transfers, teamTransfersList,
    legionnaires, images, stats, submissions, lastScraped,
    teams, players, coaches, bracket, selectedCombinations,     archives, setArchives,
    selectedTeamId, setSelectedTeamId,
    selectedPlayerId, setSelectedPlayerId,
    selectedCoachId, setSelectedCoachId,
    selectedMatch, setSelectedMatch,
    predictions, liveGoals, subscribedTeams, lastSeenGoalTimestamp,
    activeGoalEvent, setActiveGoalEvent,
    weeklyPoll, popularTeams, historicalData, featureGames,
    isLoading, activeArticle, setActiveArticle,
    isAdminLoggedIn, setIsAdminLoggedIn,
    isScraping, setIsScraping,
    selectedLeagueFilterOnStats, setSelectedLeagueFilterOnStats,
    currentSeason, setCurrentSeason,
    statsSeason, setStatsSeason,
    sidebarLeagueTab, setSidebarLeagueTab,
    newsSearch, setNewsSearch,
    transfersSearch, setTransfersSearch,
    legionnairesSearch, setLegionnairesSearch,
    gallerySearchTag, setGallerySearchTag,
    newsCategoryFilter, setNewsCategoryFilter,
    visibleNewsCount, setVisibleNewsCount,
    livescoreFilter, setLivescoreFilter,
    adConfig, setAdConfig,
    applyFetchedData, fetchData, fetchDataQuietly,
    handleSelectLegionnaire,
    handlePredictionVote, handleToggleSubscription,
    handleUpdateStandings, handleUpdateStats, handleUpdateAdConfig,
    handleCentralSync, handleAdminLogin, handleAdminLogout,
    handleTriggerScrape, getPersianCategory,
    handleTagClick, handleTabChangeSubmit,
    filteredNewsList, findPlayerById, findCoachById,
  };
}

import { useState, useEffect, useRef } from "react";
import {
  NewsItem,
  MatchItem,
  StandingRow,
  TransferItem,
  LegionnaireItem,
  ImageItem,
  ContactSubmission,
  StatsData,
  TeamTransferItem,
  AdItem,
  TeamItem,
  PlayerItem,
  CoachItem,
  SelectedCombination,
  LiveGoal,
  HeroSlideItem,
} from "../types";
import { computeDynamicAppletStats, fetchCachedAppData, fetchLiteAppData, invalidateAppDataCache, isFreshPayload, nextPollDelayMs } from "../utils";
import { playGoalSound, showSystemNotification } from "./useGoalSound";

export function useAppData() {
  const [activeTab, setActiveTab] = useState<string>("home");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [standings, setStandings] = useState<Record<string, StandingRow[]>>({});
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [teamTransfersList, setTeamTransfersList] = useState<TeamTransferItem[]>([]);
  const [legionnaires, setLegionnaires] = useState<LegionnaireItem[]>([]);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [stats, setStats] = useState<Record<string, StatsData>>({});
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [lastScraped, setLastScraped] = useState<string>("");
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [players, setPlayers] = useState<PlayerItem[]>([]);
  const [coaches, setCoaches] = useState<CoachItem[]>([]);
  const [coachMovements, setCoachMovements] = useState<any[]>([]);
  const [coachAppointments, setCoachAppointments] = useState<any[]>([]);
  const [bracket, setBracket] = useState<Record<string, any> | null>(null);
  const [selectedCombinations, setSelectedCombinations] = useState<SelectedCombination[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlideItem[]>([]);

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<MatchItem | null>(null);

  const [predictions, setPredictions] = useState<Record<string, Record<string, any>>>({});
  const [liveGoals, setLiveGoals] = useState<LiveGoal[]>([]);
  const [subscribedTeams, setSubscribedTeams] = useState<string[]>([]);
  const [lastSeenGoalTimestamp, setLastSeenGoalTimestamp] = useState<number>(Date.now());
  const [activeGoalEvent, setActiveGoalEvent] = useState<LiveGoal | null>(null);

  const [weeklyPoll, setWeeklyPoll] = useState<{question: string; options: {label: string; votes: number}[]} | null>(null);
  const [popularTeams, setPopularTeams] = useState<{name: string; logo: string; fanCount: number}[]>([]);
  const [historicalData, setHistoricalData] = useState<Record<string, any>>({});
  const [featureGames, setFeatureGames] = useState<MatchItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  // Bulk-fetch failure surfaced to the UI (fetchData paths only; the quiet
  // poller never sets it so flaky networks don't flash errors every 10s).
  // Shown only while there is no data to display (see HomePage).
  const [dataError, setDataError] = useState<string | null>(null);
  const [activeArticle, setActiveArticle] = useState<NewsItem | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminUser, setAdminUser] = useState<{ username: string; role: string; label: string; permissions: string[] } | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [selectedLeagueFilterOnStats, setSelectedLeagueFilterOnStats] = useState("pro-league");
  const [currentSeason, setCurrentSeason] = useState<string>("1405");
  const [sidebarLeagueTab, setSidebarLeagueTab] = useState("pro-league");

  const [newsSearch, setNewsSearch] = useState("");
  const [transfersSearch, setTransfersSearch] = useState("");
  const [legionnairesSearch, setLegionnairesSearch] = useState("");
  const [gallerySearchTag, setGallerySearchTag] = useState("");
  const [newsCategoryFilter, setNewsCategoryFilter] = useState("all");
  const [visibleNewsCount, setVisibleNewsCount] = useState(6);

  const [livescoreFilter, setLivescoreFilter] = useState<string>("all");
  const [ads, setAds] = useState<AdItem[]>([]);

  // Identity of the last payload actually applied to state. fetchCachedAppData
  // returns the same object reference while its TTL holds; re-applying it is
  // pure waste (recompute + ~20 setStates + full re-render, every 10s poll).
  const lastAppliedRef = useRef<any>(null);

  // Pure core of the apply path: day-offset match fix + the synchronous
  // stats recompute. Shared by the full apply and the lite first-paint apply
  // so both paints derive identical processed matches/teams/players.
  const buildProcessedCore = (data: any) => {
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

    return computeDynamicAppletStats(
      mappedMatches,
      loadedTeams,
      loadedPlayers,
      data.standings || {},
      data.stats || {}
    );
  };

  const applyFetchedData = (data: any) => {
    setNews(data.news || []);
    const statsResult = buildProcessedCore(data);

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
    setCoachMovements(data.coachMovements || []);
    setCoachAppointments(data.coachAppointments || []);
    setBracket(data.bracket || null);
    setSelectedCombinations(data.selectedCombinations || []);
    setHeroSlides(data.heroSlides || []);
    if (data.currentSeason) {
      setCurrentSeason(data.currentSeason);
    }
    setAds(data.ads || []);
    setSubmissions(data.submissions || []);
    setLastScraped(data.lastScraped || "");

    const newGoals = data.liveGoals || [];
    setLiveGoals(newGoals);
    if (newGoals.length > 0) {
      const maxTs = Math.max(...newGoals.map((g: any) => g.timestamp));
      setLastSeenGoalTimestamp(maxTs);
    }
  };

  // First-paint apply for the ?lite=1 slice. MERGE, not replace: only keys
  // present in the slice touch state, so the dropped admin/archive tables
  // keep their initial values until the full payload arrives right after.
  // The compute inputs (matches/teams/players/standings/stats) all ride in
  // the lite slice, so the first paint is fully derived, not placeholder.
  const applyLiteData = (data: any) => {
    const statsResult = buildProcessedCore(data);
    setMatches(statsResult.processedMatches);
    setTeams(statsResult.processedTeams);
    setPlayers(statsResult.processedPlayers);
    setStandings(statsResult.processedStandings);
    setStats(statsResult.processedStats);
    (window as any).db_teams = statsResult.processedTeams;
    (window as any).db_players = statsResult.processedPlayers;

    if (Array.isArray(data.news)) setNews(data.news);
    if (Array.isArray(data.transfers)) setTransfers(data.transfers);
    if (Array.isArray(data.teamTransfersList)) setTeamTransfersList(data.teamTransfersList);
    if (Array.isArray(data.legionnaires)) setLegionnaires(data.legionnaires);
    if (Array.isArray(data.images)) setImages(data.images);
    if (Array.isArray(data.coaches)) {
      setCoaches(data.coaches);
      (window as any).db_coaches = data.coaches;
    }
    if (Array.isArray(data.coachMovements)) setCoachMovements(data.coachMovements);
    if (Array.isArray(data.coachAppointments)) setCoachAppointments(data.coachAppointments);
    if (Array.isArray(data.selectedCombinations)) setSelectedCombinations(data.selectedCombinations);
    if (Array.isArray(data.heroSlides)) setHeroSlides(data.heroSlides);
    if (Array.isArray(data.ads)) setAds(data.ads);
    if (data.currentSeason) setCurrentSeason(data.currentSeason);
    if (typeof data.lastScraped === "string") setLastScraped(data.lastScraped);

    const newGoals = Array.isArray(data.liveGoals) ? data.liveGoals : [];
    setLiveGoals(newGoals);
    if (newGoals.length > 0) {
      const maxTs = Math.max(...newGoals.map((g: any) => g.timestamp));
      setLastSeenGoalTimestamp(maxTs);
    }
  };

  const fetchData = async () => {
    try {
      // Phase 1: lite slice (~1/3 of the body) for a fast first paint.
      // Any lite failure falls through to the full fetch below.
      let painted = false;
      try {
        const lite = await fetchLiteAppData();
        if (lite && lite.status === "ok") {
          lastAppliedRef.current = lite;
          applyLiteData(lite);
          painted = true;
          setDataError(null);
          setIsLoading(false);
        }
      } catch {
        // fall through to full payload
      }
      // Phase 2: full payload completes the dropped tables + full news.
      // Always runs (even after a lite paint) so admin/archive surfaces
      // and the 10s poller converge on complete state.
      const data = await fetchCachedAppData();
      if (data && data.status === "ok") {
        setDataError(null);
        if (isFreshPayload(data, lastAppliedRef.current)) {
          lastAppliedRef.current = data;
          applyFetchedData(data);
        }
      } else if (!painted) {
        setDataError("دریافت اطلاعات ناموفق بود. اتصال اینترنت را بررسی کنید.");
      }
    } catch (err) {
      console.error("Error drawing application state:", err);
      setDataError("دریافت اطلاعات ناموفق بود. اتصال اینترنت را بررسی کنید.");
    } finally {
      setIsLoading(false);
    }
  };

  // بعد از هر تغییر ادمین، کش ۱۲۰ ثانیه‌ای باید باطل شود تا داده تازه لود شود.
  const adminRefreshData = async () => {
    invalidateAppDataCache();
    await fetchData();
  };

  // Reports success so the poller can back off on consecutive failures.
  // "Success" = a usable payload arrived (even if skipped as identical);
  // null payloads and throws both count as failures.
  const fetchDataQuietly = async (): Promise<boolean> => {
    try {
      const data = await fetchCachedAppData();
      if (data && data.status === "ok") {
        // Skip the expensive apply on cache-identical payloads; the cheap
        // goal diff below still runs (no-op on identical timestamps).
        if (isFreshPayload(data, lastAppliedRef.current)) {
          lastAppliedRef.current = data;
          setDataError(null);
          applyFetchedData(data);
        }

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
        return true;
      }
      return false;
    } catch (err) {
      console.warn("Quiet fetching err:", err);
      return false;
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

  const lastLoginAtRef = useRef(0);

  useEffect(() => {
    fetchData();

    const checkAuth = async () => {
      const startedAt = Date.now();
      try {
        const res = await fetch("/api/auth/check", { credentials: "same-origin" });
        if (!res.ok) return;
        const data = await res.json();
        // اگر بعد از شروع این درخواست، لاگین/لاگ‌اوت جدیدی رخ داده باشد، پاسخ قدیمی را نادیده بگیر
        if (startedAt < lastLoginAtRef.current) return;
        if (data.authenticated) {
          setIsAdminLoggedIn(true);
          setAdminUser({
            username: data.username || "",
            role: data.role || "",
            label: data.label || "",
            permissions: data.permissions || []
          });
        } else {
          // توکن منقضی/نامعتبر است -> ادمین را به حالت لاگ‌اوت برگردان
          setIsAdminLoggedIn(false);
          setAdminUser(null);
        }
      } catch {
        // سرور در دسترس نیست؛ وضعیت فعلی حفظ می‌شود
      }
    };

    checkAuth();

    const authCheckInterval = setInterval(() => {
      checkAuth();
    }, 5 * 60 * 1000);

    return () => clearInterval(authCheckInterval);
  }, []);

  useEffect(() => {
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

  // Phase-2 smart polling: 10s refresh only on live pages (live-scores,
  // home ticker); 5min elsewhere; ticks skipped while the tab is hidden;
  // exponential backoff (capped at 5min) while the quiet fetch keeps failing
  // so a dead network/server isn't hammered; immediate converge when the tab
  // becomes visible again. Counters live in refs so effect re-runs (goal
  // timestamps change often on live pages) never reset the backoff.
  const pollIntervalMs = activeTab === "live-scores" || activeTab === "home" ? 10_000 : 300_000;
  const pollFailuresRef = useRef(0);
  const lastPollTsRef = useRef(0);

  useEffect(() => {
    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      const now = Date.now();
      if (now - lastPollTsRef.current < nextPollDelayMs(pollIntervalMs, pollFailuresRef.current)) return;
      lastPollTsRef.current = now;
      void fetchDataQuietly().then(
        (ok) => {
          pollFailuresRef.current = ok ? 0 : pollFailuresRef.current + 1;
        },
        () => {
          pollFailuresRef.current += 1;
        }
      );
    };
    const interval = setInterval(tick, pollIntervalMs);
    const onVisible = () => {
      if (typeof document !== "undefined" && !document.hidden) tick();
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisible);
    }
    return () => {
      clearInterval(interval);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisible);
      }
    };
  }, [subscribedTeams, lastSeenGoalTimestamp, pollIntervalMs, activeTab]);

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

  const handleUpdateStandings = async (leagueKey: string, rows: StandingRow[], heal?: { reason: string; findings: string[] }) => {
    try {
      const response = await fetch(`/api/standings/${leagueKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, _heal: heal ?? undefined })
      });
      if (response.ok) {
        invalidateAppDataCache();
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
        invalidateAppDataCache();
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
        invalidateAppDataCache();
        await fetchData();
        return true;
      }
    } catch (e) {
      console.error("Central physical sync failed:", e);
    }
    return false;
  };

  const handleAdminLogin = (user: { username: string; role: string; label: string; permissions: string[] }) => {
    lastLoginAtRef.current = Date.now();
    setIsAdminLoggedIn(true);
    setAdminUser(user);
  };

  const handleAdminLogout = async () => {
    lastLoginAtRef.current = Date.now();
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    } catch {
      // Ignore
    }
    setIsAdminLoggedIn(false);
    setAdminUser(null);
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
      // case "futsal": return "فوتسال";   // [آرشیو] بخش فوتسال از UI عمومی مخفی شده
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

  // Phase-1 perf: patch the local matches list after admin writes that do
  // not touch finished stats, instead of refetching the whole 9.5MB dataset.
  // The next scheduled poll converges any residual difference.
  const patchMatches = (upsert: any | null, removeId?: string) => {
    setMatches((prev: MatchItem[]) => {
      let next = prev || [];
      if (removeId) {
        next = next.filter((m: any) => String(m.id) !== String(removeId));
      }
      if (upsert && upsert.id) {
        const idx = next.findIndex((m: any) => String(m.id) === String(upsert.id));
        if (idx >= 0) {
          next = next.map((m: any, i: number) => (i === idx ? { ...m, ...upsert } : m));
        } else {
          next = [{ ...upsert }, ...next];
        }
      }
      return next;
    });
  };

  const findPlayerById = (id: string | null) => {
    if (!id) return null;

    let found = players.find(p => String(p.id) === String(id));
    if (found) return found;

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
              averageRating: (player as any).rating != null ? Number((player as any).rating) : null,
              rating: (player as any).rating != null ? Number((player as any).rating) : null,
              age: "24",
              nationality: "ایرانی",
              foot: "راست",
              height: "180 سانتی‌متر",
              seasonStats: {
                matches: 12,
                goals: posKey.toLowerCase().startsWith("st") ? 4 : 1,
                assists: posKey.toLowerCase().startsWith("cm") || posKey.toLowerCase().startsWith("rm") || posKey.toLowerCase().startsWith("lm") ? 3 : 0,
                cleanSheets: posKey.toLowerCase() === "gk" || posKey.toLowerCase().startsWith("cb") ? 5 : 0,
                yellowCards: 1,
                redCards: 0
              },
              ratingsHistory: [
                { matchId: "f-1", matchOpponent: "تیم حریف", rating: (player as any).rating != null ? Number((player as any).rating) : null, date: "1404/07/10", isMvp: false }
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
    const found = coaches.find(c => String(c.id) === String(id));
    if (found) return found;

    return null;
  };

  return {
    activeTab, setActiveTab,
    news, matches, standings, transfers, teamTransfersList,
    legionnaires, images, stats, submissions, lastScraped,
    teams, players, coaches, coachMovements, coachAppointments, bracket, selectedCombinations, heroSlides, setHeroSlides,
    selectedTeamId, setSelectedTeamId,
    selectedPlayerId, setSelectedPlayerId,
    selectedCoachId, setSelectedCoachId,
    selectedMatch, setSelectedMatch,
    predictions, liveGoals, subscribedTeams, lastSeenGoalTimestamp,
    activeGoalEvent, setActiveGoalEvent,
    weeklyPoll, popularTeams, historicalData, featureGames,
    isLoading, dataError, activeArticle, setActiveArticle,
    isAdminLoggedIn, setIsAdminLoggedIn,
    adminUser, setAdminUser,
    isScraping, setIsScraping,
    selectedLeagueFilterOnStats, setSelectedLeagueFilterOnStats,
    currentSeason, setCurrentSeason,
    sidebarLeagueTab, setSidebarLeagueTab,
    newsSearch, setNewsSearch,
    transfersSearch, setTransfersSearch,
    legionnairesSearch, setLegionnairesSearch,
    gallerySearchTag, setGallerySearchTag,
    newsCategoryFilter, setNewsCategoryFilter,
    visibleNewsCount, setVisibleNewsCount,
    livescoreFilter, setLivescoreFilter,
    ads, setAds,
    applyFetchedData, fetchData, fetchDataQuietly, adminRefreshData, patchMatches,
    handleSelectLegionnaire,
    handlePredictionVote, handleToggleSubscription,
    handleUpdateStandings, handleUpdateStats,
    handleCentralSync, handleAdminLogin, handleAdminLogout,
    handleTriggerScrape, getPersianCategory,
    handleTagClick, handleTabChangeSubmit,
    filteredNewsList, findPlayerById, findCoachById,
  };
}

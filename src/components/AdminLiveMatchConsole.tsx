import React, { useState, useEffect } from "react";
import { MatchItem, TeamItem, PlayerItem } from "../types";
import FormationPitch from "./FormationPitch";
import { 
  Play, 
  Pause, 
  Trash2, 
  Check, 
  X, 
  Plus, 
  Tv, 
  ShieldAlert, 
  Clock, 
  Sliders, 
  Users, 
  Activity, 
  Volume2,
  BookmarkCheck,
  RotateCcw,
  Save,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { toPersianDigits, normalizePersianString } from "../utils";
import { parseMatchMinute } from "../shared/matchMinute";

interface MatchEvent {
  id: string;
  type: string;
  minute: string;
  team: "home" | "away";
  playerName: string;
  playerId?: string;
  player2Name?: string;
  player2Id?: string;
  details?: string;
}

interface AdminLiveMatchConsoleProps {
  match: MatchItem;
  teams: TeamItem[];
  players?: PlayerItem[];
  onUpdateMatch: (id: string, updatedFields: any) => Promise<boolean>;
  onFinishMatch: (id: string, finalMatchData: any) => Promise<boolean>;
  onSaveFinishedMatch?: (id: string, finalMatchData: any) => Promise<boolean>;
  onCancel: () => void;
}

export default function AdminLiveMatchConsole({
  match,
  teams = [],
  players = [],
  onUpdateMatch,
  onFinishMatch,
  onSaveFinishedMatch,
  onCancel
}: AdminLiveMatchConsoleProps) {
  const isFutsal = match.sport === "futsal";
  const isFinishedMode = match.status === "finished";
  
  // Timer States
  const [minutes, setMinutes] = useState<number>(() => {
    const parsedMin = parseInt(match.minutes || "", 10);
    if (!isNaN(parsedMin)) return parsedMin;
    return isFinishedMode ? (isFutsal ? 40 : 90) : 1;
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [period, setPeriod] = useState<string>(match.minutes && parseInt(match.minutes, 10) > 45 ? "Second Half" : "First Half");

  // Scores
  const [scoreHome, setScoreHome] = useState<number>(match.scoreHome ?? 0);
  const [scoreAway, setScoreAway] = useState<number>(match.scoreAway ?? 0);

  // Events List inside Match
  const [events, setEvents] = useState<MatchEvent[]>(match.events || []);

  // Event Input helper states
  const [eventType, setEventType] = useState<string>("goal");
  const [eventTeam, setEventTeam] = useState<"home" | "away">("home");
  const [eventPlayer, setEventPlayer] = useState<string>("");
  const [eventPlayer2, setEventPlayer2] = useState<string>(""); // for assist / sub
  const [eventMin, setEventMin] = useState<string>("");
  const [eventDetails, setEventDetails] = useState<string>("");

  // MVP explicit selection
  const [mvpPlayerId, setMvpPlayerId] = useState<string>(() => {
    if (!match.mvpId) return "";
    const found = (players || []).find(p => p.id === match.mvpId || p.name === match.mvpId);
    return found ? found.id : "";
  });

  // Varzesh3 Sync states
  const [dataUrl, setDataUrl] = useState<string>(match.dataUrl || "");
  const [syncStatus, setSyncStatus] = useState<string>(match.syncStatus || "idle");
  const [syncMessage, setSyncMessage] = useState<string>("");

  // Live Sync states
  const [liveSyncMode, setLiveSyncMode] = useState<string>(match.syncMode || "off");
  const [liveSyncInterval, setLiveSyncInterval] = useState<number>(match.syncIntervalSec || 300);
  const [adminOverrides, setAdminOverrides] = useState<Record<string, any>>(match.adminOverrides || {});
  const [adminOverridesEnabled, setAdminOverridesEnabled] = useState<boolean>(match.adminOverridesEnabled || false);
  const [overrideField, setOverrideField] = useState<string>("");
  const [overrideValue, setOverrideValue] = useState<string>("");

  const resolvePlayerId = (nameOrId: string): string => {
    if (!nameOrId) return "";
    const found = (players || []).find(p => p.id === nameOrId || p.name === nameOrId);
    return found ? found.id : "";
  };

  // Suggestions states
  const [showPlayerSuggestions1, setShowPlayerSuggestions1] = useState<boolean>(false);
  const [showPlayerSuggestions2, setShowPlayerSuggestions2] = useState<boolean>(false);

  // Statistics — default to -1 (unknown) when no data exists
  const hasExistingStats = !!(match.teamStats || match.stats);
  const [possessionHome, setPossessionHome] = useState<number>(match.teamStats?.possession?.home ?? match.stats?.possessionHome ?? 50);
  const possessionAway = 100 - possessionHome;
  const [shotsHome, setShotsHome] = useState<number>(match.teamStats?.shots?.home ?? match.stats?.shotsHome ?? -1);
  const [shotsAway, setShotsAway] = useState<number>(match.teamStats?.shots?.away ?? match.stats?.shotsAway ?? -1);
  const [shotsOnTargetHome, setShotsOnTargetHome] = useState<number>(match.teamStats?.shotsOnTarget?.home ?? match.stats?.shotsOnTargetHome ?? -1);
  const [shotsOnTargetAway, setShotsOnTargetAway] = useState<number>(match.teamStats?.shotsOnTarget?.away ?? match.stats?.shotsOnTargetAway ?? -1);
  const [cornersHome, setCornersHome] = useState<number>(match.teamStats?.corners?.home ?? match.stats?.cornersHome ?? -1);
  const [cornersAway, setCornersAway] = useState<number>(match.teamStats?.corners?.away ?? match.stats?.cornersAway ?? -1);
  const [foulsHome, setFoulsHome] = useState<number>(match.teamStats?.fouls?.home ?? match.stats?.foulsHome ?? -1);
  const [foulsAway, setFoulsAway] = useState<number>(match.teamStats?.fouls?.away ?? match.stats?.foulsAway ?? -1);

  const [expectedGoalsHome, setExpectedGoalsHome] = useState<number>(match.teamStats?.expectedGoals?.home ?? -1);
  const [expectedGoalsAway, setExpectedGoalsAway] = useState<number>(match.teamStats?.expectedGoals?.away ?? -1);
  const [passesHome, setPassesHome] = useState<number>(match.teamStats?.passes?.home ?? -1);
  const [passesAway, setPassesAway] = useState<number>(match.teamStats?.passes?.away ?? -1);
  const [passAccuracyHome, setPassAccuracyHome] = useState<number>(match.teamStats?.passAccuracy?.home ?? -1);
  const [passAccuracyAway, setPassAccuracyAway] = useState<number>(match.teamStats?.passAccuracy?.away ?? -1);
  const [savesHome, setSavesHome] = useState<number>(match.teamStats?.saves?.home ?? -1);
  const [savesAway, setSavesAway] = useState<number>(match.teamStats?.saves?.away ?? -1);

  // Helper to detect if a value is unknown (-1 or "نامشخص")
  const isValUnknown = (val: any) => val === -1 || val === "-1" || val === "نامشخص" || val === "undefined" || val === null || val === undefined;

  const [unknownPossession, setUnknownPossession] = useState<boolean>(!hasExistingStats || isValUnknown(match.teamStats?.possession?.home ?? match.stats?.possessionHome));
  const [unknownShots, setUnknownShots] = useState<boolean>(!hasExistingStats || isValUnknown(match.teamStats?.shots?.home ?? match.stats?.shotsHome));
  const [unknownShotsOnTarget, setUnknownShotsOnTarget] = useState<boolean>(!hasExistingStats || isValUnknown(match.teamStats?.shotsOnTarget?.home ?? match.stats?.shotsOnTargetHome));
  const [unknownCorners, setUnknownCorners] = useState<boolean>(!hasExistingStats || isValUnknown(match.teamStats?.corners?.home ?? match.stats?.cornersHome));
  const [unknownFouls, setUnknownFouls] = useState<boolean>(!hasExistingStats || isValUnknown(match.teamStats?.fouls?.home ?? match.stats?.foulsHome));
  const [unknownExpectedGoals, setUnknownExpectedGoals] = useState<boolean>(!hasExistingStats || isValUnknown(match.teamStats?.expectedGoals?.home));
  const [unknownPasses, setUnknownPasses] = useState<boolean>(!hasExistingStats || isValUnknown(match.teamStats?.passes?.home));
  const [unknownPassAccuracy, setUnknownPassAccuracy] = useState<boolean>(!hasExistingStats || isValUnknown(match.teamStats?.passAccuracy?.home));
  const [unknownSaves, setUnknownSaves] = useState<boolean>(!hasExistingStats || isValUnknown(match.teamStats?.saves?.home));

  // Local starting lineups management
  const [localLineups, setLocalLineups] = useState<{ home: any[]; away: any[] }>({
    home: (match as any).lineups?.home || [],
    away: (match as any).lineups?.away || []
  });
  const [showLineupMgmt, setShowLineupMgmt] = useState<boolean>(false);
  const [homeFormation, setHomeFormation] = useState<string>((match as any).lineups?.homeFormation || "4-4-2");
  const [awayFormation, setAwayFormation] = useState<string>((match as any).lineups?.awayFormation || "4-4-2");

  // Helper helper digits converter
  const toPersianDigits = (num: number | string): string => {
    const numStr = String(num);
    const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
    return numStr.replace(/[0-9]/g, (w) => persianDigits[parseInt(w, 10)]);
  };

  // Clock tick simulation (+1 minute every 8 seconds when active)
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setMinutes((prev) => {
          const next = prev + 1;
          const maxMin = isFutsal ? 40 : 90;
          if (next >= maxMin) {
            setIsPlaying(false);
          }
          return next;
        });
      }, 8000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isFutsal]);

  // Set standard default minute on input opening
  useEffect(() => {
    setEventMin(String(minutes));
  }, [minutes]);

  // Live sync status polling — refreshes sync state from server every 10s when active
  const [livePollCount, setLivePollCount] = useState<number>(0);
  const [liveLastPollAt, setLiveLastPollAt] = useState<string | null>(null);
  const [liveLastSyncStatus, setLiveLastSyncStatus] = useState<string>(match.syncStatus || "idle");

  useEffect(() => {
    if (liveSyncMode === "off" || isFinishedMode) return;

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/match-sync/${match.id}/live/status`);
        const data = await res.json();
        if (data.success && data.data) {
          const s = data.data;
          setLiveSyncMode(s.syncMode || "off");
          setLiveLastSyncStatus(s.syncStatus || s.status || "idle");
          setLivePollCount(s.pollCount || 0);
          setLiveLastPollAt(s.lastPollAt || null);
          if (s.syncMode === "off") {
            setSyncStatus(s.syncStatus || "idle");
          } else {
            setSyncStatus(s.status || s.syncStatus || "active");
          }
          if (s.lastError) {
            setSyncMessage(`خطا: ${s.lastError}`);
          }
        }
      } catch {}
    };

    pollStatus();
    const interval = setInterval(pollStatus, 10000);
    return () => clearInterval(interval);
  }, [liveSyncMode, isFinishedMode, match.id]);

  // Handle Event Addition
  const handleAddEvent = () => {
    if (!eventPlayer && eventType !== "var" && eventType !== "other") {
      alert("لطفا نام بازیکن را وارد کنید.");
      return;
    }

    const newEvent: MatchEvent = {
      id: `ev-${Date.now()}`,
      type: eventType,
      minute: eventMin || String(minutes),
      team: eventTeam,
      playerName: eventPlayer,
      playerId: resolvePlayerId(eventPlayer) || undefined,
      player2Name: eventPlayer2 || undefined,
      player2Id: resolvePlayerId(eventPlayer2) || undefined,
      details: eventDetails || undefined
    };

    const updatedEvents = [...events, newEvent];
    setEvents(updatedEvents);

    // Apply quick score adjustments based on events
    if (eventType === "goal" || eventType === "penalty") {
      if (eventTeam === "home") {
        setScoreHome(prev => prev + 1);
      } else {
        setScoreAway(prev => prev + 1);
      }
    } else if (eventType === "own-goal") {
      // Own goal: the goal counts for the OPPOSITE team
      if (eventTeam === "home") {
        setScoreAway(prev => prev + 1);
      } else {
        setScoreHome(prev => prev + 1);
      }
    }

    // Reset fields
    setEventPlayer("");
    setEventPlayer2("");
    setEventDetails("");
  };

  // Handle Event Deletion
  const handleDeleteEvent = (id: string, type: string, team: string) => {
    setEvents(events.filter(e => e.id !== id));
    
    // Reverse score if deleted event is goal or penalty
    if (type === "goal" || type === "penalty") {
      if (team === "home") {
        setScoreHome(prev => Math.max(0, prev - 1));
      } else {
        setScoreAway(prev => Math.max(0, prev - 1));
      }
    } else if (type === "own-goal") {
      if (team === "home") {
        setScoreAway(prev => Math.max(0, prev - 1));
      } else {
        setScoreHome(prev => Math.max(0, prev - 1));
      }
    }
  };

  // Auto trigger save to backend
  const handleSaveState = async (status: "live" | "finished" = "live") => {
    const payload = {
      minutes: String(minutes),
      period,
      status,
      scoreHome,
      scoreAway,
      events,
      lineups: {
        ...localLineups,
        homeFormation,
        awayFormation,
      },
      stats: {
        possessionHome: unknownPossession ? -1 : possessionHome,
        possessionAway: unknownPossession ? -1 : possessionAway,
        shotsHome: unknownShots ? -1 : shotsHome,
        shotsAway: unknownShots ? -1 : shotsAway,
        shotsOnTargetHome: unknownShotsOnTarget ? -1 : shotsOnTargetHome,
        shotsOnTargetAway: unknownShotsOnTarget ? -1 : shotsOnTargetAway,
        cornersHome: unknownCorners ? -1 : cornersHome,
        cornersAway: unknownCorners ? -1 : cornersAway,
        foulsHome: unknownFouls ? -1 : foulsHome,
        foulsAway: unknownFouls ? -1 : foulsAway
      },
      teamStats: {
        possession: { home: unknownPossession ? -1 : possessionHome, away: unknownPossession ? -1 : possessionAway },
        shots: { home: unknownShots ? -1 : shotsHome, away: unknownShots ? -1 : shotsAway },
        shotsOnTarget: { home: unknownShotsOnTarget ? -1 : shotsOnTargetHome, away: unknownShotsOnTarget ? -1 : shotsOnTargetAway },
        corners: { home: unknownCorners ? -1 : cornersHome, away: unknownCorners ? -1 : cornersAway },
        fouls: { home: unknownFouls ? -1 : foulsHome, away: unknownFouls ? -1 : foulsAway },
        expectedGoals: { home: unknownExpectedGoals ? -1 : expectedGoalsHome, away: unknownExpectedGoals ? -1 : expectedGoalsAway },
        passes: { home: unknownPasses ? -1 : passesHome, away: unknownPasses ? -1 : passesAway },
        passAccuracy: { home: unknownPassAccuracy ? -1 : passAccuracyHome, away: unknownPassAccuracy ? -1 : passAccuracyAway },
        saves: { home: unknownSaves ? -1 : savesHome, away: unknownSaves ? -1 : savesAway }
      }
    };

    if (status === "finished") {
      // Automatic data extraction expects scorersList & MVP
      const scorersList = events
        .filter(e => e.type === "goal" || e.type === "penalty")
        .map(e => ({
          scorerId: e.playerId || resolvePlayerId(e.playerName),
          scorerName: e.playerName,
          name: e.playerName,
          goals: 1,
          assistName: e.player2Name || "",
          assistId: e.player2Id || resolvePlayerId(e.player2Name || ""),
          minute: e.minute
        }));

      const ownGoalsHome = events.filter(e => e.type === "own-goal" && e.team === "home").length;
      const ownGoalsAway = events.filter(e => e.type === "own-goal" && e.team === "away").length;
      const goalEventsHome = events.filter(e => (e.type === "goal" || e.type === "penalty") && e.team === "home").length + ownGoalsAway;
      const goalEventsAway = events.filter(e => (e.type === "goal" || e.type === "penalty") && e.team === "away").length + ownGoalsHome;
      if (goalEventsHome !== scoreHome || goalEventsAway !== scoreAway) {
        const ok = window.confirm(
          `تعداد رویدادهای گل با نتیجه ثبت‌شده همخوانی ندارد!\n` +
          `${match.teamHome}: ${scoreHome} گل ثبت‌شده ولی ${goalEventsHome} رویداد گل\n` +
          `${match.teamAway}: ${scoreAway} گل ثبت‌شده ولی ${goalEventsAway} رویداد گل\n` +
          `در صورت ادامه، آمار بر اساس نتیجه (اسکور) ثبت می‌شود. ادامه می‌دهید؟`
        );
        if (!ok) return;
      }

      const mvpPlayer = mvpPlayerId ? (players || []).find(p => p.id === mvpPlayerId) : undefined;
      const mvpName = mvpPlayer ? mvpPlayer.name : "";

      const finalReport = {
        ...match,
        ...payload,
        scorersList,
        mvpId: mvpPlayer ? mvpPlayer.id : "",
        mvpName: mvpName
      };

      const success = isFinishedMode && onSaveFinishedMatch
        ? await onSaveFinishedMatch(match.id, finalReport)
        : await onFinishMatch(match.id, finalReport);

      if (success) {
        alert(isFinishedMode
          ? "تغییرات مسابقه با موفقیت ثبت شد و جدول رده‌بندی و آمارها بازمحاسبه و همگام‌سازی شد!"
          : "مسابقه با موفقیت به اتمام رسید و جدول رده‌بندی فورا آپدیت شد!");
        if (!isFinishedMode) onCancel();
      } else {
        alert("خطا در ثبت اطلاعات مسابقه.");
      }
    } else {
      const success = await onUpdateMatch(match.id, payload);
      if (success) {
        alert("جزئیات مسابقه زنده با موفقیت ثبت و بر روی سایت همگام‌سازی شد!");
      } else {
        alert("خطا در همگام‌سازی جزئیات زنده.");
      }
    }
  };

  const handleSyncFromVarzesh3 = async () => {
    if (!dataUrl.trim()) {
      alert("لطفاً لینک صفحه بازی ورزش۳ را وارد کنید.");
      return;
    }
    if (!dataUrl.includes("varzesh3.com")) {
      alert("لینک باید از سایت ورزش۳ باشد.");
      return;
    }

    setSyncStatus("syncing");
    setSyncMessage("در حال دریافت و پردازش داده...");

    try {
      const res = await fetch(`/api/match-sync/${match.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: dataUrl.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setSyncStatus("idle");
        setSyncMessage(`همگام‌سازی موفق: ${data.data.scoreHome}-${data.data.scoreAway} | ${data.data.eventsCount} رویداد | روش: ${data.data.method}`);
        alert("همگام‌سازی با موفقیت انجام شد! صفحه را رفرش کنید تا تغییرات اعمال شود.");
      } else {
        setSyncStatus("error");
        setSyncMessage(`خطا: ${data.message}`);
        alert(`خطا در هگام‌سازی: ${data.message}`);
      }
    } catch (err: any) {
      setSyncStatus("error");
      setSyncMessage(`خطای شبکه: ${err.message}`);
      alert(`خطای شبکه: ${err.message}`);
    }
  };

  const handleStartLiveSync = async (mode: "auto" | "manual") => {
    if (!dataUrl.trim() || !dataUrl.includes("varzesh3.com")) {
      alert("لطفاً لینک معتبر ورزش۳ را وارد کنید.");
      return;
    }
    try {
      const res = await fetch(`/api/match-sync/${match.id}/live/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: dataUrl.trim(), mode, intervalSec: liveSyncInterval }),
      });
      const data = await res.json();
      if (data.success) {
        setLiveSyncMode(mode);
        setSyncStatus(mode === "auto" ? "pending" : "active");
        setSyncMessage(data.message);
      } else {
        alert(data.message);
      }
    } catch (err: any) {
      alert(`خطا: ${err.message}`);
    }
  };

  const handleStopLiveSync = async () => {
    try {
      const res = await fetch(`/api/match-sync/${match.id}/live/stop`, { method: "POST" });
      const data = await res.json();
      setLiveSyncMode("off");
      setSyncStatus("idle");
      setSyncMessage(data.message);
    } catch (err: any) {
      alert(`خطا: ${err.message}`);
    }
  };

  const handleSetAdminOverride = async () => {
    if (!overrideField) { alert("فیلد را انتخاب کنید."); return; }
    let parsedValue: any = overrideValue;
    try { parsedValue = JSON.parse(overrideValue); } catch {}
    try {
      const res = await fetch(`/api/match-sync/${match.id}/admin-override`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: overrideField, value: parsedValue }),
      });
      const data = await res.json();
      if (data.success) {
        setAdminOverrides({ ...adminOverrides, [overrideField]: parsedValue });
        setAdminOverridesEnabled(true);
        setOverrideValue("");
        alert(data.message);
      } else {
        alert(data.message);
      }
    } catch (err: any) {
      alert(`خطا: ${err.message}`);
    }
  };

  const handleRemoveAdminOverride = async (field: string) => {
    try {
      const res = await fetch(`/api/match-sync/${match.id}/admin-override/${field}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        const next = { ...adminOverrides };
        delete next[field];
        setAdminOverrides(next);
        setAdminOverridesEnabled(Object.keys(next).length > 0);
      }
    } catch (err: any) {
      alert(`خطا: ${err.message}`);
    }
  };

  const currentTeamName = eventTeam === "home" ? match.teamHome : match.teamAway;
  const currentTeamId = eventTeam === "home" ? match.teamHomeId : match.teamAwayId;
  const sameTeamId = (playerTeamId?: string, matchTeamId?: string) =>
    !!playerTeamId && !!matchTeamId && String(playerTeamId) === String(matchTeamId);

  const sameTeamName = (a?: string, b?: string) =>
    !!a && !!b && normalizePersianString(a) === normalizePersianString(b);

  const roster = (players || []).filter(p => 
    sameTeamId(p.teamId, currentTeamId) ||
    sameTeamName(p.teamName, currentTeamName)
  );

  const homeRoster = (players || []).filter(p => 
    sameTeamId(p.teamId, match.teamHomeId) ||
    sameTeamName(p.teamName, match.teamHome)
  );

  const LINE_LABELS = ["دروازه‌بان", "مدافع", "هافبک", "مهاجم"];
  const LINE_COLORS = ["text-yellow-400", "text-blue-400", "text-sky-400", "text-emerald-400"];

  const posToLineAdmin = (p: any): number => {
    const pos = (p.position || "").toLowerCase();
    if (pos.includes("دروازه") || pos.includes("gk") || pos.includes("گلر")) return 0;
    if (pos.includes("مدافع") || pos.includes("def")) return 1;
    if (pos.includes("هافبک") || pos.includes("وینگر") || pos.includes("mid")) return 2;
    return 3;
  };

  // Helper: update a player's formationLine in localLineups
  const setPlayerLine = (side: "home" | "away", playerId: string, newLine: number) => {
    setLocalLineups(prev => ({
      ...prev,
      [side]: prev[side].map((p: any) =>
        (p.id === playerId || p.name === playerId) ? { ...p, formationLine: newLine } : p
      ),
    }));
  };

  // Render a selected player with formation line selector
  const renderSelectedPlayer = (p: any, side: "home" | "away", accent: string) => {
    return (
      <div key={p.id || p.name} className={`flex items-center gap-1.5 p-1.5 rounded border text-[10px] ${
        accent === "emerald"
          ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/40"
          : "bg-sky-950/40 text-sky-400 border-sky-500/40"
      }`}>
        <span className="font-mono bg-zinc-800 px-1 rounded text-[9px] shrink-0">#{p.number || "?"}</span>
        <span className="truncate font-bold min-w-0 flex-1">{p.name}</span>
        <select
          value={p.formationLine ?? posToLineAdmin(p)}
          onChange={(e) => setPlayerLine(side, p.id || p.name, parseInt(e.target.value))}
          className="bg-black/40 border border-white/10 rounded text-[8px] px-1 py-0.5 cursor-pointer shrink-0 w-16"
          onClick={(e) => e.stopPropagation()}
        >
          {LINE_LABELS.map((label, idx) => (
            <option key={idx} value={idx}>{label}</option>
          ))}
        </select>
      </div>
    );
  };

  const awayRoster = (players || []).filter(p => 
    sameTeamId(p.teamId, match.teamAwayId) ||
    sameTeamName(p.teamName, match.teamAway)
  );

  // Assign a formation line (0=GK, 1=DEF, 2=MID, 3=FWD) based on player position and formation
  const assignFormationLine = (player: any, formation: string, isHome: boolean): number => {
    const pos = (player.position || "").toLowerCase();
    // GK always line 0
    if (pos.includes("دروازه") || pos.includes("gk") || pos.includes("گلر")) return 0;
    // Parse formation like "4-4-2" → [4,4,2]
    const parts = formation.split("-").map(Number);
    const defCount = parts[0] || 4;
    const midCount = parts[1] || 4;
    const fwdCount = parts[2] || 2;
    // Position-based assignment
    if (pos.includes("مدافع") || pos.includes("def")) return 1;
    if (pos.includes("هافبک") || pos.includes("وینگر") || pos.includes("mid") || pos.includes("wing")) return 2;
    if (pos.includes("مهاجم") || pos.includes(" fwd") || pos.includes("forward")) return 3;
    // Default: distribute based on count - assign to least filled line
    const lineup = isHome ? localLineups.home : localLineups.away;
    const counts = [0, 0, 0, 0];
    lineup.forEach((p: any) => {
      const l = p.formationLine ?? 3;
      if (l >= 0 && l <= 3) counts[l]++;
    });
    // Try FWD, then MID, then DEF
    if (counts[3] < fwdCount) return 3;
    if (counts[2] < midCount) return 2;
    if (counts[1] < defCount) return 1;
    return 2;
  };

  return (
    <div className="bg-[#0e0e12]/95 border border-white/5 rounded-2xl p-5 text-white max-w-5xl mx-auto" dir="rtl" id="live-console-container">
      {/* Header Info Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-4 mb-5">
        <div>
          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border flex items-center gap-1 w-max ${
            isFinishedMode 
              ? "bg-sky-950 text-sky-400 border-sky-900/40" 
              : "bg-red-950 text-red-400 border-red-900/30 animate-pulse"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isFinishedMode ? "bg-sky-400" : "bg-red-500 animate-ping"}`} />
            {isFinishedMode ? `اتاق کنترل مسابقه (ویرایش بازی خاتمه‌یافته) ${isFutsal ? "فوتسال" : "فوتبال"}` : `اتاق کنترل زنده ${isFutsal ? "فوتسال" : "فوتبال"}`}
          </span>
          <h2 className="font-extrabold text-base text-white mt-1">
            {match.teamHome} {scoreHome} - {scoreAway} {match.teamAway}
          </h2>
          <p className="text-[10px] text-slate-400 mt-1">{match.league === "futsal" ? "لیگ برتر فوتسال" : "لیگ فوتبال حرفه‌ای"} | فصل {match.season} | {match.week}</p>
        </div>

        <button onClick={onCancel} className="px-3 py-1.5 rounded-lg bg-[#222227] hover:bg-white/5 text-xs text-slate-300 transition flex items-center gap-1 cursor-pointer">
          <X className="h-4 w-4" /> خروج از کنترلر
        </button>
      </div>

      {/* Starting lineup controller bar */}
      <div className="bg-[#111115] border border-white/5 rounded-xl p-3 mb-5 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-emerald-400" />
          <div className="text-right">
            <h3 className="text-xs font-extrabold text-white">مدیریت ترکیب آغازین تیم‌ها (Starters Lineup)</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">
              ترکیب اصلی {match.teamHome} ({toPersianDigits(localLineups.home.length)} نفر) | ترکیب اصلی {match.teamAway} ({toPersianDigits(localLineups.away.length)} نفر)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowLineupMgmt(!showLineupMgmt)}
          className={`px-4 py-1.5 rounded-lg text-xs font-black select-none cursor-pointer transition flex items-center justify-center gap-1 ${
            showLineupMgmt 
              ? "bg-emerald-500 text-black hover:bg-emerald-400" 
              : "bg-white/5 hover:bg-white/10 text-slate-200"
          }`}
        >
          {showLineupMgmt ? "بستن پنل ترکیب" : "تنظیم ترکیب اصلی (۱۱ بازیکن آغازین)"}
        </button>
      </div>

      {showLineupMgmt && (
        <div id="starting-lineup-settings-panel">
          <div className="grid gap-4 md:grid-cols-2 mb-6">
          {/* Home Team Lineup Config */}
          <div className="bg-[#0b0b0f] border border-white/5 p-4 rounded-xl space-y-3">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="font-extrabold text-xs text-emerald-400">📋 ترکیب اصلی {match.teamHome} ({toPersianDigits(localLineups.home.length)} بازیکن)</span>
              <button
                type="button"
                onClick={() => {
                  const limit = isFutsal ? 5 : 11;
                  const selected = homeRoster.slice(0, limit).map((p, idx) => ({
                    id: p.id,
                    name: p.name,
                    number: p.number || 10,
                    position: p.position || "مدافع",
                    rating: parseFloat((p as any).rating) || 7.0,
                    formationLine: idx === 0 ? 0 : idx <= 4 ? 1 : idx <= 8 ? 2 : 3,
                  }));
                  setLocalLineups(prev => ({ ...prev, home: selected }));
                }}
                className="text-[9px] bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-bold px-2 py-1 rounded select-none cursor-pointer"
              >
                انتخاب خودکار چند بازیکن اول
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto pr-1">
              {/* Selected players first with formation line selectors */}
              {localLineups.home.length > 0 && (
                <div className="col-span-2 space-y-1 mb-2">
                  <span className="text-[8px] font-bold text-slate-500 block">ترکیب اصلی ({toPersianDigits(localLineups.home.length)} نفر) — خط ترکیبی را تنظیم کنید:</span>
                  {localLineups.home.map((p: any) => renderSelectedPlayer(p, "home", "emerald"))}
                </div>
              )}
              {/* Full roster for toggling */}
              {homeRoster.map((p) => {
                const isChecked = localLineups.home.some(x => x.id === p.id || x.name === p.name);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (isChecked) {
                        setLocalLineups(prev => ({
                          ...prev,
                          home: prev.home.filter(x => x.id !== p.id && x.name !== p.name)
                        }));
                      } else {
                        const item = {
                          id: p.id,
                          name: p.name,
                          number: p.number || 10,
                          position: p.position || "مدافع",
                          rating: parseFloat((p as any).rating) || 7.0,
                          formationLine: posToLineAdmin(p),
                        };
                        setLocalLineups(prev => ({
                          ...prev,
                          home: [...prev.home, item]
                        }));
                      }
                    }}
                    className={`flex items-center justify-between p-2 rounded text-right transition border text-[10px] font-semibold ${
                      isChecked 
                        ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/40 font-bold" 
                        : "bg-black/30 text-slate-400 border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="truncate pl-1">
                      <div>{p.name}</div>
                      <span className="text-[8px] opacity-60 font-mono tracking-wider">{p.position || "مدافع"}</span>
                    </div>
                    <span className="font-mono bg-zinc-800 px-1 rounded text-[9px]">#{p.number || 10}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Away Team Lineup Config */}
          <div className="bg-[#0b0b0f] border border-white/5 p-4 rounded-xl space-y-3">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="font-extrabold text-xs text-[#38bdf8]">📋 ترکیب اصلی {match.teamAway} ({toPersianDigits(localLineups.away.length)} بازیکن)</span>
              <button
                type="button"
                onClick={() => {
                  const limit = isFutsal ? 5 : 11;
                  const selected = awayRoster.slice(0, limit).map((p, idx) => ({
                    id: p.id,
                    name: p.name,
                    number: p.number || 10,
                    position: p.position || "مدافع",
                    rating: parseFloat((p as any).rating) || 7.0,
                    formationLine: idx === 0 ? 0 : idx <= 4 ? 1 : idx <= 8 ? 2 : 3,
                  }));
                  setLocalLineups(prev => ({ ...prev, away: selected }));
                }}
                className="text-[9px] bg-[#38bdf8]/10 text-[#38bdf8] hover:bg-[#38bdf8]/20 font-bold px-2 py-1 rounded select-none cursor-pointer"
              >
                انتخاب خودکار چند بازیکن اول
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto pr-1">
              {/* Selected players first with formation line selectors */}
              {localLineups.away.length > 0 && (
                <div className="col-span-2 space-y-1 mb-2">
                  <span className="text-[8px] font-bold text-slate-500 block">ترکیب اصلی ({toPersianDigits(localLineups.away.length)} نفر) — خط ترکیبی را تنظیم کنید:</span>
                  {localLineups.away.map((p: any) => renderSelectedPlayer(p, "away", "cyan"))}
                </div>
              )}
              {/* Full roster for toggling */}
              {awayRoster.map((p) => {
                const isChecked = localLineups.away.some(x => x.id === p.id || x.name === p.name);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (isChecked) {
                        setLocalLineups(prev => ({
                          ...prev,
                          away: prev.away.filter(x => x.id !== p.id && x.name !== p.name)
                        }));
                      } else {
                        const item = {
                          id: p.id,
                          name: p.name,
                          number: p.number || 10,
                          position: p.position || "مدافع",
                          rating: parseFloat((p as any).rating) || 7.0,
                          formationLine: posToLineAdmin(p),
                        };
                        setLocalLineups(prev => ({
                          ...prev,
                          away: [...prev.away, item]
                        }));
                      }
                    }}
                    className={`flex items-center justify-between p-2 rounded text-right transition border text-[10px] font-semibold ${
                      isChecked 
                        ? "bg-sky-950/40 text-sky-400 border-sky-500/40 font-bold" 
                        : "bg-black/30 text-slate-400 border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="truncate pl-1">
                      <div>{p.name}</div>
                      <span className="text-[8px] opacity-60 font-mono tracking-wider">{p.position || "مدافع"}</span>
                    </div>
                    <span className="font-mono bg-zinc-800 px-1 rounded text-[9px]">#{p.number || 10}</span>
                  </button>
                );
              })}
            </div>
          </div>
          </div>

        {/* Formation Pitch Preview */}
        {(localLineups.home.length > 0 || localLineups.away.length > 0) && (
          <div className="space-y-4">
            {/* Formation Pickers */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-emerald-400">چیدمان {match.teamHome}:</span>
                <select
                  value={homeFormation}
                  onChange={(e) => setHomeFormation(e.target.value)}
                  className="bg-[#1a1a20] border border-emerald-500/30 text-emerald-400 text-[11px] font-bold rounded px-2 py-1 cursor-pointer"
                >
                  {["4-4-2","4-3-3","3-5-2","3-4-3","4-2-3-1","5-3-2","5-4-1","4-1-4-1","4-5-1","3-4-1-2","2-4-4"].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-sky-400">چیدمان {match.teamAway}:</span>
                <select
                  value={awayFormation}
                  onChange={(e) => setAwayFormation(e.target.value)}
                  className="bg-[#1a1a20] border border-sky-500/30 text-sky-400 text-[11px] font-bold rounded px-2 py-1 cursor-pointer"
                >
                  {["4-4-2","4-3-3","3-5-2","3-4-3","4-2-3-1","5-3-2","5-4-1","4-1-4-1","4-5-1","3-4-1-2","2-4-4"].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>

            <FormationPitch
              homeLineup={localLineups.home.map((p: any) => ({
                ...p,
                formationLine: p.formationLine ?? assignFormationLine(p, homeFormation, true),
              }))}
              awayLineup={localLineups.away.map((p: any) => ({
                ...p,
                formationLine: p.formationLine ?? assignFormationLine(p, awayFormation, false),
              }))}
              homeFormation={homeFormation}
              awayFormation={awayFormation}
              homeName={match.teamHome}
              awayName={match.teamAway}
            />
          </div>
        )}

        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Timer & Score Overrides */}
        <div className="md:col-span-1 space-y-4 bg-slate-900/30 p-4 rounded-xl border border-white/[0.02]">
          <h3 className="font-black text-xs text-emerald-400 flex items-center gap-1.5 border-b border-white/5 pb-2">
            <Clock className="h-4 w-4" /> {isFinishedMode ? "نتیجه نهایی بازی" : "زمان‌سنج و ناوبری نیمه"}
          </h3>

          {!isFinishedMode && (
            <>
          {/* Time Dial */}
          <div className="bg-[#070709] p-4 rounded-xl border border-white/5 text-center relative group">
            <span className="text-[10px] text-slate-500 font-bold block mb-1">دقیقه مسابقه</span>
            <div className="text-3xl font-mono text-emerald-400 font-black tracking-widest">
              {minutes}'
            </div>

            <div className="text-[11px] font-bold text-slate-400 mt-1">
              {period === "First Half" ? "نیمه اول" : (period === "HT" ? "بین دو نیمه" : "نیمه دوم")}
            </div>

            {/* Run and Controls */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-2 rounded-lg cursor-pointer transition ${isPlaying ? "bg-amber-600 text-white" : "bg-emerald-500 text-black font-bold"}`}
                title={isPlaying ? "توقف همزمانی" : "شروع همزمانی سریع دقیقه"}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-3.5 w-3.5" />}
              </button>

              <button 
                onClick={() => setMinutes(prev => Math.max(1, prev - 1))}
                className="p-1 px-2.5 text-xs font-bold rounded bg-white/5 hover:bg-white/10 text-slate-300 transition"
              >
                -۱
              </button>
              <button 
                onClick={() => setMinutes(prev => prev + 1)}
                className="p-1 px-2.5 text-xs font-bold rounded bg-white/5 hover:bg-white/10 text-slate-300 transition"
              >
                +۱
              </button>
              
              <button 
                onClick={() => {
                  setMinutes(1);
                  setIsPlaying(false);
                  setPeriod("First Half");
                }}
                className="p-2 rounded-lg bg-white/5 hover:bg-red-950/40 text-slate-450 text-slate-400 transition"
                title="ریست ساعت"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Select Period */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-bold">وضعیت و مقطع بازی</label>
            <select
              value={period}
              onChange={(e) => {
                const per = e.target.value;
                setPeriod(per);
                if (per === "First Half") setMinutes(1);
                if (per === "Second Half") setMinutes(isFutsal ? 20 : 45);
                if (per === "HT") setIsPlaying(false);
              }}
              className="w-full text-xs rounded bg-[#07070a] border border-white/5 p-2.5 text-white font-bold focus:outline-none"
            >
              <option value="First Half">نیمه اول</option>
              <option value="HT">بین دو نیمه (HT)</option>
              <option value="Second Half">نیمه دوم</option>
            </select>
          </div>
            </>
          )}

          {/* Core score manual override */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">گل میزبان ({match.teamHome})</label>
              <input
                type="number"
                value={scoreHome}
                onChange={(e) => setScoreHome(parseInt(e.target.value) || 0)}
                className="w-full text-center text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">گل میهمان ({match.teamAway})</label>
              <input
                type="number"
                value={scoreAway}
                onChange={(e) => setScoreAway(parseInt(e.target.value) || 0)}
                className="w-full text-center text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white font-bold"
              />
            </div>
          </div>

          {/* Action trigger */}
          {!isFinishedMode && (
            <button
              onClick={() => handleSaveState("live")}
              className="w-full bg-[#10b981] text-black font-black text-xs py-2.5 rounded-lg hover:bg-emerald-400 transition flex items-center justify-center gap-1.5 shadow cursor-pointer mt-4"
            >
              <Check className="h-4 w-4" /> ذخیره موقت جزئیات زنده
            </button>
          )}
        </div>

        {/* Central Column: Event Logging */}
        <div className="md:col-span-1 space-y-4 bg-slate-900/30 p-4 rounded-xl border border-white/[0.02]">
          <h3 className="font-black text-xs text-red-400 flex items-center gap-1.5 border-b border-white/5 pb-2">
            <Activity className="h-4 w-4" /> درج رویداد و وقایع مسابقه
          </h3>

          <div className="space-y-3 pt-1">
            {/* Team selection */}
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 font-bold">تیم صاحب رویداد</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEventTeam("home")}
                  className={`text-[11px] font-bold p-2 rounded border transition cursor-pointer ${eventTeam === "home" ? "bg-emerald-950 text-emerald-400 border-emerald-500/50" : "bg-black/30 text-slate-450 border-white/5"}`}
                >
                  {match.teamHome} (میزبان)
                </button>
                <button
                  type="button"
                  onClick={() => setEventTeam("away")}
                  className={`text-[11px] font-bold p-2 rounded border transition cursor-pointer ${eventTeam === "away" ? "bg-emerald-950 text-emerald-400 border-emerald-500/50" : "bg-black/30 text-slate-450 border-white/5"}`}
                >
                  {match.teamAway} (میهمان)
                </button>
              </div>
            </div>

            {/* Event Type */}
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 font-bold">نوع رویداد بازی</label>
              <select
                value={eventType}
                onChange={(e) => {
                  setEventType(e.target.value);
                  if (e.target.value === "own-goal") {
                    setEventPlayer2("");
                  }
                }}
                className="w-full text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white font-bold focus:outline-none"
              >
                <option value="goal">⚽ گل</option>
                <option value="assist">👟 پاس گل</option>
                <option value="penalty">🥅 پنالتی (گل)</option>
                <option value="own-goal">🎯 گل به خودی</option>
                <option value="missed-penalty">❌ پنالتی از دست رفته</option>
                <option value="yellow-card">🟨 کارت زرد</option>
                <option value="red-card">🟥 کارت قرمز</option>
                <option value="substitution">🔁 تعویض بازیکن</option>
                <option value="injury">🩹 مصدومیت</option>
                <option value="var">📺 بازبینی ویدئویی VAR</option>
                <option value="other">💬 سایر رویدادها / متن آزاد</option>
              </select>
              {eventType === "own-goal" && (
                <p className="mt-1 text-[10px] text-amber-500/90">
                  🎯 گل به خودی برای تیم مقابل محاسبه می‌شود و در آمار گلِ این بازیکن ثبت نمی‌شود.
                </p>
              )}
            </div>

            {/* Player details */}
            {eventType !== "var" && (
              <div className="relative">
                <label className="block text-[10px] text-slate-400 mb-1 font-bold">نام بازیکن (یا شناسه)</label>
                <input
                  type="text"
                  placeholder="مثال: رامین رضاییان"
                  value={eventPlayer}
                  onChange={(e) => {
                    setEventPlayer(e.target.value);
                    setShowPlayerSuggestions1(true);
                  }}
                  onFocus={() => setShowPlayerSuggestions1(true)}
                  onBlur={() => setTimeout(() => setShowPlayerSuggestions1(false), 200)}
                  className="w-full text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white focus:outline-none focus:border-emerald-500 font-bold"
                  id="event-player-input-1"
                />

                {/* Suggestions Dropdown for Player 1 */}
                {showPlayerSuggestions1 && roster.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-[#0c0c10] p-1 shadow-2xl divide-y divide-white/[0.03]" id="event-player-1-suggestions">
                    {roster
                      .filter(p => !eventPlayer || p.name.includes(eventPlayer) || (p.number && String(p.number).includes(eventPlayer)))
                      .map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onMouseDown={() => {
                            setEventPlayer(p.name);
                            setShowPlayerSuggestions1(false);
                          }}
                          className="w-full text-right text-xs p-2 hover:bg-emerald-500 hover:text-black rounded-md transition flex items-center justify-between text-slate-200 cursor-pointer font-semibold"
                        >
                          <span>{p.name}</span>
                          <span className="text-[9px] opacity-75 font-mono">#{p.number} - {p.position}</span>
                        </button>
                      ))}
                    {roster.filter(p => p.name.includes(eventPlayer) || (p.number && String(p.number).includes(eventPlayer))).length === 0 && (
                      <div className="text-[10px] text-slate-500 p-2 text-center italic">بازیکنی از این تیم یافت نشد. می‌توانید دلخواه بنویسید.</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Substitution Player 2 / Assister */}
            {(eventType === "substitution" || eventType === "assist" || eventType === "goal") && (
              <div className="relative">
                <label className="block text-[10px] text-slate-400 mb-1 font-bold">
                  {eventType === "substitution" ? "بازیکن ورودی" : "نام بازیکن پاسور"}
                </label>
                <input
                  type="text"
                  placeholder={eventType === "substitution" ? "بازیکن جدید" : "پاسور"}
                  value={eventPlayer2}
                  onChange={(e) => {
                    setEventPlayer2(e.target.value);
                    setShowPlayerSuggestions2(true);
                  }}
                  onFocus={() => setShowPlayerSuggestions2(true)}
                  onBlur={() => setTimeout(() => setShowPlayerSuggestions2(false), 200)}
                  className="w-full text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white focus:outline-none focus:border-emerald-500 font-bold"
                  id="event-player-input-2"
                />

                {/* Suggestions Dropdown for Player 2 */}
                {showPlayerSuggestions2 && roster.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-[#0c0c10] p-1 shadow-2xl divide-y divide-white/[0.03]" id="event-player-2-suggestions">
                    {roster
                      .filter(p => !eventPlayer2 || p.name.includes(eventPlayer2) || (p.number && String(p.number).includes(eventPlayer2)))
                      .map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onMouseDown={() => {
                            setEventPlayer2(p.name);
                            setShowPlayerSuggestions2(false);
                          }}
                          className="w-full text-right text-xs p-2 hover:bg-emerald-500 hover:text-black rounded-md transition flex items-center justify-between text-slate-200 cursor-pointer font-semibold"
                        >
                          <span>{p.name}</span>
                          <span className="text-[9px] opacity-75 font-mono">#{p.number} - {p.position}</span>
                        </button>
                      ))}
                    {roster.filter(p => p.name.includes(eventPlayer2) || (p.number && String(p.number).includes(eventPlayer2))).length === 0 && (
                      <div className="text-[10px] text-slate-500 p-2 text-center italic">بازیکنی از این تیم یافت نشد. می‌توانید دلخواه بنویسید.</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Minute and details */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="block text-[10px] text-slate-500 mb-1">دقیقه</label>
                <input
                  type="text"
                  value={eventMin}
                  onChange={(e) => setEventMin(e.target.value)}
                  placeholder="مثلاً 45+5 یا 50"
                  className="w-full text-center text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white font-mono"
                />
                {(() => {
                  const parsed = parseMatchMinute(eventMin);
                  if (parsed.total <= 0) return null;
                  const halfLabel = parsed.half === 1 ? "نیمه اول" : "نیمه دوم";
                  return (
                    <p className="text-[9px] text-slate-500 mt-1 leading-relaxed">
                      {parsed.isStoppage
                        ? `${toPersianDigits(parsed.base)} + ${toPersianDigits(parsed.added)} → دقیقه ${toPersianDigits(parsed.total)} (${halfLabel}، وقت اضافه)`
                        : `دقیقه ${toPersianDigits(parsed.total)} (${halfLabel})`}
                    </p>
                  );
                })()}
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-1">توضیحات کوتاه</label>
                <input
                  type="text"
                  placeholder="ضربه سر / واکنش داور"
                  value={eventDetails}
                  onChange={(e) => setEventDetails(e.target.value)}
                  className="w-full text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddEvent}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs py-2 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer mt-3"
            >
              <Plus className="h-4 w-4" /> درج رویداد در لیست وقایع
            </button>
          </div>
        </div>

        {/* Right Column: Statistics */}
        <div className="md:col-span-1 space-y-4 bg-slate-900/30 p-4 rounded-xl border border-white/[0.02]">
          <h3 className="font-black text-xs text-sky-400 flex items-center gap-1.5 border-b border-white/5 pb-2">
            <Sliders className="h-4 w-4" /> {isFinishedMode ? "آمار تیمی مسابقه" : "آمار تیمی و درصدهای بازی زنده"}
          </h3>

          <div className="space-y-4 pt-1">
            {/* Possession */}
            <div className="space-y-1 bg-black/20 p-2 rounded-lg border border-white/[0.02]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-slate-400 font-bold">مالکیت توپ</span>
                <button 
                  type="button"
                  onClick={() => setUnknownPossession(!unknownPossession)}
                  className={`text-[9px] px-1.5 py-0.5 rounded transition font-bold ${unknownPossession ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
                >
                  {unknownPossession ? "نامشخص ✓" : "نامشخص؟"}
                </button>
              </div>
              {unknownPossession ? (
                <div className="w-full text-center text-xs py-1 text-amber-500/80 font-bold italic">
                  نامشخص (ثبت نشده)
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                    <span>{match.teamHome}: {possessionHome}%</span>
                    <span>{match.teamAway}: {possessionAway}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={possessionHome}
                    onChange={(e) => setPossessionHome(parseInt(e.target.value) || 50)}
                    className="w-full accent-emerald-500 cursor-pointer h-1.5 rounded-lg bg-black/40"
                  />
                </>
              )}
            </div>

            {/* Shots */}
            <div className="bg-black/20 p-2 rounded-lg border border-white/[0.02] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-bold">شوت مجموع</span>
                <button 
                  type="button"
                  onClick={() => setUnknownShots(!unknownShots)}
                  className={`text-[9px] px-1.5 py-0.5 rounded transition font-bold ${unknownShots ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
                >
                  {unknownShots ? "نامشخص ✓" : "نامشخص؟"}
                </button>
              </div>
              {unknownShots ? (
                <div className="w-full text-center text-xs py-1 text-amber-500/80 font-bold italic">
                  نامشخص (ثبت نشده)
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">شوت {match.teamHome}</label>
                    <input
                      type="number"
                      value={shotsHome}
                      onChange={(e) => setShotsHome(parseInt(e.target.value) || 0)}
                      className="w-full text-center text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">شوت {match.teamAway}</label>
                    <input
                      type="number"
                      value={shotsAway}
                      onChange={(e) => setShotsAway(parseInt(e.target.value) || 0)}
                      className="w-full text-center text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Shots on target */}
            <div className="bg-black/20 p-2 rounded-lg border border-white/[0.02] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-bold">شوت داخل چارچوب</span>
                <button 
                  type="button"
                  onClick={() => setUnknownShotsOnTarget(!unknownShotsOnTarget)}
                  className={`text-[9px] px-1.5 py-0.5 rounded transition font-bold ${unknownShotsOnTarget ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
                >
                  {unknownShotsOnTarget ? "نامشخص ✓" : "نامشخص؟"}
                </button>
              </div>
              {unknownShotsOnTarget ? (
                <div className="w-full text-center text-xs py-1 text-amber-500/80 font-bold italic">
                  نامشخص (ثبت نشده)
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">در چارچوب {match.teamHome}</label>
                    <input
                      type="number"
                      value={shotsOnTargetHome}
                      onChange={(e) => setShotsOnTargetHome(parseInt(e.target.value) || 0)}
                      className="w-full text-center text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">در چارچوب {match.teamAway}</label>
                    <input
                      type="number"
                      value={shotsOnTargetAway}
                      onChange={(e) => setShotsOnTargetAway(parseInt(e.target.value) || 0)}
                      className="w-full text-center text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Corners */}
            <div className="bg-black/20 p-2 rounded-lg border border-white/[0.02] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-bold">ضربات کرنر</span>
                <button 
                  type="button"
                  onClick={() => setUnknownCorners(!unknownCorners)}
                  className={`text-[9px] px-1.5 py-0.5 rounded transition font-bold ${unknownCorners ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
                >
                  {unknownCorners ? "نامشخص ✓" : "نامشخص؟"}
                </button>
              </div>
              {unknownCorners ? (
                <div className="w-full text-center text-xs py-1 text-amber-500/80 font-bold italic">
                  نامشخص (ثبت نشده)
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">کرنرهای {match.teamHome}</label>
                    <input
                      type="number"
                      value={cornersHome}
                      onChange={(e) => setCornersHome(parseInt(e.target.value) || 0)}
                      className="w-full text-center text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">کرنرهای {match.teamAway}</label>
                    <input
                      type="number"
                      value={cornersAway}
                      onChange={(e) => setCornersAway(parseInt(e.target.value) || 0)}
                      className="w-full text-center text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Fouls */}
            <div className="bg-black/20 p-2 rounded-lg border border-white/[0.02] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-bold">خطاها</span>
                <button 
                  type="button"
                  onClick={() => setUnknownFouls(!unknownFouls)}
                  className={`text-[9px] px-1.5 py-0.5 rounded transition font-bold ${unknownFouls ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
                >
                  {unknownFouls ? "نامشخص ✓" : "نامشخص؟"}
                </button>
              </div>
              {unknownFouls ? (
                <div className="w-full text-center text-xs py-1 text-amber-500/80 font-bold italic">
                  نامشخص (ثبت نشده)
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">خطاهای {match.teamHome}</label>
                    <input
                      type="number"
                      value={foulsHome}
                      onChange={(e) => setFoulsHome(parseInt(e.target.value) || 0)}
                      className="w-full text-center text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">خطاهای {match.teamAway}</label>
                    <input
                      type="number"
                      value={foulsAway}
                      onChange={(e) => setFoulsAway(parseInt(e.target.value) || 0)}
                      className="w-full text-center text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Expected Goals (xG) */}
            <div className="bg-black/20 p-2 rounded-lg border border-white/[0.02] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-bold">امید به گل (xG)</span>
                <button 
                  type="button"
                  onClick={() => setUnknownExpectedGoals(!unknownExpectedGoals)}
                  className={`text-[9px] px-1.5 py-0.5 rounded transition font-bold ${unknownExpectedGoals ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
                >
                  {unknownExpectedGoals ? "نامشخص ✓" : "نامشخص؟"}
                </button>
              </div>
              {unknownExpectedGoals ? (
                <div className="w-full text-center text-xs py-1 text-amber-500/80 font-bold italic">
                  نامشخص (ثبت نشده)
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">امید به گل (xG) {match.teamHome}</label>
                    <input
                      type="number"
                      step="0.1"
                      value={expectedGoalsHome}
                      onChange={(e) => setExpectedGoalsHome(parseFloat(e.target.value) || 0)}
                      className="w-full text-center text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">امید به گل (xG) {match.teamAway}</label>
                    <input
                      type="number"
                      step="0.1"
                      value={expectedGoalsAway}
                      onChange={(e) => setExpectedGoalsAway(parseFloat(e.target.value) || 0)}
                      className="w-full text-center text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Passes */}
            <div className="bg-black/20 p-2 rounded-lg border border-white/[0.02] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-bold">پاس‌های ردوبدل شده</span>
                <button 
                  type="button"
                  onClick={() => setUnknownPasses(!unknownPasses)}
                  className={`text-[9px] px-1.5 py-0.5 rounded transition font-bold ${unknownPasses ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
                >
                  {unknownPasses ? "نامشخص ✓" : "نامشخص؟"}
                </button>
              </div>
              {unknownPasses ? (
                <div className="w-full text-center text-xs py-1 text-amber-500/80 font-bold italic">
                  نامشخص (ثبت نشده)
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">تعداد پاس‌های {match.teamHome}</label>
                    <input
                      type="number"
                      value={passesHome}
                      onChange={(e) => setPassesHome(parseInt(e.target.value) || 0)}
                      className="w-full text-center text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">تعداد پاس‌های {match.teamAway}</label>
                    <input
                      type="number"
                      value={passesAway}
                      onChange={(e) => setPassesAway(parseInt(e.target.value) || 0)}
                      className="w-full text-center text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Pass Accuracy */}
            <div className="bg-black/20 p-2 rounded-lg border border-white/[0.02] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-bold">دقت پاس</span>
                <button 
                  type="button"
                  onClick={() => setUnknownPassAccuracy(!unknownPassAccuracy)}
                  className={`text-[9px] px-1.5 py-0.5 rounded transition font-bold ${unknownPassAccuracy ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
                >
                  {unknownPassAccuracy ? "نامشخص ✓" : "نامشخص؟"}
                </button>
              </div>
              {unknownPassAccuracy ? (
                <div className="w-full text-center text-xs py-1 text-amber-500/80 font-bold italic">
                  نامشخص (ثبت نشده)
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">دقت پاس {match.teamHome} (٪)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={passAccuracyHome}
                      onChange={(e) => setPassAccuracyHome(parseInt(e.target.value) || 0)}
                      className="w-full text-center text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">دقت پاس {match.teamAway} (٪)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={passAccuracyAway}
                      onChange={(e) => setPassAccuracyAway(parseInt(e.target.value) || 0)}
                      className="w-full text-center text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Saves */}
            <div className="bg-black/20 p-2 rounded-lg border border-white/[0.02] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-bold">سیوهای دروازه‌بان</span>
                <button 
                  type="button"
                  onClick={() => setUnknownSaves(!unknownSaves)}
                  className={`text-[9px] px-1.5 py-0.5 rounded transition font-bold ${unknownSaves ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
                >
                  {unknownSaves ? "نامشخص ✓" : "نامشخص؟"}
                </button>
              </div>
              {unknownSaves ? (
                <div className="w-full text-center text-xs py-1 text-amber-500/80 font-bold italic">
                  نامشخص (ثبت نشده)
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">سیوهای {match.teamHome}</label>
                    <input
                      type="number"
                      value={savesHome}
                      onChange={(e) => setSavesHome(parseInt(e.target.value) || 0)}
                      className="w-full text-center text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">سیوهای {match.teamAway}</label>
                    <input
                      type="number"
                      value={savesAway}
                      onChange={(e) => setSavesAway(parseInt(e.target.value) || 0)}
                      className="w-full text-center text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Event Logs Register */}
      <div className="bg-[#08080a] p-4 rounded-xl border border-white/5 mt-5">
        <h3 className="font-extrabold text-xs text-yellow-500 border-b border-white/5 pb-2 mb-3">
          📜 لیست زمانی رویدادهای ثبت شده بازی
        </h3>
        {events.length === 0 ? (
          <p className="text-[10px] text-slate-500 italic p-3 text-center">هیچ رویدادی برای این مسابقه ثبت نشده است. از جعبه وسط برای وارد کردن اطلاعات بازی اعم از گل و کارت زرد استفاده کنید.</p>
        ) : (
          <div className="max-h-[140px] overflow-y-auto space-y-2 pr-1 text-xs" dir="ltr text-right">
            {events.map((ev, index) => (
              <div key={ev.id || index} className="flex justify-between items-center bg-white/[0.02] border border-white/5 p-2 rounded hover:bg-white/[0.04]">
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-zinc-800 text-yellow-500 text-[10px] font-bold px-1.5 py-0.5 rounded">
                    دقیقه {ev.minute}'
                  </span>
                  <span className="text-[11px] text-slate-400">
                    [{ev.team === "home" ? "میزبان" : "میهمان"}]
                  </span>
                  <strong className="text-white">
                    {ev.type === "goal" ? "⚽ گل " : 
                     ev.type === "assist" ? "👟 پاسور " : 
                     ev.type === "penalty" ? "🥅 پنالتی " : 
                     ev.type === "own-goal" ? "🎯 گل به خودی " : 
                     ev.type === "yellow-card" ? "🟨 کارت زرد " : 
                     ev.type === "red-card" ? "🟥 کارت قرمز " : 
                     ev.type === "substitution" ? "🔁 تعویض " : 
                     ev.type === "injury" ? "🩹 مصدومیت " : "💬 "}
                    {ev.playerName}
                  </strong>
                  {ev.player2Name && <span className="text-slate-450 text-[10px]">({ev.player2Name})</span>}
                  {ev.details && <span className="text-slate-500 text-[10px]">— {ev.details}</span>}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteEvent(ev.id, ev.type, ev.team)}
                  className="text-red-500 hover:text-red-400 p-1 rounded bg-white/5"
                  title="حذف رویداد"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MVP SELECTION */}
      <div className="bg-[#08080a] p-4 rounded-xl border border-white/5 mt-5">
        <h3 className="font-extrabold text-xs text-amber-500 border-b border-white/5 pb-2 mb-3">
          🏅 انتخاب بهترین بازیکن زمین (MVP)
        </h3>
        <div className="flex flex-col gap-2">
          <select
            value={mvpPlayerId}
            onChange={(e) => setMvpPlayerId(e.target.value)}
            className="w-full text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white focus:outline-none focus:border-amber-500 font-bold"
          >
            <option value="">— بدون انتخاب (هیچکس: MVP ثبت نشود) —</option>
            {[...homeRoster, ...awayRoster]
              .filter((p, idx, arr) => arr.findIndex((x) => x.id === p.id) === idx)
              .map(p => (
                <option key={p.id} value={p.id}>{p.name} — {p.teamName}</option>
              ))}
          </select>
          {mvpPlayerId && (
            <div className="text-[10px] text-amber-400 font-bold">
              🏅 MVP انتخابی: {(players || []).find(p => p.id === mvpPlayerId)?.name || mvpPlayerId}
            </div>
          )}
        </div>
      </div>

      {/* VARZESH3 SYNC BOX — works for both live and finished matches */}
      <div className="bg-[#08080a] p-4 rounded-xl border border-white/5 mt-5">
        <h3 className="font-extrabold text-xs text-blue-400 border-b border-white/5 pb-2 mb-3 flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> هگام‌سازی داده از ورزش۳
          {liveSyncMode !== "off" && (
            <span className={`text-[9px] px-2 py-0.5 rounded-full ${
              liveSyncMode === "auto" ? "bg-emerald-900/50 text-emerald-400" : "bg-amber-900/50 text-amber-400"
            }`}>
              {liveSyncMode === "auto" ? "اتوماتیک" : "دستی"} فعال
            </span>
          )}
        </h3>

        {/* URL Input — always visible */}
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center mb-3">
          <input
            type="text"
            value={dataUrl}
            onChange={(e) => { setDataUrl(e.target.value); setSyncMessage(""); }}
            placeholder="https://www.varzesh3.com/football/match/XXXXX/بازی-..."
            className="flex-1 text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-mono ltr"
            dir="ltr"
          />
        </div>

        {/* Control Buttons */}
        <div className="flex flex-wrap gap-2 mb-3">
          {isFinishedMode ? (
            <button
              onClick={handleSyncFromVarzesh3}
              disabled={syncStatus === "syncing"}
              className={`font-extrabold text-[11px] px-4 py-2 rounded-lg flex items-center gap-1.5 shadow whitespace-nowrap ${
                syncStatus === "syncing"
                  ? "bg-slate-600 text-slate-300 cursor-wait"
                  : "bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
              }`}
            >
              {syncStatus === "syncing" ? (
                <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> در حال پردازش...</>
              ) : (
                <><ExternalLink className="h-3.5 w-3.5" /> تست و هگام‌سازی</>
              )}
            </button>
          ) : (
            <>
              {liveSyncMode === "off" ? (
                <>
                  <button
                    onClick={() => handleStartLiveSync("auto")}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] px-4 py-2 rounded-lg flex items-center gap-1.5 shadow"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> شروع اتوماتیک
                  </button>
                  <button
                    onClick={() => handleStartLiveSync("manual")}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-[11px] px-4 py-2 rounded-lg flex items-center gap-1.5 shadow"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> شروع دستی
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStopLiveSync}
                  className="bg-red-600 hover:bg-red-500 text-white font-extrabold text-[11px] px-4 py-2 rounded-lg flex items-center gap-1.5 shadow"
                >
                  توقف سینک
                </button>
              )}
            </>
          )}

          {/* Interval selector — only for live sync */}
          {!isFinishedMode && liveSyncMode === "off" && (
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span>هر</span>
              <select
                value={liveSyncInterval}
                onChange={(e) => setLiveSyncInterval(Number(e.target.value))}
                className="bg-[#07070a] border border-white/10 rounded px-2 py-1 text-white text-[10px]"
              >
                <option value={60}>۱ دقیقه</option>
                <option value={120}>۲ دقیقه</option>
                <option value={180}>۳ دقیقه</option>
                <option value={300}>۵ دقیقه</option>
              </select>
              <span>یکبار</span>
            </div>
          )}
        </div>

        {/* Admin Override Section — only for live */}
        {!isFinishedMode && (
          <div className="border-t border-white/5 pt-3 mt-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-amber-400 font-bold">Override ادمین</span>
              {adminOverridesEnabled && (
                <span className="text-[8px] bg-amber-900/50 text-amber-400 px-1.5 py-0.5 rounded-full">
                  فعال — {Object.keys(adminOverrides).length} فیلد محافظت‌شده
                </span>
              )}
            </div>
            {Object.keys(adminOverrides).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {Object.entries(adminOverrides).map(([field, val]) => (
                  <span key={field} className="text-[9px] bg-amber-900/30 text-amber-300 px-2 py-1 rounded flex items-center gap-1">
                    {field}: {typeof val === "object" ? JSON.stringify(val).slice(0, 30) : String(val).slice(0, 30)}
                    <button onClick={() => handleRemoveAdminOverride(field)} className="text-red-400 hover:text-red-300 ml-1 font-bold">✕</button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-center">
              <select
                value={overrideField}
                onChange={(e) => setOverrideField(e.target.value)}
                className="bg-[#07070a] border border-white/10 rounded px-2 py-1 text-white text-[10px]"
              >
                <option value="">فیلد...</option>
                <option value="scoreHome">گل خانه</option>
                <option value="scoreAway">گل مهمان</option>
                <option value="referee">داور</option>
                <option value="venue">ورزشگاه</option>
                <option value="minutes">دقیقه</option>
              </select>
              <input
                type="text"
                value={overrideValue}
                onChange={(e) => setOverrideValue(e.target.value)}
                placeholder="مقدار..."
                className="flex-1 text-[10px] rounded bg-[#07070a] border border-white/5 p-1.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={handleSetAdminOverride}
                disabled={!overrideField || !overrideValue}
                className="bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold text-[10px] px-3 py-1.5 rounded"
              >
                ثبت
              </button>
            </div>
          </div>
        )}

        {/* Status messages */}
        {syncMessage && (
          <div className={`mt-2 text-[10px] font-bold flex items-center gap-1.5 ${
            syncStatus === "error" ? "text-red-400" : syncStatus === "syncing" ? "text-blue-400" : "text-emerald-400"
          }`}>
            {syncStatus === "error" ? <AlertCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
            {syncMessage}
          </div>
        )}
        {liveSyncMode !== "off" && (
          <div className="mt-2 flex flex-wrap gap-3 text-[9px] text-slate-500">
            {livePollCount > 0 && <span>پلینگ: {livePollCount} بار</span>}
            {liveLastPollAt && <span>آخرین: {new Date(liveLastPollAt).toLocaleTimeString("fa-IR")}</span>}
            {liveLastSyncStatus && liveLastSyncStatus !== "idle" && (
              <span className={`font-bold ${
                liveLastSyncStatus === "error" ? "text-red-400" :
                liveLastSyncStatus === "half-time" ? "text-amber-400" :
                liveLastSyncStatus === "active" ? "text-emerald-400" : "text-slate-500"
              }`}>وضعیت: {liveLastSyncStatus === "active" ? "فعال" : liveLastSyncStatus === "half-time" ? "نیمه‌وقت" : liveLastSyncStatus === "error" ? "خطا" : liveLastSyncStatus}</span>
            )}
          </div>
        )}
        {match.lastDataFetchAt && (
          <div className="mt-2 text-[9px] text-slate-600">
            آخرین دریافت داده: {new Date(match.lastDataFetchAt).toLocaleString("fa-IR")}
          </div>
        )}
      </div>

      {/* FOOTER CONTROLS: TERMINATION / UPDATE TRIGGER */}
      {isFinishedMode ? (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-5 border-t border-white/5 mt-5">
          <span className="text-[10px] text-slate-500 italic">
            ترکیب، رویدادها و آمار این بازی خاتمه‌یافته را ویرایش کرده و برای اعمال بازمحاسبه جدول رده‌بندی و آمار بازیکنان توسط سرور، دکمه زیر را بزنید.
          </span>

          <button
            onClick={() => {
              if (window.confirm("آیا از ثبت تغییرات این بازی خاتمه‌یافته مطمئن هستید؟ پس از ذخیره، جدول رده‌بندی و آمارها بازمحاسبه می‌شوند.")) {
                handleSaveState("finished");
              }
            }}
            className="bg-emerald-500 hover:bg-emerald-600 font-extrabold text-[#000] text-xs px-5 py-2.5 rounded-lg flex items-center gap-1.5 shadow cursor-pointer"
            id="btn-update-finished-match"
          >
            <Save className="h-4 w-4" /> ثبت تغییرات و به‌روزرسانی کامل مسابقه
          </button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-5 border-t border-white/5 mt-5">
          <span className="text-[10px] text-slate-500 italic">پس از ثبت تمام وقایع، با دکمه قرمز رنگ "سوت پایان و اتمام بازی" را اعلام کنید تا جدول رقابت‌ها آپدیت گردد.</span>

          <button
            onClick={() => {
              if (window.confirm("آیا از اتمام رسمی این مسابقه و بسته شدن آن مطمئن هستید؟ با اتمام بازی، مسابقه مستقیما به Finished_Games منتقل شده و جدول لیگ موثر خواهد شد.")) {
                handleSaveState("finished");
              }
            }}
            className="bg-red-500 hover:bg-red-600 font-extrabold text-[#000] text-xs px-5 py-2.5 rounded-lg flex items-center gap-1.5 shadow"
            id="btn-finish-live-match"
          >
            <BookmarkCheck className="h-4 w-4" /> سوت پایان و اتمام رسمی مسابقه (Finished_Games)
          </button>
        </div>
      )}
    </div>
  );
}

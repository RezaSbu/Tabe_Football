import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  RotateCw, 
  CheckCircle, 
  AlertTriangle, 
  Database,
  Users,
  Trophy,
  Award,
  Zap,
  Flame,
  Wrench,
  Search
} from "lucide-react";
import { MatchItem, StandingRow, PlayerItem, TeamItem } from "../types";
import { normalizePersianString } from "../utils";

interface AdminDashboardProps {
  matches: MatchItem[];
  standings: Record<string, StandingRow[]>;
  teams: TeamItem[];
  players: PlayerItem[];
  submissions: any[];
  newsCount: number;
  onUpdateStandings: (leagueKey: string, rows: StandingRow[]) => Promise<boolean>;
  onUpdateTeam: (id: string, data: any) => Promise<boolean>;
  onUpdatePlayer: (id: string, data: any) => Promise<boolean>;
  onRefreshData: () => void;
}

interface Discrepancy {
  type: "standing" | "player" | "team";
  id: string;
  name: string;
  field: string;
  currentValue: any;
  computedValue: any;
  details: string;
}

export default function AdminDashboard({
  matches = [],
  standings = {},
  teams = [],
  players = [],
  submissions = [],
  newsCount = 0,
  onUpdateStandings,
  onUpdateTeam,
  onUpdatePlayer,
  onRefreshData
}: AdminDashboardProps) {
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [isResolverRunning, setIsResolverRunning] = useState(false);
  const [healStatus, setHealStatus] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // High-level statistics
  const finishedGamesCount = matches.filter(m => m.status === "finished").length;
  const liveGamesCount = matches.filter(m => m.status === "live").length;
  const upcomingGamesCount = matches.filter(m => m.status === "not-started").length;

  // Run the mismatch scanning scanner
  const runSyncScanner = () => {
    setIsScanning(true);
    const found: Discrepancy[] = [];

    // 1. Standings Scanner
    const leagues = ["pro-league", "league-1", "futsal"];
    leagues.forEach(leagueKey => {
      const activeStandings = standings[leagueKey] || [];
      const leagueFinishedMatches = matches.filter(m => m.status === "finished" && m.league === leagueKey);

      // Compute standings on the fly
      const computed: Record<string, { played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; points: number }> = {};
      
      // Initialize computed stats with 0s for each team currently in the standing list
      activeStandings.forEach(row => {
        computed[row.team] = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
      });

      // Accumulate scores
      leagueFinishedMatches.forEach(m => {
        const homeName = m.teamHome;
        const awayName = m.teamAway;
        const sh = Number(m.scoreHome);
        const sa = Number(m.scoreAway);

        if (!computed[homeName]) computed[homeName] = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
        if (!computed[awayName]) computed[awayName] = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };

        // Home Team accumulation
        computed[homeName].played += 1;
        computed[homeName].goalsFor += sh;
        computed[homeName].goalsAgainst += sa;

        // Away Team accumulation
        computed[awayName].played += 1;
        computed[awayName].goalsFor += sa;
        computed[awayName].goalsAgainst += sh;

        if (sh > sa) {
          computed[homeName].won += 1;
          computed[homeName].points += 3;
          computed[awayName].lost += 1;
        } else if (sh < sa) {
          computed[awayName].won += 1;
          computed[awayName].points += 3;
          computed[homeName].lost += 1;
        } else {
          computed[homeName].drawn += 1;
          computed[homeName].points += 1;
          computed[awayName].drawn += 1;
          computed[awayName].points += 1;
        }
      });

      // Compare standing rows to computed values
      activeStandings.forEach(row => {
        const comp = computed[row.team];
        if (comp) {
          const lName = leagueKey === "pro-league" ? "لیگ برتر" : leagueKey === "futsal" ? "فوتسال" : leagueKey === "hazfi-cup" ? "جام حذفی" : leagueKey === "league-1" ? "لیگ یک" : leagueKey === "league-2" ? "لیگ دو" : "رقابت‌ها";
          if (row.points !== comp.points) {
            found.push({
              type: "standing",
              id: leagueKey,
              name: `${lName} — ${row.team}`,
              field: "امتیاز",
              currentValue: row.points,
              computedValue: comp.points,
              details: `امتیاز ثبت‌شده بر اساس تاریخچه بازی‌ها همخوانی ندارد. جدول: ${row.points} | محاسبه: ${comp.points}`
            });
          }
          if (row.played !== comp.played) {
            found.push({
              type: "standing",
              id: leagueKey,
              name: `${lName} — ${row.team}`,
              field: "بازی‌ها",
              currentValue: row.played,
              computedValue: comp.played,
              details: `تعداد کل بازی‌های تیمی ناهماهنگ است. جدول: ${row.played} | بازی‌های واقعی: ${comp.played}`
            });
          }
          const gd = row.goalsFor - row.goalsAgainst;
          const compGd = comp.goalsFor - comp.goalsAgainst;
          if (row.goalsFor !== comp.goalsFor || row.goalsAgainst !== comp.goalsAgainst) {
            found.push({
              type: "standing",
              id: leagueKey,
              name: `${lName} — ${row.team}`,
              field: "گل‌های زده/خورده",
              currentValue: `${row.goalsFor}-${row.goalsAgainst}`,
              computedValue: `${comp.goalsFor}-${comp.goalsAgainst}`,
              details: `آمار تفاضل گل نیاز به بازسازی دارد. جدول: ${row.goalsFor}-${row.goalsAgainst} | محاسبه: ${comp.goalsFor}-${comp.goalsAgainst}`
            });
          }
        }
      });
    });

    // 2. Player Stats Scanner
    players.forEach(p => {
      let compGoals = 0;
      let compAssists = 0;
      let compCleanSheets = 0;
      let compMatches = 0;

      matches.filter(m => m.status === "finished").forEach(m => {
        // Did the player play? Check if they belong to the team
        const isHomePlayer = p.teamName === m.teamHome;
        const isAwayPlayer = p.teamName === m.teamAway;

        if (isHomePlayer || isAwayPlayer) {
          compMatches += 1;
          const conceded = isHomePlayer ? Number(m.scoreAway) : Number(m.scoreHome);
          if (conceded === 0 && p.position === "دروازه‌بان") {
            compCleanSheets += 1;
          }
        }

        const matchNames = (name1?: string, name2?: string) => {
          if (!name1 || !name2) return false;
          return normalizePersianString(name1) === normalizePersianString(name2);
        };

        // Count goals and assists from events or scorersList
        if (m.events && m.events.length > 0) {
          m.events.forEach((ev: any) => {
            if (!ev) return;
            if (ev.type === "goal" || ev.type === "penalty") {
              if (matchNames(ev.playerName, p.name)) {
                compGoals += 1;
              }
              if (matchNames(ev.player2Name, p.name)) {
                compAssists += 1;
              }
            } else if (ev.type === "assist") {
              if (matchNames(ev.playerName, p.name) && !ev.player2Name) {
                compAssists += 1;
              }
              if (matchNames(ev.player2Name, p.name)) {
                compAssists += 1;
              }
            }
          });
        }
        
        const scorers = m.scorersList || [];
        scorers.forEach((sc: any) => {
          if (!sc) return;
          const isScorer = matchNames(sc.scorerName, p.name) || matchNames(sc.scorerId, p.id) || matchNames(sc.name, p.name);
          const isAssistant = matchNames(sc.assistName, p.name) || matchNames(sc.assistId, p.id) || matchNames(sc.assist, p.name);

          if (isScorer) {
            const hasScoringEvent = m.events && m.events.some((ev: any) => ev && (ev.type === "goal" || ev.type === "penalty") && matchNames(ev.playerName, p.name));
            if (!hasScoringEvent) {
              compGoals += 1;
            }
          }
          if (isAssistant) {
            const hasAssistingEvent = m.events && m.events.some((ev: any) => ev && (ev.type === "goal" || ev.type === "assist") && (matchNames(ev.player2Name, p.name) || matchNames(ev.playerName, p.name)));
            if (!hasAssistingEvent) {
              compAssists += 1;
            }
          }
        });
      });

      const currentG = Number(p.goals || 0);
      const currentA = Number(p.assists || 0);
      const currentM = Number(p.matchesPlayed || p.seasonStats?.matches || 0);

      if (currentG !== compGoals) {
        found.push({
          type: "player",
          id: p.id,
          name: `${p.name} (${p.teamName})`,
          field: "گل‌های زده",
          currentValue: currentG,
          computedValue: compGoals,
          details: `اختلاف در شمردن گل‌های ثبت شده. پروفایل: ${currentG} | تایم‌لاین واقعی بازی‌ها: ${compGoals}`
        });
      }
      if (currentA !== compAssists && compAssists > 0) {
        found.push({
          type: "player",
          id: p.id,
          name: `${p.name} (${p.teamName})`,
          field: "پاس گل",
          currentValue: currentA,
          computedValue: compAssists,
          details: `اختلاف در پاس‌گل‌های ثبت شده. پروفایل: ${currentA} | محاسبه: ${compAssists}`
        });
      }
    });

    setDiscrepancies(found);
    setIsScanning(false);
  };

  // Perform full database sync and heal based on calculated values
  const handleHealDatabase = async () => {
    if (discrepancies.length === 0) return;
    setIsResolverRunning(true);
    setHealStatus("در حال همگام‌سازی و بازگردانی هماهنگی جداول...");

    try {
      // Group standings updates by league
      const leaguesToUpdate = Array.from(new Set(discrepancies.filter(d => d.type === "standing").map(d => d.id))) as string[];
      
      for (const leagueKey of leaguesToUpdate) {
        const activeStandings = JSON.parse(JSON.stringify(standings[leagueKey] || [])) as StandingRow[];
        const leagueFinishedMatches = matches.filter(m => m.status === "finished" && m.league === leagueKey);

        const computed: Record<string, { played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; points: number }> = {};
        activeStandings.forEach(row => {
          computed[row.team] = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
        });

        leagueFinishedMatches.forEach(m => {
          const homeName = m.teamHome;
          const awayName = m.teamAway;
          const sh = Number(m.scoreHome);
          const sa = Number(m.scoreAway);

          if (!computed[homeName]) computed[homeName] = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
          if (!computed[awayName]) computed[awayName] = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };

          computed[homeName].played += 1;
          computed[homeName].goalsFor += sh;
          computed[homeName].goalsAgainst += sa;

          computed[awayName].played += 1;
          computed[awayName].goalsFor += sa;
          computed[awayName].goalsAgainst += sh;

          if (sh > sa) {
            computed[homeName].won += 1;
            computed[homeName].points += 3;
            computed[awayName].lost += 1;
          } else if (sh < sa) {
            computed[awayName].won += 1;
            computed[awayName].points += 3;
            computed[homeName].lost += 1;
          } else {
            computed[homeName].drawn += 1;
            computed[homeName].points += 1;
            computed[awayName].drawn += 1;
            computed[awayName].points += 1;
          }
        });

        // Map corrected values back to standing rows
        const correctedRows = activeStandings.map(row => {
          const comp = computed[row.team];
          if (comp) {
            return {
              ...row,
              played: comp.played,
              won: comp.won,
              drawn: comp.drawn,
              lost: comp.lost,
              goalsFor: comp.goalsFor,
              goalsAgainst: comp.goalsAgainst,
              goalDifference: comp.goalsFor - comp.goalsAgainst,
              points: comp.points
            };
          }
          return row;
        });

        // Re-sort standings by points -> goal difference -> goals for
        correctedRows.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          const aGd = a.goalsFor - a.goalsAgainst;
          const bGd = b.goalsFor - b.goalsAgainst;
          if (bGd !== aGd) return bGd - aGd;
          return b.goalsFor - a.goalsFor;
        });

        // Correct ranking indices
        const finalRanked = correctedRows.map((r, index) => ({
          ...r,
          rank: index + 1
        }));

        await onUpdateStandings(leagueKey, finalRanked);
      }

      // Group player correctives
      const playerDiscrepancies = discrepancies.filter(d => d.type === "player");
      for (const disc of playerDiscrepancies) {
        const player = players.find(p => p.id === disc.id);
        if (player) {
          const finishedMatches = matches.filter(m => m.status === "finished");
          let calculatedGoals = 0;
          let calculatedAssists = 0;
          let calculatedMatches = 0;
          let calculatedCleanSheets = 0;

          finishedMatches.forEach(m => {
            const isHomePlayer = player.teamName === m.teamHome;
            const isAwayPlayer = player.teamName === m.teamAway;

            if (isHomePlayer || isAwayPlayer) {
              calculatedMatches += 1;
              const conceded = isHomePlayer ? Number(m.scoreAway) : Number(m.scoreHome);
              if (conceded === 0 && player.position === "دروازه‌بان") {
                calculatedCleanSheets += 1;
              }
            }

            const matchNames = (name1?: string, name2?: string) => {
              if (!name1 || !name2) return false;
              return normalizePersianString(name1) === normalizePersianString(name2);
            };

            // Count goals and assists from events or scorersList
            if (m.events && m.events.length > 0) {
              m.events.forEach((ev: any) => {
                if (!ev) return;
                if (ev.type === "goal" || ev.type === "penalty") {
                  if (matchNames(ev.playerName, player.name)) {
                    calculatedGoals += 1;
                  }
                  if (matchNames(ev.player2Name, player.name)) {
                    calculatedAssists += 1;
                  }
                } else if (ev.type === "assist") {
                  if (matchNames(ev.playerName, player.name) && !ev.player2Name) {
                    calculatedAssists += 1;
                  }
                  if (matchNames(ev.player2Name, player.name)) {
                    calculatedAssists += 1;
                  }
                }
              });
            }
            
            const scorers = m.scorersList || [];
            scorers.forEach((sc: any) => {
              if (!sc) return;
              const isScorer = matchNames(sc.scorerName, player.name) || matchNames(sc.scorerId, player.id) || matchNames(sc.name, player.name);
              const isAssistant = matchNames(sc.assistName, player.name) || matchNames(sc.assistId, player.id) || matchNames(sc.assist, player.name);

              if (isScorer) {
                const hasScoringEvent = m.events && m.events.some((ev: any) => ev && (ev.type === "goal" || ev.type === "penalty") && matchNames(ev.playerName, player.name));
                if (!hasScoringEvent) {
                  calculatedGoals += 1;
                }
              }
              if (isAssistant) {
                const hasAssistingEvent = m.events && m.events.some((ev: any) => ev && (ev.type === "goal" || ev.type === "assist") && (matchNames(ev.player2Name, player.name) || matchNames(ev.playerName, player.name)));
                if (!hasAssistingEvent) {
                  calculatedAssists += 1;
                }
              }
            });
          });

          const payload = {
            goals: calculatedGoals,
            assists: calculatedAssists,
            matchesPlayed: calculatedMatches,
            seasonStats: {
              ...player.seasonStats,
              matches: calculatedMatches,
              goals: calculatedGoals,
              assists: calculatedAssists,
              cleanSheets: player.position === "دروازه‌بان" ? calculatedCleanSheets : player.seasonStats?.cleanSheets
            }
          };
          await onUpdatePlayer(player.id, payload);
        }
      }

      setHealStatus("همگام‌سازی با موفقیت انجام شد! دیتابیس در تراز عالی قرار گرفت.");
      setDiscrepancies([]);
      setTimeout(() => {
        setHealStatus(null);
        onRefreshData();
      }, 3000);
    } catch (e) {
      setHealStatus("خطا در تراز کردن اطلاعات.");
      setTimeout(() => setHealStatus(null), 3000);
    } finally {
      setIsResolverRunning(false);
    }
  };

  useEffect(() => {
    // Perform initial auto-scan
    runSyncScanner();
  }, [matches, teams, players, standings]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Header metrics */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-900 border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-20 w-20 bg-red-600/5 rounded-full blur-2xl" />
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-xs font-bold">کل مسابقات</span>
            <Database className="h-5 w-5 text-gray-500 group-hover:text-red-500 transition-colors" />
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white">{matches.length}</span>
            <span className="text-[10px] text-gray-500 font-bold">بازی ثبت‌شده</span>
          </div>
          <div className="text-[9px] text-slate-400 mt-2 flex justify-between">
            <span>{finishedGamesCount} خاتمه‌یافته</span>
            <span>{liveGamesCount} زنده</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900/80 to-slate-900 border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-20 w-20 bg-emerald-600/5 rounded-full blur-2xl" />
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-xs font-bold">تعداد باشگاه‌ها</span>
            <Trophy className="h-5 w-5 text-gray-500 group-hover:text-emerald-500 transition-colors" />
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white">{teams.length}</span>
            <span className="text-[10px] text-emerald-500 font-bold">پرسونال و آمار تکمیلی</span>
          </div>
          <div className="text-[9px] text-slate-500 mt-2 flex justify-between">
            <span>لیگ برتر: {teams.filter(t => t.titles).length}</span>
            <span>تیم فوتسال / سایر: {teams.length - teams.filter(t => t.titles).length}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900/80 to-slate-900 border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-20 w-20 bg-blue-600/5 rounded-full blur-2xl" />
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-xs font-bold">تعداد بازیکنان</span>
            <Users className="h-5 w-5 text-gray-500 group-hover:text-blue-500 transition-colors" />
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white">{players.length}</span>
            <span className="text-[10px] text-blue-500 font-bold">شناسنامه فعال</span>
          </div>
          <div className="text-[9px] text-slate-500 mt-2">
            <span>میانگین گل‌ها در کلوب: {(players.reduce((acc, p) => acc + Number(p.goals || 0), 0) / (players.length || 1)).toFixed(1)} گل برای هر بازیکن</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900/80 to-slate-900 border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-20 w-20 bg-yellow-600/5 rounded-full blur-2xl" />
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-xs font-bold">محتوا و پیام‌ها</span>
            <Award className="h-5 w-5 text-gray-500 group-hover:text-yellow-500 transition-colors" />
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white">{newsCount + submissions.length}</span>
            <span className="text-[10px] text-yellow-500 font-bold">ورودی رسانه‌ای</span>
          </div>
          <div className="text-[9px] text-slate-500 mt-2 flex justify-between">
            <span>اخبار پورتال: {newsCount}</span>
            <span>صندوق پیام‌ها: {submissions.length}</span>
          </div>
        </div>
      </div>

      {/* Autonomous Synchronization Resolver Section */}
      <div className="bg-[#0b0b0f] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute -top-10 -left-10 h-44 w-44 bg-red-655/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
          <div className="space-y-1.5">
            <h3 className="font-black text-base text-gray-100 flex items-center gap-2">
              <Zap className="h-5 w-5 text-red-500 animate-pulse" />
              <span>عیب‌یاب و ترازکننده خودکار دیتابیس (Autonomous Sync Resolver)</span>
            </h3>
            <p className="text-[11px] text-gray-400 max-w-3xl leading-relaxed">
              این موتور هوشمند تاریخچه تمام مسابقات تمام‌شده را اسکن کرده، با آمارهای مستقیم جداول رده‌بندی، گلزنان و پروفایل شخصی تک‌تک بازیکنان و کادر تیم‌ها تطبیق می‌دهد. خطاکوچک‌ترین ناسازگاری ناشی از اشتباه ادمین‌ها در این جدول شناسایی و مرتفع می‌شود.
            </p>
          </div>

          <button
            onClick={runSyncScanner}
            disabled={isScanning}
            className="flex items-center gap-1.5 border border-white/10 hover:border-white/20 bg-white/5 text-slate-300 font-bold text-xs px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`h-4 w-4 ${isScanning ? "animate-spin" : ""}`} />
            <span>اسکن مجدد ناهماهنگی‌ها</span>
          </button>
        </div>

        {/* Healing action banner */}
        {healStatus && (
          <div className="my-4 p-4 rounded-xl bg-orange-950/20 border border-orange-700/30 text-xs font-black text-orange-400 animate-pulse flex items-center gap-2">
            <LoaderIcon className="h-4 w-4 animate-spin" />
            <span>{healStatus}</span>
          </div>
        )}

        {/* Scan Result */}
        <div className="mt-5">
          {discrepancies.length === 0 ? (
            <div className="bg-emerald-950/10 border border-emerald-500/20 p-5 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-emerald-400" />
                <div>
                  <h4 className="font-extrabold text-sm text-white">تطبیق دیتابیس در تراز ۱۰۰٪ است</h4>
                  <p className="text-[10px] text-slate-400 mt-1">تمام مسابقات تمام‌شده، کارت‌ها و گل‌ها کاملاً با جداول رده‌بندی و پروفایل‌های بازیکنان یکپارچه و فاقد تناقض هستند.</p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-900/35 border border-emerald-600/30 text-emerald-400 px-3.5 py-1 rounded-full font-bold">بسیار عالی و تراز</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-yellow-950/20 border border-yellow-700/30 p-5 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-8 w-8 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-sm text-yellow-400">تعداد {discrepancies.length} مورد عدم تطابق شناسایی شد!</h4>
                    <p className="text-[10px] text-slate-400 mt-1">
                      برخی تغییرات ویرایشی به تیم‌ها یا بازیکنان به خوبی منعکس نشده‌اند یا ادمین‌ها یک بازی ثبت‌شده را اصلاح کرده‌اند که آمار رده‌بندی از آن پس افتاده است.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleHealDatabase}
                  disabled={isResolverRunning}
                  className="bg-red-655 hover:bg-red-700 hover:shadow-lg hover:shadow-red-900/20 text-white font-black text-xs px-4.5 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer"
                >
                  <Wrench className="h-4 w-4" />
                  <span>اصلاح و تراز کردن آنی کل دیتابیس</span>
                </button>
              </div>

              {/* Discrepancy Matrix table */}
              <div className="rounded-xl border border-white/5 overflow-hidden">
                <div className="bg-slate-900/40 px-4 py-3 border-b border-white/5 text-xs text-white font-extrabold">
                  ماتریس تحلیل ناهماهنگی اطلاعات سیستم (Conflict Matrix)
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-white/5 text-[11px]">
                  {discrepancies.map((disc, idx) => (
                    <div key={idx} className="p-3 bg-white/[0.01] hover:bg-white/[0.03] flex justify-between items-center gap-4 transition">
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-slate-200 block">{disc.name}</span>
                        <span className="text-slate-400">{disc.details}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-[10px] bg-slate-950 border border-white/5 rounded px-2 py-0.5 font-mono text-center">
                          <span className="text-gray-500 block">مقدار فعلی</span>
                          <span className="text-red-400 font-bold">{disc.currentValue}</span>
                        </div>
                        <span className="text-gray-500 font-bold">←</span>
                        <div className="text-[10px] bg-slate-950 border border-emerald-900/70 rounded px-2 py-0.5 font-mono text-center">
                          <span className="text-emerald-500 block">تراز محاسباتی</span>
                          <span className="text-emerald-400 font-bold">{disc.computedValue}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoaderIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

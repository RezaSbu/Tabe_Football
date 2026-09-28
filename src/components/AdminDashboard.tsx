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
import { buildPlayerIdentityIndex } from "../shared/playerIdentity";
import {
  computeResolverFindings,
  buildCorrectedStandingRows,
  computePlayerTallies,
  isHealEligible,
  reasonFa,
  severityFa,
  resolveScope,
  type ResolverFinding,
  type ResolverSummary,
  type HealContext,
} from "../shared/syncResolver";

interface AdminDashboardProps {
  matches: MatchItem[];
  standings: Record<string, StandingRow[]>;
  teams: TeamItem[];
  players: PlayerItem[];
  coaches?: any[];
  submissions: any[];
  newsCount: number;
  currentSeason?: string;
  onUpdateStandings: (leagueKey: string, rows: StandingRow[], heal?: HealContext) => Promise<boolean>;
  onUpdateTeam: (id: string, data: any) => Promise<boolean>;
  onUpdatePlayer: (id: string, data: any, heal?: HealContext) => Promise<boolean>;
  onRefreshData: () => void;
}

type Discrepancy = ResolverFinding;

export default function AdminDashboard({
  matches = [],
  standings = {},
  teams = [],
  players = [],
  coaches = [],
  submissions = [],
  newsCount = 0,
  currentSeason = "1405",
  onUpdateStandings,
  onUpdateTeam,
  onUpdatePlayer,
  onRefreshData
}: AdminDashboardProps) {
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [resolverSummary, setResolverSummary] = useState<ResolverSummary | null>(null);
  const [confirmGlobal, setConfirmGlobal] = useState(false);
  const [healingId, setHealingId] = useState<string | null>(null);
  const [isResolverRunning, setIsResolverRunning] = useState(false);
  const [healStatus, setHealStatus] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // High-level statistics
  const finishedGamesCount = matches.filter(m => m.status === "finished").length;
  const liveGamesCount = matches.filter(m => m.status === "live").length;
  const upcomingGamesCount = matches.filter(m => m.status === "not-started").length;

  // Run the mismatch scanning scanner
  // Run the mismatch scan — read-only, shared engine (same logic every heal path uses).
  const runSyncScanner = () => {
    setIsScanning(true);
    try {
      const { findings, summary } = computeResolverFindings({
        matches, players, standings, currentSeasonId: currentSeason,
      });
      setDiscrepancies(findings);
      setResolverSummary(summary);
    } finally {
      setIsScanning(false);
    }
    setConfirmGlobal(false);
  };

  const healContextFor = (items: ResolverFinding[]): HealContext => ({
    reason: "sync-resolver",
    findings: items.map((f) => `${f.type}:${f.id}:${f.field}`),
  });

  const healLeague = async (leagueKey: string, eligibleOnly: boolean) => {
    const { scope } = resolveScope(matches, currentSeason);
    const rows = buildCorrectedStandingRows(leagueKey, standings[leagueKey] || [], matches, scope);
    const ctxItems = discrepancies.filter(
      (d) => d.type === "standing" && d.id === leagueKey && (!eligibleOnly || isHealEligible(d))
    );
    return onUpdateStandings(leagueKey, rows as StandingRow[], healContextFor(ctxItems));
  };

  const healPlayer = async (playerId: string, onlyFields?: string[], eligibleOnly?: boolean) => {
    const player: any = players.find((p) => p.id === playerId);
    if (!player) return false;
    const approved = discrepancies.filter(
      (d) =>
        d.type === "player" && d.id === playerId &&
        (!onlyFields || onlyFields.includes(d.field)) &&
        (!eligibleOnly || isHealEligible(d))
    );
    if (approved.length === 0) return false;
    const identityIndex = buildPlayerIdentityIndex(players);
    const t = computePlayerTallies(player, matches, identityIndex);
    const want = (fa: string) => approved.some((d) => d.field === fa);
    // Flagged fields ONLY — never rewrite matches unless flagged.
    const seasonStats = {
      ...(player.seasonStats || {}),
      ...(want("گل‌های زده") ? { goals: t.goals } : {}),
      ...(want("پاس گل") ? { assists: t.assists } : {}),
      ...(want("بازی‌ها") ? { matches: t.matches } : {}),
    };
    return onUpdatePlayer(playerId, { seasonStats, _heal: healContextFor(approved) });
  };

  const healFinding = async (disc: ResolverFinding) => {
    const key = `${disc.type}:${disc.id}:${disc.field}`;
    setHealingId(key);
    setHealStatus("در حال اصلاح مورد تأییدشده...");
    try {
      const ok = disc.type === "standing"
        ? await healLeague(disc.id, false)
        : await healPlayer(disc.id, [disc.field], false);
      setHealStatus(ok ? "مورد تأییدشده اصلاح شد." : "اصلاح ناموفق بود.");
      onRefreshData();
    } catch {
      setHealStatus("خطا در اصلاح مورد.");
    } finally {
      setHealingId(null);
      setTimeout(() => setHealStatus(null), 3000);
    }
  };

  // Global repair: eligible findings ONLY (STALE_TABLE / REAL_MISMATCH at
  // high-medium severity). NAME_MISMATCH / MULTI_SEASON / low never auto-run.
  const eligibleFindings = discrepancies.filter(isHealEligible);
  const skippedFindings = discrepancies.length - eligibleFindings.length;

  const handleHealDatabase = async () => {
    if (!confirmGlobal) {
      setConfirmGlobal(true); // first click = dry-run preview, nothing mutates
      return;
    }
    setConfirmGlobal(false);
    if (eligibleFindings.length === 0) return;
    setIsResolverRunning(true);
    setHealStatus("در حال اجرای ترمیم موارد واجد شرایط...");
    try {
      const leagues = Array.from(new Set(eligibleFindings.filter((d) => d.type === "standing").map((d) => d.id))) as string[];
      for (const leagueKey of leagues) await healLeague(leagueKey, true);
      const playerIds = Array.from(new Set(eligibleFindings.filter((d) => d.type === "player").map((d) => d.id)));
      for (const pid of playerIds) await healPlayer(pid, undefined, true);
      setHealStatus(`ترمیم سراسری انجام شد: ${eligibleFindings.length} مورد اصلاح، ${skippedFindings} مورد نیازمند بازبینی دستی ماند.`);
      onRefreshData();
    } catch {
      setHealStatus("خطا در تراز کردن اطلاعات.");
    } finally {
      setIsResolverRunning(false);
      setTimeout(() => setHealStatus(null), 4000);
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
            <span className="text-[10px] text-emerald-500 font-bold">تیم</span>
          </div>
          <div className="text-[9px] text-slate-500 mt-2 flex flex-wrap gap-x-2 gap-y-0.5">
            <span>لیگ برتر: {teams.filter(t => t.divisionKey === "pro-league").length}</span>
            <span>لیگ یک: {teams.filter(t => t.divisionKey === "league-1").length}</span>
            <span>لیگ دو: {teams.filter(t => t.divisionKey?.startsWith("league-2")).length}</span>
            <span>فوتسال: {teams.filter(t => t.divisionKey === "futsal").length}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900/80 to-slate-900 border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-20 w-20 bg-blue-600/5 rounded-full blur-2xl" />
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-xs font-bold">بازیکنان و مربیان</span>
            <Users className="h-5 w-5 text-gray-500 group-hover:text-blue-500 transition-colors" />
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white">{players.length}</span>
            <span className="text-[10px] text-blue-500 font-bold">بازیکن</span>
          </div>
          <div className="text-[9px] text-slate-500 mt-2 flex justify-between">
            <span>مربیان: {coaches.length}</span>
            <span>مربی آزاد: {coaches.filter((c: any) => !c.teamId).length}</span>
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
              فوتسال به‌دلیل آرشیو شدن از فرانت‌اند، عیب‌یابی نمی‌شود.
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
                  <h4 className="font-extrabold text-sm text-white">تطبیق دیتابیس در تراز 100٪ است</h4>
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
                    <h4 className="font-extrabold text-sm text-yellow-400">تعداد {discrepancies.length} مورد عدم تطابق شناسایی شد! ({eligibleFindings.length} مورد واجد ترمیم خودکار)</h4>
                    <p className="text-[10px] text-slate-400 mt-1">
                      برخی تغییرات ویرایشی به تیم‌ها یا بازیکنان به خوبی منعکس نشده‌اند یا ادمین‌ها یک بازی ثبت‌شده را اصلاح کرده‌اند که آمار رده‌بندی از آن پس افتاده است.
                      موارد کم‌ریسک (اختلاف نام، چندفصلی) هرگز به‌صورت خودکار ترمیم نمی‌شوند.
                    </p>
                    {resolverSummary && (resolverSummary.baselineExplained > 0 || resolverSummary.skippedAutoFinished > 0 || resolverSummary.autoExplained > 0) && (
                      <p className="text-[10px] text-emerald-400/80 mt-1">
                        {resolverSummary.baselineExplained > 0 && `${resolverSummary.baselineExplained} مورد با تاریخچه معتبر (baseline) توضیح داده و نادیده گرفته شد. `}
                        {resolverSummary.skippedAutoFinished > 0 && `${resolverSummary.skippedAutoFinished} بازی auto-finished عمداً از محاسبه کنار گذاشته شد. `}
                        {resolverSummary.autoExplained > 0 && `${resolverSummary.autoExplained} مجموع بازی بازیکنان که بازی auto-finished را شامل می‌شد توضیح داده شد.`}
                      </p>
                    )}
                  </div>
                </div>

                {!confirmGlobal ? (
                  <button
                    onClick={handleHealDatabase}
                    disabled={isResolverRunning || eligibleFindings.length === 0}
                    className="bg-red-655 hover:bg-red-700 hover:shadow-lg hover:shadow-red-900/20 text-white font-black text-xs px-4.5 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    <Wrench className="h-4 w-4" />
                    <span>اصلاح و تراز کردن آنی کل دیتابیس ({eligibleFindings.length} مورد واجد شرایط)</span>
                  </button>
                ) : (
                  <div className="flex flex-col gap-2 items-stretch">
                    <p className="text-[11px] font-bold text-amber-300">
                      پیش‌نمایش (dry-run): {eligibleFindings.length} مورد اصلاح می‌شود، {skippedFindings} مورد نیازمند بازبینی دستی می‌ماند. چیزی هنوز تغییر نکرده است.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleHealDatabase}
                        disabled={isResolverRunning}
                        className="flex-1 bg-red-700 hover:bg-red-600 text-white font-black text-xs px-4 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50"
                      >
                        تأیید اجرای سراسری
                      </button>
                      <button
                        onClick={() => setConfirmGlobal(false)}
                        disabled={isResolverRunning}
                        className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/5 transition cursor-pointer disabled:opacity-50"
                      >
                        انصراف
                      </button>
                    </div>
                  </div>
                )}
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
                        <span className="flex flex-wrap gap-1.5 pt-1">
                          <span className="text-[10px] px-2 py-0.5 rounded-full border border-sky-700/40 bg-sky-950/30 text-sky-300 font-bold">{reasonFa(disc.reason)}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${disc.severity === "high" ? "border-red-700/40 bg-red-950/30 text-red-300" : disc.severity === "medium" ? "border-amber-700/40 bg-amber-950/30 text-amber-300" : "border-white/10 bg-white/5 text-slate-400"}`}>{severityFa(disc.severity)}</span>
                          {disc.scope !== "all" && disc.scope !== "unseasoned" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-slate-400 font-bold">فصل {disc.scope}</span>
                          )}
                          {!isHealEligible(disc) && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-slate-500 font-bold">فقط بازبینی دستی</span>
                          )}
                        </span>
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
                        <button
                          onClick={() => healFinding(disc)}
                          disabled={isResolverRunning || healingId !== null}
                          className="text-[10px] font-black px-3 py-1.5 rounded-lg border border-emerald-700/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40 transition cursor-pointer disabled:opacity-50"
                        >
                          {healingId === `${disc.type}:${disc.id}:${disc.field}` ? "..." : "تأیید و اصلاح"}
                        </button>
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

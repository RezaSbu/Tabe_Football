import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calendar, ShieldCheck, User, Users } from "lucide-react";
import TeamLogo from "./TeamLogo";
import EmptyState from "./ui/EmptyState";
import { formatJalaliDate, formatStatNumber, getSafeImageUrl } from "../utils";

/**
 * Public feed of REAL club movements (the audited player/coach ledger).
 *
 * This surface is deliberately separate from Transfer News: it only reads
 * /api/club-movements (movement rows), never the `transfers` news table, so a
 * rumour or an article can never appear here as a completed move — and a
 * completed move never needs a news item to exist.
 */
interface ClubMovement {
  id: string;
  kind: "player" | "coach";
  personId: string | null;
  personName: string;
  personImage: string;
  position: string;
  fromTeamName: string | null;
  fromTeamLogo: string;
  toTeamName: string | null;
  toTeamLogo: string;
  seasonId: string | null;
  seasonName: string | null;
  movementDate: string | null;
  note: string | null;
}

interface ClubMovementsListProps {
  searchQuery?: string;
}

export default function ClubMovementsList({ searchQuery = "" }: ClubMovementsListProps) {
  const [movements, setMovements] = useState<ClubMovement[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<"all" | "player" | "coach">("all");
  const [seasonId, setSeasonId] = useState<string>("all");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch("/api/club-movements")
      .then((res) => res.json())
      .then((data) => {
        if (!alive) return;
        setMovements(Array.isArray(data.movements) ? data.movements : []);
        setSeasons(Array.isArray(data.seasons) ? data.seasons : []);
        setError(null);
      })
      .catch(() => {
        if (alive) setError("دریافت جابه‌جایی‌های باشگاهی ناموفق بود.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return movements.filter((m) => {
      if (kind !== "all" && m.kind !== kind) return false;
      if (seasonId !== "all" && String(m.seasonId || "") !== seasonId) return false;
      if (!q) return true;
      return [m.personName, m.fromTeamName, m.toTeamName]
        .some((value) => String(value || "").toLowerCase().includes(q));
    });
  }, [movements, kind, seasonId, searchQuery]);

  const seasonOptions = useMemo(() => {
    const seen = new Set<string>();
    return seasons.filter((s: any) => {
      if (!s?.id || seen.has(String(s.id))) return false;
      seen.add(String(s.id));
      return true;
    });
  }, [seasons]);

  const playerCount = filtered.filter((m) => m.kind === "player").length;
  const coachCount = filtered.filter((m) => m.kind === "coach").length;

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0a0a0c] border border-white/5 rounded-xl p-4">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
          <ShieldCheck className="h-4 w-4" />
          <span>جابه‌جایی‌های رسمی و ثبت‌شده باشگاهی — مستقل از اخبار نقل و انتقالات</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
          <span className="flex items-center gap-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 px-2.5 py-1 text-emerald-300">
            <User className="h-3 w-3" />
            بازیکن: {formatStatNumber(playerCount)}
          </span>
          <span className="flex items-center gap-1.5 rounded-lg bg-sky-950/30 border border-sky-500/20 px-2.5 py-1 text-sky-300">
            <Users className="h-3 w-3" />
            مربی: {formatStatNumber(coachCount)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {([
          { key: "all", label: "همه" },
          { key: "player", label: "بازیکنان" },
          { key: "coach", label: "مربیان" },
        ] as const).map((option) => (
          <button
            key={option.key}
            onClick={() => setKind(option.key)}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer border ${
              kind === option.key
                ? "bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/10"
                : "bg-[#0a0a0c] text-slate-400 border-white/5 hover:text-white hover:border-emerald-500/30"
            }`}
          >
            {option.label}
          </button>
        ))}

        <select
          value={seasonId}
          onChange={(e) => setSeasonId(e.target.value)}
          className="mr-auto bg-[#0a0a0c] text-slate-300 border border-white/5 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-emerald-500/40"
          aria-label="فیلتر فصل"
        >
          <option value="all">همه فصل‌ها</option>
          {seasonOptions.map((season: any) => (
            <option key={season.id} value={String(season.id)}>
              فصل {formatStatNumber(String(season.name || season.id).replace(/^season-/, ""))}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-[76px] rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon="search" title="خطا در دریافت اطلاعات" hint={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="search"
          title="جابه‌جایی رسمی‌ای با این فیلتر پیدا نشد"
          hint="اخبار و شایعات نقل و انتقالات در بخش اخبار است؛ این بخش فقط انتقال‌های ثبت‌شده را نشان می‌دهد."
          actionLabel="حذف فیلترها"
          onAction={() => { setKind("all"); setSeasonId("all"); }}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((movement) => {
            const isPlayer = movement.kind === "player";
            return (
              <div
                key={`${movement.kind}-${movement.id}`}
                className="bg-[#0c0c0f] border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4 hover:border-emerald-500/25 transition"
              >
                <div className="flex items-center gap-3 min-w-0 md:w-64">
                  <div className="relative shrink-0">
                    {movement.personImage ? (
                      <img
                        loading="lazy"
                        decoding="async"
                        src={getSafeImageUrl(movement.personImage)}
                        alt={movement.personName}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-full object-cover border border-white/10"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
                        {isPlayer ? <User className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                      </div>
                    )}
                    <span className={`absolute -bottom-1 -left-1 text-[8px] font-black px-1.5 py-0.5 rounded-md border ${
                      isPlayer
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                        : "bg-sky-500/15 border-sky-500/30 text-sky-300"
                    }`}>
                      {isPlayer ? "بازیکن" : "مربی"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-black text-white truncate">{movement.personName || "نامشخص"}</div>
                    <div className="text-[10px] text-slate-500 font-bold truncate">
                      {movement.position || (isPlayer ? "بازیکن فوتبال" : "سرمربی")}
                      {movement.seasonName ? ` • فصل ${formatStatNumber(String(movement.seasonName).replace(/^season-/, ""))}` : ""}
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 items-center justify-between gap-3 rounded-xl bg-black/30 border border-white/5 p-3">
                  <div className="flex items-center gap-2 min-w-0 w-5/12">
                    <TeamLogo logo={movement.fromTeamLogo} fallback="🛡️" size="sm" />
                    <span className="text-xs font-bold text-slate-300 truncate">{movement.fromTeamName || "بدون باشگاه"}</span>
                  </div>
                  <div className="w-2/12 flex items-center justify-center">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#121215] text-emerald-400 border border-white/10">
                      <ArrowLeft className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2 min-w-0 w-5/12">
                    <span className="text-xs font-black text-white truncate">{movement.toTeamName || "بدون باشگاه (آزاد)"}</span>
                    <TeamLogo logo={movement.toTeamLogo} fallback="🛡️" size="sm" />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold md:w-32 md:justify-end shrink-0">
                  <Calendar className="h-3 w-3 text-slate-600" />
                  <span>{movement.movementDate ? formatJalaliDate(movement.movementDate) : "بدون تاریخ"}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

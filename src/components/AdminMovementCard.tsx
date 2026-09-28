import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Search, ArrowLeftRight, Check } from "lucide-react";
import { formatJalaliDate } from "../utils";

interface SlimEntity {
  id: string;
  name: string;
  teamId?: string | null;
  teamName?: string | null;
  position?: string;
}

interface MovementRow {
  id: string;
  playerId?: string;
  coachId?: string;
  fromTeamId?: string | null;
  toTeamId?: string | null;
  seasonId?: string | null;
  movementDate?: string | null;
  note?: string | null;
}

interface AdminMovementCardProps {
  teams?: any[];
  canPlayer?: boolean;
  canCoach?: boolean;
  onChanged?: () => void;
}

const todayLocal = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// Records a REAL club change (player/coach team_id update + movement ledger
// row, in one transaction). Transfer News is a separate domain and is never
// touched here. Entity selection is always by id (search shows the current
// club next to the name so same-name players are never confused).
export default function AdminMovementCard({ teams = [], canPlayer = true, canCoach = true, onChanged }: AdminMovementCardProps) {
  const [kind, setKind] = useState<"player" | "coach">(canPlayer ? "player" : "coach");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SlimEntity[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SlimEntity | null>(null);
  const [toTeamId, setToTeamId] = useState("");
  const [date, setDate] = useState(todayLocal());
  const [note, setNote] = useState("");
  const [seasons, setSeasons] = useState<any[]>([]);
  const [seasonId, setSeasonId] = useState("");
  const [history, setHistory] = useState<MovementRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Occupied dugout: team already has a head coach (coaches only).
  const [occupied, setOccupied] = useState<{ byId: string; byName: string; toTeamId: string } | null>(null);
  const RELEASE = "__RELEASE__";

  const teamNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of teams || []) {
      if (t && t.id) m.set(String(t.id), t.name || String(t.id));
    }
    return m;
  }, [teams]);
  const teamName = useCallback((id: string | null | undefined) => {
    if (!id) return "بدون باشگاه";
    return teamNameById.get(String(id)) || String(id);
  }, [teamNameById]);

  useEffect(() => {
    fetch("/api/seasons")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.seasons)) {
          setSeasons(d.seasons);
          const active = d.seasons.find((s: any) => s.isActive || s.status === "current");
          if (active) setSeasonId(String(active.id));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setQuery("");
    setResults([]);
    setSelected(null);
    setToTeamId("");
    setHistory([]);
    setError(null);
    setSuccess(null);
  }, [kind]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const ctrl = new AbortController();
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/${kind === "player" ? "players" : "coaches"}?q=${encodeURIComponent(query.trim())}&slim=1&limit=8`,
          { signal: ctrl.signal }
        );
        const data = await res.json();
        // Admin list endpoints paginate as {items,...} (not {rows}).
        const list = Array.isArray((data as any).items)
          ? (data as any).items
          : Array.isArray((data as any).rows)
            ? (data as any).rows
            : [];
        if (res.ok) {
          setResults(list);
          if (list.length === 0) setError(null);
        } else {
          setResults([]);
          setError((data as any)?.error || "خطا در جست‌وجو (دسترسی؟).");
        }
      } catch {
        // aborted or offline; keep previous results
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, kind]);

  const fetchHistory = useCallback(async (entityId: string) => {
    try {
      const param = kind === "player" ? "playerId" : "coachId";
      const res = await fetch(`/api/${kind === "player" ? "player" : "coach"}-movements?${param}=${encodeURIComponent(entityId)}`);
      const data = await res.json();
      // Movement endpoints return {movements:[...]}.
      const list = Array.isArray((data as any).movements)
        ? (data as any).movements
        : Array.isArray((data as any).rows)
          ? (data as any).rows
          : [];
      if (res.ok) {
        setHistory(list);
      }
    } catch {
      // history is best-effort
    }
  }, [kind]);

  const pick = (e: SlimEntity) => {
    setSelected(e);
    setResults([]);
    setQuery(e.name);
    setToTeamId("");
    setOccupied(null);
    setError(null);
    setSuccess(null);
    fetchHistory(e.id);
  };

  const postMovement = async (body: any) => {
    const response = await fetch(`/api/${kind === "player" ? "player" : "coach"}-movements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    return { response, result };
  };

  const finishSuccess = async (summary: string) => {
    setSuccess(summary);
    setToTeamId("");
    setNote("");
    setOccupied(null);
    if (selected) {
      setSelected({ ...selected, teamId: null, teamName: null });
      await fetchHistory(selected.id);
    }
    if (onChanged) onChanged();
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!selected) {
      setError("اول بازیکن/مربی را از نتایج جست‌وجو انتخاب کنید.");
      return;
    }
    const releasing = toTeamId === RELEASE;
    if (!toTeamId) {
      setError("تیم مقصد را انتخاب کنید.");
      return;
    }
    if (!releasing && selected.teamId && String(selected.teamId) === toTeamId) {
      setError("تیم مقصد با تیم فعلی یکی است.");
      return;
    }
    if (releasing && !selected.teamId) {
      setError("این فرد هم‌اکنون بدون باشگاه است.");
      return;
    }
    if (!date.trim() || !seasonId) {
      setError("تاریخ انتقال و فصل الزامی است.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    setOccupied(null);
    try {
      const body: any = { movementDate: date.trim(), seasonId, note: note.trim() || undefined };
      if (kind === "player") body.playerId = selected.id;
      else body.coachId = selected.id;
      if (releasing) {
        body.toTeamId = null;
        body.release = true;
      } else {
        body.toTeamId = toTeamId;
      }
      const { response, result } = await postMovement(body);
      if (!response.ok) {
        if (response.status === 409 && (result as any)?.occupied) {
          setOccupied({
            byId: (result as any).occupiedBy?.id || "",
            byName: (result as any).occupiedBy?.name || "مربی فعلی",
            toTeamId,
          });
          setError(null);
          return;
        }
        throw new Error((result as any).message || "خطا در ثبت انتقال");
      }
      if (releasing) {
        await finishSuccess(`«${selected.name}» آزاد شد (بدون باشگاه).`);
      } else {
        setSuccess(`انتقال «${selected.name}» از ${teamName(result.movement?.fromTeamId ?? selected.teamId)} به ${teamName(toTeamId)} ثبت شد.`);
        setSelected({ ...selected, teamId: toTeamId, teamName: teamName(toTeamId) });
        setToTeamId("");
        setNote("");
        setOccupied(null);
        await fetchHistory(selected.id);
        if (onChanged) onChanged();
      }
    } catch (err: any) {
      setError(err.message || "خطایی در ثبت انتقال رخ داد.");
    } finally {
      setBusy(false);
    }
  };

  // Occupied dugout resolution: release the incumbent, then retry with force.
  // Sequential is safe: the vacant intermediate state is valid (no unique
  // violation), and each step is atomic on its own.
  const handleReleaseAndRetry = async () => {
    if (!selected || !occupied) return;
    setBusy(true);
    setError(null);
    try {
      const base: any = { movementDate: date.trim(), seasonId, note: note.trim() || undefined };
      const rel: any = { ...base, toTeamId: null, release: true };
      if (kind === "player") rel.playerId = occupied.byId;
      else rel.coachId = occupied.byId;
      const r1 = await postMovement(rel);
      if (!r1.response.ok) {
        throw new Error((r1.result as any).message || "آزادسازی مربی فعلی ناموفق بود.");
      }
      const retry: any = { ...base, toTeamId: occupied.toTeamId, force: true };
      if (kind === "player") retry.playerId = selected.id;
      else retry.coachId = selected.id;
      const r2 = await postMovement(retry);
      if (!r2.response.ok) {
        throw new Error((r2.result as any).message || "ثبت انتقال پس از آزادسازی ناموفق بود.");
      }
      setSuccess(`«${occupied.byName}» آزاد شد و «${selected.name}» به ${teamName(occupied.toTeamId)} منتقل شد.`);
      setSelected({ ...selected, teamId: occupied.toTeamId, teamName: teamName(occupied.toTeamId) });
      setToTeamId("");
      setNote("");
      setOccupied(null);
      await fetchHistory(selected.id);
      if (onChanged) onChanged();
    } catch (err: any) {
      setError(err.message || "خطایی رخ داد.");
    } finally {
      setBusy(false);
    }
  };

  // Atomic head-coach swap X <-> Y (coaches only).
  const handleSwap = async () => {
    if (!selected || !occupied || kind !== "coach") return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/coach-movements/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachIdX: selected.id,
          coachIdY: occupied.byId,
          seasonId,
          movementDate: date.trim(),
          note: note.trim() || undefined,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((result as any).message || "جابه‌جایی ناموفق بود.");
      }
      setSuccess(`جابه‌جایی ثبت شد: «${selected.name}» ↔ «${occupied.byName}».`);
      setToTeamId("");
      setNote("");
      setOccupied(null);
      await fetchHistory(selected.id);
      if (onChanged) onChanged();
    } catch (err: any) {
      setError(err.message || "خطایی رخ داد.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />

      {error && (
        <div className="mb-3 p-3 rounded-xl bg-red-950/30 border border-red-700/30 text-xs font-bold text-red-400">
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-700/30 text-xs font-bold text-emerald-400">
          <span>{success}</span>
        </div>
      )}

      <div>
        <h3 className="text-sm font-black text-white flex items-center gap-1.5">
          <ArrowLeftRight className="h-4 w-4 text-sky-400" />
          ثبت انتقال باشگاهی
        </h3>
        <p className="text-[11px] text-slate-400 mt-1">
          تغییر واقعی تیم (نه خبر). انتخاب همیشه با شناسه است؛ هم‌نام‌ها را از روی باشگاه فعلی تشخیص دهید.
        </p>
      </div>

      {canPlayer && canCoach && (
        <div className="mt-3 flex gap-2">
          {(["player", "coach"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`text-[11px] font-extrabold px-4 py-1.5 rounded-lg border transition cursor-pointer ${
                kind === k
                  ? "text-white bg-sky-600/20 border-sky-500/40"
                  : "text-slate-400 border-white/10 hover:border-white/25"
              }`}
            >
              {k === "player" ? "بازیکن" : "مربی"}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-3 space-y-2.5">
        <div className="relative">
          <Search className="absolute right-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder={`جست‌وجوی ${kind === "player" ? "بازیکن" : "مربی"} (حداقل ۲ حرف)...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-950 border border-white/5 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
            disabled={busy}
          />
          {searching && <span className="absolute left-3.5 top-3 text-[10px] text-slate-500">...</span>}
          {results.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-slate-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-56 overflow-y-auto">
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => pick(r)}
                  className="w-full text-right px-3.5 py-2.5 hover:bg-sky-500/10 transition flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="text-xs font-bold text-white truncate">{r.name}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {r.teamName || "بدون باشگاه"}{r.position ? ` • ${r.position}` : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="bg-slate-950/60 border border-sky-500/15 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-black text-white truncate">{selected.name}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                باشگاه فعلی: <span className="font-bold text-slate-300">{selected.teamName || "بدون باشگاه"}</span>
              </p>
            </div>
            <span className="text-[10px] font-mono text-slate-500 shrink-0" title="شناسه یکتا">#{selected.id.slice(-6)}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5">
          <select
            value={toTeamId}
            onChange={(e) => setToTeamId(e.target.value)}
            className="flex-1 bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500 transition"
            disabled={busy || !selected}
          >
            <option value="">تیم مقصد...</option>
            <option value="__RELEASE__">آزاد / بدون باشگاه</option>
            {(teams || []).map((t: any) => (
              <option key={t.id} value={t.id} disabled={selected?.teamId != null && String(selected.teamId) === String(t.id)}>
                {t.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            title="تاریخ انتقال"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500 transition"
            disabled={busy}
          />
          <select
            value={seasonId}
            onChange={(e) => setSeasonId(e.target.value)}
            className="bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500 transition"
            disabled={busy}
          >
            <option value="">فصل...</option>
            {seasons.map((s: any) => (
              <option key={s.id} value={s.id}>
                فصل {s.name}{s.isActive || s.status === "current" ? " (جاری)" : ""}
              </option>
            ))}
          </select>
        </div>

        <input
          type="text"
          placeholder="یادداشت (اختیاری)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
          disabled={busy}
        />

        <button
          type="submit"
          disabled={busy || !selected}
          className="w-full sm:w-auto bg-sky-600 hover:bg-sky-500 text-white font-extrabold py-2.5 px-6 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          {busy ? "در حال ثبت..." : "ثبت انتقال"}
        </button>
      </form>

      {occupied && selected && (
        <div className="mt-3 p-3.5 rounded-xl bg-amber-950/30 border border-amber-700/40 space-y-2.5">
          <p className="text-[11px] font-black text-amber-300">
            «{teamName(occupied.toTeamId)}» هم‌اکنون مربی دارد: «{occupied.byName}». چه کار شود؟
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => setOccupied(null)}
              disabled={busy}
              className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] font-extrabold transition cursor-pointer disabled:opacity-50"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={handleReleaseAndRetry}
              disabled={busy}
              className="flex-1 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-200 text-[11px] font-extrabold transition cursor-pointer disabled:opacity-50"
            >
              آزادسازی «{occupied.byName}» و انتقال «{selected.name}»
            </button>
            {kind === "coach" && (
              <button
                type="button"
                onClick={handleSwap}
                disabled={busy}
                className="flex-1 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-200 text-[11px] font-extrabold transition cursor-pointer disabled:opacity-50"
              >
                جابه‌جایی «{selected.name}» ↔ «{occupied.byName}»
              </button>
            )}
          </div>
        </div>
      )}

      {selected && history.length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/5">
          <p className="text-[11px] font-black text-slate-300 mb-2">سوابق باشگاهی «{selected.name}»</p>
          <div className="space-y-1.5">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-2 text-[11px] bg-slate-950/60 border border-white/5 rounded-lg px-3 py-1.5">
                <span className="text-slate-300 font-bold truncate">
                  {teamName(h.fromTeamId)} <span className="text-sky-400 mx-1">←</span> {teamName(h.toTeamId)}
                </span>
                <span className="text-slate-500 shrink-0 font-mono">{formatJalaliDate(h.movementDate)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

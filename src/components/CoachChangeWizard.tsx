import React, { useState, useEffect, useMemo } from "react";
import { Search, UserPlus, CheckCircle2, AlertTriangle, ArrowLeftRight } from "lucide-react";
import { formatJalaliDate } from "../utils";

interface Reason {
  category: string;
  code: string;
  labelFa: string;
  sortOrder: number;
}

interface SlimCoach {
  id: string;
  name: string;
  teamId?: string | null;
  teamName?: string | null;
}

interface TeamOption {
  id: string;
  name: string;
}

interface WizardProps {
  teams: TeamOption[];
  onChanged?: () => void;
}

type Step = "team" | "action" | "incoming" | "dates" | "review";

const todayLocal = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// Team-centric head-coach change wizard (P4). Starts from the TEAM, not the
// person: pick team -> see incumbent -> end (with reason+date) and/or appoint
// (with reason+date, conflict-checked) -> confirmation summary -> commit.
// Every mutation goes through POST /api/lifecycle/events (atomic, audited).
// Inline new-coach creation is part of the same flow (no fake transfers).
export default function CoachChangeWizard({ teams = [], onChanged }: WizardProps) {
  const [step, setStep] = useState<Step>("team");
  const [teamId, setTeamId] = useState("");
  const [holder, setHolder] = useState<SlimCoach | null>(null);
  const [holderLoading, setHolderLoading] = useState(false);
  const [action, setAction] = useState<"end" | "replace" | "appoint">("replace");
  const [departDate, setDepartDate] = useState(todayLocal());
  const [departReason, setDepartReason] = useState("");
  const [nextStatus, setNextStatus] = useState<"FREE_AGENT" | "RETIRED">("FREE_AGENT");
  // Incoming
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SlimCoach[]>([]);
  const [searching, setSearching] = useState(false);
  const [incoming, setIncoming] = useState<SlimCoach | null>(null);
  const [createNew, setCreateNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [appointDate, setAppointDate] = useState(todayLocal());
  const [appointReason, setAppointReason] = useState("");
  const [seasons, setSeasons] = useState<any[]>([]);
  const [seasonId, setSeasonId] = useState("");
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [review, setReview] = useState<any>(null);

  const teamNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of teams || []) if (t && t.id) m.set(String(t.id), t.name);
    return m;
  }, [teams]);
  const teamName = (id: string | null | undefined) =>
    !id ? "بدون باشگاه" : teamNameById.get(String(id)) || String(id);

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
    fetch("/api/lifecycle/reasons")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.reasons)) setReasons(d.reasons);
      })
      .catch(() => {});
  }, []);

  const reasonsFor = (cat: string) =>
    reasons.filter((r) => r.category === cat).sort((a, b) => a.sortOrder - b.sortOrder);

  const loadHolder = async (tid: string) => {
    setHolderLoading(true);
    try {
      const res = await fetch(`/api/lifecycle/availability?teamId=${encodeURIComponent(tid)}`);
      const data = await res.json();
      setHolder(data.holder || null);
    } catch {
      setHolder(null);
    } finally {
      setHolderLoading(false);
    }
  };

  const pickTeam = (tid: string) => {
    setTeamId(tid);
    setHolder(null);
    setIncoming(null);
    setCreateNew(false);
    setQuery("");
    setResults([]);
    setError(null);
    setSuccess(null);
    setReview(null);
    if (tid) {
      loadHolder(tid);
      setStep("action");
    } else {
      setStep("team");
    }
  };

  // Incoming search (id-based, club badge for disambiguation).
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
        const res = await fetch(`/api/admin/coaches?q=${encodeURIComponent(query.trim())}&slim=1&limit=8`, { signal: ctrl.signal });
        const data = await res.json();
        const list = Array.isArray((data as any).items) ? (data as any).items : [];
        if (res.ok) setResults(list);
      } catch { /* aborted */ } finally {
        setSearching(false);
      }
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query]);

  const needsEnd = action === "end" || action === "replace";
  const needsAppoint = action === "appoint" || action === "replace";
  const incomingOccupiedElsewhere =
    incoming && incoming.teamId != null && String(incoming.teamId) !== String(teamId);

  const buildReview = () => {
    setError(null);
    if (!teamId) { setError("تیم را انتخاب کنید."); return; }
    if (needsEnd && !holder) { setError("این تیم مربی فعلی ندارد."); return; }
    if (needsEnd && !departDate) { setError("تاریخ پایان همکاری الزامی است."); return; }
    if (needsAppoint && !createNew && !incoming) { setError("مربی جدید را انتخاب کنید یا بسازید."); return; }
    if (needsAppoint && createNew && !newName.trim()) { setError("نام مربی جدید الزامی است."); return; }
    if (needsAppoint && !appointDate) { setError("تاریخ شروع الزامی است."); return; }
    if (needsAppoint && needsEnd && appointDate < departDate) {
      setError("تاریخ شروع نمی‌تواند قبل از پایان همکاری قبلی باشد.");
      return;
    }
    setReview({
      team: teamName(teamId),
      outgoing: needsEnd ? holder : null,
      departDate: needsEnd ? departDate : null,
      departReason: needsEnd ? departReason : null,
      nextStatus: needsEnd ? nextStatus : null,
      incoming: needsAppoint ? (createNew ? { name: newName.trim(), isNew: true } : incoming) : null,
      incomingFrom: needsAppoint && !createNew && incomingOccupiedElsewhere ? teamName(incoming!.teamId) : null,
      appointDate: needsAppoint ? appointDate : null,
      appointReason: needsAppoint ? appointReason : null,
    });
    setStep("review");
  };

  const commit = async () => {
    if (!review) return;
    setBusy(true);
    setError(null);
    try {
      const post = async (body: any) => {
        const r = await fetch("/api/lifecycle/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const d = await r.json().catch(() => ({}));
        return { r, d };
      };
      let incomingId: string | null = incoming ? String(incoming.id) : null;
      // Inline create: coach with no team, then the flow appoints them.
      if (needsAppoint && createNew) {
        const cr = await fetch("/api/coaches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName.trim() }),
        });
        const cd = await cr.json().catch(() => ({}));
        if (!cr.ok) throw new Error((cd as any).message || "ساخت مربی ناموفق بود.");
        const list = await fetch("/api/admin/coaches?q=" + encodeURIComponent(newName.trim()) + "&slim=1&limit=5").then((x) => x.json()).catch(() => ({}));
        const found = ((list as any).items || []).find((c: any) => String(c.name).trim() === newName.trim());
        if (!found) throw new Error("مربی ساخته شد ولی یافت نشد؛ از جست‌وجو انتخابش کنید.");
        incomingId = String(found.id);
      }
      // Step 1: end outgoing (with reason; RETIRED when chosen).
      if (needsEnd && holder) {
        const kind = nextStatus === "RETIRED" ? "RETIRED" : "DISMISSAL";
        const e1 = await post({
          personKind: "coach", personId: holder.id, eventKind: kind,
          teamId, seasonId: seasonId || undefined, eventDate: departDate,
          reasonCode: nextStatus === "RETIRED" ? "RETIRED" : (departReason || undefined),
          note: `wizard: end ${holder.name} at ${teamName(teamId)}`,
        });
        if (!e1.r.ok) throw new Error((e1.d as any).message || "پایان همکاری ناموفق بود.");
      }
      // Steps 2-4: appoint incoming (conflict surfaces here if occupied).
      if (needsAppoint && incomingId) {
        const e2 = await post({
          personKind: "coach", personId: incomingId, eventKind: "APPOINTMENT",
          teamId, seasonId: seasonId || undefined, eventDate: appointDate,
          reasonCode: appointReason || undefined,
          note: `wizard: appoint at ${teamName(teamId)}`,
        });
        if (!e2.r.ok) {
          const msg = (e2.d as any).message || "انتصاب ناموفق بود.";
          const extra = (e2.d as any).occupiedBy ? ` (مربی فعلی: ${(e2.d as any).occupiedBy.name})` : "";
          throw new Error(msg + extra);
        }
      }
      setSuccess(`تغییر سرمربی «${teamName(teamId)}» ثبت شد.`);
      setStep("team");
      setTeamId("");
      setHolder(null);
      setIncoming(null);
      setCreateNew(false);
      setNewName("");
      setReview(null);
      if (onChanged) onChanged();
    } catch (err: any) {
      setError(err.message || "خطایی رخ داد.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
      {error && (
        <div className="mb-3 p-3 rounded-xl bg-red-950/30 border border-red-700/30 text-xs font-bold text-red-400">{error}</div>
      )}
      {success && (
        <div className="mb-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-700/30 text-xs font-bold text-emerald-400">{success}</div>
      )}

      <div>
        <h3 className="text-sm font-black text-white flex items-center gap-1.5">
          <ArrowLeftRight className="h-4 w-4 text-emerald-400" />
          تغییر سرمربی تیم
        </h3>
        <p className="text-[11px] text-slate-400 mt-1">
          از تیم شروع کنید: پایان همکاری، جایگزینی یا انتصاب — با تاریخ و دلیل جدا، و تأیید نهایی.
        </p>
      </div>

      {/* Step 1: team */}
      <div className="mt-3">
        <p className="text-[11px] font-black text-slate-300 mb-1.5">۱. تیم</p>
        <select
          value={teamId}
          onChange={(e) => pickTeam(e.target.value)}
          className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
          disabled={busy}
        >
          <option value="">انتخاب تیم...</option>
          {(teams || []).map((t: any) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {teamId && (
          <p className="text-[11px] text-slate-400 mt-1.5">
            سرمربی فعلی: {holderLoading ? "..." : holder ? <span className="font-black text-white">{holder.name}</span> : <span className="text-slate-500">بدون مربی</span>}
          </p>
        )}
      </div>

      {step !== "team" && teamId && (
        <>
          {/* Step 2: action */}
          <div className="mt-3">
            <p className="text-[11px] font-black text-slate-300 mb-1.5">۲. اقدام</p>
            <div className="flex flex-wrap gap-2">
              {holder && (
                <button type="button" onClick={() => setAction("end")}
                  className={`text-[11px] font-extrabold px-4 py-1.5 rounded-lg border transition cursor-pointer ${action === "end" ? "text-white bg-red-600/20 border-red-500/40" : "text-slate-400 border-white/10 hover:border-white/25"}`}>
                  پایان همکاری
                </button>
              )}
              <button type="button" onClick={() => setAction("replace")}
                className={`text-[11px] font-extrabold px-4 py-1.5 rounded-lg border transition cursor-pointer ${action === "replace" ? "text-white bg-sky-600/20 border-sky-500/40" : "text-slate-400 border-white/10 hover:border-white/25"}`}>
                جایگزینی سرمربی
              </button>
              {!holder && (
                <button type="button" onClick={() => setAction("appoint")}
                  className={`text-[11px] font-extrabold px-4 py-1.5 rounded-lg border transition cursor-pointer ${action === "appoint" ? "text-white bg-emerald-600/20 border-emerald-500/40" : "text-slate-400 border-white/10 hover:border-white/25"}`}>
                  انتصاب سرمربی
                </button>
              )}
            </div>
          </div>

          {/* Step 3a: departure */}
          {needsEnd && holder && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="text-[11px] text-slate-400 font-bold">تاریخ پایان
                <input type="date" value={departDate} onChange={(e) => setDepartDate(e.target.value)}
                  className="mt-1 w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500" disabled={busy} />
              </label>
              <label className="text-[11px] text-slate-400 font-bold">دلیل پایان
                <select value={departReason} onChange={(e) => setDepartReason(e.target.value)}
                  className="mt-1 w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500" disabled={busy}>
                  <option value="">انتخاب دلیل...</option>
                  {reasonsFor("coach_departure").map((r) => (
                    <option key={r.code} value={r.code}>{r.labelFa}</option>
                  ))}
                </select>
              </label>
              <label className="text-[11px] text-slate-400 font-bold">وضعیت بعدی
                <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value as any)}
                  className="mt-1 w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500" disabled={busy}>
                  <option value="FREE_AGENT">بازیکن آزاد</option>
                  <option value="RETIRED">بازنشسته (دائمی)</option>
                </select>
              </label>
            </div>
          )}

          {/* Step 3b: incoming */}
          {needsAppoint && (
            <div className="mt-3 space-y-2">
              <p className="text-[11px] font-black text-slate-300">۳. مربی جدید</p>
              {!createNew ? (
                <>
                  <div className="relative">
                    <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                      placeholder="جست‌وجوی مربی (حداقل ۲ حرف)..."
                      className="w-full bg-slate-950 border border-white/5 rounded-xl pr-9 pl-3 py-2 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      disabled={busy} />
                    {searching && <span className="absolute left-3 top-2.5 text-[10px] text-slate-500">...</span>}
                    {results.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full bg-slate-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
                        {results.map((r) => (
                          <button key={r.id} type="button"
                            onClick={() => { setIncoming(r); setResults([]); setQuery(r.name); }}
                            className="w-full text-right px-3 py-2 hover:bg-emerald-500/10 transition flex items-center justify-between gap-2 cursor-pointer">
                            <span className="text-[11px] font-bold text-white truncate">{r.name}</span>
                            <span className="text-[10px] text-slate-400 shrink-0">{r.teamName || "بدون باشگاه"}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {incoming ? (
                    <div className="bg-slate-950/60 border border-emerald-500/15 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black text-white truncate">{incoming.name}</span>
                      {incomingOccupiedElsewhere ? (
                        <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg shrink-0">
                          ⚠ در «{teamName(incoming.teamId)}» مشغول است
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg shrink-0">
                          ✓ آزاد
                        </span>
                      )}
                    </div>
                  ) : (
                    <button type="button" onClick={() => setCreateNew(true)} disabled={busy}
                      className="w-full py-2 rounded-xl border border-dashed border-white/15 text-[11px] font-bold text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300 transition cursor-pointer flex items-center justify-center gap-1.5">
                      <UserPlus className="h-3.5 w-3.5" /> مربی در لیست نیست؟ ساخت مربی جدید
                    </button>
                  )}
                </>
              ) : (
                <div className="flex gap-2">
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                    placeholder="نام مربی جدید..."
                    className="flex-1 bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    disabled={busy} />
                  <button type="button" onClick={() => setCreateNew(false)} disabled={busy}
                    className="text-[11px] text-slate-400 hover:text-white px-2 cursor-pointer">انصراف</button>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="text-[11px] text-slate-400 font-bold">تاریخ شروع
                  <input type="date" value={appointDate} onChange={(e) => setAppointDate(e.target.value)}
                    className="mt-1 w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500" disabled={busy} />
                </label>
                <label className="text-[11px] text-slate-400 font-bold">دلیل انتصاب
                  <select value={appointReason} onChange={(e) => setAppointReason(e.target.value)}
                    className="mt-1 w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500" disabled={busy}>
                    <option value="">انتخاب دلیل...</option>
                    {reasonsFor("coach_appointment").map((r) => (
                      <option key={r.code} value={r.code}>{r.labelFa}</option>
                    ))}
                  </select>
                </label>
                <label className="text-[11px] text-slate-400 font-bold">فصل
                  <select value={seasonId} onChange={(e) => setSeasonId(e.target.value)}
                    className="mt-1 w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500" disabled={busy}>
                    <option value="">فصل...</option>
                    {seasons.map((s: any) => (
                      <option key={s.id} value={s.id}>فصل {s.name}{s.isActive || s.status === "current" ? " (جاری)" : ""}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}

          {step !== "review" ? (
            <button type="button" onClick={buildReview} disabled={busy}
              className="mt-3 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2.5 px-6 rounded-xl text-xs transition cursor-pointer disabled:opacity-50">
              بازبینی نهایی
            </button>
          ) : (
            <div className="mt-3 p-3.5 rounded-xl bg-slate-950/60 border border-emerald-500/20 space-y-2">
              <p className="text-[11px] font-black text-white">خلاصه تأیید — «{review.team}»</p>
              {review.outgoing && (
                <p className="text-[11px] text-slate-300">
                  مربی قبلی: <span className="font-black text-white">{review.outgoing.name}</span>
                  {" "}• پایان: <span className="font-mono">{formatJalaliDate(review.departDate)}</span>
                  {review.departReason && <> • {review.departReason}</>}
                  {" "}• وضعیت بعدی: {review.nextStatus === "RETIRED" ? "بازنشسته" : "آزاد"}
                </p>
              )}
              {review.incoming && (
                <p className="text-[11px] text-slate-300">
                  مربی جدید: <span className="font-black text-white">{review.incoming.name}</span>
                  {review.incomingFrom && <span className="text-amber-300"> (پایان همکاری در «{review.incomingFrom}» لازم است)</span>}
                  {" "}• شروع: <span className="font-mono">{formatJalaliDate(review.appointDate)}</span>
                  {review.appointReason && <> • {review.appointReason}</>}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setStep("action")} disabled={busy}
                  className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] font-extrabold transition cursor-pointer disabled:opacity-50">
                  بازگشت
                </button>
                <button type="button" onClick={commit} disabled={busy}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {busy ? "در حال ثبت..." : "تأیید و ثبت"}
                </button>
              </div>
              {review.incomingFrom && (
                <p className="text-[10px] text-amber-300 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  مربی جدید در تیم دیگری است؛ بدون پایان همکاری آنجا، ثبت بلاک می‌شود.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

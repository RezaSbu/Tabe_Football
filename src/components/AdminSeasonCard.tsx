import React, { useState, useEffect, useCallback } from "react";
import { Calendar, Plus, Check } from "lucide-react";
import { formatStatNumber } from "../utils";

interface SeasonRow {
  id: string;
  name: string;
  label?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
  status?: string;
}

interface AdminSeasonCardProps {
  currentSeason?: string;
  onSeasonChanged?: () => void;
}

// Season manager. Lists all season rows, creates new (upcoming) seasons and
// switches the active one transactionally. It never snapshots, zeroes,
// moves, or deletes any stats/matches/news data: history stays in place and
// a fresh season simply starts with zero rows until its matches are played.
export default function AdminSeasonCard({ currentSeason = "1405", onSeasonChanged }: AdminSeasonCardProps) {
  const [seasons, setSeasons] = useState<SeasonRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchSeasons = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/seasons");
      const data = await res.json();
      if (res.ok && Array.isArray(data.seasons)) {
        setSeasons(data.seasons);
      }
    } catch {
      // list is best-effort; the card still works without it
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchSeasons();
  }, [fetchSeasons, currentSeason]);

  const statusBadge = (s: SeasonRow) => {
    if (s.isActive || s.status === "current") {
      return <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-lg border border-emerald-400/20">جاری</span>;
    }
    if (s.status === "closed") {
      return <span className="text-[10px] font-black text-slate-400 bg-slate-400/10 px-2 py-0.5 rounded-lg border border-slate-400/20">بسته‌شده</span>;
    }
    return <span className="text-[10px] font-black text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded-lg border border-sky-400/20">آینده</span>;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(name.trim())) {
      setError("تگ فصل باید سال چهاررقمی باشد (مثل 1406).");
      return;
    }
    setBusy("create");
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          label: label.trim() || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "خطا در ثبت فصل جدید");
      }
      setSuccess(`فصل «${name.trim()}» ثبت شد (بدون هیچ داده‌ای؛ با اولین بازی‌ها پر می‌شود).`);
      setName("");
      setLabel("");
      setStartDate("");
      setEndDate("");
      await fetchSeasons();
      if (onSeasonChanged) onSeasonChanged();
    } catch (err: any) {
      setError(err.message || "خطایی در ثبت فصل رخ داد.");
    } finally {
      setBusy(null);
    }
  };

  const handleMakeCurrent = async (s: SeasonRow) => {
    if (!window.confirm(`فصل جاری به «${s.name}» تغییر کند؟ هیچ داده‌ای جابه‌جا یا حذف نمی‌شود.`)) return;
    setBusy(s.id);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/seasons/${encodeURIComponent(s.id)}/make-current`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "خطا در فعال‌سازی فصل");
      }
      setSuccess(`فصل جاری به «${s.name}» تغییر یافت. آمار و تاریخچه فصل‌های قبل سر جایشان هستند.`);
      await fetchSeasons();
      if (onSeasonChanged) onSeasonChanged();
    } catch (err: any) {
      setError(err.message || "خطایی در فعال‌سازی فصل رخ داد.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

      {error && (
        <div className="mb-3 p-3 rounded-xl bg-red-950/30 border border-red-700/30 text-xs font-bold text-red-400 flex items-center gap-2">
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-700/30 text-xs font-bold text-emerald-400 flex items-center gap-2">
          <span>{success}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black text-white flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-emerald-400" />
            مدیریت فصل‌ها
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            ساخت فصل جدید و جابه‌جایی فصل جاری. تاریخچه هیچ فصلی دست نمی‌خورد؛ فصل تازه تا بازی اول خالی می‌ماند.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-950/20 border border-emerald-500/10 px-3.5 py-1.5 rounded-xl shrink-0">
          <span className="text-[11px] text-slate-400">فصل جاری:</span>
          <span className="text-xs font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-lg border border-emerald-400/20 font-mono">
            {formatStatNumber(currentSeason)}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {loadingList && <p className="text-[11px] text-slate-500">در حال دریافت فهرست فصل‌ها...</p>}
        {!loadingList && seasons.map((s) => {
          const isCurrent = s.isActive || s.status === "current";
          return (
            <div key={s.id} className="flex items-center justify-between gap-3 bg-slate-950/60 border border-white/5 rounded-xl px-3.5 py-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                {statusBadge(s)}
                <span className="text-xs font-black text-white font-mono">{formatStatNumber(s.name)}</span>
                {s.label && s.label !== s.name && (
                  <span className="text-[11px] text-slate-500 truncate">{s.label}</span>
                )}
              </div>
              {!isCurrent && (
                <button
                  onClick={() => handleMakeCurrent(s)}
                  disabled={busy !== null}
                  className="shrink-0 text-[11px] font-extrabold text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/5 px-3 py-1.5 rounded-lg transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  {busy === s.id ? "در حال فعال‌سازی..." : "فعال‌سازی"}
                </button>
              )}
            </div>
          );
        })}
        {!loadingList && seasons.length === 0 && (
          <p className="text-[11px] text-slate-500">فصلی ثبت نشده است.</p>
        )}
      </div>

      <form onSubmit={handleCreate} className="mt-4 pt-4 border-t border-white/5">
        <p className="text-[11px] font-black text-slate-300 mb-2.5 flex items-center gap-1.5">
          <Plus className="h-3.5 w-3.5 text-emerald-400" />
          ثبت فصل جدید
        </p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <input
            type="text"
            placeholder="تگ فصل (مثل 1406)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="sm:w-36 bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition font-mono"
            disabled={busy !== null}
          />
          <input
            type="text"
            placeholder="برچسب (اختیاری، مثل 1406-1407)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="flex-1 bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
            disabled={busy !== null}
          />
          <input
            type="date"
            title="تاریخ شروع (اختیاری)"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 transition"
            disabled={busy !== null}
          />
          <input
            type="date"
            title="تاریخ پایان (اختیاری)"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 transition"
            disabled={busy !== null}
          />
          <button
            type="submit"
            disabled={busy !== null}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2.5 px-6 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {busy === "create" ? "در حال ثبت..." : "ثبت فصل"}
          </button>
        </div>
      </form>
    </div>
  );
}

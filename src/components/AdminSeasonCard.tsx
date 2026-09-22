import React, { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { formatStatNumber } from "../utils";

interface AdminSeasonCardProps {
  currentSeason?: string;
  onSeasonChanged?: () => void;
}

// Current-season-only control. There is exactly one active season;
// this card only sets which season tag is current. It never snapshots,
// zeroes, or deletes any data (the multi-season archive system is gone).
export default function AdminSeasonCard({ currentSeason = "1405", onSeasonChanged }: AdminSeasonCardProps) {
  const [directSeasonInput, setDirectSeasonInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (currentSeason) {
      setDirectSeasonInput(currentSeason);
    }
  }, [currentSeason]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directSeasonInput.trim()) {
      setError("لطفا تگ فصل جاری را وارد کنید.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/current-season", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentSeason: directSeasonInput.trim() }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "خطا در بروزرسانی فصل جاری");
      }
      setSuccess(`فصل جاری وب‌سایت با موفقیت به «${directSeasonInput.trim()}» تغییر یافت.`);
      if (onSeasonChanged) onSeasonChanged();
    } catch (err: any) {
      setError(err.message || "خطایی در تغییر فصل جاری رخ داد.");
    } finally {
      setLoading(false);
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
            فصل جاری وب‌سایت
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            فصلی که همه منوها، جداول، بازی‌ها و آمار روی آن نمایش داده می‌شوند. فقط همین یک فصل فعال وجود دارد.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-950/20 border border-emerald-500/10 px-3.5 py-1.5 rounded-xl shrink-0">
          <span className="text-[11px] text-slate-400">فصل جاری:</span>
          <span className="text-xs font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-lg border border-emerald-400/20 font-mono">
            {formatStatNumber(currentSeason)}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 relative">
          <Calendar className="absolute right-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="مثال: 1405"
            value={directSeasonInput}
            onChange={(e) => setDirectSeasonInput(e.target.value)}
            className="w-full bg-slate-950 border border-white/5 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2.5 px-6 rounded-xl text-xs transition shadow-md hover:shadow-emerald-950/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? "در حال ذخیره..." : "ذخیره"}
        </button>
      </form>
    </div>
  );
}

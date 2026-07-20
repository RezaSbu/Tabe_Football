import React, { useState } from "react";
import { Database, Calendar, Trash2, ShieldAlert, CheckCircle2, Trophy, Users, BarChart3, AlertCircle } from "lucide-react";

interface ArchiveItem {
  id: string;
  season_tag: string;
  type: "stats" | "standings" | "bracket" | "players" | "coaches" | "matches";
  createdAt: string;
}

interface AdminArchiveManagerProps {
  archives: ArchiveItem[];
  currentSeason?: string;
  onArchiveCreated: (newArchives: ArchiveItem[]) => void;
  onArchiveDeleted: (newArchives: ArchiveItem[]) => void;
}

const typeMap = {
  stats: {
    label: "آمار بازیکنان",
    icon: Users,
    color: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  },
  standings: {
    label: "جدول لیگ‌ها",
    icon: Trophy,
    color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  },
  bracket: {
    label: "نمودار جام حذفی",
    icon: BarChart3,
    color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  },
  players: {
    label: "آرشیو لیست بازیکنان",
    icon: Users,
    color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  },
  coaches: {
    label: "آرشیو لیست مربیان",
    icon: Trophy,
    color: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  },
  matches: {
    label: "آرشیو مسابقات",
    icon: Calendar,
    color: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  },
};

export const AdminArchiveManager: React.FC<AdminArchiveManagerProps> = ({
  archives,
  currentSeason = "1404",
  onArchiveCreated,
  onArchiveDeleted,
}) => {
  const [type, setType] = useState<"stats" | "standings" | "bracket">("stats");
  const [seasonTag, setSeasonTag] = useState("");
  const [newCurrentSeason, setNewCurrentSeason] = useState("");
  const [directSeasonInput, setDirectSeasonInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const getNextSeasonSuggestion = (season: string): string => {
    if (!season) return "";
    const parts = season.split("-");
    if (parts.length === 2) {
      const p1 = parseInt(parts[0], 10);
      const p2 = parseInt(parts[1], 10);
      if (!isNaN(p1) && !isNaN(p2)) {
        return `${p1 + 1}-${p2 + 1}`;
      }
    }
    const single = parseInt(season, 10);
    if (!isNaN(single)) {
      return String(single + 1);
    }
    return "";
  };

  React.useEffect(() => {
    if (currentSeason) {
      setSeasonTag(currentSeason);
      const nextSuggested = getNextSeasonSuggestion(currentSeason);
      setNewCurrentSeason(nextSuggested);
      setDirectSeasonInput(currentSeason);
    }
  }, [currentSeason]);

  const handleDirectSeasonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directSeasonInput.trim()) {
      setError("لطفا تگ فصل فعال جاری را وارد کنید.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/current-season", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentSeason: directSeasonInput.trim(),
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "خطا در بروزرسانی فصل جاری");
      }

      setSuccess(`فصل فعال سیستم با موفقیت به «${directSeasonInput.trim()}» تغییر یافت.`);
      onArchiveCreated(archives);
    } catch (err: any) {
      setError(err.message || "خطایی در تغییر فصل فعال رخ داد.");
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (newType: "stats" | "standings" | "bracket") => {
    setType(newType);
    setShowConfirm(false);
    setError(null);
    setSuccess(null);
  };

  const handleSeasonTagChange = (val: string) => {
    setSeasonTag(val);
    setShowConfirm(false);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seasonTag.trim()) {
      setError("لطفا تگ فصل را وارد نمایید (مثلا: ۱۴۰۳-۱۴۰۴ یا 1403-1404)");
      return;
    }
    if (!newCurrentSeason.trim()) {
      setError("لطفا تگ فصل جاری جدید را وارد نمایید (مثلا: ۱۴۰۴-۱۴۰۵ یا 1405)");
      return;
    }

    if (!showConfirm) {
      setShowConfirm(true);
      setError(null);
      setSuccess(null);
      return;
    }

    setShowConfirm(false);
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/archives", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          type, 
          season_tag: seasonTag.trim(),
          new_current_season: newCurrentSeason.trim()
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "خطا در برقراری ارتباط با سرور");
      }

      setSuccess(`بخش ${typeMap[type].label} با موفقیت با تگ ${seasonTag} آرشیو شد و فصل جاری به ${newCurrentSeason} تغییر یافت و مقادیر جاری صفر شدند.`);
      onArchiveCreated(result.archives);
    } catch (err: any) {
      setError(err.message || "خطایی در انجام عملیات رخ داد.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/archives/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "خطا در حذف آرشیو");
      }

      setSuccess("آرشیو مورد نظر با موفقیت حذف گردید.");
      onArchiveDeleted(result.archives);
      setConfirmDeleteId(null);
    } catch (err: any) {
      setError(err.message || "خطا در حذف آرشیو رخ داد.");
    } finally {
      setLoading(false);
    }
  };

  const toPersianDigits = (num: number | string): string => {
    const numStr = String(num);
    const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
    return numStr.replace(/[0-9]/g, (w) => persianDigits[parseInt(w, 10)]);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex items-center gap-3 border-b border-white/5 pb-4">
        <Database className="h-6 w-6 text-red-500" />
        <div>
          <h2 className="text-xl font-extrabold text-white">مدیریت آرشیوهای اطلاعات گذشته</h2>
          <p className="text-xs text-slate-400 mt-1">
            آرشیو کردن جداول آماری، جدول لیگ و جام حذفی برای شروع فصل جدید و صفر کردن مقادیر جاری.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 bg-red-950/30 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2.5 bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 p-3.5 rounded-xl text-xs">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Current Season Management Card */}
      <div className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
              <Calendar className="h-4.5 w-4.5 text-emerald-400" />
              تنظیم و مدیریت فصل فعال وب‌سایت
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              در این بخش می‌توانید بدون نیاز به آرشیو کردن یا پاک کردن اطلاعات، فصل فعال و جاری وب‌سایت را مستقیماً تغییر دهید. تمامی منوها، جداول فعال، بازی‌های پیش‌رو و پیش‌بینی‌ها فوراً روی این فصل سوئیچ خواهند کرد.
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-emerald-950/20 border border-emerald-500/10 px-3.5 py-1.5 rounded-xl shrink-0">
            <span className="text-[11px] text-slate-400">فصل فعال فعلی:</span>
            <span className="text-xs font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-lg border border-emerald-400/20 font-mono">
              {toPersianDigits(currentSeason)}
            </span>
          </div>
        </div>

        <form onSubmit={handleDirectSeasonSubmit} className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 relative">
            <Calendar className="absolute right-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="مثال: ۱۴۰۴-۱۴۰۵ یا 1404"
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
            {loading ? "در حال بروزرسانی..." : "بروزرسانی فصل فعال"}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Create Archive Form */}
        <div className="lg:col-span-5 bg-slate-900/40 border border-white/5 p-5 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <h3 className="text-sm font-black text-white mb-4 flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            ایجاد آرشیو جدید (صفر کردن مقادیر جاری)
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">انتخاب بخش جهت آرشیو</label>
              <div className="grid grid-cols-3 gap-2">
                {(["stats", "standings", "bracket"] as const).map((tKey) => {
                  const item = typeMap[tKey];
                  const Icon = item.icon;
                  const isSelected = type === tKey;
                  return (
                    <button
                      key={tKey}
                      type="button"
                      onClick={() => handleTypeChange(tKey)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition cursor-pointer ${
                        isSelected
                          ? "bg-red-500/10 border-red-500/30 text-white font-black"
                          : "bg-slate-950/40 border-white/5 text-slate-400 hover:bg-slate-950/70"
                      }`}
                    >
                      <Icon className={`h-5 w-5 mb-1.5 ${isSelected ? "text-red-400" : "text-slate-500"}`} />
                      <span className="text-[11px]">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">تگ فصل آرشیو (پایان‌یافته)</label>
              <div className="relative">
                <Calendar className="absolute right-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="مثال: ۱۴۰۳-۱۴۰۴"
                  value={seasonTag}
                  onChange={(e) => handleSeasonTagChange(e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500 transition"
                  disabled={loading}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                این تگ برای تفکیک آرشیوها در دراپ‌داون‌های صفحات عمومی استفاده می‌شود. ترجیحا از ساختار استاندارد فارسی (مثلا ۱۴۰۳-۱۴۰۴) استفاده نمایید.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">تگ فصل جاری جدید (شروع‌شونده)</label>
              <div className="relative">
                <Calendar className="absolute right-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="مثال: ۱۴۰۴-۱۴۰۵"
                  value={newCurrentSeason}
                  onChange={(e) => setNewCurrentSeason(e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500 transition"
                  disabled={loading}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                این تگ برای مشخص کردن نام فصلِ فعالِ جدید در وب‌سایت استفاده می‌گردد تا آمار و مسابقات جدید تحت این عنوان نشان داده شوند.
              </p>
            </div>

            <div className="p-3 bg-amber-950/20 border border-amber-500/15 rounded-xl text-[11px] text-amber-300/90 leading-relaxed">
              <strong className="block text-amber-400 mb-1">هشدار مهم امنیتی:</strong>
              پس از اجرای موفق این فرآیند، اطلاعات جاریِ بخش مربوطه به تاریخچه (آرشیو) منتقل شده و مقادیر فعالِ فعلی سایت جهت آغاز فصلِ جدید صفر (تهی) خواهند شد. همچنین بازی‌های تمام‌شده جهت جلوگیری از بازمحاسبه مجدد به حالت بایگانی (archived) در می‌آیند.
            </div>

            {showConfirm && (
              <div className="p-3.5 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300">
                <p className="font-extrabold flex items-center gap-1.5 text-red-400 mb-1">
                  <ShieldAlert className="h-4 w-4 text-red-500 animate-pulse" />
                  آیا کاملاً از این کار اطمینان دارید؟
                </p>
                بخش <strong className="text-white">«{typeMap[type].label}»</strong> برای فصل <strong className="text-white">«{seasonTag}»</strong> آرشیو شده و اطلاعات فعال جاری روی سایت <strong className="text-white">کاملاً صفر خواهند شد!</strong> این اقدام غیرقابل‌بازگشت است.
              </div>
            )}

            {showConfirm ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer text-center"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition shadow-md hover:shadow-red-950/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{loading ? "در حال ثبت..." : "بله، قطعاً آرشیو شود"}</span>
                </button>
              </div>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-md hover:shadow-red-950/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Database className="h-4 w-4" />
                <span>شروع فرآیند آرشیو و صفر کردن مقادیر</span>
              </button>
            )}
          </form>
        </div>

        {/* Archives List */}
        <div className="lg:col-span-7 bg-slate-900/40 border border-white/5 p-5 rounded-2xl">
          <h3 className="text-sm font-black text-white mb-4 flex items-center gap-1.5">
            <Database className="h-4 w-4 text-slate-400" />
            آرشیو‌های ثبت شده در سیستم ({toPersianDigits(archives.length)})
          </h3>

          {archives.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border border-dashed border-white/5 rounded-xl text-slate-500">
              <Database className="h-8 w-8 text-slate-600 mb-2" />
              <p className="text-xs font-bold">هیچ آرشیوی تا کنون در سیستم ثبت نشده است.</p>
              <p className="text-[10px] text-slate-600 mt-1">با فرم روبرو می‌توانید اولین آرشیو خود را بسازید.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {archives.map((archive) => {
                const typeInfo = typeMap[archive.type] || { label: archive.type, icon: Database, color: "text-slate-400 bg-slate-400/10" };
                const Icon = typeInfo.icon;
                const isConfirming = confirmDeleteId === archive.id;

                return (
                  <div
                    key={archive.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-slate-950/40 border border-white/5 rounded-xl gap-3 hover:bg-slate-950/70 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl border ${typeInfo.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white">{typeInfo.label}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-white/5 border border-white/10 text-slate-400 rounded-full font-bold">
                            فصل {toPersianDigits(archive.season_tag)}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          ایجاد شده در: {toPersianDigits(new Date(archive.createdAt).toLocaleDateString("fa-IR"))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {isConfirming ? (
                        <div className="flex items-center gap-1.5 animate-fadeIn">
                          <span className="text-[10px] text-red-400 font-bold">مطمئنید؟</span>
                          <button
                            onClick={() => handleDelete(archive.id)}
                            disabled={loading}
                            className="bg-red-600 hover:bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded"
                          >
                            حذف قطعی
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="bg-white/5 hover:bg-white/10 text-slate-400 text-[10px] font-bold px-2 py-1 rounded"
                          >
                            انصراف
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(archive.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/5 transition cursor-pointer"
                          title="حذف آرشیو"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              
              <div className="text-[10px] text-slate-500 mt-2 text-center bg-slate-950/25 p-2 rounded-lg">
                ⚠️ طبق الگوریتم، حداکثر ۵ آرشیو برای هر بخش نگهداری می‌شود و ثبت آرشیو ششم، قدیمی‌ترین آرشیوِ مربوطه را به صورت خودکار حذف می‌کند.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

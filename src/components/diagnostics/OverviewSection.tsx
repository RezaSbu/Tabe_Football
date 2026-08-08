import React from "react";
import { Server, Database, HardDrive, RefreshCw, CheckCircle, XCircle, Info, Cpu, ShieldCheck } from "lucide-react";
import { Card, Stat, ProgressBar, EmptyState, formatBytes, formatUptime, toPersian } from "./ui";

const tableLabels: Record<string, string> = {
  news: "اخبار",
  teams: "تیم‌ها",
  players: "بازیکنان",
  coaches: "مربیان",
  matches: "مسابقات",
  transfers: "نقل و انتقالات",
  legionnaires: "لژیونرها",
  media: "تصاویر گالری",
  media_files: "فایل‌های رسانه",
  hero_slides: "اسلایدر",
  contact_messages: "پیام‌ها",
  standings: "جدول رده‌بندی",
  stats: "آمار لیگ"
};

const tableColors: Record<string, string> = {
  news: "text-emerald-400",
  teams: "text-blue-400",
  players: "text-cyan-400",
  coaches: "text-violet-400",
  matches: "text-amber-400",
  transfers: "text-yellow-400",
  legionnaires: "text-purple-400",
  media: "text-pink-400",
  media_files: "text-rose-400",
  hero_slides: "text-orange-400",
  contact_messages: "text-teal-400",
  standings: "text-red-400",
  stats: "text-indigo-400"
};

export default function OverviewSection({ diag, loading, onRefresh }: {
  diag: any;
  loading: boolean;
  onRefresh: () => void;
}) {
  const pg = diag?.postgres || {};
  const storage = diag?.storage || {};
  const cache = diag?.cache || {};
  const system = diag?.system || {};
  const warnings = system.warnings || [];

  const disk = storage.disk;
  const diskPct = disk ? Math.round((disk.usedBytes / Math.max(1, disk.totalBytes)) * 100) : 0;

  return (
    <div className="space-y-6">
      {warnings.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-700/40 space-y-2">
          <div className="flex items-center gap-2 font-extrabold text-amber-400 text-xs">
            <Cpu className="h-4 w-4" />
            <span>هشدارهای سیستم</span>
          </div>
          {warnings.map((w: any) => (
            <div key={w.key} className={`text-[11px] font-bold flex items-center gap-2 ${w.level === "error" ? "text-red-400" : "text-amber-300"}`}>
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{w.label}:</span>
              <span className="font-mono">{w.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connection Status */}
        <Card
          title="وضعیت دیتابیس PostgreSQL"
          icon={<Server className="h-4 w-4" />}
          className="lg:col-span-1"
        >
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/20">
              <span className="text-slate-400">اتصال</span>
              {pg.available ? (
                <span className="flex items-center gap-1.5 font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-950">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>متصل (Online)</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 font-bold text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-950">
                  <XCircle className="h-3.5 w-3.5" />
                  <span>قطع (Offline)</span>
                </span>
              )}
            </div>

            <div className="p-2.5 rounded-xl bg-black/20 space-y-1.5 font-mono text-[10px]">
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">هاست:</span>
                <span className="text-slate-300 truncate max-w-[180px]" dir="ltr">{diag?.config?.host || "—"}:{diag?.config?.port}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">دیتابیس:</span>
                <span className="text-slate-300">{diag?.config?.database || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">کاربر:</span>
                <span className="text-slate-300">{diag?.config?.user || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">محیط:</span>
                <span className="text-emerald-400 uppercase font-bold">{diag?.config?.nodeEnv || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">نسخه سرور:</span>
                <span className="text-slate-300 text-[9px] truncate max-w-[170px]">{pg.serverVersion ? pg.serverVersion.split(" on ")[0] : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">اتصال‌های فعال:</span>
                <span className="text-cyan-400">{toPersian(pg.activeConnections || 0)} / {toPersian(pg.maxConnections || "—")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Autovacuum:</span>
                <span className="text-emerald-400">{pg.autovacuum}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={onRefresh}
                disabled={loading}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/20 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>به‌روزرسانی و بارگذاری مجدد</span>
              </button>
            </div>
          </div>
        </Card>

        {/* Table counts */}
        <Card
          title="آمار جداول (کش حافظه)"
          icon={<Database className="h-4 w-4 text-cyan-400" />}
          className="lg:col-span-2"
        >
          {cache.memoryCounts ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 py-1">
              {Object.entries(cache.memoryCounts).map(([key, count]) => (
                <div key={key} className="bg-black/15 p-2.5 rounded-xl border border-white/[0.02] hover:border-slate-800 transition text-center select-none">
                  <span className="block text-[10px] text-slate-400 font-medium truncate">{tableLabels[key] || key}</span>
                  <span className={`block font-mono text-lg font-black mt-1 ${tableColors[key] || "text-slate-300"}`}>{toPersian(count as number)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="داده‌ای در دسترس نیست" />
          )}

          <div className="bg-slate-800/20 rounded-xl px-4 py-2.5 border border-white/5 text-[10px] text-slate-400 leading-relaxed flex items-center gap-2">
            <Info className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <span>همگام‌سازی کش: {cache.lastSyncAt ? new Date(cache.lastSyncAt).toLocaleString("fa-IR") : "—"} — وضعیت: {cache.lastSyncOk ? "موفق" : "ناموفق"} — تعداد همگام‌سازی: {toPersian(cache.syncCount || 0)}</span>
          </div>
        </Card>
      </div>

      {/* Storage & Server info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="فضای ذخیره‌سازی" icon={<HardDrive className="h-4 w-4 text-amber-400" />}>
          {storage.disk ? (
            <div className="space-y-3">
              <Stat label="دیسک سرور" value={formatBytes(disk.usedBytes)} color="text-amber-400" sub={<span className="text-[9px] text-slate-500">از {formatBytes(disk.totalBytes)}</span>} />
              <Stat label="فضای آزاد" value={formatBytes(disk.freeBytes)} color="text-emerald-400" />
              <ProgressBar percent={diskPct} colorClass="from-amber-500 to-amber-400" label={`${diskPct}٪ استفاده`} />
              <Stat label="حجم دیتابیس" value={formatBytes(storage.databaseSizeBytes)} color="text-emerald-400" />
              <Stat label="حجم تصاویر (uploads)" value={formatBytes(storage.uploadsSizeBytes)} color="text-cyan-400" />
            </div>
          ) : (
            <EmptyState message="اطلاعات دیسک در دسترس نیست" />
          )}
        </Card>

        <Card title="وضعیت سرور" icon={<Server className="h-4 w-4 text-emerald-400" />}>
          <div className="space-y-3">
            <Stat label="آپتایم سرور" value={formatUptime(system.hostUptime || 0)} color="text-emerald-400" />
            <Stat label="آپتایم سرویس" value={formatUptime(system.processUptime || 0)} color="text-emerald-400" />
            <Stat label="Node.js" value={diag?.version?.nodeVersion || "—"} color="text-slate-200" />
            <Stat label="پلتفرم" value={system.platform + " " + system.arch} color="text-slate-200" />
            <Stat label="مصرف حافظه (نود)" value={`${diag?.version ? "" : ""}${Math.round((system.memory?.used || 0) / 1024 / 1024)} MB`} color="text-cyan-400" />
          </div>
        </Card>

        <Card title="نسخه و اطلاعات اجرا" icon={<Info className="h-4 w-4 text-blue-400" />}>
          <div className="space-y-3">
            <Stat label="نسخه پکیج" value={diag?.version?.packageVersion || "—"} color="text-slate-200" />
            <Stat label="آغاز سرویس" value={diag?.version?.startedAt ? new Date(diag.version.startedAt).toLocaleString("fa-IR") : "—"} color="text-slate-300" />
            <Stat label="میزبان" value={system.hostname || "—"} color="text-slate-200" />
            <Stat label="کرنل" value={system.kernel || "—"} color="text-slate-300" />
            <Stat label="مدل CPU" value={system.cpuModel || "—"} color="text-slate-300" sub={<span className="text-[9px] text-slate-500">{toPersian(system.cpuCores || 0)} هسته</span>} />
          </div>
        </Card>
      </div>
    </div>
  );
}

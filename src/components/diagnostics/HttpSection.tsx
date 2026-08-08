import React from "react";
import { ShieldCheck, GitBranch, TrendingDown, CheckCircle2, CircleAlert, MemoryStick, Activity } from "lucide-react";
import { Card, Stat, ProgressBar, formatBytes, formatDateTime, toPersian } from "./ui";

export default function HttpSection({ diag }: { diag: any }) {
  const http = diag?.http || {};
  const stats = http.stats || {};
  const dbStatus = diag?.database;

  const uptime = diag?.runningVersion?.uptimeSec || 0;
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);

  return (
    <div className="space-y-6">
      {/* DB sync + site status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="همگام‌سازی دیتابیس حافظه" icon={<Activity className="h-4 w-4 text-violet-400" />}>
          {dbStatus ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/20">
                <span className="text-xs text-slate-300">وضعیت:</span>
                {dbStatus.connected ? (
                  <span className="flex items-center gap-1.5 text-xs font-black text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" /> متصل
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-black text-red-400">
                    <CircleAlert className="h-4 w-4" /> قطع
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/20">
                <span className="text-xs text-slate-300">آخرین همگام‌سازی:</span>
                <span className="text-xs font-mono text-slate-200">{formatDateTime(dbStatus.lastSync)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/20">
                <span className="text-xs text-slate-300">رکوردهای در حافظه:</span>
                <span className="text-xs font-mono text-cyan-400">{toPersian(dbStatus.count)}</span>
              </div>
              <ProgressBar
                percent={dbStatus.lastSyncSecAgo < 120 ? 100 : Math.max(0, Math.min(100, 100 - (dbStatus.lastSyncSecAgo - 120) / 10))}
                colorClass={dbStatus.lastSyncSecAgo < 120 ? "from-emerald-500 to-emerald-400" : dbStatus.lastSyncSecAgo < 600 ? "from-amber-500 to-amber-400" : "from-red-500 to-red-400"}
                label={dbStatus.lastSyncSecAgo < 120 ? "در وضعیت عادی" : `${dbStatus.lastSyncSecAgo} ثانیه از آخرین همگام‌سازی گذشته`}
              />
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-3">وضعیت دیتابیس در دسترس نیست.</div>
          )}
        </Card>

        <Card title="وضعیت امنیت" icon={<ShieldCheck className="h-4 w-4 text-emerald-400" />}>
          <div className="space-y-3">
            <Stat label="درخواست‌های ردشده توسط Rate-Limit" value={toPersian(http.rateLimited || 0)} color={http.rateLimited > 0 ? "text-amber-400" : "text-emerald-400"} />
            <Stat label="شکست‌های سینک خودکار" value={toPersian(http.syncFailures || 0)} color={http.syncFailures > 0 ? "text-red-400" : "text-emerald-400"} />
            <Stat label="ردشدن درخواست خراب (Malformed)" value={toPersian(http.malformed || 0)} color={http.malformed > 0 ? "text-red-400" : "text-emerald-400"} />
            <div className="text-[9px] text-slate-500">خطاهای Rate-Limit و Malformed در میدلویر مرکزی ثبت می‌شوند.</div>
          </div>
        </Card>
      </div>

      {/* General stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="کل درخواست‌های /api" value={toPersian(stats.total || 0)} color="text-slate-200" card />
        <Stat label="خطاهای ۴xx" value={toPersian(stats.status4xx || 0)} color={stats.status4xx > 0 ? "text-amber-400" : "text-emerald-400"} card />
        <Stat label="خطاهای ۵xx" value={toPersian(stats.status5xx || 0)} color={stats.status5xx > 0 ? "text-red-400" : "text-emerald-400"} card />
        <Stat label="سرعت آهسته (>۲ ثانیه)" value={toPersian(stats.slowCount || 0)} color={stats.slowCount > 0 ? "text-red-400" : "text-emerald-400"} card />
      </div>

      {/* Status by endpoint */}
      <Card title="سریع‌ترین و کندترین اندپوینت‌ها (میانگین ms)" icon={<TrendingDown className="h-4 w-4 text-cyan-400" />}>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <h4 className="text-[10px] text-slate-500 mb-2">سریع‌ترین</h4>
            {http.fastest?.length ? (
              <div className="space-y-1.5">
                {http.fastest.map((e: any) => (
                  <div key={e.method + e.route} className="flex items-center justify-between p-2 rounded-lg bg-black/15 text-[10px]">
                    <span className="font-mono text-emerald-400 font-bold">{e.method} {e.route}</span>
                    <span className="font-mono text-slate-300">{e.avgMs}ms <span className="text-slate-600">({e.count})</span></span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[10px] text-slate-500">هنوز داده‌ای ثبت نشده است.</div>
            )}
          </div>
          <div>
            <h4 className="text-[10px] text-slate-500 mb-2">کندترین</h4>
            {http.slowest?.length ? (
              <div className="space-y-1.5">
                {http.slowest.map((e: any) => (
                  <div key={e.method + e.route} className="flex items-center justify-between p-2 rounded-lg bg-black/15 text-[10px]">
                    <span className="font-mono text-red-400 font-bold">{e.method} {e.route}</span>
                    <span className="font-mono text-slate-300">{e.avgMs}ms <span className="text-slate-600">({e.count})</span></span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[10px] text-slate-500">هنوز داده‌ای ثبت نشده است.</div>
            )}
          </div>
        </div>
      </Card>

      {/* Recent errors */}
      <Card title="آخرین خطاهای ثبت‌شده" icon={<CircleAlert className="h-4 w-4 text-red-400" />}>
        {(http.recentErrors || []).length === 0 ? (
          <div className="text-[10px] text-slate-500 py-2">خطایی ثبت نشده است.</div>
        ) : (
          <div className="space-y-1.5">
            {http.recentErrors.map((e: any, i: number) => (
              <div key={i} className="p-2 rounded-lg bg-black/15 border border-red-950/30 text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-red-400 font-bold">{e.method} {e.url}</span>
                  <span className="text-slate-500">{formatDateTime(e.time)}</span>
                </div>
                <div className="text-red-300/80 font-mono mt-1 truncate select-all" dir="ltr">{e.error || `کد ${e.status}`}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="نسخه اجرایی" icon={<GitBranch className="h-4 w-4 text-emerald-400" />}>
          <div className="space-y-2 text-[11px]">
            <Stat label="نسخه" value={diag?.runningVersion?.version || "—"} color="text-emerald-400" />
            <Stat label="برنچ" value={diag?.runningVersion?.branch || "—"} color="text-slate-300" />
            <Stat label="کامیت" value={(diag?.runningVersion?.commit || "—").slice(0, 8)} color="text-slate-400" />
          </div>
        </Card>
        <Card title="مدت اجرای سرویس" icon={<Activity className="h-4 w-4 text-violet-400" />}>
          <div className="text-3xl font-black text-violet-400 my-3">{toPersian(hours)} ساعت <span className="text-lg text-slate-400">{toPersian(minutes)} دقیقه</span></div>
          <div className="text-[9px] text-slate-500">از آخرین راه‌اندازی سرور</div>
        </Card>
        <Card title="حافظه فرآیند" icon={<MemoryStick className="h-4 w-4 text-amber-400" />}>
          <div className="space-y-2 text-[11px]">
            <Stat label="RSS" value={formatBytes(http.rssBytes)} color="text-amber-400" />
            <Stat label="Heap" value={formatBytes(http.heapUsed)} color="text-slate-300" />
            <Stat label="External" value={formatBytes(http.externalBytes)} color="text-slate-400" />
            <ProgressBar
              percent={http.rssBytes ? Math.min(100, Math.round((http.rssBytes / (http.heapTotal || 1)) * 100)) : 0}
              colorClass="from-amber-500 to-amber-400"
              label="نسبت RSS به Heap"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

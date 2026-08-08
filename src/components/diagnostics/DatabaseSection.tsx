import React, { useState } from "react";
import { Database, GitCommitHorizontal, Activity, HardDriveDownload, Download, Trash2, Sparkles } from "lucide-react";
import { Card, Stat, ProgressBar, formatBytes, toPersian, EmptyState, formatDateTime } from "./ui";

export default function DatabaseSection({ diag, onBackup, onVacuum, busy }: {
  diag: any;
  onBackup: () => void;
  onVacuum: () => void;
  busy: boolean;
}) {
  const pg = diag?.postgres || {};
  const backups = diag?.backups || [];

  const [viewingBackups, setViewingBackups] = useState(false);
  const longRunning = pg.longRunning || [];
  const tableSizes = pg.tableSizes || [];
  const vacuum = pg.vacuum || [];
  const dbStats = pg.database || {};

  return (
    <div className="space-y-6">
      {/* Quick actions */}
      <div className="flex flex-wrap gap-2.5">
        <button
          onClick={onBackup}
          disabled={busy}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-xs text-black font-extrabold rounded-xl transition disabled:opacity-50 cursor-pointer"
        >
          <HardDriveDownload className="h-4 w-4" />
          <span>پشتیبان‌گیری یک‌کلیک (pg_dump)</span>
        </button>
        <button
          onClick={onVacuum}
          disabled={busy}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-bold rounded-xl border border-white/5 transition disabled:opacity-50 cursor-pointer"
        >
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span>بهینه‌سازی VACUUM / ANALYZE</span>
        </button>
        <button
          onClick={() => setViewingBackups(v => !v)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-bold rounded-xl border border-white/5 transition cursor-pointer"
        >
          <Download className="h-4 w-4 text-cyan-400" />
          <span>بکاپ‌ها ({toPersian(backups.length)})</span>
        </button>
      </div>

      {viewingBackups && (
        <div className="p-4 rounded-2xl bg-[#18181c]/90 border border-white/5 space-y-2">
          <h3 className="font-bold text-sm text-slate-200 border-b border-white/5 pb-2 flex items-center gap-2">
            <HardDriveDownload className="h-4 w-4 text-emerald-400" />
            <span>فایل‌های پشتیبان ({toPersian(backups.length)})</span>
          </h3>
          {backups.length === 0 ? (
            <EmptyState message="هنوز بکاپی ساخته نشده است." />
          ) : (
            <div className="space-y-1.5">
              {backups.map((b: any) => (
                <div key={b.file} className="flex items-center justify-between p-2.5 rounded-xl bg-black/20 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Trash2 className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                    <span className="font-mono text-[11px] text-slate-300 truncate" dir="ltr">{b.file}</span>
                    <span className="text-[9px] text-slate-500">{formatBytes(b.size)}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[9px] text-slate-500">{formatDateTime(b.createdAt)}</span>
                    <a
                      href={`/api/diagnostics/backup/${encodeURIComponent(b.file)}`}
                      className="flex items-center gap-1 px-2 py-1 bg-cyan-950/30 text-cyan-400 border border-cyan-900/40 rounded-lg hover:bg-cyan-950/60 text-[10px] font-bold transition"
                    >
                      <Download className="h-3 w-3" />
                      <span>دانلود</span>
                    </a>
                  </div>
                </div>
              ))}
              <div className="text-[9px] text-slate-500">فقط ۳۰ بکاپ اخیر نگهداری می‌شود.</div>
            </div>
          )}
        </div>
      )}

      {/* Database health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="سلامت دیتابیس" icon={<Activity className="h-4 w-4 text-emerald-400" />}>
          <div className="space-y-3">
            <Stat label="اتصال‌های فعال" value={toPersian(pg.activeConnections || 0)} color="text-cyan-400" sub={<span className="text-[9px] text-slate-500">از {pg.maxConnections || "—"}</span>} />
            <Stat label="Cache Hit Ratio" value={`${dbStats.cacheHitPercent ?? "—"}٪`} color={dbStats.cacheHitPercent < 90 ? "text-amber-400" : "text-emerald-400"} />
            <Stat label="تراکنش‌ها" value={toPersian(dbStats.transactions || 0)} color="text-slate-200" />
            <Stat label="Deadlocks" value={toPersian(dbStats.deadlocks || 0)} color={dbStats.deadlocks > 0 ? "text-red-400" : "text-emerald-400"} />
            <Stat label="نرخ Rollback" value={`${dbStats.rollbackPercent ?? 0}٪`} color="text-slate-300" />
          </div>
        </Card>

        {/* Long running queries */}
        <Card title="کوئری‌های طولانی (>۵ ثانیه)" icon={<GitCommitHorizontal className="h-4 w-4 text-amber-400" />} className="lg:col-span-2">
          {longRunning.length === 0 ? (
            <EmptyState message="کوئری طولانی فعالی وجود ندارد." height="h-28" />
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {longRunning.map((q: any, i: number) => (
                <div key={i} className="p-2.5 rounded-xl bg-black/20 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-cyan-400">PID {q.pid}</span>
                    <span className="text-amber-400 font-bold">{q.durationSec} ثانیه</span>
                    <span className="text-slate-400">{q.username}</span>
                  </div>
                  <div className="text-[9px] text-slate-300 font-mono truncate select-all" dir="ltr">{q.query || ""}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Table sizes */}
      <Card title="حجم واقعی جداول PostgreSQL" icon={<Database className="h-4 w-4 text-cyan-400" />}>
        {tableSizes.length === 0 ? (
          <EmptyState message="اطلاعاتی در دسترس نیست." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-[11px]">
              <thead>
                <tr className="text-slate-500 border-b border-white/5 text-[9px]">
                  <th className="py-2 pr-1 font-bold">جدول</th>
                  <th className="py-2 px-2 font-bold">تخمین ردیف</th>
                  <th className="py-2 px-2 font-bold">داده</th>
                  <th className="py-2 px-2 font-bold">ایندکس</th>
                  <th className="py-2 px-2 font-bold">مجموع</th>
                  <th className="py-2 px-2 font-bold">نمودار</th>
                </tr>
              </thead>
              <tbody>
                {tableSizes.map((t: any) => {
                  const maxBytes = tableSizes[0]?.totalBytes || 1;
                  return (
                    <tr key={t.table} className="border-b border-white/[0.02]">
                      <td className="py-1.5 pr-1 text-slate-300 font-bold font-mono">{t.table}</td>
                      <td className="py-1.5 px-2 font-mono text-slate-400">{toPersian(t.liveRows)}</td>
                      <td className="py-1.5 px-2 font-mono text-slate-400">{formatBytes(t.dataBytes)}</td>
                      <td className="py-1.5 px-2 font-mono text-amber-400">{formatBytes(t.indexBytes)}</td>
                      <td className="py-1.5 px-2 font-mono text-emerald-400 font-bold">{formatBytes(t.totalBytes)}</td>
                      <td className="py-1.5 px-2">
                        <div className="h-1.5 bg-slate-800/60 rounded-full overflow-hidden w-28">
                          <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400" style={{ width: `${Math.max(2, Math.round((t.totalBytes / maxBytes) * 100))}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Vacuum status */}
      <Card title="وضعیت VACUUM / ANALYZE" icon={<Sparkles className="h-4 w-4 text-violet-400" />}>
        {vacuum.length === 0 ? (
          <EmptyState message="اطلاعاتی در دسترس نیست." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-[11px]">
              <thead>
                <tr className="text-slate-500 border-b border-white/5 text-[9px]">
                  <th className="py-2 pr-1 font-bold">جدول</th>
                  <th className="py-2 px-2 font-bold">ردیف‌های مرده</th>
                  <th className="py-2 px-2 font-bold">آخرین VACUUM</th>
                  <th className="py-2 px-2 font-bold">آخرین AUTO</th>
                  <th className="py-2 px-2 font-bold">آخرین ANALYZE</th>
                </tr>
              </thead>
              <tbody>
                {vacuum.map((v: any) => (
                  <tr key={v.table} className="border-b border-white/[0.02]">
                    <td className="py-1.5 pr-1 text-slate-300 font-bold font-mono">{v.table}</td>
                    <td className="py-1.5 px-2 font-mono text-amber-400">{toPersian(v.deadRows)}</td>
                    <td className="py-1.5 px-2 text-[10px] text-slate-400">{formatDateTime(v.lastVacuum)}</td>
                    <td className="py-1.5 px-2 text-[10px] text-slate-400">{formatDateTime(v.lastAutovacuum)}</td>
                    <td className="py-1.5 px-2 text-[10px] text-slate-400">{formatDateTime(v.lastAnalyze)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

import React from "react";
import { Cpu, MemoryStick, HardDrive, Network, Activity, TriangleAlert } from "lucide-react";
import { Card, Stat, ProgressBar, formatBytes, toPersian } from "./ui";

export default function VpsSection({ diag }: { diag: any }) {
  const s = diag?.system || {};
  const mem = s.memory || {};
  const load = s.load || {};
  const net = s.network;
  const inode = s.inode;
  const storage = diag?.storage || {};
  const disk = storage.disk || null;
  const diskPct = disk?.totalBytes ? Math.round((disk.usedBytes / disk.totalBytes) * 100) : 0;

  return (
    <div className="space-y-6">
      {s.warnings && s.warnings.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-700/40 space-y-2">
          <div className="flex items-center gap-2 font-extrabold text-amber-400 text-xs">
            <TriangleAlert className="h-4 w-4" />
            <span>هشدارهای آستانه</span>
          </div>
          {s.warnings.map((w: any) => (
            <div key={w.key} className={`text-[11px] font-bold ${w.level === "error" ? "text-red-400" : "text-amber-300"}`}>
              {w.label}: <span className="font-mono">{w.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU */}
        <Card title="پردازنده (CPU)" icon={<Cpu className="h-4 w-4 text-cyan-400" />}>
          <div className="space-y-3">
            <Stat label="مدل" value={s.cpuModel || "—"} color="text-slate-300" />
            <Stat label="تعداد هسته‌ها" value={toPersian(s.cpuCores || 0)} color="text-slate-200" />
            <div className="p-2.5 rounded-xl bg-black/20 space-y-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "۱ دقیقه", v: load["1min"] },
                  { label: "۵ دقیقه", v: load["5min"] },
                  { label: "۱۵ دقیقه", v: load["15min"] }
                ].map(it => (
                  <div key={it.label} className="bg-black/20 rounded-lg py-2">
                    <div className="text-[9px] text-slate-500">{it.label}</div>
                    <div className="font-mono text-sm font-black text-cyan-400">{typeof it.v === "number" ? it.v.toFixed(2) : "—"}</div>
                  </div>
                ))}
              </div>
              <ProgressBar
                percent={Math.min(100, Math.round((load.coreRatio || 0) * 100))}
                colorClass={load.coreRatio > 2 ? "from-red-500 to-red-400" : load.coreRatio > 1 ? "from-amber-500 to-amber-400" : "from-emerald-500 to-emerald-400"}
                label={`بار نسبت به هسته‌ها: ${((load.coreRatio || 0) * 100).toFixed(0)}٪`}
              />
            </div>
          </div>
        </Card>

        {/* Memory */}
        <Card title="حافظه (RAM و Swap)" icon={<MemoryStick className="h-4 w-4 text-violet-400" />}>
          <div className="space-y-3">
            <Stat label="حافظه کل" value={formatBytes(mem.total)} color="text-slate-200" />
            <Stat label="مصرف‌شده" value={formatBytes(mem.used)} color={mem.usedPercent > 85 ? "text-red-400" : "text-amber-400"} />
            <Stat label="آزاد" value={formatBytes(mem.free)} color="text-emerald-400" />
            <ProgressBar percent={mem.usedPercent || 0} colorClass={mem.usedPercent > 85 ? "from-red-500 to-red-400" : mem.usedPercent > 70 ? "from-amber-500 to-amber-400" : "from-violet-500 to-violet-400"} label={`${mem.usedPercent || 0}٪ مصرف حافظه`} />
            {(mem.swapTotal || 0) > 0 && (
              <>
                <Stat label="سواپ مصرفی" value={formatBytes(mem.swapUsed)} color="text-rose-400" sub={<span className="text-[9px] text-slate-500">از {formatBytes(mem.swapTotal)}</span>} />
                <ProgressBar percent={mem.swapPercent || 0} colorClass="from-rose-500 to-rose-400" label={`${mem.swapPercent || 0}٪ سواپ`} />
              </>
            )}
          </div>
        </Card>

        {/* Network */}
        <Card title="ترافیک شبکه" icon={<Network className="h-4 w-4 text-blue-400" />}>
          {net ? (
            <div className="space-y-3">
              <Stat label="دریافتی (RX)" value={formatBytes(net.rxBytes)} color="text-blue-400" />
              <Stat label="ارسال (TX)" value={formatBytes(net.txBytes)} color="text-emerald-400" />
              <Stat label="مجموع ترافیک" value={formatBytes((net.rxBytes || 0) + (net.txBytes || 0))} color="text-slate-200" />
              <div className="border-t border-white/5 pt-2.5 grid grid-cols-2 gap-2">
                <div className="bg-black/15 rounded-lg p-2 text-center">
                  <div className="text-[9px] text-slate-500 mb-0.5">نرخ دریافت لحظه‌ای</div>
                  <div className="font-mono text-[11px] font-black text-blue-400">{net.rxPerSec ? formatBytes(net.rxPerSec) + "/s" : "—"}</div>
                </div>
                <div className="bg-black/15 rounded-lg p-2 text-center">
                  <div className="text-[9px] text-slate-500 mb-0.5">نرخ ارسال لحظه‌ای</div>
                  <div className="font-mono text-[11px] font-black text-emerald-400">{net.txPerSec ? formatBytes(net.txPerSec) + "/s" : "—"}</div>
                </div>
              </div>
              <div className="text-[9px] text-slate-500">خوانده‌شده از /proc/net/dev (جمع همه اینترفیس‌ها به‌جز loopback) از زمان راه‌اندازی سیستم.</div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-3">فقط در لینوکس در دسترس است.</div>
          )}
        </Card>

        {/* Disk space */}
        <Card title="حجم دیسک و فضای باقیمانده" icon={<HardDrive className="h-4 w-4 text-amber-400" />}>
          {disk ? (
            <div className="space-y-3">
              <Stat label="حجم کل دیسک" value={formatBytes(disk.totalBytes)} color="text-slate-200" />
              <Stat label="مصرف‌شده" value={formatBytes(disk.usedBytes)} color="text-amber-400" />
              <Stat label="فضای باقیمانده (آزاد)" value={formatBytes(disk.freeBytes)} color="text-emerald-400" />
              <ProgressBar
                percent={diskPct}
                colorClass={diskPct > 90 ? "from-red-500 to-red-400" : diskPct > 75 ? "from-amber-500 to-amber-400" : "from-emerald-500 to-emerald-400"}
                label={`${diskPct}٪ از دیسک پر شده`}
              />
              <div className="border-t border-white/5 pt-2.5 grid grid-cols-2 gap-2">
                <div className="bg-black/15 rounded-lg p-2">
                  <div className="text-[9px] text-slate-500 mb-0.5">حجم دیتابیس</div>
                  <div className="font-mono text-[11px] font-black text-cyan-400">{formatBytes(storage.databaseSizeBytes)}</div>
                </div>
                <div className="bg-black/15 rounded-lg p-2">
                  <div className="text-[9px] text-slate-500 mb-0.5">حجم فایل‌های آپلود</div>
                  <div className="font-mono text-[11px] font-black text-pink-400">{formatBytes(storage.uploadsSizeBytes)}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-3">در دسترس نیست.</div>
          )}
        </Card>

        {/* Inode */}
        <Card title="ایندود (inode)" icon={<HardDrive className="h-4 w-4 text-amber-400" />}>
          <div className="space-y-3">
            {inode ? (
              <>
                <Stat label="ایندود کل" value={toPersian(inode.total)} color="text-slate-200" />
                <Stat label="ایندود مصرفی" value={toPersian(inode.used)} color="text-amber-400" />
                <ProgressBar
                  percent={inode.total ? Math.round((inode.used / inode.total) * 100) : 0}
                  colorClass="from-amber-500 to-amber-400"
                  label={`${inode.total ? Math.round((inode.used / inode.total) * 100) : 0}٪ ایندود مصرفی`}
                />
              </>
            ) : (
              <div className="text-xs text-slate-500 py-3">در دسترس نیست.</div>
            )}
          </div>
        </Card>
      </div>

      <div className="p-4 rounded-2xl bg-black/20 border border-white/5 text-[10px] text-slate-500 leading-relaxed">
        <Activity className="inline h-3.5 w-3.5 ml-1 text-slate-400" />
        نکته: اپ داخل کانتینر داکر اجرا می‌شود؛ متریک‌های CPU/RAM/دیسک مربوط به کانتینر و سیستم فایل آن است. برای مشاهده وضعیت کل VPS، می‌توان حجم‌های /proc هاست را به صورت فقط‌خواندنی mount کرد یا از agent جداگانه استفاده نمود.
      </div>
    </div>
  );
}

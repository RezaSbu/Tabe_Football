import React from "react";
import { FileImage, Images, FileCheck2, Files, Boxes } from "lucide-react";
import { Card, Stat, ProgressBar, formatBytes, toPersian } from "./ui";

const categoryLabels: Record<string, string> = {
  news_image: "عکس خبر",
  team_logo: "لوگوی تیم",
  player_photo: "عکس بازیکن",
  ad_banner: "بنر تبلیغاتی",
  general: "عمومی",
  migrated: "مهاجرت‌شده",
  uncategorized: "بدون دسته‌بندی"
};

export default function MediaSection({ diag }: { diag: any }) {
  const m = diag?.media || {};
  const byCategory = m.byCategory || {};
  const byMime = m.byMime || {};
  const recent = m.recent || [];

  const maxCat = Math.max(1, ...Object.values(byCategory).map((v: any) => Number(v)));
  const mimeEntries = Object.entries(byMime);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="تصاویر آپلودشده" icon={<FileImage className="h-4 w-4 text-pink-400" />}>
          <div className="space-y-3">
            <Stat label="تعداد فایل‌های رسانه" value={toPersian(m.totalFiles || 0)} color="text-pink-400" />
            <Stat label="حجم کل فایل‌ها" value={formatBytes(m.totalSize)} color="text-cyan-400" />
            <Stat label="تصاویر گالری (images)" value={toPersian(m.galleryImages || 0)} color="text-violet-400" />
          </div>
        </Card>

        <Card title="تبدیل به WebP" icon={<FileCheck2 className="h-4 w-4 text-emerald-400" />}>
          <div className="space-y-3">
            <Stat label="تعداد WebP" value={toPersian(m.webpCount || 0)} color="text-emerald-400" />
            <Stat label="تعداد سایر فرمت‌ها" value={toPersian(m.otherCount || 0)} color="text-amber-400" />
            <Stat label="حجم WebP" value={formatBytes(m.webpBytes)} color="text-emerald-400" sub={<span className="text-[9px] text-slate-500">از {formatBytes(m.totalSize)}</span>} />
            <ProgressBar percent={m.webpPercent || 0} colorClass="from-emerald-500 to-emerald-400" label={`${m.webpPercent || 0}٪ تصاویر WebP`} />
          </div>
        </Card>

        <Card title="تفکیک فرمت" icon={<Boxes className="h-4 w-4 text-cyan-400" />}>
          {mimeEntries.length === 0 ? (
            <div className="text-xs text-slate-500 py-3">داده‌ای نیست.</div>
          ) : (
            <div className="space-y-2">
              {mimeEntries.map(([mime, v]: any) => (
                <div key={mime} className="flex items-center justify-between p-2 rounded-xl bg-black/20 text-[10px]">
                  <span className="font-mono text-slate-300 truncate" dir="ltr">{mime}</span>
                  <span className="font-bold text-slate-200">{toPersian(v.count)} <span className="text-slate-500 font-mono text-[9px]">({formatBytes(v.bytes)})</span></span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="تفکیک دسته‌بندی" icon={<Images className="h-4 w-4 text-amber-400" />}>
        {Object.keys(byCategory).length === 0 ? (
          <div className="text-xs text-slate-500 py-3">فایلی آپلود نشده است.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(byCategory).map(([cat, count]: any) => (
              <div key={cat} className="bg-black/15 p-3 rounded-xl border border-white/[0.02]">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-bold">{categoryLabels[cat] || cat}</span>
                  <span className="font-mono text-pink-400 font-black">{toPersian(count)}</span>
                </div>
                <div className="h-1.5 bg-slate-800/60 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-gradient-to-r from-pink-500 to-rose-400" style={{ width: `${(Number(count) / maxCat) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {recent.length > 0 && (
        <Card title="آخرین آپلودها" icon={<Files className="h-4 w-4 text-slate-400" />}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {recent.map((f: any) => (
              <div key={f.id} className="bg-black/15 rounded-xl border border-white/[0.02] overflow-hidden group">
                <div className="aspect-square bg-slate-800/40 flex items-center justify-center overflow-hidden">
                  <img src={f.imageUrl} alt={f.title} className="w-full h-full object-cover group-hover:scale-105 transition" loading="lazy" />
                </div>
                <div className="p-2 space-y-1">
                  <div className="text-[9px] text-slate-300 font-bold truncate">{f.title}</div>
                  <div className="text-[8px] text-slate-500 font-mono truncate" dir="ltr">{f.mimeType}</div>
                  <div className="text-[8px] text-slate-500 font-mono">{formatBytes(f.fileSize)}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

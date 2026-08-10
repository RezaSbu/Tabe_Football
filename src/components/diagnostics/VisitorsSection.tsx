import React from "react";
import { Users, Eye, TrendingUp, Repeat, FileText, Clock3, Bot } from "lucide-react";
import { Card, Stat, toPersian, formatDateTime } from "./ui";

const dayNames = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];

export default function VisitorsSection({ diag }: { diag: any }) {
  const v = diag?.visitors || {};

  const hourly = v.peakHours || [];
  const maxHour = Math.max(1, ...hourly.map((h: any) => h.count));
  const pages = (v.topPages || []).slice(0, 10);
  const maxPage = Math.max(1, ...pages.map((p: any) => p.count));
  const daily = v.daily || [];
  const maxDay = Math.max(1, ...daily.map((d: any) => d.count));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat label="بازدید امروز" value={toPersian(v.today || 0)} color="text-emerald-400" card />
        <Stat label="میانگین ۳۰ روز" value={toPersian(v.avgDaily || 0)} color="text-cyan-400" card />
        <Stat label="حداکثر روزانه" value={toPersian(v.maxDaily || 0)} color="text-violet-400" card />
        <Stat label="بازدیدکنندگان ۷ روز اخیر" value={toPersian(v.recent7d || 0)} color="text-amber-400" card />
        <Stat label="درصد بازگشتی (۷ روز)" value={`${v.returnRate7d || 0}٪`} color="text-pink-400" card />
      </div>

      <Card title="بازدید ۳۰ روز اخیر" icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}>
        {daily.length === 0 ? (
          <div className="text-[11px] text-slate-500 py-3">داده‌ای ثبت نشده است.</div>
        ) : (
          <div className="space-y-1.5">
            {daily.map((d: any) => (
              <div key={d.date} className="flex items-center gap-2 text-[10px]">
                <span className="w-12 text-slate-500 font-mono flex-shrink-0" dir="ltr">{d.date}</span>
                <div className="flex-1 h-2.5 bg-slate-800/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${d.count > (v.avgDaily || 0) * 1.3 ? "bg-gradient-to-r from-amber-500 to-orange-400" : "bg-gradient-to-r from-emerald-500 to-emerald-400"}`}
                    style={{ width: `${Math.max(2, (d.count / maxDay) * 100)}%` }}
                  />
                </div>
                <span className="w-10 text-slate-300 font-mono text-left">{toPersian(d.count)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="ساعت‌های اوج بازدید" icon={<Clock3 className="h-4 w-4 text-cyan-400" />}>
          {hourly.length === 0 ? (
            <div className="text-[11px] text-slate-500 py-3">داده‌ای ثبت نشده است.</div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1 text-[10px] text-slate-400 font-bold border-b border-white/5 pb-1.5">
                <span className="w-20">ساعت</span>
                <span className="flex-1" />
                <span className="w-14 text-center">تعداد</span>
              </div>
              {hourly.map((h: any) => (
                <div key={h.hour} className="flex items-center gap-2 text-[11px]">
                  <span className="w-20 font-mono font-bold text-slate-200" dir="ltr">{toPersian(h.hour)}:۰۰</span>
                  <div className="flex-1 h-2.5 bg-slate-800/60 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-400" style={{ width: `${Math.max(3, (h.count / maxHour) * 100)}%` }} />
                  </div>
                  <span className="w-14 text-center font-mono font-bold text-cyan-300">{toPersian(h.count)}</span>
                </div>
              ))}
              <div className="pt-1.5 text-[10px] text-slate-500">بازدیدهای ۷ روز اخیر به تفکیک ساعت (۰ تا ۲۳)</div>
            </div>
          )}
        </Card>

        <Card title="بازدیدها بر اساس روز هفته" icon={<Repeat className="h-4 w-4 text-violet-400" />}>
          {v.byWeekday ? (
            <div className="space-y-2">
              {v.byWeekday.map((w: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <span className="w-16 text-slate-300 font-bold">{dayNames[i]}</span>
                  <div className="flex-1 h-2 bg-slate-800/60 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400" style={{ width: `${Math.min(100, (w.count / (w.count || 1)) * (v.maxWeekday || 1) === 0 ? 0 : (w.count / v.maxWeekday) * 100)}%` }} />
                  </div>
                  <span className="w-8 text-slate-300 font-mono text-left">{toPersian(w.count)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-slate-500 py-3">داده‌ای ثبت نشده است.</div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="محبوب‌ترین صفحات (۳۰ روز)" icon={<FileText className="h-4 w-4 text-amber-400" />}>
          {pages.length === 0 ? (
            <div className="text-[11px] text-slate-500 py-3">داده‌ای ثبت نشده است.</div>
          ) : (
            <div className="space-y-2">
              {pages.map((p: any) => (
                <div key={p.path} className="flex items-center gap-2 text-[10px]">
                  <span className="flex-1 font-mono text-slate-300 truncate" dir="ltr">{p.path}</span>
                  <div className="w-20 h-1.5 bg-slate-800/60 rounded-full overflow-hidden flex-shrink-0">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-orange-400" style={{ width: `${Math.max(2, (p.count / maxPage) * 100)}%` }} />
                  </div>
                  <span className="w-8 text-slate-200 font-mono text-left">{toPersian(p.count)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="نمای کلی" icon={<Users className="h-4 w-4 text-pink-400" />}>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/15 rounded-xl p-3 space-y-1.5">
              <Eye className="h-4 w-4 text-pink-400" />
              <div className="text-[9px] text-slate-500">کل بازدیدهای ثبت‌شده</div>
              <div className="font-mono font-black text-lg text-pink-400">{toPersian(v.total || 0)}</div>
            </div>
            <div className="bg-black/15 rounded-xl p-3 space-y-1.5">
              <Bot className="h-4 w-4 text-slate-400" />
              <div className="text-[9px] text-slate-500">ردشده به‌عنوان بات</div>
              <div className="font-mono font-black text-lg text-slate-300">{toPersian(v.botsBlocked || 0)}</div>
            </div>
          </div>
          <div className="mt-3 p-3 rounded-xl bg-black/20 text-[10px] text-slate-500 leading-relaxed">
            کاربر برای شناسایی در مرورگر، یک شناسه یکتا ذخیره می‌شود و هر بازدید با آن شمارش می‌گردد؛ بازدیدهای تکراری هر صفحه در بازه ۳ ثانیه نادیده گرفته می‌شود.
          </div>
          {v.lastVisit && (
            <div className="mt-2 p-3 rounded-xl bg-black/20 text-[10px] text-slate-400">
              آخرین بازدید: <span className="font-mono">{formatDateTime(v.lastVisit)}</span>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

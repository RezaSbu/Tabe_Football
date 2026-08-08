import React from "react";
import { History, UserCog, Activity, ShieldAlert } from "lucide-react";
import { Card, Stat, toPersian, formatDateTime } from "./ui";

const actionLabels: Record<string, string> = {
  login: "ورود به حساب",
  failed_login: "ورود ناموفق",
  logout: "خروج",
  create: "ایجاد",
  update: "ویرایش",
  delete: "حذف",
  upload: "آپلود",
  backup: "پشتیبان‌گیری",
  vacuum: "بهینه‌سازی",
  unknown: "نامشخص"
};

const actionColors: Record<string, string> = {
  login: "bg-emerald-950/50 text-emerald-400 border-emerald-900/40",
  failed_login: "bg-red-950/50 text-red-400 border-red-900/40",
  logout: "bg-slate-800/50 text-slate-300 border-slate-700/40",
  create: "bg-cyan-950/50 text-cyan-400 border-cyan-900/40",
  update: "bg-violet-950/50 text-violet-400 border-violet-900/40",
  delete: "bg-red-950/50 text-red-400 border-red-900/40",
  upload: "bg-pink-950/50 text-pink-400 border-pink-900/40",
  backup: "bg-emerald-950/50 text-emerald-400 border-emerald-900/40",
  vacuum: "bg-amber-950/50 text-amber-400 border-amber-900/40"
};

function getAction(action: string) {
  const key = actionLabels[action] ? action : "unknown";
  return { label: actionLabels[key], color: actionColors[key] || actionColors.unknown };
}

export default function AuditSection({ diag }: { diag: any }) {
  const audit = diag?.audit || {};
  const byUser = Object.entries(audit.byUser || {});
  const byAction = Object.entries(audit.byAction || {});
  const recent = audit.recent || [];
  const authEvents = audit.authEvents || [];
  const failedIps = Object.entries(audit.failedIps || {});

  const maxUser = Math.max(1, ...byUser.map(([, v]: any) => v));
  const maxAction = Math.max(1, ...byAction.map(([, v]: any) => v));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="مجموع اقدامات ثبت‌شده" value={toPersian(audit.total || 0)} color="text-cyan-400" card />
        <Stat label="کاربران دارای فعالیت" value={toPersian(byUser.length || 0)} color="text-slate-200" card />
        <Stat label="رویدادهای ورود (سشن)" value={toPersian(audit.authEventCount || 0)} color="text-emerald-400" card />
        <Stat label="ورودهای ناموفق" value={toPersian(audit.failedCount || 0)} color={audit.failedCount > 0 ? "text-red-400" : "text-emerald-400"} card />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="فعالیت بر اساس ادمین" icon={<UserCog className="h-4 w-4 text-violet-400" />}>
          {byUser.length === 0 ? (
            <div className="text-[11px] text-slate-500 py-3">فعلی ثبت نشده است.</div>
          ) : (
            <div className="space-y-2.5">
              {byUser.map(([user, count]: any) => (
                <div key={user}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-300 font-bold">{user}</span>
                    <span className="font-mono text-violet-400">{toPersian(count)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800/60 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400" style={{ width: `${(count / maxUser) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="تفکیک نوع اقدام" icon={<Activity className="h-4 w-4 text-cyan-400" />}>
          {byAction.length === 0 ? (
            <div className="text-[11px] text-slate-500 py-3">فعلی ثبت نشده است.</div>
          ) : (
            <div className="space-y-2.5">
              {byAction.map(([action, count]: any) => (
                <div key={action}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-300 font-bold">{actionLabels[action] || action}</span>
                    <span className="font-mono text-cyan-400">{toPersian(count)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800/60 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-400" style={{ width: `${(count / maxAction) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="رویدادهای ورود به سیستم" icon={<History className="h-4 w-4 text-emerald-400" />}>
          {authEvents.length === 0 ? (
            <div className="text-[11px] text-slate-500 py-3">رویدادی ثبت نشده است.</div>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {authEvents.map((e: any, i: number) => (
                <div key={i} className="p-2.5 rounded-xl bg-black/15 border border-white/[0.02] text-[10px] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border whitespace-nowrap ${e.success ? "bg-emerald-950/50 text-emerald-400 border-emerald-900/40" : "bg-red-950/50 text-red-400 border-red-900/40"}`}>
                      {e.success ? "موفق" : "ناموفق"}
                    </span>
                    <span className="text-slate-200 font-bold truncate">{e.username}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 text-slate-500">
                    <span className="font-mono" dir="ltr">{e.ip}</span>
                    <span className="text-[9px]">{formatDateTime(e.time)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="ورودهای ناموفق بر اساس IP" icon={<ShieldAlert className="h-4 w-4 text-amber-400" />}>
          {failedIps.length === 0 ? (
            <div className="text-[11px] text-slate-500 py-3">ورود ناموفقی ثبت نشده است.</div>
          ) : (
            <div className="space-y-2">
              {failedIps.map(([ip, count]: any) => (
                <div key={ip} className="p-2.5 rounded-xl bg-black/15 border border-amber-950/30 text-[10px] flex items-center justify-between">
                  <span className="font-mono text-amber-400" dir="ltr">{ip}</span>
                  <span className="font-mono text-slate-300">{toPersian(count)} تلاش ناموفق</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="آخرین اقدامات ادمین‌ها" icon={<History className="h-4 w-4 text-slate-400" />}>
        {recent.length === 0 ? (
          <div className="text-[11px] text-slate-500 py-3">اقدامی ثبت نشده است.</div>
        ) : (
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {recent.map((a: any, i: number) => {
              const act = getAction(a.action);
              return (
                <div key={i} className="p-2.5 rounded-xl bg-black/15 border border-white/[0.02] text-[10px] flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border whitespace-nowrap ${act.color}`}>{act.label}</span>
                  <span className="text-slate-200 font-bold whitespace-nowrap">{a.username}</span>
                  <span className="text-slate-400 truncate font-mono" dir="ltr">{a.route}</span>
                  <span className="text-slate-500 flex-shrink-0 mr-auto">{formatDateTime(a.createdAt)}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

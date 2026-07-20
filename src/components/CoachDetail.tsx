import React, { useState } from "react";
import { ArrowLeft, Trophy, Award, Calendar, UserRound, TrendingUp, Target, BookOpen, BadgeCheck, Clock, Flag, Sparkles, Activity } from "lucide-react";
import { getSafeImageUrl, convertGregorianToShamsi, toPersianDigits, normalizePersianString } from "../utils";

interface CoachDetailProps {
  coach: any;
  allMatches?: any[];
  onBack: () => void;
  onSelectTeam?: (name: string) => void;
}

export default function CoachDetail({
  coach,
  allMatches = [],
  onBack,
  onSelectTeam
}: CoachDetailProps) {
  if (!coach) return null;

  const [activeTab, setActiveTab] = useState<"overview" | "matches" | "career">("overview");
  const [imageError, setImageError] = useState(false);
  const [lastCoachId, setLastCoachId] = useState(coach?.id);

  if (coach?.id !== lastCoachId) {
    setImageError(false);
    setLastCoachId(coach?.id);
  }

  const stats = coach.seasonStats || {};
  const matches = stats.matches || 0;
  const wins = stats.wins || 0;
  const draws = stats.draws || 0;
  const losses = stats.losses || 0;
  const winRate = stats.winRate || (matches > 0 ? parseFloat(((wins / matches) * 100).toFixed(1)) : 0);
  const goalsFor = stats.goalsFor || 0;
  const goalsAgainst = stats.goalsAgainst || 0;

  const titles = coach.titles || [];
  const recentForm = coach.recentForm || [];

  const formLabels: Record<string, { label: string; color: string }> = {
    W: { label: "پیروزی", color: "bg-emerald-500" },
    D: { label: "مساوی", color: "bg-amber-500" },
    L: { label: "شکست", color: "bg-red-500" }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between bg-[#131317]/80 backdrop-blur border border-white/5 p-3 rounded-2xl sticky top-2 z-40 select-none shadow-xl">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white bg-white/5 active:bg-white/10 px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>برگشت به خانه</span>
        </button>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-500 animate-pulse" />
          <span className="text-[10px] text-slate-450 font-black">پروفایل فنی مربی</span>
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black px-1.5 py-0.5 rounded font-mono">
            ID: {coach.id || "Unresolved"}
          </span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-b from-[#131317] to-slate-950 shadow-2xl p-4 sm:p-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-4 flex flex-col items-center text-center space-y-4">
            <div className="relative group select-none">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full blur opacity-15" />
              <div className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-full overflow-hidden border-2 border-white/10 bg-slate-900 flex items-center justify-center">
                {!imageError && coach.image ? (
                  <img
                    src={getSafeImageUrl(coach.image)}
                    alt={coach.name}
                    className="h-full w-full object-cover"
                    onError={() => setImageError(true)}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <UserRound className="h-14 w-14 text-slate-600" />
                )}
              </div>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                {coach.teamName ? (
                  <button onClick={() => onSelectTeam && onSelectTeam(coach.teamName)} className="hover:text-emerald-400 transition cursor-pointer">
                    {coach.name}
                  </button>
                ) : coach.name}
              </h2>
              <div className="flex items-center gap-2 justify-center mt-1.5 text-[10px] flex-wrap">
                <span className="bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg text-slate-300 font-bold">
                  {coach.coachingStyle || "مربی"}
                </span>
                <span className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg text-amber-400 font-bold">
                  <Flag className="h-3 w-3" />
                  {coach.nationality || "نامشخص"}
                </span>
                {coach.teamName && (
                  <button
                    onClick={() => onSelectTeam && onSelectTeam(coach.teamName)}
                    className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-emerald-400 font-bold hover:bg-emerald-500/20 transition cursor-pointer"
                  >
                    <span>{coach.teamName}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-black/35 border border-white/5 text-center">
              <span className="block text-[9px] text-[#808092] font-black mb-1">سن</span>
              <span className="text-sm font-black text-slate-100 font-mono">{toPersianDigits(coach.age || "—")} سال</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-black/35 border border-white/5 text-center">
              <span className="block text-[9px] text-[#808092] font-black mb-1">مدرک مربیگری</span>
              <span className="text-sm font-black text-emerald-400">{coach.licenseLevel || "—"}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-black/35 border border-white/5 text-center">
              <span className="block text-[9px] text-[#808092] font-black mb-1">سابقه مربیگری</span>
              <span className="text-sm font-black text-slate-100 font-mono">{toPersianDigits(coach.experienceYears || "۰")} سال</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-black/35 border border-white/5 text-center">
              <span className="block text-[9px] text-[#808092] font-black mb-1">درصد برد</span>
              <span className="text-sm font-black text-emerald-400 font-mono">{toPersianDigits(winRate)}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-[#131317] border border-white/5 rounded-2xl text-xs select-none shadow-lg">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex-1 py-3 rounded-xl font-black text-center transition cursor-pointer ${activeTab === "overview" ? "bg-emerald-500 text-black shadow font-black" : "text-slate-400 hover:text-white"}`}
        >
          خلاصه عملکرد
        </button>
        <button
          onClick={() => setActiveTab("matches")}
          className={`flex-1 py-3 rounded-xl font-black text-center transition cursor-pointer ${activeTab === "matches" ? "bg-emerald-500 text-black shadow font-black" : "text-slate-400 hover:text-white"}`}
        >
          کارنامه مسابقات ({toPersianDigits(matches)})
        </button>
        <button
          onClick={() => setActiveTab("career")}
          className={`flex-1 py-3 rounded-xl font-black text-center transition cursor-pointer ${activeTab === "career" ? "bg-emerald-500 text-black shadow font-black" : "text-slate-400 hover:text-white"}`}
        >
          افتخارات و سوابق
        </button>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-4">
          {coach.biography && (
            <div className="p-4 rounded-2xl bg-[#131317] border border-white/5">
              <h3 className="text-xs font-black text-slate-400 mb-3 flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-emerald-500" />
                <span>بیوگرافی و معرفی</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">{coach.biography}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#131317] border border-white/5">
              <h3 className="text-xs font-black text-slate-400 mb-3 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span>آمار کلی فصل</span>
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">بازی‌ها</span>
                  <span className="font-bold text-white font-mono">{toPersianDigits(matches)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">برد</span>
                  <span className="font-bold text-emerald-400 font-mono">{toPersianDigits(wins)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">مساوی</span>
                  <span className="font-bold text-amber-400 font-mono">{toPersianDigits(draws)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">باخت</span>
                  <span className="font-bold text-red-400 font-mono">{toPersianDigits(losses)}</span>
                </div>
                <div className="pt-2 border-t border-white/5 flex justify-between items-center text-xs">
                  <span className="text-slate-500">درصد برد</span>
                  <span className="font-bold text-emerald-400 font-mono">{toPersianDigits(winRate)}%</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#131317] border border-white/5">
              <h3 className="text-xs font-black text-slate-400 mb-3 flex items-center gap-1.5">
                <Target className="h-4 w-4 text-emerald-500" />
                <span>آمار گل و امتیاز</span>
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">گل زده</span>
                  <span className="font-bold text-emerald-400 font-mono">{toPersianDigits(goalsFor)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">گل خورده</span>
                  <span className="font-bold text-red-400 font-mono">{toPersianDigits(goalsAgainst)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">تفاضل گل</span>
                  <span className={`font-bold font-mono ${goalsFor - goalsAgainst >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {toPersianDigits(goalsFor - goalsAgainst)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">میانگین گل زده هر بازی</span>
                  <span className="font-bold text-slate-100 font-mono">
                    {toPersianDigits(matches > 0 ? (goalsFor / matches).toFixed(1) : "۰")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {recentForm.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#131317] border border-white/5">
              <h3 className="text-xs font-black text-slate-400 mb-3 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-emerald-500" />
                <span>فرم اخیر</span>
              </h3>
              <div className="flex gap-2">
                {recentForm.map((f: string, i: number) => {
                  const formInfo = formLabels[f] || { label: f, color: "bg-slate-500" };
                  return (
                    <div
                      key={i}
                      className={`w-10 h-10 rounded-xl ${formInfo.color} flex items-center justify-center text-xs font-black text-white shadow-lg`}
                      title={formInfo.label}
                    >
                      {f === "W" ? "ب" : f === "D" ? "م" : f === "L" ? "ش" : f}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "matches" && (
        <div className="p-4 rounded-2xl bg-[#131317] border border-white/5">
          <h3 className="text-xs font-black text-slate-400 mb-3 flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-emerald-500" />
            <span>کارنامه مسابقات فصل جاری</span>
          </h3>
          <div className="text-center py-10 text-slate-500 text-xs">
            <Award className="h-10 w-10 mx-auto mb-3 text-slate-600" />
            <p>جزئیات عملکرد مسابقات مربی پس از پایان هر بازی به صورت خودکار محاسبه و نمایش داده می‌شود.</p>
            <p className="mt-1 text-slate-600">تعداد کل مسابقات: {toPersianDigits(matches)}</p>
          </div>
        </div>
      )}

      {activeTab === "career" && (
        <div className="space-y-4">
          {titles.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#131317] border border-white/5">
              <h3 className="text-xs font-black text-slate-400 mb-3 flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-emerald-500" />
                <span>افتخارات و عناوین</span>
              </h3>
              <div className="space-y-2">
                {titles.map((title: string, i: number) => (
                  <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5">
                    <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="text-xs text-slate-300">{title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {coach.teamHistory && coach.teamHistory.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#131317] border border-white/5">
              <h3 className="text-xs font-black text-slate-400 mb-4 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-emerald-500" />
                <span>سوابق و تاریخچه مربیگری</span>
              </h3>
              <div className="relative border-r border-white/10 pr-4 mr-2 space-y-4">
                {coach.teamHistory.map((history: any, idx: number) => (
                  <div key={idx} className="relative">
                    <div className="absolute right-[-21px] top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-slate-950" />
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-black text-white">
                          {history.teamName}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{history.role || "سرمربی"}</p>
                      </div>
                      <span className="text-[10px] bg-white/5 text-slate-300 font-bold px-2 py-0.5 rounded font-mono">
                        {toPersianDigits(history.startYear || "—")} - {toPersianDigits(history.endYear || "—")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {coach.careerHistory && coach.careerHistory.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#131317] border border-white/5 space-y-3">
              <h3 className="text-xs font-black text-slate-400 flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-emerald-500" />
                <span>آمار و عملکرد تفصیلی در فصل‌های آرشیو شده</span>
              </h3>
              <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/15 p-2">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="text-slate-500 text-[10px] border-b border-white/[0.04]">
                      <th className="py-3 px-2 font-bold">فصل کاری</th>
                      <th className="py-3 px-2 font-bold">باشگاه</th>
                      <th className="py-3 px-2 text-center font-bold">بازی‌ها</th>
                      <th className="py-3 px-2 text-center font-bold">برد / مساوی / باخت</th>
                      <th className="py-3 px-2 text-center font-bold">گل‌زده / گل‌خورده</th>
                      <th className="py-3 px-2 text-center font-bold">درصد برد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coach.careerHistory.map((history: any, idx: number) => (
                      <tr key={idx} className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01]">
                        <td className="py-3 px-2 font-mono font-bold text-slate-300">{toPersianDigits(history.season)}</td>
                        <td className="py-3 px-2 font-semibold text-white">{history.club}</td>
                        <td className="py-3 px-2 text-center font-mono text-slate-400">{toPersianDigits(history.apps || 0)} بازی</td>
                        <td className="py-3 px-2 text-center font-mono text-slate-400 font-bold">
                          <span className="text-emerald-400">{toPersianDigits(history.wins || 0)}</span>
                          <span className="text-slate-600 px-1">/</span>
                          <span className="text-amber-400">{toPersianDigits(history.draws || 0)}</span>
                          <span className="text-slate-600 px-1">/</span>
                          <span className="text-red-400">{toPersianDigits(history.losses || 0)}</span>
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-slate-400 font-bold">
                          <span className="text-emerald-400">{toPersianDigits(history.goalsFor || 0)}</span>
                          <span className="text-slate-600 px-1">:</span>
                          <span className="text-red-400">{toPersianDigits(history.goalsAgainst || 0)}</span>
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-emerald-400 font-bold">
                          {toPersianDigits(history.winRate || 0)}٪
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-[#131317] border border-white/5">
            <h3 className="text-xs font-black text-slate-400 mb-3 flex items-center gap-1.5">
              <BadgeCheck className="h-4 w-4 text-emerald-500" />
              <span>اطلاعات حرفه‌ای</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-[10px] text-slate-500 mb-1">سبک مربیگری</span>
                <span className="text-xs font-bold text-white">{coach.coachingStyle || "—"}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 mb-1">مدرک مربیگری</span>
                <span className="text-xs font-bold text-white">{coach.licenseLevel || "—"}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 mb-1">سال‌های تجربه</span>
                <span className="text-xs font-bold text-white font-mono">{toPersianDigits(coach.experienceYears || "۰")} سال</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 mb-1">ملیت</span>
                <span className="text-xs font-bold text-white">{coach.nationality || "—"}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React from "react";
import { Sparkles, Trophy, ShieldCheck, Mail, Phone, MapPin } from "lucide-react";

interface FooterProps {
  setActiveTab: (tab: string) => void;
}

export default function Footer({ setActiveTab }: FooterProps) {
  return (
    <footer className="w-full bg-[#0a0a0c] text-slate-300 border-t border-white/5 py-10" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4 border-b border-white/5 pb-8">
          
          {/* Section 1: Brand & Bio */}
          <div className="md:col-span-1.5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center">
                <img loading="lazy" decoding="async" 
                  src="https://mfkpmjknckfrdwvmmizs.supabase.co/storage/v1/object/public/media_assets/general/1782058553909_sports360-photo-gallery-1782053249175.jpg" 
                  alt="تب فوتبال" 
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                تب فوتبال ایران
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs">
              پورتال مستقل و مرجع خبری، نتایج زنده، وضعیت نقل و انتقالات و آمارهای پیشرفته فوتبال ایران و لژیونرها. تمام حقوق این سامانه برای کادر تخصصی محفوظ است.
            </p>
          </div>

          {/* Section 2: Quick Links */}
          <div>
            <h4 className="text-xs font-bold text-white mb-3.5 flex items-center gap-1.5 border-r-2 border-emerald-500 pr-2">
              دسترسی سریع
            </h4>
            <ul className="space-y-2 text-[11px]">
              <li>
                <button onClick={() => setActiveTab("home")} className="hover:text-emerald-400 transition">
                  صفحه اصلی (پورتال خبری)
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab("live-scores")} className="hover:text-emerald-400 transition">
                  مرکز نتایج زنده مسابقات
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab("transfers")} className="hover:text-emerald-400 transition">
                  جدول رسمی نقل و انتقالات
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab("images")} className="hover:text-emerald-400 transition">
                  گالری تصاویر عکاسان ملی
                </button>
              </li>
            </ul>
          </div>

          {/* Section 3: League Standings Quick Entry */}
          <div>
            <h4 className="text-xs font-bold text-white mb-3.5 flex items-center gap-1.5 border-r-2 border-emerald-500 pr-2">
              رقابت‌های باشگاهی
            </h4>
            <ul className="space-y-2 text-[11px]">
              <li>
                <button onClick={() => setActiveTab("pro-league")} className="hover:text-emerald-400 transition flex items-center gap-1">
                  <Trophy className="h-3 w-3 text-emerald-500" />
                  <span>لیگ برتر خلیج فارس</span>
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab("hazfi-cup")} className="hover:text-emerald-400 transition flex items-center gap-1">
                  <Trophy className="h-3 w-3 text-cyan-400" />
                  <span>رقابت‌های جام حذفی</span>
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab("league-1")} className="hover:text-slate-200 transition">
                  لیگ دسته اول آزادگان
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab("league-2")} className="hover:text-slate-200 transition">
                  لیگ دسته دوم کشوری
                </button>
              </li>
            </ul>
          </div>

          {/* Section 4: Contact & Support */}
          <div>
            <h4 className="text-xs font-bold text-white mb-3.5 flex items-center gap-1.5 border-r-2 border-emerald-500 pr-2">
              ارتباط با ما
            </h4>
            <ul className="space-y-2.5 text-[11px] text-slate-400">
              <li className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-slate-500" />
                <span>تهران، مجتمع رسانه‌ای ورزشی آزادی، طبقه چهارم</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-slate-500 pr-0.5" />
                <span>info@tabfootball.ir</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>بررسی امنیتی و لایسنس تایید شده</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Footer Sub-bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-6 text-[10px] text-slate-500">
          <p>© {new Date().getFullYear()} پورتال تب فوتبال ایران. تمامی حقوق مادی و معنوی محفوظ است.</p>
          <div className="flex items-center gap-3 mt-3 sm:mt-0">
            <span className="hover:text-slate-400 cursor-pointer">سند قوانین و مقررات</span>
            <span className="text-slate-700">|</span>
            <span className="hover:text-slate-400 cursor-pointer">حفظ حریم خصوصی</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

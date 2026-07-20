import React from "react";
import { Sparkles, ArrowLeft, Megaphone, HelpCircle } from "lucide-react";

interface AdBannerWidgetProps {
  adConfig: {
    adTitle: string;
    adPromo: string;
    adDesc: string;
    adLink: string;
    adBtnText: string;
    customBannerUrl?: string;
  };
}

export default function AdBannerWidget({ adConfig }: AdBannerWidgetProps) {
  if (!adConfig) return null;

  return (
    <div className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-cyan-950 to-[#121215] border border-white/5 p-4 sm:p-6 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4" dir="rtl">
      
      {/* Visual neon light spots */}
      <div className="absolute -top-12 -left-12 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
      <div className="absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-cyan-500/10 blur-2xl" />

      {/* Main pitch copy */}
      <div className="z-10 flex items-start gap-4 flex-col sm:flex-row text-center sm:text-right">
        <div className="mx-auto sm:mx-0 h-11 w-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
          <Megaphone className="h-5.5 w-5.5 text-emerald-400 rotate-12" />
        </div>
        <div>
          <span className="text-[10px] bg-emerald-500 text-black px-2 py-0.5 rounded font-black tracking-tight shadow">
            پیشنهاد ویژه حامی مالی تب فوتبال
          </span>
          <h3 className="font-extrabold text-sm sm:text-base text-white mt-1.5 leading-snug">
            {adConfig.adTitle}
          </h3>
          <p className="text-[11px] text-slate-350 mt-1 max-w-xl">
            {adConfig.adDesc}
          </p>
        </div>
      </div>

      {/* Code and Action buttons */}
      <div className="z-10 flex flex-col sm:flex-row items-center gap-3 shrink-0">
        {adConfig.adPromo && (
          <div className="bg-black/35 rounded-xl border border-white/10 overflow-hidden flex font-mono" dir="ltr">
            <span className="px-3.5 py-1.5 text-xs text-slate-300 font-bold uppercase select-all tracking-wider text-center">
              {adConfig.adPromo}
            </span>
            <span className="bg-emerald-500 text-black px-2.5 py-1.5 text-[10px] font-black uppercase text-center flex items-center select-none">
              کد هدیه
            </span>
          </div>
        )}

        <a
          href={adConfig.adLink || "https://snapp.ir"}
          target="_blank"
          referrerPolicy="no-referrer"
          rel="noopener noreferrer"
          className="bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-emerald-500/15"
        >
          <span>{adConfig.adBtnText}</span>
          <ArrowLeft className="h-3.5 w-3.5" />
        </a>
      </div>

    </div>
  );
}

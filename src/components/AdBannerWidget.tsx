import React from "react";
import { ArrowLeft, Megaphone } from "lucide-react";
import { AdItem } from "../types";
import { trackAdClick } from "./AdSlot";

interface AdBannerWidgetProps {
  ad: AdItem;
}

export default function AdBannerWidget({ ad }: AdBannerWidgetProps) {
  if (!ad) return null;

  const promo = ad.promo || ad.settings?.promoCode || "";

  return (
    <div className="ad-banner-card w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-cyan-950 to-[#121215] border border-white/5 p-4 sm:p-6 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4" dir="rtl">

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
            {ad.title}
          </h3>
          <p className="text-[11px] text-slate-350 mt-1 max-w-xl">
            {ad.description}
          </p>
        </div>
      </div>

      {/* Code and Action buttons */}
      <div className="z-10 flex flex-col sm:flex-row items-center gap-3 shrink-0">
        {promo && (
          <div className="bg-black/35 rounded-xl border border-white/10 overflow-hidden flex font-mono" dir="ltr">
            <span className="px-3.5 py-1.5 text-xs text-slate-300 font-bold uppercase select-all tracking-wider text-center">
              {promo}
            </span>
            <span className="bg-emerald-500 text-black px-2.5 py-1.5 text-[10px] font-black uppercase text-center flex items-center select-none">
              کد هدیه
            </span>
          </div>
        )}

        <a
          href={ad.linkUrl || "#"}
          target="_blank"
          referrerPolicy="no-referrer"
          rel="noopener noreferrer"
          onClick={() => trackAdClick(ad.id)}
          className="bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-emerald-500/15"
        >
          <span>{ad.btnText}</span>
          <ArrowLeft className="h-3.5 w-3.5" />
        </a>
      </div>

    </div>
  );
}

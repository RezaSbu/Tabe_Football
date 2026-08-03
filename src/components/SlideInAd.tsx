import React, { useEffect, useState } from "react";
import { X, ExternalLink } from "lucide-react";
import { AdItem } from "../types";
import { isAdActive, trackAdView, trackAdClick } from "./AdSlot";

interface SlideInAdProps {
  ad: AdItem;
}

const STORAGE_KEY = "slidein_ad_dismissed";

export default function SlideInAd({ ad }: SlideInAdProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!ad || !isAdActive(ad) || dismissed) return;
    if (sessionStorage.getItem(STORAGE_KEY) === "true") return;

    const showScrollDelay = Number(ad.settings?.showAfterScroll) || 400;
    const handleScroll = () => {
      if (window.scrollY > showScrollDelay) {
        trackAdView(ad.id);
        window.removeEventListener("scroll", handleScroll);
      }
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [ad, dismissed]);

  if (!ad || !isAdActive(ad) || dismissed) return null;

  const side = ad.settings?.side === "right" ? "right-4" : "left-4";

  return (
    <div className={`fixed top-24 z-[90] ${side} animate-in slide-in-from-right-8 fade-in duration-500`} dir="rtl">
      <div className="w-64 rounded-2xl border border-white/10 bg-gray-950/95 backdrop-blur-md p-4 shadow-2xl">
        <button
          onClick={() => {
            sessionStorage.setItem(STORAGE_KEY, "true");
            setDismissed(true);
          }}
          className="absolute -top-2 -left-2 h-6 w-6 flex items-center justify-center rounded-full bg-gray-800 border border-white/10 text-gray-400 hover:text-white transition"
        >
          <X className="h-3 w-3" />
        </button>
        {ad.imageUrl && (
          <div className="mb-3 overflow-hidden rounded-xl">
            <img src={ad.imageUrl} alt={ad.title} referrerPolicy="no-referrer" className="h-24 w-full object-cover" />
          </div>
        )}
        <p className="text-sm font-bold text-white">{ad.title}</p>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{ad.description}</p>
        <a
          href={ad.linkUrl || "#"}
          target="_blank"
          referrerPolicy="no-referrer"
          rel="noopener noreferrer"
          onClick={() => trackAdClick(ad.id)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold px-3.5 py-1.5 transition active:scale-95"
        >
          {ad.btnText || "مشاهده"}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

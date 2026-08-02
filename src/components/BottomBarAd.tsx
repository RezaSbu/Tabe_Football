import React, { useEffect, useState } from "react";
import { X, ExternalLink } from "lucide-react";
import { AdItem } from "../types";
import { isAdActive, trackAdView, trackAdClick } from "./AdSlot";

interface BottomBarAdProps {
  ad: AdItem;
}

const STORAGE_KEY = "bottombar_ad_dismissed";

export default function BottomBarAd({ ad }: BottomBarAdProps) {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 1000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!ad || !isAdActive(ad) || !mounted || dismissed) return;
    if (sessionStorage.getItem(STORAGE_KEY) === "true") return;
    trackAdView(ad.id);
  }, [ad, mounted, dismissed]);

  if (!ad || !isAdActive(ad) || !mounted || dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-[85]" dir="rtl">
      <div className="mx-auto flex max-w-4xl items-center gap-4 border-t border-x border-white/10 bg-gray-950/95 backdrop-blur-md px-5 py-3 shadow-2xl animate-in slide-in-from-bottom-16 duration-500 rounded-t-2xl">
        {ad.imageUrl && (
          <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg">
            <img src={ad.imageUrl} alt={ad.title} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white truncate">{ad.title}</p>
          <p className="text-xs text-gray-400 truncate">{ad.description}</p>
        </div>
        <a
          href={ad.linkUrl || "#"}
          target="_blank"
          referrerPolicy="no-referrer"
          rel="noopener noreferrer"
          onClick={() => trackAdClick(ad.id)}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold px-4 py-2 transition active:scale-95"
        >
          {ad.btnText || "مشاهده"}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <button onClick={handleDismiss} className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

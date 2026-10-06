import React, { useEffect, useState } from "react";
import { X, ExternalLink } from "lucide-react";
import { AdItem } from "../types";
import { isAdActive, trackAdView, trackAdClick } from "./AdSlot";

interface FloatingAdProps {
  ad: AdItem;
}

export default function FloatingAd({ ad }: FloatingAdProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!ad || !isAdActive(ad)) return;
    const timer = setTimeout(() => {
      trackAdView(ad.id);
    }, 2000);
    return () => clearTimeout(timer);
  }, [ad]);

  if (!ad || !isAdActive(ad) || dismissed) return null;

  const corner = ad.settings?.corner || "bottom-left";
  const positionClass =
    corner === "top-right" ? "top-6 right-6"
    : corner === "top-left" ? "top-6 left-6"
    : corner === "bottom-right" ? "bottom-6 right-6"
    : "bottom-6 left-6";

  return (
    <div className={`fixed z-[90] ${positionClass} animate-in slide-in-from-bottom-8 fade-in duration-500`} dir="rtl">
      <div className="flex w-72 items-start gap-3 rounded-2xl border border-white/10 bg-gray-950/95 backdrop-blur-md p-3 shadow-2xl">
        <button
          onClick={() => setDismissed(true)}
          className="absolute -top-2 -left-2 h-6 w-6 flex items-center justify-center rounded-full bg-gray-800 border border-white/10 text-gray-400 hover:text-white transition"
        >
          <X className="h-3 w-3" />
        </button>
        {ad.imageUrl && (
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
            <img src={ad.imageUrl} alt={ad.title} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white truncate">{ad.title}</p>
          <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{ad.description}</p>
          <a
            href={ad.linkUrl || "#"}
            target="_blank"
            referrerPolicy="no-referrer"
            rel="noopener noreferrer"
            onClick={() => trackAdClick(ad.id)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition"
          >
            {ad.btnText || "مشاهده"}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

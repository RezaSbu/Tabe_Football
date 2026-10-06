import React, { useState, useEffect } from "react";
import { X, ExternalLink } from "lucide-react";
import { AdItem } from "../types";
import { isAdActive, trackAdView, trackAdClick } from "./AdSlot";

interface PopupAdProps {
  ad: AdItem;
}

const STORAGE_KEY = "popup_ad_closed";

export default function PopupAd({ ad }: PopupAdProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ad || !isAdActive(ad)) return;
    if (sessionStorage.getItem(STORAGE_KEY) === "true") return;
    trackAdView(ad.id);
    const delay = Number(ad.settings?.delay) || 3;
    const timer = setTimeout(() => setVisible(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [ad]);

  const handleClose = () => {
    sessionStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  if (!ad || !isAdActive(ad) || !visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-lg bg-gray-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <button
          onClick={handleClose}
          className="absolute top-3 left-3 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-black/50 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition"
        >
          <X className="h-4 w-4" />
        </button>
        {ad.imageUrl && (
          <div className="w-full h-52 overflow-hidden">
            <img src={ad.imageUrl} alt={ad.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-6 text-white">
          <h3 className="text-lg font-bold text-white mb-2">{ad.title}</h3>
          <p className="text-sm text-gray-400 mb-5 leading-relaxed">{ad.description}</p>
          <a
            href={ad.linkUrl || "#"}
            target="_blank"
            referrerPolicy="no-referrer"
            rel="noopener noreferrer"
            onClick={() => trackAdClick(ad.id)}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold px-5 py-2.5 rounded-xl transition active:scale-95"
          >
            {ad.btnText || "بیشتر بخوانید"}
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

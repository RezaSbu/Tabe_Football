import React, { useState, useEffect } from "react";
import { X, ExternalLink } from "lucide-react";

interface FloatingAdProps {
  ad?: {
    enabled: boolean;
    title: string;
    description: string;
    link: string;
    btnText: string;
    imageUrl?: string;
    position?: string;
    delay?: number;
    showAfterScroll?: boolean;
  };
}

const STORAGE_KEY = "floating_ad_closed";

const positionClasses: Record<string, string> = {
  "top-left": "top-4 left-4",
  "top-right": "top-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "bottom-right": "bottom-4 right-4",
};

export default function FloatingAd({ ad }: FloatingAdProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ad || !ad.enabled) return;
    if (localStorage.getItem(STORAGE_KEY) === "true") return;
    const timer = setTimeout(() => setVisible(true), (ad.delay || 3) * 1000);
    return () => clearTimeout(timer);
  }, [ad]);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  if (!ad || !ad.enabled || !visible) return null;

  const pos = positionClasses[ad.position || "bottom-left"] || positionClasses["bottom-left"];

  return (
    <div
      dir="rtl"
      className={`fixed z-50 w-72 bg-gray-950 border border-white/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 ${pos}`}
    >
      <button
        onClick={handleClose}
        className="absolute top-2 left-2 z-10 h-7 w-7 flex items-center justify-center rounded-full bg-black/50 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      {ad.imageUrl && (
        <div className="w-full h-28 overflow-hidden">
          <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-3 text-white">
        <h4 className="text-sm font-bold text-white mb-1 truncate">{ad.title}</h4>
        <p className="text-[11px] text-gray-400 mb-3 line-clamp-2">{ad.description}</p>
        <a
          href={ad.link || "#"}
          target="_blank"
          referrerPolicy="no-referrer"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-bold px-3 py-1.5 rounded-lg transition active:scale-95"
        >
          {ad.btnText || "بیشتر بخوانید"}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

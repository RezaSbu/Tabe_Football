import React, { useState, useEffect } from "react";
import { X, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

interface BottomBarAdProps {
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

const STORAGE_KEY = "bottombar_ad_closed";

export default function BottomBarAd({ ad }: BottomBarAdProps) {
  const [visible, setVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!ad || !ad.enabled) return;
    if (localStorage.getItem(STORAGE_KEY) === "true") return;
    const timer = setTimeout(() => setVisible(true), (ad.delay || 2) * 1000);
    return () => clearTimeout(timer);
  }, [ad]);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  if (!ad || !ad.enabled || !visible) return null;

  return (
    <div
      dir="rtl"
      className="fixed bottom-0 left-0 right-0 z-40 bg-gray-950/95 backdrop-blur-md border-t border-white/5 animate-in slide-in-from-bottom duration-500"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          {ad.imageUrl && !collapsed && (
            <img src={ad.imageUrl} alt={ad.title} className="h-10 w-10 rounded-lg object-cover shrink-0 border border-white/10" />
          )}
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{ad.title}</p>
              <p className="text-[10px] text-gray-400 truncate">{ad.description}</p>
            </div>
          )}
          {collapsed && (
            <p className="text-xs font-bold text-white">{ad.title}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!collapsed && (
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
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="h-7 w-7 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={handleClose}
            className="h-7 w-7 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

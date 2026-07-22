import React, { useState, useEffect } from "react";
import { X, ExternalLink } from "lucide-react";

interface SlideInAdProps {
  ad?: {
    enabled: boolean;
    title: string;
    description: string;
    link: string;
    btnText: string;
    imageUrl?: string;
    position?: "left" | "right";
    delay?: number;
    showAfterScroll?: boolean;
  };
}

const STORAGE_KEY = "slidein_ad_closed";

export default function SlideInAd({ ad }: SlideInAdProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ad || !ad.enabled) return;
    if (localStorage.getItem(STORAGE_KEY) === "true") return;

    const checkScroll = () => {
      const scrolled = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      if (scrolled >= 0.3) setVisible(true);
    };

    if (ad.showAfterScroll) {
      window.addEventListener("scroll", checkScroll, { passive: true });
      return () => window.removeEventListener("scroll", checkScroll);
    }

    const timer = setTimeout(() => setVisible(true), (ad.delay || 3) * 1000);
    return () => clearTimeout(timer);
  }, [ad]);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  if (!ad || !ad.enabled || !visible) return null;

  const isRight = (ad.position || "right") === "right";

  return (
    <div
      dir="rtl"
      className={`fixed z-50 top-1/2 -translate-y-1/2 w-64 bg-gray-950 border border-white/10 rounded-xl shadow-xl overflow-hidden transition-transform duration-500 ease-out ${
        isRight ? "right-0 translate-x-0 animate-in slide-in-from-right" : "left-0 translate-x-0 animate-in slide-in-from-left"
      }`}
      style={visible ? undefined : isRight ? { transform: "translateX(100%)" } : { transform: "translateX(-100%)" }}
    >
      <button
        onClick={handleClose}
        className="absolute top-2 left-2 z-10 h-7 w-7 flex items-center justify-center rounded-full bg-black/50 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      {ad.imageUrl && (
        <div className="w-full h-24 overflow-hidden">
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

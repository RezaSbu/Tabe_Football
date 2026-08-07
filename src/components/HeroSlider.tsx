import React, { useState, useEffect } from "react";
import { NewsItem } from "../types";
import { getSafeImageUrl } from "../utils";
import { Calendar, Eye, ChevronRight, ChevronLeft, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface HeroSliderProps {
  news: NewsItem[];
  onSelectArticle: (art: NewsItem) => void;
}

export default function HeroSlider({ news = [], onSelectArticle }: HeroSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Filter top featured news articles
  const featuredNews = news.slice(0, 4);

  useEffect(() => {
    if (featuredNews.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % featuredNews.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [featuredNews]);

  if (featuredNews.length === 0) {
    return (
      <div className="w-full h-80 rounded-3xl bg-[#18181c] flex items-center justify-center border border-white/5 text-slate-500 text-xs">
        درحال بارگذاری اخبار داغ و رویدادها...
      </div>
    );
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev + 1) % featuredNews.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev - 1 + featuredNews.length) % featuredNews.length);
  };

  const activeArticle = featuredNews[activeIndex];

  const getPersianCategory = (cat: string) => {
    switch (cat) {
      case "pro-league": return "لیگ برتر";
      case "league-1": return "لیگ دسته یک";
      case "league-2": return "لیگ دسته دو";
      case "hazfi-cup": return "جام حذفی";
      case "legionnaires": return "لژیونرها";
      case "transfers": return "نقل و انتقالات";
      default: return "اخبار فوتبال";
    }
  };

  return (
    <div 
      className="hero-slider relative w-full h-[320px] sm:h-[420px] rounded-2xl overflow-hidden border border-white/5 bg-[#0a0a0c] group cursor-pointer shadow-xl select-none" 
      onClick={() => onSelectArticle(activeArticle)}
      dir="rtl"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeArticle.id}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 w-full h-full"
        >
          {/* Overlay gradient shroud for crisp text contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
          <img loading="lazy" decoding="async"             src={getSafeImageUrl(activeArticle.image)}
            alt={activeArticle.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            referrerPolicy="no-referrer"
          />
        </motion.div>
      </AnimatePresence>

      {/* Slide Navigation Triggers */}
      <div className="absolute top-1/2 -translate-y-1/2 left-4 z-20 opacity-0 group-hover:opacity-100 transition duration-300">
        <button 
          onClick={handlePrev}
          className="h-10 w-10 flex items-center justify-center rounded-full bg-black/45 border border-white/10 text-white hover:bg-emerald-500 hover:text-black transition active:scale-90"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 right-4 z-20 opacity-0 group-hover:opacity-100 transition duration-300">
        <button 
          onClick={handleNext}
          className="h-10 w-10 flex items-center justify-center rounded-full bg-black/45 border border-white/10 text-white hover:bg-emerald-500 hover:text-black transition active:scale-90"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Content Meta Text Block */}
      <div className="absolute bottom-0 left-0 w-full p-4 sm:p-8 z-20 text-right flex flex-col items-start gap-2.5">
        <div className="flex items-center gap-2">
          <span className="rounded bg-emerald-500 px-2.5 py-1 text-[10px] font-black text-black shadow-md shadow-emerald-500/20">
            {getPersianCategory(activeArticle.category)}
          </span>
          <span className="text-[10px] text-slate-300 font-medium flex items-center gap-1 bg-black/30 backdrop-blur-md px-2 py-0.5 rounded border border-white/5">
            <Eye className="h-3 w-3 text-slate-400" />
            {activeArticle.viewCount.toLocaleString("fa-IR")} بازدید
          </span>
        </div>

        <h2 className="font-black text-lg sm:text-2xl text-white tracking-tight leading-snug max-w-3xl drop-shadow-md">
          {activeArticle.title}
        </h2>

        <p className="hidden sm:block text-xs text-slate-300 leading-relaxed max-w-2xl text-justify drop-shadow">
          {activeArticle.summary}
        </p>

        {/* Action Button */}
        <div className="mt-1 text-xs text-emerald-400 font-extrabold flex items-center gap-1.5 group-hover:text-emerald-300 transition">
          <span>مشاهده جزییات بیشتر خبر</span>
          <ArrowLeft className="h-3.5 w-3.5 group-hover:translate-x-1.5 transition-transform" />
        </div>
      </div>

      {/* Slider indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
        {featuredNews.map((_, idx) => (
          <button
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              setActiveIndex(idx);
            }}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === activeIndex ? "w-6 bg-emerald-500" : "w-1.5 bg-white/40 hover:bg-white"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { NewsItem, TransferItem } from "../types";
import { ChevronLeft, ChevronRight, Eye, Calendar, ArrowUpRight } from "lucide-react";
import { getSafeImageUrl } from "../utils";

interface NewsSliderProps {
  news: NewsItem[];
  transfers?: TransferItem[];
  onSelectNews: (article: NewsItem) => void;
}

export default function NewsSlider({ news, transfers = [], onSelectNews }: NewsSliderProps) {
  // Convert transfer items to slide-friendly NewsItem format to cycle them in the slider
  const convertedTransfers: NewsItem[] = transfers.map((t) => ({
    id: `transfer-slide-${t.id}`,
    title: `انتقال بمب: ${t.playerName} رسماً به ${t.toTeam} پیوست`,
    summary: `توافق نهایی بازیکن در پست ${t.position || "تخصصی"} با قرارداد ${t.type || "دائمی"}. باشگاه مبدأ: ${t.fromTeam} | ارزش انتقال: ${t.fee || "توافقی"}`,
    content: t.details || `جزییات کامل انتقال ${t.playerName} به تیم ${t.toTeam}: این ترانسفر با تلاش‌های فشرده کادر مدیریتی نهایی شده است.`,
    image: t.image || "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=300",
    category: "transfers",
    createdAt: t.date ? `${t.date}T12:00:00.000Z` : new Date().toISOString(),
    viewCount: 2240,
    tags: ["نقل و انتقالات"]
  }));

  // Combine regular news with newly-converted transfer slides and sort by date descending
  const combined = [...(news || []), ...convertedTransfers];
  const sortedCombined = combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  // Choose up to 1 latest item per category to represent all categories in the HERO slider
  const categoriesToPick = ["pro-league", "league-1", "league-2", "hazfi-cup", "legionnaires", "transfers"];
  const sliderArticles: NewsItem[] = [];
  const pickedCategories = new Set<string>();

  for (const item of sortedCombined) {
    if (categoriesToPick.includes(item.category) && !pickedCategories.has(item.category)) {
      sliderArticles.push(item);
      pickedCategories.add(item.category);
    }
  }

  // If there are less than 5 categories picked, fill with remaining latest items regardless of category
  if (sliderArticles.length < 5) {
    for (const item of sortedCombined) {
      if (!sliderArticles.some(article => article.id === item.id)) {
        sliderArticles.push(item);
      }
      if (sliderArticles.length >= 6) break;
    }
  }

  // Soft sort them back by date so the newest are shown beautifully
  sliderArticles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (sliderArticles.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sliderArticles.length);
    }, 5000); // Change slide every 5 seconds
    return () => clearInterval(interval);
  }, [sliderArticles.length]);

  if (sliderArticles.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center rounded-2xl bg-gray-900 border border-gray-800 text-gray-500">
        در حال بارگذاری اسلایدر اخبار...
      </div>
    );
  }

  const currentArticle = sliderArticles[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + sliderArticles.length) % sliderArticles.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % sliderArticles.length);
  };

  const getPersianCategory = (cat: string) => {
    switch (cat) {
      case "pro-league": return "لیگ برتر";
      case "league-1": return "لیگ آزادگان";
      case "league-2": return "لیگ دسته دو";
      case "hazfi-cup": return "جام حذفی";
      case "legionnaires": return "لژیونرها";
      case "transfers": return "نقل و انتقالات";
      default: return "ورزشی";
    }
  };

  const formatPersianDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("fa-IR", { day: "numeric", month: "long" });
    } catch {
      return "اخیراً";
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#121215] border border-white/5 shadow-xl group" dir="rtl" id="news-hero-slider">
      {/* Slide Image Background with overlay */}
      <div className="relative h-[280px] sm:h-[380px] w-full overflow-hidden">
        <img loading="lazy" decoding="async"           src={getSafeImageUrl(currentArticle.image)}
          alt={currentArticle.title}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-all duration-700 ease-out transform scale-102 group-hover:scale-105"
        />
        {/* Modern dark gradient overlay mimicking football360.ir dark layout */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c]/30 to-transparent" />
      </div>

      {/* Slide Content Box */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6" dir="rtl">
        <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
          <span className="rounded bg-gradient-to-r from-emerald-500 to-cyan-500 px-2.5 py-0.5 text-xs font-black text-black shadow-md shadow-emerald-500/10">
            {getPersianCategory(currentArticle.category)}
          </span>
          <span className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-300">
            <Calendar className="h-3 w-3 text-emerald-400" />
            {formatPersianDate(currentArticle.createdAt)}
          </span>
          <span className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-300 mr-2">
            <Eye className="h-3 w-3 text-cyan-400" />
            {(currentArticle.viewCount || 0).toLocaleString("fa-IR")} بازدید
          </span>
        </div>

        <h3 
          onClick={() => onSelectNews(currentArticle)}
          className="cursor-pointer font-black text-white hover:text-emerald-400 text-lg sm:text-2xl leading-snug sm:leading-normal tracking-tight line-clamp-2 md:max-w-4xl transition-colors duration-250 flex items-start gap-1"
        >
          {currentArticle.title}
          <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-emerald-400 mt-1" />
        </h3>

        <p className="mt-2 text-xs sm:text-sm text-gray-300 line-clamp-2 leading-relaxed max-w-3xl hidden sm:block">
          {currentArticle.summary}
        </p>

        {/* Carousel Indicators & Controls bar */}
        <div className="mt-4 sm:mt-6 flex items-center justify-between border-t border-white/5 pt-3">
          {/* Bullet indicators */}
          <div className="flex gap-1.5 order-2">
            {sliderArticles.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-1.5 transition-all rounded-full ${
                  index === currentIndex ? "w-6 bg-emerald-500" : "w-1.5 bg-gray-700 hover:bg-gray-500"
                }`}
                title={`اسلاید ${index + 1}`}
              />
            ))}
          </div>

          {/* Nav arrows */}
          <div className="flex gap-1 order-1">
            <button
              onClick={handlePrev}
              className="rounded-lg bg-[#0a0a0c]/80 p-1.5 text-white hover:bg-emerald-500 hover:text-black hover:shadow-lg hover:shadow-emerald-500/10 transition border border-white/10"
              title="خبر قبلی"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={handleNext}
              className="rounded-lg bg-[#0a0a0c]/80 p-1.5 text-white hover:bg-emerald-500 hover:text-black hover:shadow-lg hover:shadow-emerald-500/10 transition border border-white/10"
              title="خبر بعدی"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

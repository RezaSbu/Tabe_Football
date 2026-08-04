import React, { useState, useEffect } from "react";
import { NewsItem, TransferItem, HeroSlideItem, LegionnaireItem } from "../types";
import { ChevronLeft, ChevronRight, Eye, Calendar, ArrowUpRight } from "lucide-react";
import { getSafeImageUrl } from "../utils";

interface NewsSliderProps {
  news: NewsItem[];
  transfers?: TransferItem[];
  heroSlides?: HeroSlideItem[];
  legionnaires?: LegionnaireItem[];
  onSelectNews: (article: NewsItem) => void;
  onSelectTransfer?: (transferId: string) => void;
}

export default function NewsSlider({ news, transfers = [], heroSlides = [], legionnaires = [], onSelectNews, onSelectTransfer }: NewsSliderProps) {
  // Use admin-configured hero slides if available, otherwise fall back to auto-selection
  // [غیرفعال‌سازی موقت اسلایدهای لژیونر و نقل‌وانتقال بازیکن‌محور]
  // برای بازگردانی، فیلتر دوم (sourceType) را حذف کنید و به نسخه اصلی زیر برگردید:
  // const activeSlides = heroSlides.filter((s) => s.active).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const activeSlides = heroSlides
    .filter((s) => s.active)
    .filter((s) => s.sourceType !== "transfer" && s.sourceType !== "legionnaire")
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const useHeroSlides = activeSlides.length > 0;

  // Build slider articles from heroSlides (admin-curated) or auto-pick
  let sliderArticles: (NewsItem & { _heroSlide?: HeroSlideItem })[] = [];

  if (useHeroSlides) {
    sliderArticles = activeSlides.map((slide) => {
      let viewCount = 0;
      let createdAt = new Date().toISOString();
      let category = (slide.sourceType === "transfer" ? "transfers" : slide.sourceType === "legionnaire" ? "legionnaires" : "pro-league") as any;
      if (slide.sourceType === "news" && slide.sourceId) {
        const source = news.find((n) => n.id === slide.sourceId);
        if (source) { viewCount = source.viewCount || 0; createdAt = source.createdAt; category = source.category as any; }
      } else if (slide.sourceType === "transfer" && slide.sourceId) {
        const source = transfers.find((t) => String(t.id) === String(slide.sourceId));
        if (source) { viewCount = (source as any).viewCount || 0; createdAt = source.date ? `${source.date}T12:00:00.000Z` : new Date().toISOString(); }
      } else if (slide.sourceType === "legionnaire" && slide.sourceId) {
        const source = legionnaires.find((l) => l.id === slide.sourceId);
        if (source) { viewCount = source.viewCount || 0; createdAt = (source as any).createdAt || (source as any).created_at || new Date().toISOString(); }
      }
      return {
        id: slide.sourceId || slide.id,
        title: slide.title,
        summary: slide.subtitle || "",
        content: "",
        image: slide.image,
        category,
        tags: [],
        viewCount,
        createdAt,
        _heroSlide: slide,
      };
    });
  } else {
    // Original auto-pick logic (fallback when no hero slides configured)
    // ==========================================================================
    // [غیرفعال‌سازی موقت اسلایدهای لژیونر و نقل‌وانتقال بازیکن‌محور]
    // برای بازگردانی، دو خط زیر را از کامنت خارج و خط combined جدید را حذف کنید:
    // const convertedTransfers: NewsItem[] = transfers.map((t) => ({
    //   id: `transfer-slide-${t.id}`,
    //   title: `انتقال بمب: ${t.playerName} رسماً به ${t.toTeam} پیوست`,
    //   summary: `توافق نهایی بازیکن در پست ${t.position || "تخصصی"} با قرارداد ${t.type || "دائمی"}. باشگاه مبدأ: ${t.fromTeam} | ارزش انتقال: ${t.fee || "توافقی"}`,
    //   content: t.details || `جزییات کامل انتقال ${t.playerName} به تیم ${t.toTeam}: این ترانسفر با تلاش‌های فشرده کادر مدیریتی نهایی شده است.`,
    //   image: t.image || "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=300",
    //   category: "transfers",
    //   createdAt: t.date ? `${t.date}T12:00:00.000Z` : new Date().toISOString(),
    //   viewCount: 2240,
    //   tags: ["نقل و انتقالات"],
    //   _originalTransferId: t.id,
    // } as any));

    // const combined = [...(news || []), ...convertedTransfers];
    const combined = [...(news || [])].filter(
      (n) => n.category !== "transfers" && n.category !== "legionnaires"
    );
    // ==========================================================================
    const sortedCombined = combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // const categoriesToPick = ["pro-league", "league-1", "league-2", "hazfi-cup", "legionnaires", "transfers"];
    const categoriesToPick = ["pro-league", "league-1", "league-2", "hazfi-cup", "futsal"];
    const pickedCategories = new Set<string>();

    for (const item of sortedCombined) {
      if (categoriesToPick.includes(item.category) && !pickedCategories.has(item.category)) {
        sliderArticles.push(item);
        pickedCategories.add(item.category);
      }
    }

    if (sliderArticles.length < 5) {
      for (const item of sortedCombined) {
        if (!sliderArticles.some((article) => article.id === item.id)) {
          sliderArticles.push(item);
        }
        if (sliderArticles.length >= 6) break;
      }
    }

    sliderArticles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

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
      case "futsal": return "فوتسال";
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
          onClick={() => {
            const heroSlide = (currentArticle as any)._heroSlide as HeroSlideItem | undefined;
            if (heroSlide?.link) {
              window.location.href = heroSlide.link;
            } else if (onSelectTransfer && (currentArticle as any)._originalTransferId) {
              onSelectTransfer(String((currentArticle as any)._originalTransferId));
            } else {
              onSelectNews(currentArticle);
            }
          }}
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

import React from "react";
import { NewsItem } from "../types";
import { Calendar, Eye, ArrowLeft } from "lucide-react";
import { getSafeImageUrl } from "../utils";

interface NewsCardProps {
  newsItem: NewsItem;
  onClick: (art: NewsItem) => void;
}

export default function NewsCard({ newsItem, onClick }: NewsCardProps) {
  const getPersianCategory = (cat: string) => {
    switch (cat) {
      case "pro-league": return "لیگ برتر";
      case "league-1": return "لیگ یک";
      case "league-2": return "لیگ دو";
      case "hazfi-cup": return "جام حذفی";
      case "futsal": return "فوتسال";
      case "legionnaires": return "لژیونرها";
      case "transfers": return "نقل و انتقالات";
      default: return "سایر موضوعات";
    }
  };

  return (
    <div
      onClick={() => onClick(newsItem)}
      className="group bg-[#18181c]/40 border border-white/5 rounded-xl overflow-hidden hover:bg-[#18181c] hover:border-emerald-500/25 transition duration-300 cursor-pointer shadow flex flex-col justify-between"
      dir="rtl"
    >
      <div>
        {/* Cover image area with proxy */}
        <div className="relative h-44 w-full overflow-hidden bg-slate-900">
          <span className="absolute top-2 right-2 z-10 rounded bg-[#121215]/85 backdrop-blur px-2.5 py-1 text-[10px] font-bold text-emerald-400">
            {getPersianCategory(newsItem.category)}
          </span>
          <img
            src={getSafeImageUrl(newsItem.image)}
            alt={newsItem.title}
            className="w-full h-full object-cover group-hover:scale-103 transition duration-500"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Text specifications */}
        <div className="p-4 space-y-2">
          <h3 className="font-extrabold text-sm text-white line-clamp-2 leading-snug group-hover:text-emerald-400 transition">
            {newsItem.title}
          </h3>
          <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 text-justify">
            {newsItem.summary}
          </p>
        </div>
      </div>

      {/* Meta footnote indicators */}
      <div className="p-4 pt-0 border-t border-white/[0.03] mt-2 flex items-center justify-between text-[10px] text-slate-500 font-medium">
        <span className="flex items-center gap-1">
          <Eye className="h-3 w-3 text-slate-450" />
          {newsItem.viewCount.toLocaleString("fa-IR")} بازدید
        </span>
        <div className="flex items-center gap-1 text-emerald-400 font-extrabold group-hover:translate-x-1 transition-transform">
          <span>ادامه خبر</span>
          <ArrowLeft className="h-3 w-3" />
        </div>
      </div>
    </div>
  );
}

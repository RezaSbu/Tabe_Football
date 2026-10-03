import React from "react";
import { NewsItem } from "../types";
import { Calendar, Eye, ArrowLeft, Tag } from "lucide-react";
import { getSafeImageUrl, formatStatNumber } from "../utils";

interface NewsCardProps {
  newsItem: NewsItem;
  onClick: (art: NewsItem) => void;
  onTagClick?: (tag: string) => void;
}

export default function NewsCard({ newsItem, onClick, onTagClick }: NewsCardProps) {
  const getPersianCategory = (cat: string) => {
    switch (cat) {
      case "pro-league": return "لیگ برتر";
      case "league-1": return "لیگ یک";
      case "league-2": return "لیگ دو";
      case "hazfi-cup": return "جام حذفی";
      // case "futsal": return "فوتسال";   // [آرشیو] بخش فوتسال از UI عمومی مخفی شده
      case "legionnaires": return "لژیونرها";
      case "transfers": return "نقل و انتقالات";
      default: return "سایر موضوعات";
    }
  };

  const categoryTint = (cat: string) => {
    switch (cat) {
      case "pro-league": return "bg-red-500/15 text-red-300 border-red-500/30";
      case "transfers": return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
      case "legionnaires": return "bg-sky-500/15 text-sky-300 border-sky-500/30";
      case "hazfi-cup": return "bg-purple-500/15 text-purple-300 border-purple-500/30";
      default: return "bg-white/5 text-slate-300 border-white/10";
    }
  };

  return (
    <div
      onClick={() => onClick(newsItem)}
      className="group bg-[#18181c]/40 border border-white/5 rounded-xl overflow-hidden hover:bg-[#18181c] hover:border-emerald-500/40 hover:-translate-y-1 hover:shadow-[0_12px_36px_-10px_rgba(16,185,129,0.4)] transition-all duration-300 cursor-pointer shadow flex flex-col justify-between"
      dir="rtl"
    >
      <div>
        <div className="relative w-full overflow-hidden bg-slate-900 h-44">
          <span className={`absolute top-2 right-2 z-10 rounded px-2.5 py-1 text-[10px] font-bold border backdrop-blur ${categoryTint(newsItem.category)}`}>
            {getPersianCategory(newsItem.category)}
          </span>
          <img loading="lazy" decoding="async" src={getSafeImageUrl(newsItem.image)}
            alt={newsItem.title}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="p-4 space-y-2">
          <h3 className="font-extrabold text-white line-clamp-2 leading-snug group-hover:text-emerald-400 transition text-sm">
            {newsItem.title}
          </h3>
          <p className="text-slate-400 leading-relaxed line-clamp-2 text-justify text-[11px]">
            {newsItem.summary}
          </p>
        </div>
      </div>

      <div>
      {newsItem.tags && newsItem.tags.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1">
          {newsItem.tags.slice(0, 3).map((tag: string) => (
            <button
              key={tag}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTagClick?.(tag); }}
              className="rounded-lg bg-gray-950 px-1.5 py-0.5 text-[9px] text-slate-400 border border-white/5 hover:bg-red-950/40 hover:text-red-400 hover:border-red-900/40 transition cursor-pointer"
            >
              <Tag className="h-2 w-2 inline ml-0.5" />{tag}
            </button>
          ))}
          {newsItem.tags.length > 3 && <span className="text-[9px] text-slate-600">+{newsItem.tags.length - 3}</span>}
        </div>
      )}

        <div className="p-4 pt-0 border-t border-white/[0.03] mt-2 flex items-center justify-between text-[10px] text-slate-400 font-medium">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3 text-slate-500" />
            {formatStatNumber(newsItem.viewCount)} بازدید
            {(newsItem.viewCount ?? 0) > 5000 && (
              <span className="mr-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-1.5 py-px text-[9px] font-black text-amber-300">داغ</span>
            )}
          </span>
        <div className="flex items-center gap-1 text-emerald-400 font-extrabold group-hover:translate-x-1 transition-transform">
          <span>ادامه خبر</span>
          <ArrowLeft className="h-3 w-3" />
        </div>
      </div>
      </div>
    </div>
  );
}

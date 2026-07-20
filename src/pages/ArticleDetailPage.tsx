import React from "react";
import { ChevronRight, ExternalLink, Share2 } from "lucide-react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Eye,
  User,
  Tag,
} from "lucide-react";

interface ArticleDetailPageProps {
  article: any;
  setActiveArticle: (article: any) => void;
  toPersianDigits: (n: any) => string;
  getSafeImageUrl: (url: string) => string;
}

const getPersianCategory = (cat: string) => {
  switch (cat) {
    case "pro-league": return "لیگ برتر";
    case "league-1": return "لیگ آزادگان";
    case "league-2": return "لیگ دسته دو";
    case "hazfi-cup": return "جام حذفی";
    case "futsal": return "فوتسال";
    case "legionnaires": return "لژیونرها";
    case "transfers": return "نقل و انتقالات";
    default: return "ورزشی";
  }
};

const ArticleDetailPage: React.FC<ArticleDetailPageProps> = ({
  article,
  setActiveArticle,
  toPersianDigits,
  getSafeImageUrl,
}) => {
  return (
    <article
      className="rounded-2xl bg-[#121215] border border-white/5 p-4 sm:p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300"
      dir="rtl"
      id="detailed-article-story"
    >
      <button
        onClick={() => setActiveArticle(null)}
        className="mb-6 flex items-center gap-1.5 rounded-lg bg-gray-955 px-3.5 py-1.5 text-xs text-gray-350 border border-white/5 hover:bg-gray-900 hover:text-white transition cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4 text-red-500" />
        <span>بازگشت به لابی خبرها</span>
      </button>

      <header className="mb-5 space-y-3.5">
        <span className="rounded bg-red-655 px-2.5 py-1 text-xs font-black text-white shadow shadow-red-950/30">
          {getPersianCategory(article.category)}
        </span>
        <h1 className="font-black text-xl sm:text-3xl text-white leading-snug sm:leading-normal">
          {article.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 border-t border-b border-white/5 py-3">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-gray-500" />{" "}
            {new Date(article.createdAt).toLocaleDateString("fa-IR", {
              dateStyle: "long",
            })}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-gray-500" />{" "}
            {new Date(article.createdAt).toLocaleTimeString("fa-IR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span className="flex items-center gap-1.5">
            <Eye className="h-4 w-4 text-gray-500" />{" "}
            {article.viewCount.toLocaleString("fa-IR")} بازدید
          </span>
          <span className="flex items-center gap-1.5">
            <User className="h-4 w-4 text-gray-500" /> تحریریه تب فوتبال
          </span>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-12 items-start">
        <div className="md:col-span-8 space-y-4">
          <blockquote className="border-r-4 border-red-655 bg-[#0a0a0c]/55 p-4 rounded-l-xl text-gray-200 text-sm font-semibold italic leading-relaxed shadow-inner">
            {article.summary}
          </blockquote>

          <p className="text-gray-300 text-sm sm:text-base leading-loose whitespace-pre-line text-justify pl-2">
            {article.content}
          </p>
        </div>

        <div className="md:col-span-4 space-y-4">
          <div className="overflow-hidden rounded-xl bg-gray-950 border border-white/5 shadow-lg sm:h-64 h-48 w-full">
            <img
              src={getSafeImageUrl(article.image)}
              alt={article.title}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          </div>

          {article.tags && article.tags.length > 0 && (
            <div className="rounded-xl border border-white/5 bg-gray-955 p-4">
              <h4 className="font-bold text-xs text-white mb-2.5 flex items-center gap-1">
                <Tag className="h-3.5 w-3.5 text-red-500" />
                <span>برچسب‌های گزارش</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {article.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="rounded-lg bg-gray-950 px-2.5 py-1 text-[11px] text-gray-300 border border-white/5 cursor-pointer hover:bg-emerald-950/40 hover:text-emerald-400 transition"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default ArticleDetailPage;

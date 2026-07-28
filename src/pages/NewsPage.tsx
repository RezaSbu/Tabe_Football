import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import NewsCard from "../components/NewsCard";
import { NewsItem } from "../types";

interface NewsPageProps {
  news: NewsItem[];
  newsCategoryFilter: string;
  setNewsCategoryFilter: (filter: string) => void;
  newsSearch: string;
  setNewsSearch: (search: string) => void;
  setActiveArticle: (article: NewsItem) => void;
}

export default function NewsPage({
  news,
  newsCategoryFilter,
  setNewsCategoryFilter,
  newsSearch,
  setNewsSearch,
  setActiveArticle,
}: NewsPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const tag = searchParams.get("tag");
    if (tag) {
      setNewsSearch(tag);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setNewsSearch, setSearchParams]);

  return (
    <div className="space-y-6 animate-in fade-in" dir="rtl">
      <style>{`
        .news-hero-glow {
          background: radial-gradient(circle at top right, rgba(239, 68, 68, 0.08) 0%, transparent 60%);
        }
      `}</style>
      <div className="rounded-2xl border border-white/5 bg-gradient-to-l from-red-950/10 via-gray-900 to-gray-900 p-6 relative overflow-hidden news-hero-glow">
        <h2 className="font-black text-2xl text-white flex items-center gap-2">
          <span className="w-1.5 h-6 bg-red-655 rounded-sm" />
          <span>آرشیو جامع اخبار و تحلیل‌های ورزشی فوتبال ایران</span>
        </h2>
        <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
          پوشش زنده و تحلیل داغ‌ترین شایعات نقل و انتقالاتی، وضعیت لژیونرهای ملی‌پوش در خارج از کشور و رویدادهای دربی پایتخت.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-[#121215] p-4 rounded-2xl border border-white/5">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "all", label: "همه موضوعات" },
            { id: "pro-league", label: "لیگ برتر" },
            { id: "league-1", label: "لیگ یک" },
            { id: "league-2", label: "لیگ دو" },
            { id: "hazfi-cup", label: "جام حذفی" },
            { id: "futsal", label: "فوتسال" },
            { id: "other", label: "سایر موضوعات" }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setNewsCategoryFilter(cat.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-black transition relative ${
                newsCategoryFilter === cat.id
                  ? "bg-red-655 text-white shadow shadow-red-950/40"
                  : "bg-gray-950 text-gray-400 hover:text-white border border-white/5"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72 relative">
          <input
            type="text"
            dir="rtl"
            placeholder="جستجو کلمات کلیدی، تگ یا نام بازیکن..."
            value={newsSearch}
            onChange={(e) => setNewsSearch(e.target.value)}
            className="w-full rounded-xl bg-gray-950 px-4 py-2 text-xs text-white placeholder-slate-600 border border-white/5 focus:outline-none focus:border-red-650 font-bold"
          />
        </div>
      </div>

      {(() => {
        const mainCategories = ["pro-league", "league-1", "league-2", "hazfi-cup", "futsal"];
        const filtered = news.filter((item) => {
          const matchesCategory = newsCategoryFilter === "all" ||
            (newsCategoryFilter === "other" ? !mainCategories.includes(item.category) : item.category === newsCategoryFilter) ||
            item.tags?.includes(newsCategoryFilter);
          const q = newsSearch.toLowerCase();
          const matchesQuery = !newsSearch ||
            item.title.toLowerCase().includes(q) ||
            item.summary.toLowerCase().includes(q) ||
            item.content?.toLowerCase().includes(q) ||
            item.tags?.some(t => t.toLowerCase().includes(q));
          return matchesCategory && matchesQuery;
        });

        if (filtered.length === 0) {
          return (
            <div className="p-12 text-center rounded-2xl border border-dashed border-white/5 text-xs text-slate-500 font-bold bg-[#121215]/40">
              هیچ رویداد یا اخباری با فیلتر جستجوی شما مطابقت ندارد.
            </div>
          );
        }

        return (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <div key={item.id} className="cursor-pointer" onClick={() => { setActiveArticle(item); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                <NewsCard newsItem={item} onClick={() => {}} onTagClick={(tag) => setNewsSearch(tag)} />
              </div>
            ))}
          </div>
        );
      })()}

    </div>
  );
}

import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import NewsCard from "../components/NewsCard";
import { NewsItem } from "../types";
import { formatStatNumber } from "../utils";

interface NewsPageProps {
  newsCategoryFilter: string;
  setNewsCategoryFilter: (filter: string) => void;
  newsSearch: string;
  setNewsSearch: (search: string) => void;
  setActiveArticle: (article: NewsItem) => void;
}

const PAGE_SIZE = 20;

export default function NewsPage({
  newsCategoryFilter,
  setNewsCategoryFilter,
  newsSearch,
  setNewsSearch,
  setActiveArticle,
}: NewsPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const tag = searchParams.get("tag");
    if (tag) {
      setNewsSearch(tag);
      setPage(1);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setNewsSearch, setSearchParams]);

  // Reset to the first page whenever the filter or the search text changes.
  useEffect(() => {
    setPage(1);
  }, [newsCategoryFilter, newsSearch]);

  // Debounced server-side fetch with AbortController to cancel stale requests.
  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    const controller = new AbortController();
    const t = setTimeout(() => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        category: newsCategoryFilter,
        q: newsSearch,
      });
      fetch(`/api/news?${params.toString()}`, { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error("news fetch failed");
          return res.json();
        })
        .then(data => {
          if (data.success) {
            setItems(Array.isArray(data.items) ? data.items : []);
            setTotal(Number(data.total) || 0);
            setTotalPages(Math.max(1, Number(data.totalPages) || 1));
            if (Number(data.page) && Number(data.page) !== page) {
              setPage(Number(data.page));
            }
          } else {
            setLoadError(true);
          }
        })
        .catch((e) => {
          if (e?.name !== "AbortError") setLoadError(true);
        })
        .finally(() => setLoading(false));
    }, 350);
    return () => { clearTimeout(t); controller.abort(); };
  }, [page, newsCategoryFilter, newsSearch]);

  const pageWindow = (() => {
    const start = Math.max(1, Math.min(page - 2, Math.max(1, totalPages - 4)));
    const end = Math.min(totalPages, start + 4);
    const arr: number[] = [];
    for (let p = start; p <= end; p++) arr.push(p);
    return arr;
  })();

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
            // { id: "futsal", label: "فوتسال" },   // [آرشیو] بخش فوتسال از UI عمومی مخفی شده
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

      {loading ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-white/5 text-xs text-slate-500 font-bold bg-[#121215]/40">
          در حال بارگذاری خبرها...
        </div>
      ) : loadError ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-white/5 text-xs text-slate-500 font-bold bg-[#121215]/40">
          خطا در دریافت خبرها. لطفا دوباره تلاش کنید.
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-white/5 text-xs text-slate-500 font-bold bg-[#121215]/40">
          هیچ رویداد یا اخباری با فیلتر جستجوی شما مطابقت ندارد.
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <Link
                key={item.id}
                to={`/news/${item.id}`}
                onClick={() => {
                  setActiveArticle(item);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="block cursor-pointer"
              >
                <NewsCard newsItem={item} onClick={() => {}} onTagClick={(tag) => setNewsSearch(tag)} />
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2" dir="rtl">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-xl px-3 py-1.5 text-xs font-black bg-gray-950 text-gray-300 border border-white/5 hover:text-white disabled:opacity-40 disabled:cursor-default transition"
            >
              قبلی
            </button>
            {pageWindow[0] > 1 && (
              <span className="text-[11px] text-slate-500 px-1">...</span>
            )}
            {pageWindow.map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`min-w-8 rounded-xl px-2.5 py-1.5 text-xs font-black font-mono transition ${
                  p === page
                    ? "bg-red-655 text-white shadow shadow-red-950/40"
                    : "bg-gray-950 text-gray-400 hover:text-white border border-white/5"
                }`}
              >
                {formatStatNumber(p)}
              </button>
            ))}
            {pageWindow[pageWindow.length - 1] < totalPages && (
              <span className="text-[11px] text-slate-500 px-1">...</span>
            )}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-xl px-3 py-1.5 text-xs font-black bg-gray-950 text-gray-300 border border-white/5 hover:text-white disabled:opacity-40 disabled:cursor-default transition"
            >
              بعدی
            </button>
            <span className="w-full text-center text-[11px] text-slate-500 font-bold mt-1">
              صفحه {formatStatNumber(page)} از {formatStatNumber(totalPages)} ــ {formatStatNumber(total)} خبر
            </span>
          </div>
        </>
      )}

    </div>
  );
}

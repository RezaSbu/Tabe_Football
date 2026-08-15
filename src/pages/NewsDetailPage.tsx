import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Loader2, Tag } from "lucide-react";
import { getSafeImageUrl, toPersianDigits } from "../utils";

export default function NewsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(false);
    fetch(`/api/detail/news/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then(data => {
        if (data.success && data.data) {
          setArticle(data.data);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/detail/news/${id}/view`, { method: "POST" }).catch(() => {});
  }, [id]);

  const getPersianCategory = (cat: string) => {
    const map: Record<string, string> = {
      "pro-league": "لیگ برتر", "league-1": "لیگ آزادگان", "league-2": "لیگ دسته دو",
      "hazfi-cup": "جام حذفی", "futsal": "فوتسال", "legionnaires": "لژیونرها",
      "transfers": "نقل و انتقالات",
    };
    return map[cat] || "ورزشی";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="text-center py-20 space-y-4" dir="rtl">
        <h1 className="text-2xl font-bold text-white">خبر یافت نشد</h1>
        <p className="text-gray-400 text-sm">مورد مورد نظر شما وجود ندارد یا حذف شده است.</p>
        <Link to="/news" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm">
          <ArrowRight className="h-4 w-4" /> بازگشت به اخبار
        </Link>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{article.title} | تب فوتبال</title>
        <meta name="description" content={article.summary || article.title} />
        <link rel="canonical" href={`https://tabefotbal.ir/news/${id}`} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.summary || article.title} />
        <meta property="og:image" content={getSafeImageUrl(article.image)} />
        <meta property="og:url" content={`https://tabefotbal.ir/news/${id}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.title} />
        <meta name="twitter:description" content={article.summary || article.title} />
        <meta name="twitter:image" content={getSafeImageUrl(article.image)} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            "headline": article.title,
            "description": article.summary,
            "image": getSafeImageUrl(article.image),
            "datePublished": article.createdAt,
            "publisher": { "@type": "Organization", "name": "تب فوتبال" },
          })}
        </script>
      </Helmet>

      <article className="rounded-2xl bg-[#121215] border border-white/5 p-4 sm:p-6 shadow-xl animate-in fade-in" dir="rtl">
        <Link to="/news" className="mb-6 flex items-center gap-1.5 rounded-lg bg-gray-955 px-3.5 py-1.5 text-xs text-gray-350 border border-white/5 hover:bg-gray-900 hover:text-white transition w-fit">
          <ArrowRight className="h-4 w-4 text-red-500" />
          <span>بازگشت به اخبار</span>
        </Link>

        <header className="mb-5 space-y-3.5">
          <span className="rounded bg-red-655 px-2.5 py-1 text-xs font-black text-white shadow shadow-red-950/30">
            {getPersianCategory(article.category)}
          </span>
          <h1 className="font-black text-xl sm:text-3xl text-white leading-snug">{article.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 border-t border-b border-white/5 py-3">
            <span>{new Date(article.createdAt).toLocaleDateString("fa-IR", { dateStyle: "long" })}</span>
            <span>{article.viewCount?.toLocaleString("fa-IR") || "۰"} بازدید</span>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-12 items-start">
          <div className="md:col-span-8 space-y-4 order-2 md:order-1">
            <blockquote className="border-r-4 border-red-655 bg-[#0a0a0c]/55 p-4 rounded-l-xl text-gray-300 text-sm sm:text-base leading-loose text-justify">
              {article.summary}
            </blockquote>
            <p className="text-gray-300 text-sm sm:text-base leading-loose whitespace-pre-line text-justify">
              {article.content}
            </p>
          </div>
          <div className="md:col-span-4 space-y-4 order-1 md:order-2">
            <div className="overflow-hidden rounded-xl bg-gray-950 border border-white/5 shadow-lg sm:h-64 h-48">
              <img loading="lazy" decoding="async" src={getSafeImageUrl(article.image)} alt={article.title} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
            </div>
            {Array.isArray(article.gallery) && article.gallery.length > 0 && (
              <div className={`grid gap-3 ${article.gallery.length > 1 ? "grid-cols-2" : ""}`}>
                {article.gallery.map((g: string, gi: number) => (
                  <figure key={gi} className={`overflow-hidden rounded-xl bg-gray-950 border border-white/5 shadow-lg ${article.gallery.length === 1 ? "p-2" : ""}`}>
                    <img loading="lazy" decoding="async" src={getSafeImageUrl(g)} alt={article.title} referrerPolicy="no-referrer"
                      className={article.gallery.length > 1 ? "h-28 w-full object-cover" : "mx-auto max-h-96 w-auto max-w-full rounded-lg"} />
                  </figure>
                ))}
              </div>
            )}
            {article.tags && article.tags.length > 0 && (
              <div className="rounded-xl border border-white/5 bg-gray-955 p-4">
                <h2 className="font-bold text-xs text-white mb-2.5">برچسب‌ها</h2>
                <div className="flex flex-wrap gap-1.5">
                  {article.tags.map((tag: string) => (
                    <Link
                      key={tag}
                      to={`/news?tag=${encodeURIComponent(tag)}`}
                      className="rounded-lg bg-gray-950 px-2.5 py-1 text-[11px] text-gray-300 border border-white/5 hover:bg-emerald-950/30 hover:text-emerald-400 hover:border-emerald-900/40 transition inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Tag className="h-2.5 w-2.5" />{tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {(article.read_more?.content || article.read_more?.content2 || (Array.isArray(article.read_more?.images) && article.read_more.images.length > 0)) && (
          <div className="mt-6 border-t border-white/5 pt-5 space-y-5 animate-in fade-in">
            {article.read_more?.content && (
              <p className="text-gray-300 text-sm sm:text-base leading-loose whitespace-pre-line text-justify">
                {article.read_more.content}
              </p>
            )}
            {Array.isArray(article.read_more?.images) && article.read_more.images.length === 1 && (
              <img loading="lazy" decoding="async" src={getSafeImageUrl(article.read_more.images[0])} alt={article.title} referrerPolicy="no-referrer" className="mx-auto max-h-[26rem] w-auto max-w-full rounded-xl border border-white/5 shadow-lg" />
            )}
            {Array.isArray(article.read_more?.images) && article.read_more.images.length > 1 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {article.read_more.images.map((g: string, gi: number) => (
                  <img key={gi} loading="lazy" decoding="async" src={getSafeImageUrl(g)} alt={article.title} referrerPolicy="no-referrer" className="w-full h-56 sm:h-80 rounded-xl object-cover border border-white/5 shadow-lg" />
                ))}
              </div>
            )}
            {article.read_more?.content2 && (
              <p className="text-gray-300 text-sm sm:text-base leading-loose whitespace-pre-line text-justify">
                {article.read_more.content2}
              </p>
            )}
          </div>
        )}
      </article>
    </>
  );
}

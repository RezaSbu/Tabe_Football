import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Loader2, Eye, MapPin, Trophy, Star, Shirt, FileText } from "lucide-react";
import { getSafeImageUrl } from "../utils";

export default function LegionnaireDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [legionnaire, setLegionnaire] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(false);
    fetch(`/api/detail/legionnaire/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => d.success && d.data ? setLegionnaire(d.data) : setError(true))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/detail/legionnaire/${id}/view`, { method: "POST" }).catch(() => {});
  }, [id]);

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-cyan-500" /></div>;
  if (error || !legionnaire) return (
    <div className="text-center py-20 space-y-4" dir="rtl">
      <h1 className="text-2xl font-bold text-white">لژیونر یافت نشد</h1>
      <p className="text-gray-400 text-sm">لژیونر مورد نظر وجود ندارد یا حذف شده است.</p>
      <Link to="/legionnaires" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm"><ArrowRight className="h-4 w-4" /> بازگشت به لژیونرها</Link>
    </div>
  );

  const imgSrc = getSafeImageUrl(legionnaire.image);

  return (
    <>
      <Helmet>
        <title>{legionnaire.name} | لژیونر | تب فوتبال</title>
        <meta name="description" content={`عملکرد ${legionnaire.name} لژیونر ایرانی در ${legionnaire.league || ""} - ${legionnaire.team || ""}`} />
        <link rel="canonical" href={`https://tabefootball.com/legionnaire/${id}`} />
        <meta property="og:type" content="profile" />
        <meta property="og:title" content={`${legionnaire.name} | لژیونر`} />
        <meta property="og:description" content={`${legionnaire.team || ""} - ${legionnaire.league || ""}`} />
        {legionnaire.image && <meta property="og:image" content={imgSrc} />}
        <meta property="og:url" content={`https://tabefootball.com/legionnaire/${id}`} />
        <script type="application/ld+json">
          {JSON.stringify({ "@context": "https://schema.org", "@type": "Person", "name": legionnaire.name, "jobTitle": `فوتبالیست لژیونر - ${legionnaire.team || ""}`, "image": imgSrc })}
        </script>
      </Helmet>

      <div dir="rtl" className="space-y-4 animate-in fade-in">
        <Link to="/legionnaires" className="flex items-center gap-1.5 rounded-xl bg-[#121215] px-4 py-2.5 text-xs text-gray-400 border border-white/5 hover:bg-[#1a1a1f] hover:text-white transition w-fit">
          <ArrowRight className="h-4 w-4 text-emerald-500" />
          <span>بازگشت به لژیونرها</span>
        </Link>

        {/* Main card */}
        <div className="rounded-2xl bg-[#121215] border border-white/5 shadow-2xl overflow-hidden">
          <div className="grid md:grid-cols-12">

            {/* Image column */}
            <div className="md:col-span-4 bg-gradient-to-br from-gray-900 to-gray-950 p-6 flex flex-col items-center justify-center relative">
              <div className="relative w-full aspect-[3/4] max-w-[260px] mx-auto rounded-2xl overflow-hidden bg-gray-800/50 border border-white/5 shadow-lg">
                <img
                  loading="lazy" decoding="async"
                  src={imgSrc}
                  alt={legionnaire.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-gray-500">
                <Eye className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium">{(legionnaire.viewCount || 0).toLocaleString("fa-IR")} بازدید</span>
              </div>
            </div>

            {/* Content column */}
            <div className="md:col-span-8 p-6 sm:p-8 space-y-5">
              {/* Name + badges */}
              <div className="space-y-3">
                <h1 className="font-black text-2xl sm:text-3xl text-white leading-tight">{legionnaire.name}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  {legionnaire.team && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-400">
                      <Trophy className="h-3.5 w-3.5" /> {legionnaire.team}
                    </span>
                  )}
                  {legionnaire.league && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 text-xs font-bold text-cyan-400">
                      <Star className="h-3.5 w-3.5" /> {legionnaire.league}
                    </span>
                  )}
                  {legionnaire.nationality && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 text-xs font-bold text-blue-400">
                      <MapPin className="h-3.5 w-3.5" /> {legionnaire.nationality}
                    </span>
                  )}
                  {legionnaire.position && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 text-xs font-bold text-purple-400">
                      <Shirt className="h-3.5 w-3.5" /> {legionnaire.position}
                    </span>
                  )}
                </div>
              </div>

              {/* Summary */}
              {legionnaire.summary && (
                <div className="rounded-xl bg-[#0a0a0c] border border-white/5 p-5">
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-emerald-400" />
                    خلاصه عملکرد
                  </h2>
                  <p className="text-sm text-gray-300 leading-relaxed">{legionnaire.summary}</p>
                </div>
              )}

              {/* Full description */}
              {(legionnaire.description || legionnaire.performance) && (
                <div className="rounded-xl bg-[#0a0a0c] border border-white/5 p-5">
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-cyan-400" />
                    توضیحات کامل
                  </h2>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{legionnaire.description || legionnaire.performance}</p>
                </div>
              )}

              {/* Tags */}
              {legionnaire.tags && legionnaire.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {legionnaire.tags.map((tag: string) => (
                    <span key={tag} className="rounded-lg bg-[#0a0a0c] px-2.5 py-1 text-[11px] text-gray-400 border border-white/5">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

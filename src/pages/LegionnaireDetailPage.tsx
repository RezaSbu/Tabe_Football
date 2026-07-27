import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Loader2, ExternalLink, MapPin, Trophy, Star } from "lucide-react";
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
      .then(res => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then(data => {
        if (data.success && data.data) {
          setLegionnaire(data.data);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/detail/legionnaire/${id}/view`, { method: "POST" }).catch(() => {});
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error || !legionnaire) {
    return (
      <div className="text-center py-20 space-y-4" dir="rtl">
        <h1 className="text-2xl font-bold text-white">لژیونر یافت نشد</h1>
        <p className="text-gray-400 text-sm">لژیونر مورد نظر وجود ندارد یا حذف شده است.</p>
        <Link to="/legionnaires" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm">
          <ArrowRight className="h-4 w-4" /> بازگشت به لژیونرها
        </Link>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{legionnaire.name} | لژیونر | تب فوتبال</title>
        <meta name="description" content={`عملکرد ${legionnaire.name} لژیونر ایرانی در ${legionnaire.league || ""} - ${legionnaire.team || ""}`} />
        <link rel="canonical" href={`https://tabefootball.com/legionnaire/${id}`} />
        <meta property="og:type" content="profile" />
        <meta property="og:title" content={`${legionnaire.name} | لژیونر`} />
        <meta property="og:description" content={`${legionnaire.team || ""} - ${legionnaire.league || ""}`} />
        {legionnaire.image && <meta property="og:image" content={getSafeImageUrl(legionnaire.image)} />}
        <meta property="og:url" content={`https://tabefootball.com/legionnaire/${id}`} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            "name": legionnaire.name,
            "jobTitle": `فوتبالیست لژیونر - ${legionnaire.team || ""}`,
            "image": legionnaire.image || undefined,
          })}
        </script>
      </Helmet>

      <article className="rounded-2xl bg-[#121215] border border-white/5 p-4 sm:p-6 shadow-xl animate-in fade-in" dir="rtl">
        <Link to="/legionnaires" className="mb-6 flex items-center gap-1.5 rounded-lg bg-gray-955 px-3.5 py-1.5 text-xs text-gray-350 border border-white/5 hover:bg-gray-900 hover:text-white transition w-fit">
          <ArrowRight className="h-4 w-4 text-red-500" />
          <span>بازگشت به لژیونرها</span>
        </Link>

        <div className="grid gap-6 md:grid-cols-12 items-start">
          <div className="md:col-span-4">
            <div className="overflow-hidden rounded-xl bg-gray-950 border border-white/5 shadow-lg">
              <img loading="lazy" decoding="async" src={getSafeImageUrl(legionnaire.image)} alt={legionnaire.name} referrerPolicy="no-referrer" className="w-full h-64 object-cover" />
            </div>
          </div>
          <div className="md:col-span-8 space-y-4">
            <h1 className="font-black text-2xl sm:text-3xl text-white">{legionnaire.name}</h1>
            <div className="flex flex-wrap gap-3 text-sm text-gray-400">
              {legionnaire.team && (
                <span className="flex items-center gap-1.5"><Trophy className="h-4 w-4 text-emerald-500" /> {legionnaire.team}</span>
              )}
              {legionnaire.league && (
                <span className="flex items-center gap-1.5"><Star className="h-4 w-4 text-yellow-500" /> {legionnaire.league}</span>
              )}
              {legionnaire.nationality && (
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-blue-500" /> {legionnaire.nationality}</span>
              )}
            </div>
            {legionnaire.position && (
              <div className="text-sm text-gray-300"><span className="text-gray-500">پست:</span> {legionnaire.position}</div>
            )}
            {(legionnaire.performance || legionnaire.description || legionnaire.details) && (
              <div className="rounded-xl border border-white/5 bg-[#0a0a0c]/55 p-4">
                <h2 className="font-bold text-sm text-white mb-2">عملکرد</h2>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{legionnaire.performance || legionnaire.description || legionnaire.details}</p>
              </div>
            )}
          </div>
        </div>
      </article>
    </>
  );
}

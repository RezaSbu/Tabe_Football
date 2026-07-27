import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Loader2, ArrowDownLeft, ArrowUpRight, Calendar, Shield } from "lucide-react";
import { getSafeImageUrl } from "../utils";

export default function TransferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [transfer, setTransfer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(false);
    fetch(`/api/detail/transfer/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then(data => {
        if (data.success && data.data) {
          setTransfer(data.data);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/detail/transfer/${id}/view`, { method: "POST" }).catch(() => {});
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error || !transfer) {
    return (
      <div className="text-center py-20 space-y-4" dir="rtl">
        <h1 className="text-2xl font-bold text-white">نقل و انتقال یافت نشد</h1>
        <p className="text-gray-400 text-sm">نقل و انتقال مورد نظر وجود ندارد یا حذف شده است.</p>
        <Link to="/transfers" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm">
          <ArrowRight className="h-4 w-4" /> بازگشت به نقل و انتقالات
        </Link>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`انتقال ${transfer.playerName} | تب فوتبال`}</title>
        <meta name="description" content={`انتقال رسمی ${transfer.playerName} از ${transfer.fromTeam} به ${transfer.toTeam}`} />
        <link rel="canonical" href={`https://tabefootball.com/transfer/${id}`} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={`انتقال ${transfer.playerName} به ${transfer.toTeam}`} />
        <meta property="og:description" content={`${transfer.fromTeam} → ${transfer.toTeam}`} />
        {transfer.playerImage && <meta property="og:image" content={getSafeImageUrl(transfer.playerImage)} />}
        <meta property="og:url" content={`https://tabefootball.com/transfer/${id}`} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            "headline": `انتقال ${transfer.playerName} به ${transfer.toTeam}`,
            "description": `${transfer.fromTeam} → ${transfer.toTeam}`,
          })}
        </script>
      </Helmet>

      <article className="rounded-2xl bg-[#121215] border border-white/5 p-4 sm:p-6 shadow-xl animate-in fade-in" dir="rtl">
        <Link to="/transfers" className="mb-6 flex items-center gap-1.5 rounded-lg bg-gray-955 px-3.5 py-1.5 text-xs text-gray-350 border border-white/5 hover:bg-gray-900 hover:text-white transition w-fit">
          <ArrowRight className="h-4 w-4 text-red-500" />
          <span>بازگشت به نقل و انتقالات</span>
        </Link>

        <div className="grid gap-6 md:grid-cols-12 items-start">
          <div className="md:col-span-4">
            <div className="overflow-hidden rounded-xl bg-gray-950 border border-white/5 shadow-lg">
              <img loading="lazy" decoding="async" src={getSafeImageUrl(transfer.playerImage || transfer.player_image || transfer.image)} alt={transfer.playerName} referrerPolicy="no-referrer" className="w-full h-64 object-cover" />
            </div>
          </div>

          <div className="md:col-span-8 space-y-4">
            <span className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-black text-white">
              {transfer.type === "loan" ? "قرضی" : transfer.type === "permanent" || transfer.type === "دائمی" ? "دائمی" : transfer.type || "انتقال"}
            </span>

            <h1 className="font-black text-2xl sm:text-3xl text-white">{transfer.playerName}</h1>

            {transfer.position && (
              <div className="text-sm text-gray-400">پست: <span className="text-white">{transfer.position}</span></div>
            )}

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 bg-red-950/30 border border-red-900/30 rounded-xl px-4 py-3">
                <ArrowUpRight className="h-5 w-5 text-red-400" />
                <div>
                  <div className="text-[10px] text-gray-500">تیم مبدأ</div>
                  <div className="font-bold text-sm text-white">{transfer.fromTeam}</div>
                </div>
                {transfer.fromTeamLogo && (
                  <img loading="lazy" decoding="async" src={getSafeImageUrl(transfer.fromTeamLogo)} alt={transfer.fromTeam} className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                )}
              </div>

              <ArrowRight className="h-6 w-6 text-emerald-500" />

              <div className="flex items-center gap-2 bg-emerald-950/30 border border-emerald-900/30 rounded-xl px-4 py-3">
                {transfer.toTeamLogo && (
                  <img loading="lazy" decoding="async" src={getSafeImageUrl(transfer.toTeamLogo)} alt={transfer.toTeam} className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                )}
                <div>
                  <div className="text-[10px] text-gray-500">تیم مقصد</div>
                  <div className="font-bold text-sm text-white">{transfer.toTeam}</div>
                </div>
                <ArrowDownLeft className="h-5 w-5 text-emerald-400" />
              </div>
            </div>

            {transfer.fee && (
              <div className="text-sm text-gray-400">ارزش انتقال: <span className="text-yellow-400 font-bold">{transfer.fee}</span></div>
            )}

            {(transfer.description || transfer.details) && (
              <div className="rounded-xl border border-white/5 bg-[#0a0a0c]/55 p-4">
                <h2 className="font-bold text-sm text-white mb-2">جزییات</h2>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{transfer.description || transfer.details}</p>
              </div>
            )}

            {transfer.tags && transfer.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {transfer.tags.map((tag: string) => (
                  <span key={tag} className="rounded-lg bg-gray-950 px-2.5 py-1 text-[11px] text-gray-300 border border-white/5">#{tag}</span>
                ))}
              </div>
            )}

            {transfer.date && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Calendar className="h-3.5 w-3.5" />
                {transfer.date}
              </div>
            )}
          </div>
        </div>
      </article>
    </>
  );
}

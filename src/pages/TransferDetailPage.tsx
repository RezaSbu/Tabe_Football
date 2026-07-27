import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Loader2, ArrowUpRight, ArrowDownLeft, Calendar, Eye, Tag, BadgeCheck, Banknote } from "lucide-react";
import { getSafeImageUrl } from "../utils";

export default function TransferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [transfer, setTransfer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(false);
    fetch(`/api/detail/transfer/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => d.success && d.data ? setTransfer(d.data) : setError(true))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/detail/transfer/${id}/view`, { method: "POST" }).catch(() => {});
  }, [id]);

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>;
  if (error || !transfer) return (
    <div className="text-center py-20 space-y-4" dir="rtl">
      <h1 className="text-2xl font-bold text-white">نقل و انتقال یافت نشد</h1>
      <p className="text-gray-400 text-sm">نقل و انتقال مورد نظر وجود ندارد یا حذف شده است.</p>
      <Link to="/transfers" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm"><ArrowRight className="h-4 w-4" /> بازگشت به نقل و انتقالات</Link>
    </div>
  );

  const typeLabel = transfer.type === "loan" ? "قرضی" : transfer.type === "permanent" || transfer.type === "دائمی" ? "دائمی" : transfer.type || "انتقال";
  const imgSrc = getSafeImageUrl(transfer.playerImage || transfer.player_image || transfer.image);

  return (
    <>
      <Helmet>
        <title>{`انتقال ${transfer.playerName} | تب فوتبال`}</title>
        <meta name="description" content={`انتقال رسمی ${transfer.playerName} از ${transfer.fromTeam} به ${transfer.toTeam}`} />
        <link rel="canonical" href={`https://tabefootball.com/transfer/${id}`} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={`انتقال ${transfer.playerName} به ${transfer.toTeam}`} />
        <meta property="og:description" content={`${transfer.fromTeam} → ${transfer.toTeam}`} />
        {transfer.playerImage && <meta property="og:image" content={imgSrc} />}
        <meta property="og:url" content={`https://tabefootball.com/transfer/${id}`} />
        <script type="application/ld+json">
          {JSON.stringify({ "@context": "https://schema.org", "@type": "NewsArticle", "headline": `انتقال ${transfer.playerName} به ${transfer.toTeam}`, "description": `${transfer.fromTeam} → ${transfer.toTeam}` })}
        </script>
      </Helmet>

      <div dir="rtl" className="space-y-4 animate-in fade-in">
        <Link to="/transfers" className="flex items-center gap-1.5 rounded-xl bg-[#121215] px-4 py-2.5 text-xs text-gray-400 border border-white/5 hover:bg-[#1a1a1f] hover:text-white transition w-fit">
          <ArrowRight className="h-4 w-4 text-emerald-500" />
          <span>بازگشت به نقل و انتقالات</span>
        </Link>

        {/* Main card */}
        <div className="rounded-2xl bg-[#121215] border border-white/5 shadow-2xl overflow-hidden">
          <div className="grid md:grid-cols-12">

            {/* Image column — fixed aspect ratio, always consistent */}
            <div className="md:col-span-4 bg-gradient-to-br from-gray-900 to-gray-950 p-6 flex flex-col items-center justify-center relative">
              <div className="relative w-full aspect-[3/4] max-w-[260px] mx-auto rounded-2xl overflow-hidden bg-gray-800/50 border border-white/5 shadow-lg">
                <img
                  loading="lazy" decoding="async"
                  src={imgSrc}
                  alt={transfer.playerName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* View count */}
              <div className="mt-4 flex items-center gap-1.5 text-gray-500">
                <Eye className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium">{(transfer.viewCount || 0).toLocaleString("fa-IR")} بازدید</span>
              </div>
            </div>

            {/* Content column */}
            <div className="md:col-span-8 p-6 sm:p-8 space-y-5">
              {/* Badges + Name */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-400">
                    <BadgeCheck className="h-3.5 w-3.5" /> {typeLabel}
                  </span>
                  {transfer.fee && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-400">
                      <Banknote className="h-3.5 w-3.5" /> {transfer.fee}
                    </span>
                  )}
                  {transfer.date && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/5 px-3 py-1.5 text-xs text-gray-500">
                      <Calendar className="h-3.5 w-3.5" /> {transfer.date}
                    </span>
                  )}
                </div>
                <h1 className="font-black text-2xl sm:text-3xl text-white leading-tight">{transfer.playerName}</h1>
                {transfer.position && <p className="text-sm text-gray-400">پست: <span className="text-white font-medium">{transfer.position}</span></p>}
              </div>

              {/* Transfer flow */}
              <div className="rounded-xl bg-[#0a0a0c] border border-white/5 p-5">
                <div className="flex items-center gap-3">
                  {/* From */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      {transfer.fromTeamLogo ? (
                        <div className="w-12 h-12 shrink-0 rounded-xl bg-[#121215] border border-white/5 flex items-center justify-center overflow-hidden">
                          <img loading="lazy" decoding="async" src={getSafeImageUrl(transfer.fromTeamLogo)} alt="" className="w-9 h-9 object-contain" referrerPolicy="no-referrer" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 shrink-0 rounded-xl bg-[#121215] border border-white/5 flex items-center justify-center text-xl">⚽</div>
                      )}
                      <div className="min-w-0">
                        <div className="text-[10px] text-gray-600 uppercase tracking-wider font-medium">مبدأ</div>
                        <div className="font-bold text-sm text-white truncate">{transfer.fromTeam}</div>
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="shrink-0 flex items-center gap-1">
                    <div className="w-8 h-[1px] bg-gradient-to-l from-emerald-500/0 to-emerald-500/40" />
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <ArrowUpRight className="h-4 w-4 text-emerald-400 rotate-180" />
                    </div>
                    <div className="w-8 h-[1px] bg-gradient-to-r from-emerald-500/0 to-emerald-500/40" />
                  </div>

                  {/* To */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 justify-end">
                      <div className="min-w-0 text-right">
                        <div className="text-[10px] text-gray-600 uppercase tracking-wider font-medium">مقصد</div>
                        <div className="font-bold text-sm text-white truncate">{transfer.toTeam}</div>
                      </div>
                      {transfer.toTeamLogo ? (
                        <div className="w-12 h-12 shrink-0 rounded-xl bg-[#121215] border border-white/5 flex items-center justify-center overflow-hidden">
                          <img loading="lazy" decoding="async" src={getSafeImageUrl(transfer.toTeamLogo)} alt="" className="w-9 h-9 object-contain" referrerPolicy="no-referrer" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 shrink-0 rounded-xl bg-[#121215] border border-white/5 flex items-center justify-center text-xl">⚽</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {(transfer.description || transfer.details) && (
                <div className="rounded-xl bg-[#0a0a0c] border border-white/5 p-5">
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">جزئیات انتقال</h2>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{transfer.description || transfer.details}</p>
                </div>
              )}

              {/* Tags */}
              {transfer.tags && transfer.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {transfer.tags.map((tag: string) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-lg bg-[#0a0a0c] px-2.5 py-1 text-[11px] text-gray-400 border border-white/5">
                      <Tag className="h-3 w-3 text-emerald-500/40" />{tag}
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

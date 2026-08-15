import React, { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Loader2 } from "lucide-react";
import PlayerDetail from "../components/PlayerDetail";
import { getSafeImageUrl, fetchCachedAppData } from "../utils";
import { resolveTeam } from "../shared/teamMatch";

export default function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [player, setPlayer] = useState<any>(null);
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const relatedMatchesRef = useRef<any[] | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(false);
    relatedMatchesRef.current = null;
    fetch(`/api/detail/player/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then(data => {
        if (data.success && data.data) {
          setPlayer(data.data);
          relatedMatchesRef.current = data.data.relatedMatches || [];
          setAllMatches(relatedMatchesRef.current || []);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    fetchCachedAppData()
      .then(d => {
        if (d && d.status === "ok") {
          setAllTeams(d.teams || []);
          if (!relatedMatchesRef.current || relatedMatchesRef.current.length === 0) {
            setAllMatches(d.matches || []);
          }
        }
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/detail/player/${id}/view`, { method: "POST" }).catch(() => {});
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="text-center py-20 space-y-4" dir="rtl">
        <h1 className="text-2xl font-bold text-white">بازیکن یافت نشد</h1>
        <p className="text-gray-400 text-sm">بازیکن مورد نظر وجود ندارد یا حذف شده است.</p>
        <Link to="/" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm">
          <ArrowRight className="h-4 w-4" /> بازگشت به صفحه اصلی
        </Link>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{player.name} | تب فوتبال</title>
        <meta name="description" content={`پروفایل ${player.name} - بازیکن ${player.teamName || ""} - آمار و عملکرد`} />
        <link rel="canonical" href={`https://tabefotbal.ir/player/${id}`} />
        <meta property="og:type" content="profile" />
        <meta property="og:title" content={player.name} />
        <meta property="og:description" content={`پروفایل ${player.name} - ${player.teamName || ""}`} />
        {player.image && <meta property="og:image" content={getSafeImageUrl(player.image)} />}
        <meta property="og:url" content={`https://tabefotbal.ir/player/${id}`} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            "name": player.name,
            "jobTitle": "فوتبالیست",
            "image": player.image || undefined,
          })}
        </script>
      </Helmet>

      <PlayerDetail
        player={player}
        allMatches={allMatches}
        allTeams={allTeams}
        onBack={() => navigate(-1)}
        onSelectTeam={(teamName: string) => {
          const tm = resolveTeam(allTeams, teamName);
          if (tm) navigate(`/team/${tm.id}`);
        }}
        onSelectMatch={(matchId: string) => navigate(`/match/${matchId}`)}
      />
    </>
  );
}

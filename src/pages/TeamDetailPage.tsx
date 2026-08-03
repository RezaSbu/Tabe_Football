import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Loader2 } from "lucide-react";
import TeamDetail from "../components/TeamDetail";
import { getSafeImageUrl } from "../utils";

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [team, setTeam] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [allStandings, setAllStandings] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(false);
    fetch(`/api/detail/team/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then(data => {
        if (data.success && data.data) {
          setTeam(data.data);
          setPlayers(data.data.players || []);
          setCoaches(data.data.coaches || []);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    fetch("/api/data")
      .then(r => r.json())
      .then(d => {
        if (d.status === "ok") {
          setAllMatches(d.matches || []);
          setAllStandings(d.standings || {});
        }
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/detail/team/${id}/view`, { method: "POST" }).catch(() => {});
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="text-center py-20 space-y-4" dir="rtl">
        <h1 className="text-2xl font-bold text-white">تیم یافت نشد</h1>
        <p className="text-gray-400 text-sm">تیم مورد نظر وجود ندارد یا حذف شده است.</p>
        <Link to="/" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm">
          <ArrowRight className="h-4 w-4" /> بازگشت به صفحه اصلی
        </Link>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{team.name} | تب فوتبال</title>
        <meta name="description" content={`اطلاعات تیم ${team.name} - بازیکنان، نتایج و جدول رده‌بندی`} />
        <link rel="canonical" href={`https://tabefootball.com/team/${id}`} />
        <meta property="og:type" content="sports_team" />
        <meta property="og:title" content={team.name} />
        <meta property="og:description" content={`اطلاعات تیم ${team.name}`} />
        {team.logo && <meta property="og:image" content={getSafeImageUrl(team.logo)} />}
        <meta property="og:url" content={`https://tabefootball.com/team/${id}`} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SportsTeam",
            "name": team.name,
            "sport": "Soccer",
            "logo": team.logo || undefined,
          })}
        </script>
      </Helmet>

      <TeamDetail
        team={team}
        players={players}
        coaches={coaches}
        allStandings={allStandings}
        allMatches={allMatches}
        onBack={() => navigate(-1)}
        onSelectPlayer={(pid: string) => navigate(`/player/${pid}`)}
        onSelectCoach={(cid: string) => navigate(`/coach/${cid}`)}
        onSelectMatch={(matchId: string) => navigate(`/match/${matchId}`)}
      />
    </>
  );
}

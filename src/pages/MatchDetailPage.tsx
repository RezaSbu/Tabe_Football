import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Loader2 } from "lucide-react";
import MatchDetailView from "../components/MatchDetailView";
import { computeDynamicAppletStats } from "../utils";

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [match, setMatch] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let hasData = false;
    const fetchMatch = () => {
      fetch(`/api/detail/match/${id}`)
        .then(res => {
          if (!res.ok) throw new Error("not found");
          return res.json();
        })
        .then(data => {
          if (cancelled) return;
          if (data.success && data.data) {
            hasData = true;
            const processed = computeDynamicAppletStats(
              [data.data.match],
              data.data.teams || [],
              data.data.players || [],
              {},
              {}
            );
            setMatch(processed.processedMatches[0]);
            setPlayers(data.data.players || []);
            setTeams(data.data.teams || []);
          } else if (!hasData) {
            setError(true);
          }
        })
        .catch(() => { if (!hasData && !cancelled) setError(true); })
        .finally(() => { if (!cancelled) setLoading(false); });
    };
    fetchMatch();
    const interval = setInterval(fetchMatch, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/detail/match/${id}/view`, { method: "POST" }).catch(() => {});
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="text-center py-20 space-y-4" dir="rtl">
        <h1 className="text-2xl font-bold text-white">مسابقه یافت نشد</h1>
        <p className="text-gray-400 text-sm">مسابقه مورد نظر وجود ندارد یا حذف شده است.</p>
        <Link to="/live-scores" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm">
          <ArrowRight className="h-4 w-4" /> بازگشت به نتایج زنده
        </Link>
      </div>
    );
  }

  const title = `${match.teamHome || "—"} ${match.scoreHome ?? ""} - ${match.scoreAway ?? ""} ${match.teamAway || "—"}`;

  return (
    <>
      <Helmet>
        <title>{title} | تب فوتبال</title>
        <meta name="description" content={`نتیجه مسابقه ${match.teamHome} مقابل ${match.teamAway} - ${match.date || ""}`} />
        <link rel="canonical" href={`https://tabefotbal.ir/match/${id}`} />
        <meta property="og:type" content="sports_event" />
        <meta property="og:title" content={title} />
        <meta property="og:url" content={`https://tabefotbal.ir/match/${id}`} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SportsEvent",
            "name": `${match.teamHome} vs ${match.teamAway}`,
            "startDate": match.date || undefined,
            "eventStatus": match.status === "live" ? "https://schema.org/EventScheduled" : "https://schema.org/EventEnded",
          })}
        </script>
      </Helmet>

      <MatchDetailView
        match={match}
        allMatches={[]}
        allTeams={teams}
        players={players}
        onBack={() => navigate(-1)}
        onSelectPlayer={(pid: string) => navigate(`/player/${pid}`)}
      />
    </>
  );
}

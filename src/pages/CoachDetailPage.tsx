import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Loader2 } from "lucide-react";
import CoachDetail from "../components/CoachDetail";
import { fetchCachedAppData } from "../utils";

export default function CoachDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [coach, setCoach] = useState<any>(null);
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(false);
    fetch(`/api/detail/coach/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then(data => {
        if (data.success && data.data) {
          setCoach(data.data);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    fetchCachedAppData()
      .then(d => { if (d && d.status === "ok") setAllMatches(d.matches || []); })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/detail/coach/${id}/view`, { method: "POST" }).catch(() => {});
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error || !coach) {
    return (
      <div className="text-center py-20 space-y-4" dir="rtl">
        <h1 className="text-2xl font-bold text-white">مربی یافت نشد</h1>
        <p className="text-gray-400 text-sm">مربی مورد نظر وجود ندارد یا حذف شده است.</p>
        <Link to="/" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm">
          <ArrowRight className="h-4 w-4" /> بازگشت به صفحه اصلی
        </Link>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{coach.name} | تب فوتبال</title>
        <meta name="description" content={`پروفایل مربی ${coach.name}`} />
        <link rel="canonical" href={`https://tabefotbal.ir/coach/${id}`} />
        <meta property="og:type" content="profile" />
        <meta property="og:title" content={coach.name} />
        <meta property="og:url" content={`https://tabefotbal.ir/coach/${id}`} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            "name": coach.name,
            "jobTitle": "مربی فوتبال",
          })}
        </script>
      </Helmet>

      <CoachDetail
        coach={coach}
        allMatches={allMatches}
        onBack={() => navigate(-1)}
        onSelectTeam={(teamName: string) => {
          if (coach?.teamId) navigate(`/team/${coach.teamId}`);
          else if (coach?.teamName) navigate(`/team/${encodeURIComponent(coach.teamName)}`);
          else navigate("/");
        }}
      />
    </>
  );
}

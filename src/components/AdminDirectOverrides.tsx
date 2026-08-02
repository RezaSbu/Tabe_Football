import React, { useState, useEffect } from "react";
import { 
  Trophy, 
  Award, 
  Users, 
  ShieldAlert, 
  Check, 
  Sliders, 
  Search, 
  UserPlus, 
  Trash2,
  BookmarkCheck,
  RotateCcw
} from "lucide-react";
import { StandingRow, TeamItem, PlayerItem, StatsData } from "../types";

interface AdminDirectOverridesProps {
  standings: Record<string, StandingRow[]>;
  teams: TeamItem[];
  players: PlayerItem[];
  stats: Record<string, any>;
  onUpdateStandings: (leagueKey: string, rows: StandingRow[]) => Promise<boolean>;
  onUpdateStats: (leagueKey: string, statsData: any) => Promise<boolean>;
  onUpdateTeam: (id: string, data: any) => Promise<boolean>;
  onUpdatePlayer: (id: string, data: any) => Promise<boolean>;
  onRefreshData: () => void;
}

export default function AdminDirectOverrides({
  standings = {},
  teams = [],
  players = [],
  stats = {},
  onUpdateStandings,
  onUpdateStats,
  onUpdateTeam,
  onUpdatePlayer,
  onRefreshData
}: AdminDirectOverridesProps) {
  const [subTab, setSubTab] = useState<"standings" | "leaders" | "teams" | "players">("standings");
  
  // 1. STANDINGS OVERRIDE STATE
  const [standingLeague, setStandingLeague] = useState("pro-league");
  const [standingRows, setStandingRows] = useState<StandingRow[]>([]);

  useEffect(() => {
    if (standings && standings[standingLeague]) {
      setStandingRows(JSON.parse(JSON.stringify(standings[standingLeague])));
    } else {
      setStandingRows([]);
    }
  }, [standingLeague, standings]);

  const handleSaveStandings = async () => {
    // Re-calculate goalDifference and sort them properly by points -> goalDifference -> goalsFor
    const resolvedRows = standingRows.map(r => ({
      ...r,
      goalDifference: Number(r.goalsFor || 0) - Number(r.goalsAgainst || 0)
    }));

    resolvedRows.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return (b.goalsFor || 0) - (a.goalsFor || 0);
    });

    // Re-rank items
    const rankedRows = resolvedRows.map((r, i) => ({
      ...r,
      rank: i + 1
    }));

    const success = await onUpdateStandings(standingLeague, rankedRows);
    if (success) {
      alert("جدول رده‌بندی با موفقیت ویرایش و مجدداً مرتب گردید.");
      onRefreshData();
    }
  };

  // 2. LEADERS OVERRIDE STATE
  const [statsLeague, setStatsLeague] = useState("pro-league");
  const [scorers, setScorers] = useState<any[]>([]);
  const [assists, setAssists] = useState<any[]>([]);
  const [cleansheets, setCleansheets] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);

  useEffect(() => {
    if (stats && stats[statsLeague]) {
      setScorers(JSON.parse(JSON.stringify(stats[statsLeague].scorers || [])));
      setAssists(JSON.parse(JSON.stringify(stats[statsLeague].assists || [])));
      setCleansheets(JSON.parse(JSON.stringify(stats[statsLeague].cleansheets || [])));
      setRatings(JSON.parse(JSON.stringify(stats[statsLeague].ratings || [])));
    } else {
      setScorers([]);
      setAssists([]);
      setCleansheets([]);
      setRatings([]);
    }
  }, [statsLeague, stats]);

  const handleSaveStats = async () => {
    // Sort and re-rank scorers
    const sortedScorers = scorers.map((s) => ({ ...s, goals: Number(s.goals) }))
      .sort((a, b) => b.goals - a.goals)
      .map((s, idx) => ({ ...s, rank: idx + 1 }));

    // Sort and re-rank assists
    const sortedAssists = assists.map((a) => ({ ...a, assists: Number(a.assists) }))
      .sort((a, b) => b.assists - a.assists)
      .map((a, idx) => ({ ...a, rank: idx + 1 }));

    // Sort and re-rank cleansheets
    const sortedCleansheets = cleansheets.map((c) => {
      const csCount = c.cleanSheets !== undefined ? c.cleanSheets : (c.cleansheets !== undefined ? c.cleansheets : (c.clean_sheets || 0));
      return { ...c, cleanSheets: Number(csCount) };
    })
      .sort((a, b) => b.cleanSheets - a.cleanSheets)
      .map((c, idx) => ({ ...c, rank: idx + 1 }));

    // Sort and re-rank ratings
    const sortedRatings = ratings.map((r) => ({ ...r, rating: Number(r.rating) }))
      .sort((a, b) => b.rating - a.rating)
      .map((r, idx) => ({ ...r, rank: idx + 1 }));

    const success = await onUpdateStats(statsLeague, {
      ...stats[statsLeague],
      scorers: sortedScorers,
      assists: sortedAssists,
      cleansheets: sortedCleansheets,
      ratings: sortedRatings
    });

    if (success) {
      alert("لیست آقای گل، پاس گل، کلین‌شیت و نمرات بازیکنان همگام‌سازی شد.");
      onRefreshData();
    }
  };

  // 3. TEAMS PROFILE OVERRIDE
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [teamForm, setTeamForm] = useState({
    name: "",
    coach: "",
    city: "",
    stadium: "",
    founded: "",
    coverImage: "",
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    points: 0
  });

  const handleSelectTeam = (id: string) => {
    setSelectedTeamId(id);
    const tm = teams.find(t => t.id === id);
    if (tm) {
      setTeamForm({
        name: tm.name || "",
        coach: tm.coach || "",
        city: tm.city || "",
        stadium: tm.stadium || "",
        founded: tm.founded || "",
        coverImage: tm.coverImage || "",
        played: Number(tm.stats?.played || 0),
        won: Number(tm.stats?.won || 0),
        drawn: Number(tm.stats?.drawn || 0),
        lost: Number(tm.stats?.lost || 0),
        points: Number(tm.stats?.points || 0)
      });
    }
  };

  const handleSaveTeamOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) return;

    const payload = {
      name: teamForm.name,
      coach: teamForm.coach,
      city: teamForm.city,
      stadium: teamForm.stadium,
      founded: teamForm.founded,
      coverImage: teamForm.coverImage,
      stats: {
        played: Number(teamForm.played),
        won: Number(teamForm.won),
        drawn: Number(teamForm.drawn),
        lost: Number(teamForm.lost),
        points: Number(teamForm.points)
      }
    };

    const success = await onUpdateTeam(selectedTeamId, payload);
    if (success) {
      alert("پروفایل تیمی و آمار ورزشی باشگاه با موفقیت تغییر کرد.");
      onRefreshData();
    }
  };

  // 4. PLAYERS PROFILE OVERRIDE
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [playerForm, setPlayerForm] = useState({
    name: "",
    position: "",
    goals: 0,
    assists: 0,
    matches: 0,
    cleanSheets: 0,
    injured: false,
    suspended: false
  });

  const handleSelectPlayer = (id: string) => {
    setSelectedPlayerId(id);
    const pl = players.find(p => p.id === id);
    if (pl) {
      setPlayerForm({
        name: pl.name || "",
        position: pl.position || "هافبک",
        goals: Number(pl.goals || pl.seasonStats?.goals || 0),
        assists: Number(pl.assists || pl.seasonStats?.assists || 0),
        matches: Number(pl.matchesPlayed || pl.seasonStats?.matches || 0),
        cleanSheets: Number(pl.seasonStats?.cleanSheets || 0),
        injured: Boolean(pl.achievements?.includes("مصدوم") || false), // placeholder suspended or custom
        suspended: Boolean(pl.achievements?.includes("محروم") || false)
      });
    }
  };

  const handleSavePlayerOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId) return;

    const achievementsList: string[] = [];
    if (playerForm.injured) achievementsList.push("مصدوم");
    if (playerForm.suspended) achievementsList.push("محروم");

    const payload = {
      goals: Number(playerForm.goals),
      assists: Number(playerForm.assists),
      matchesPlayed: Number(playerForm.matches),
      achievements: achievementsList,
      seasonStats: {
        matches: Number(playerForm.matches),
        goals: Number(playerForm.goals),
        assists: Number(playerForm.assists),
        cleanSheets: playerForm.position === "دروازه‌بان" ? Number(playerForm.cleanSheets) : 0
      }
    };

    const success = await onUpdatePlayer(selectedPlayerId, payload);
    if (success) {
      alert("پروفایل شخصی و عملکرد فصل بازیکن کاملاً بروزرسانی و اعمال شد.");
      onRefreshData();
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Sub tabs block */}
      <div className="flex border-b border-white/5 pb-2 gap-2 text-xs">
        <button
          onClick={() => setSubTab("standings")}
          className={`px-4 py-2 font-bold rounded-lg transition ${subTab === "standings" ? "bg-red-655 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          🏆 ویرایش مستقیم رده‌بندی
        </button>
        <button
          onClick={() => setSubTab("leaders")}
          className={`px-4 py-2 font-bold rounded-lg transition ${subTab === "leaders" ? "bg-red-655 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          ⚽ ویرایش آقای گل و پاس گل
        </button>
        <button
          onClick={() => setSubTab("teams")}
          className={`px-4 py-2 font-bold rounded-lg transition ${subTab === "teams" ? "bg-red-655 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          🛡️ ادیت پروفایل و آمار باشگاه‌ها
        </button>
        <button
          onClick={() => setSubTab("players")}
          className={`px-4 py-2 font-bold rounded-lg transition ${subTab === "players" ? "bg-red-655 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          🏃 ادیت پروفایل و آمار بازیکنان
        </button>
      </div>

      {/* RENDER TAB 1: STANDINGS GRID */}
      {subTab === "standings" && (
        <div className="bg-[#0b0b0f] border border-white/5 p-5 rounded-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <h3 className="font-extrabold text-sm text-white">جدول کاربرگ ویرایش زنده رده‌بندی (Standings Sheet)</h3>
            <select
              value={standingLeague}
              onChange={e => setStandingLeague(e.target.value)}
              className="bg-slate-950 text-xs border border-white/10 rounded-lg p-2 font-bold text-white"
            >
              <option value="pro-league">لیگ برتر خلیج فارس</option>
              <option value="league-1">لیگ دسته یک آزادگان</option>
              <option value="league-2-group-a">لیگ دو گروه الف</option>
              <option value="league-2-group-b">لیگ دو گروه ب</option>
              <option value="futsal">لیگ برتر فوتسال</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold divide-y divide-white/5">
                <tr className="divide-x divide-x-reverse divide-white/5">
                  <th className="p-3 w-16 text-center">رتبه فعلی</th>
                  <th className="p-3">باشگاه</th>
                  <th className="p-3 w-16 text-center">بازی‌ها</th>
                  <th className="p-3 w-16 text-center">برد</th>
                  <th className="p-3 w-16 text-center">مساوی</th>
                  <th className="p-3 w-16 text-center">باخت</th>
                  <th className="p-3 w-20 text-center">گل زده</th>
                  <th className="p-3 w-20 text-center">گل خورده</th>
                  <th className="p-3 w-20 text-center">کل امتیاز</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {standingRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] divide-x divide-x-reverse divide-white/5">
                    <td className="p-2 text-center font-mono text-gray-500">{row.rank}</td>
                    <td className="p-2 font-bold text-white">{row.team}</td>
                    
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        value={row.played}
                        onChange={e => {
                          const updated = [...standingRows];
                          updated[idx].played = Number(e.target.value);
                          setStandingRows(updated);
                        }}
                        className="w-12 bg-black text-center p-1 border border-white/5 rounded font-mono text-white"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        value={row.won}
                        onChange={e => {
                          const updated = [...standingRows];
                          updated[idx].won = Number(e.target.value);
                          setStandingRows(updated);
                        }}
                        className="w-12 bg-black text-center p-1 border border-white/5 rounded font-mono text-white"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        value={row.drawn}
                        onChange={e => {
                          const updated = [...standingRows];
                          updated[idx].drawn = Number(e.target.value);
                          setStandingRows(updated);
                        }}
                        className="w-12 bg-black text-center p-1 border border-white/5 rounded font-mono text-white"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        value={row.lost}
                        onChange={e => {
                          const updated = [...standingRows];
                          updated[idx].lost = Number(e.target.value);
                          setStandingRows(updated);
                        }}
                        className="w-12 bg-black text-center p-1 border border-white/5 rounded font-mono text-white"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        value={row.goalsFor}
                        onChange={e => {
                          const updated = [...standingRows];
                          updated[idx].goalsFor = Number(e.target.value);
                          setStandingRows(updated);
                        }}
                        className="w-16 bg-black text-center p-1 border border-white/5 rounded font-mono text-slate-100"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        value={row.goalsAgainst}
                        onChange={e => {
                          const updated = [...standingRows];
                          updated[idx].goalsAgainst = Number(e.target.value);
                          setStandingRows(updated);
                        }}
                        className="w-16 bg-black text-center p-1 border border-white/5 rounded font-mono text-slate-100"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        value={row.points}
                        onChange={e => {
                          const updated = [...standingRows];
                          updated[idx].points = Number(e.target.value);
                          setStandingRows(updated);
                        }}
                        className="w-16 bg-black text-center p-1 border border-emerald-950 bg-emerald-950/20 rounded font-mono text-emerald-400 font-extrabold"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-3">
            <button
              onClick={handleSaveStandings}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl cursor-pointer"
            >
              ذخیره تغییرات جدول رده‌بندی لیگ
            </button>
          </div>
        </div>
      )}

      {/* RENDER TAB 2: LEADERBOARD OVERRIDES */}
      {subTab === "leaders" && (
        <div className="bg-[#0b0b0f] border border-white/5 p-5 rounded-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <h3 className="font-extrabold text-sm text-white">کاربرگ آمار برترین‌ها (گل‌، پاس گل، کلین‌شیت و نمرات)</h3>
            <select
              value={statsLeague}
              onChange={e => setStatsLeague(e.target.value)}
              className="bg-slate-950 text-xs border border-white/10 rounded-lg p-2 font-bold text-white"
            >
              <option value="pro-league">لیگ برتر خلیج فارس</option>
              <option value="league-1">لیگ دسته یک آزادگان</option>
              <option value="league-2">لیگ دسته دو فوتبال</option>
              <option value="hazfi-cup">جام حذفی فوتبال کشور</option>
              <option value="futsal">لیگ برتر فوتسال</option>
            </select>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Top Scorers box */}
            <div className="space-y-3">
              <span className="font-extrabold text-xs text-red-500 block border-r-2 border-red-500 pr-2">🏆 لیست مستقیم جدول آقای گل لیگ</span>
              <div className="divide-y divide-white/5 max-h-96 overflow-y-auto bg-black/45 rounded-xl border border-white/5 p-3">
                {scorers.length === 0 ? (
                  <p className="text-gray-500 text-[11px] text-center py-4">گلی ثبت نشده است.</p>
                ) : (
                  scorers.map((sc, idx) => (
                    <div key={idx} className="py-2 flex justify-between items-center text-[11px]">
                      <span className="font-bold text-slate-100">{sc.name} ({sc.team})</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-gray-500">تعداد گل:</span>
                        <input
                          type="number"
                          value={sc.goals}
                          onChange={e => {
                            const updated = [...scorers];
                            updated[idx].goals = Number(e.target.value);
                            setScorers(updated);
                          }}
                          className="w-12 bg-black text-center border border-white/5 p-1 rounded text-white"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Assists Box */}
            <div className="space-y-3">
              <span className="font-extrabold text-xs text-sky-400 block border-r-2 border-sky-500 pr-2">🏆 لیست مستقیم جدول برترین پاس گل دهندگان</span>
              <div className="divide-y divide-white/5 max-h-96 overflow-y-auto bg-black/45 rounded-xl border border-white/5 p-3">
                {assists.length === 0 ? (
                  <p className="text-gray-500 text-[11px] text-center py-4">پاس گلی ثبت نشده است.</p>
                ) : (
                  assists.map((as, idx) => (
                    <div key={idx} className="py-2 flex justify-between items-center text-[11px]">
                      <span className="font-bold text-slate-100">{as.name} ({as.team})</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-gray-500">پاس گل:</span>
                        <input
                          type="number"
                          value={as.assists}
                          onChange={e => {
                            const updated = [...assists];
                            updated[idx].assists = Number(e.target.value);
                            setAssists(updated);
                          }}
                          className="w-12 bg-black text-center border border-white/5 p-1 rounded text-white"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Clean Sheets Box */}
            <div className="space-y-3">
              <span className="font-extrabold text-xs text-emerald-400 block border-r-2 border-emerald-500 pr-2">🧤 لیست مستقیم جدول کلین‌شیت دروازه‌بانان</span>
              <div className="divide-y divide-white/5 max-h-96 overflow-y-auto bg-black/45 rounded-xl border border-white/5 p-3">
                {cleansheets.length === 0 ? (
                  <p className="text-gray-500 text-[11px] text-center py-4">کلین‌شیتی ثبت نشده است.</p>
                ) : (
                  cleansheets.map((cs, idx) => {
                    const cleanSheetsVal = cs.cleanSheets !== undefined ? cs.cleanSheets : (cs.cleansheets !== undefined ? cs.cleansheets : (cs.clean_sheets || 0));
                    return (
                      <div key={idx} className="py-2 flex justify-between items-center text-[11px]">
                        <span className="font-bold text-slate-100">{cs.name} ({cs.team})</span>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-gray-500">کلین‌شیت:</span>
                          <input
                            type="number"
                            value={cleanSheetsVal}
                            onChange={e => {
                              const updated = [...cleansheets];
                              updated[idx].cleanSheets = Number(e.target.value);
                              setCleansheets(updated);
                            }}
                            className="w-12 bg-black text-center border border-white/5 p-1 rounded text-white"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Top SofaScore Ratings Box */}
            <div className="space-y-3">
              <span className="font-extrabold text-xs text-amber-500 block border-r-2 border-amber-500 pr-2">★ لیست مستقیم بالاترین نمرات SofaScore</span>
              <div className="divide-y divide-white/5 max-h-96 overflow-y-auto bg-black/45 rounded-xl border border-white/5 p-3">
                {ratings.length === 0 ? (
                  <p className="text-gray-500 text-[11px] text-center py-4">نمره‌ای ثبت نشده است.</p>
                ) : (
                  ratings.map((rt, idx) => (
                    <div key={idx} className="py-2 flex justify-between items-center text-[11px]">
                      <span className="font-bold text-slate-100">{rt.name} ({rt.team})</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-gray-500">نمره:</span>
                        <input
                          type="number"
                          step="0.1"
                          value={rt.rating}
                          onChange={e => {
                            const updated = [...ratings];
                            updated[idx].rating = Number(e.target.value);
                            setRatings(updated);
                          }}
                          className="w-14 bg-black text-center border border-white/5 p-1 rounded text-white font-bold"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              onClick={handleSaveStats}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl cursor-pointer"
            >
              ذخیره جدول آمار و نمرات لیگ
            </button>
          </div>
        </div>
      )}

      {/* RENDER TAB 3: TEAMS DIRECT ADJUSTMENT */}
      {subTab === "teams" && (
        <div className="bg-[#0b0b0f] border border-white/5 p-5 rounded-2xl space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-white/5 pb-3">
            <h3 className="font-extrabold text-sm text-white">اصلاح بیوگرافی و عملکرد فصلی باشگاه‌ها</h3>
            <select
              value={selectedTeamId}
              onChange={e => handleSelectTeam(e.target.value)}
              className="bg-slate-950 text-xs border border-white/10 rounded-lg p-2 font-bold text-white w-full md:w-64"
            >
              <option value="">-- یک تیم انتخاب کنید --</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {selectedTeamId ? (
            <form onSubmit={handleSaveTeamOverride} className="space-y-4 max-w-2xl">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1.5">عنوان باشگاه</label>
                  <input
                    type="text"
                    required
                    value={teamForm.name}
                    onChange={e => setTeamForm({ ...teamForm, name: e.target.value })}
                    className="w-full text-xs rounded bg-black p-2 border border-white/5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1.5">سرمربی</label>
                  <input
                    type="text"
                    value={teamForm.coach}
                    onChange={e => setTeamForm({ ...teamForm, coach: e.target.value })}
                    className="w-full text-xs rounded bg-black p-2 border border-white/5 text-white"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1.5">شهر خانگی</label>
                  <input
                    type="text"
                    value={teamForm.city}
                    onChange={e => setTeamForm({ ...teamForm, city: e.target.value })}
                    className="w-full text-xs rounded bg-black p-2 border border-white/5"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1.5">ورزشگاه</label>
                  <input
                    type="text"
                    value={teamForm.stadium}
                    onChange={e => setTeamForm({ ...teamForm, stadium: e.target.value })}
                    className="w-full text-xs rounded bg-black p-2 border border-white/5"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1.5">سال تاسیس</label>
                  <input
                    type="text"
                    value={teamForm.founded}
                    onChange={e => setTeamForm({ ...teamForm, founded: e.target.value })}
                    className="w-full text-xs rounded bg-black p-2 border border-white/5"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-1">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1.5">آدرس تصویر کاور (بنر بالای پروفایل باشگاه)</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={teamForm.coverImage}
                    onChange={e => setTeamForm({ ...teamForm, coverImage: e.target.value })}
                    className="w-full text-xs rounded bg-black p-2 border border-white/5 text-left font-mono"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5 space-y-3">
                <span className="font-extrabold text-[10px] text-white block">کارنامه عملکرد مستقل باشگاه (مستقل از تاریخچه بازی‌ها):</span>
                <div className="grid gap-2 grid-cols-5 text-center text-xs">
                  <div>
                    <label className="block text-[9px] text-gray-500 mb-1">بازی</label>
                    <input
                      type="number"
                      value={teamForm.played}
                      onChange={e => setTeamForm({ ...teamForm, played: Number(e.target.value) })}
                      className="w-full text-center bg-black rounded p-1 border border-white/5"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-gray-500 mb-1">برد</label>
                    <input
                      type="number"
                      value={teamForm.won}
                      onChange={e => setTeamForm({ ...teamForm, won: Number(e.target.value) })}
                      className="w-full text-center bg-black rounded p-1 border border-white/5"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-gray-500 mb-1">مساوی</label>
                    <input
                      type="number"
                      value={teamForm.drawn}
                      onChange={e => setTeamForm({ ...teamForm, drawn: Number(e.target.value) })}
                      className="w-full text-center bg-black rounded p-1 border border-white/5"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-gray-500 mb-1">باخت</label>
                    <input
                      type="number"
                      value={teamForm.lost}
                      onChange={e => setTeamForm({ ...teamForm, lost: Number(e.target.value) })}
                      className="w-full text-center bg-black rounded p-1 border border-white/5"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-gray-500 mb-1">امتیاز</label>
                    <input
                      type="number"
                      value={teamForm.points}
                      onChange={e => setTeamForm({ ...teamForm, points: Number(e.target.value) })}
                      className="w-full text-center bg-emerald-950/40 font-bold border border-emerald-900/50 rounded p-1 text-emerald-400"
                    />
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 text-black font-black text-xs rounded-xl cursor-pointer"
                >
                  ذخیره تغییرات مستقیم فرم باشگاه
                </button>
              </div>
            </form>
          ) : (
            <p className="text-xs text-slate-500 italic py-6 text-center">خواهشمند است یکی از باشگاه‌های پورتال را جهت ویرایش مستقیم آمار انتخاب کنید.</p>
          )}
        </div>
      )}

      {/* RENDER TAB 4: PLAYERS DIRECT ADJUSTMENT */}
      {subTab === "players" && (
        <div className="bg-[#0b0b0f] border border-white/5 p-5 rounded-2xl space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-white/5 pb-3">
            <h3 className="font-extrabold text-sm text-white">جایگزینی مستقیم عملکرد انفرادی و برچسب‌های پزشکی بازیکنان</h3>
            <select
              value={selectedPlayerId}
              onChange={e => handleSelectPlayer(e.target.value)}
              className="bg-slate-950 text-xs border border-white/10 rounded-lg p-2 font-bold text-white w-full md:w-64"
            >
              <option value="">-- یک بازیکن انتخاب کنید --</option>
              {players.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.teamName})</option>
              ))}
            </select>
          </div>

          {selectedPlayerId ? (
            <form onSubmit={handleSavePlayerOverride} className="space-y-4 max-w-2xl">
              <div className="text-sm font-bold text-slate-200 border-b border-white/[0.03] pb-1.5">
                ویرایش مشخصات: {playerForm.name} ({playerForm.position})
              </div>

              <div className="grid gap-3 grid-cols-4 text-center text-xs">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">کل مسابقات</label>
                  <input
                    type="number"
                    value={playerForm.matches}
                    onChange={e => setPlayerForm({ ...playerForm, matches: Number(e.target.value) })}
                    className="w-full text-center bg-black rounded p-2.5 border border-white/5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">گل‌های زده</label>
                  <input
                    type="number"
                    value={playerForm.goals}
                    onChange={e => setPlayerForm({ ...playerForm, goals: Number(e.target.value) })}
                    className="w-full text-center bg-black rounded p-2.5 border border-white/5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">پاس‌های گل</label>
                  <input
                    type="number"
                    value={playerForm.assists}
                    onChange={e => setPlayerForm({ ...playerForm, assists: Number(e.target.value) })}
                    className="w-full text-center bg-black rounded p-2.5 border border-white/5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">کلین شیت (مخصوص دروازه‌بان)</label>
                  <input
                    type="number"
                    disabled={playerForm.position !== "دروازه‌بان"}
                    value={playerForm.cleanSheets}
                    onChange={e => setPlayerForm({ ...playerForm, cleanSheets: Number(e.target.value) })}
                    className="w-full text-center bg-black rounded p-2.5 border border-white/5 text-white disabled:opacity-40"
                  />
                </div>
              </div>

              {/* Injury and Suspension state checkboxes */}
              <div className="bg-slate-950 p-4 rounded-xl border border-white/5 flex gap-6 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-red-400">
                  <input
                    type="checkbox"
                    checked={playerForm.injured}
                    onChange={e => setPlayerForm({ ...playerForm, injured: e.target.checked })}
                    className="rounded accent-red-655"
                  />
                  <span>برچسب مصدوم (خارج از کادر فنی)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-orange-400">
                  <input
                    type="checkbox"
                    checked={playerForm.suspended}
                    onChange={e => setPlayerForm({ ...playerForm, suspended: e.target.checked })}
                    className="rounded accent-orange-600"
                  />
                  <span>محرومیت انضباطی (تعلیق سه اخطاره)</span>
                </label>
              </div>

              <div>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 text-black font-black text-xs rounded-xl cursor-pointer"
                >
                  ذخیره اطلاعات و تراز آماری بازیکن
                </button>
              </div>
            </form>
          ) : (
            <p className="text-xs text-slate-500 italic py-6 text-center">خواهشمند است یکی از بازیکنان را برای دسترسی به پنل تراز انتخاب کنید.</p>
          )}
        </div>
      )}
    </div>
  );
}

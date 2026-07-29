import React, { useState, useEffect } from "react";
import { 
  Vote, 
  Bell, 
  BellRing, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Check, 
  AlertCircle,
  Clock,
  Radio,
  Gamepad2,
  PieChart
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MatchItem } from "../types";
import { getSafeImageUrl } from "../utils";
import TeamLogo from "./TeamLogo";

interface FanPredictionsProps {
  matches: MatchItem[];
  predictionsData: Record<string, any>;
  onVote: (matchId: string, prediction: "home" | "draw" | "away", score: string) => Promise<void>;
  subscribedTeams: string[];
  onToggleSubscription: (team: string) => void;
  triggerMockGoalNotification: () => void;
  popularTeams?: any[];
}

export default function FanPredictions({
  matches,
  predictionsData,
  onVote,
  subscribedTeams,
  onToggleSubscription,
  triggerMockGoalNotification,
  popularTeams = []
}: FanPredictionsProps) {
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [predictionType, setPredictionType] = useState<"home" | "draw" | "away" | null>(null);
  const [scoreHome, setScoreHome] = useState<string>("");
  const [scoreAway, setScoreAway] = useState<string>("");
  const [hasVotedMap, setHasVotedMap] = useState<Record<string, boolean>>({});
  const [selectedMatchForStats, setSelectedMatchForStats] = useState<string>("");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Candidates for user predictions (Live or Not-Started fixtures)
  const predictMatches = matches.filter(
    m => m.status === "live" || m.status === "not-started"
  );

  useEffect(() => {
    if (predictMatches.length > 0 && !selectedMatchId) {
      setSelectedMatchId(predictMatches[0].id);
      setSelectedMatchForStats(predictMatches[0].id);
    }
  }, [matches, predictMatches, selectedMatchId]);

  // Load votes from client localStorage
  useEffect(() => {
    const saved = localStorage.getItem("fan_predictions_votes");
    if (saved) {
      try {
        setHasVotedMap(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse votes from storage:", e);
      }
    }
    
    // Attempt system Web Push notification check
    if ("Notification" in window && Notification.permission === "default") {
      try {
        Notification.requestPermission();
      } catch (_e) { /* permission denied */ }
    }
  }, []);

  const handleVoteSubmit = async () => {
    if (!selectedMatchId || !predictionType) return;
    const scoreVal = scoreHome && scoreAway ? `${scoreHome}-${scoreAway}` : "";
    
    await onVote(selectedMatchId, predictionType, scoreVal);
    
    const updated = { ...hasVotedMap, [selectedMatchId]: true };
    setHasVotedMap(updated);
    localStorage.setItem("fan_predictions_votes", JSON.stringify(updated));
    setSelectedMatchForStats(selectedMatchId);
    
    // Synthesize physical whistle sound for instant response action
    if (soundEnabled) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1000, audioContext.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        osc.start();
        osc.stop(audioContext.currentTime + 0.15);
      } catch (_e) { /* audio not supported */ }
    }
  };

  // Safe fallback statistics computation
  const currentMatchStats = predictionsData[selectedMatchForStats] || {
    totalVotes: 480,
    votesHome: 240,
    votesDraw: 120,
    votesAway: 120,
    scorePredictions: { "2-1": 180, "1-1": 140, "1-0": 90, "2-0": 70 }
  };

  const total = currentMatchStats.totalVotes || 1;
  const pctHome = Math.round((currentMatchStats.votesHome / total) * 100);
  const pctDraw = Math.round((currentMatchStats.votesDraw / total) * 100);
  const pctAway = Math.round((currentMatchStats.votesAway / total) * 100);

  const matchedMatch = matches.find(m => m.id === selectedMatchId);
  const matchedStatsMatch = matches.find(m => m.id === selectedMatchForStats);

  return (
    <div id="central-prediction-bento-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
      
      {/* CARD 1: PUSH NOTIFICATIONS SETTINGS */}
      <div className="bg-[#121215] rounded-2xl border border-white/5 p-5 flex flex-col justify-between transition hover:border-white/10 shadow-xl relative overflow-hidden" id="card-alert-options">
        {/* Accent highlight decoration indicator */}
        <div className="absolute top-0 right-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-80" />
        
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Bell size={18} className="animate-pulse" />
              </span>
              <div>
                <h3 className="text-sm font-black text-white">سامانه نوتیفیکیشن زنده گل‌ها</h3>
                <span className="text-[10px] text-amber-550 font-bold block">وب‌پوش لحظه‌ای دسکتاپ و موبایل</span>
              </div>
            </div>
            
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-lg bg-gray-950/80 border border-white/5 hover:border-white/10 text-slate-400 transition"
              title={soundEnabled ? "قطع صدای نوتیفیکیشن" : "فعال‌سازی صدا"}
            >
              {soundEnabled ? <Volume2 size={15} className="text-amber-400" /> : <VolumeX size={15} />}
            </button>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
            تیم‌های محبوب تان را انتخاب کنید تا به محض ثبت گل در مسابقات، سوت لحظه‌ای داور و اعلان زنده روی صفحه نمایش شما ظاهر شود.
          </p>

          <div className="space-y-3 mb-5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">فهرست کانال اشتراک تیم‌ها:</span>
            <div className="flex flex-wrap gap-1.5">
              {popularTeams.map((t) => {
                const isSubscribed = subscribedTeams.includes(t.name);
                return (
                  <button
                    key={t.name}
                    onClick={() => onToggleSubscription(t.name)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold cursor-pointer transition-all border ${
                      isSubscribed 
                        ? `${t.color} border-white/15 scale-103 shadow-md shadow-red-955/20` 
                        : "bg-gray-950/90 text-slate-300 border-white/5 hover:bg-gray-900 hover:text-white"
                    }`}
                  >
                    <span>{t.emoji}</span>
                    <span>{t.name}</span>
                    {isSubscribed && <Check size={12} className="stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* REALTIME SIMULATOR SIMULATE GOAL */}
          <div className="p-3.5 rounded-xl bg-gray-950/60 border border-white/5 mb-3">
            <div className="flex items-center gap-1 mb-1.5">
              <Sparkles size={13} className="text-amber-500" />
              <span className="text-[10px] font-black text-amber-500">پانل شبیه‌سازی تست صدا و نمایش</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
              برای آزمایش صحت کارکرد صدای سوت و موتور اعلانات در مرورگرتان، دکمه تست زیر را بفشارید.
            </p>
            <button
              onClick={triggerMockGoalNotification}
              className="w-full py-2 px-3 rounded-lg bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-550 text-slate-950 text-[11px] font-black flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer shadow"
            >
              <BellRing size={13} />
              <span>ارسال پاپ‌آپ و شبیه‌سازی زنگ مسابقه</span>
            </button>
          </div>
        </div>

        <div className="pt-2 text-[9px] text-gray-500 flex items-center gap-1 border-t border-white/5">
          <AlertCircle size={11} className="text-gray-650" />
          <span>پشتیبانی از مرورگرهای کروم، سافاری و فایرفاکس موبایل</span>
        </div>
      </div>

      {/* CARD 2: SUBMIT MATCH PREDICTIONS */}
      <div className="bg-[#121215] rounded-2xl border border-white/5 p-5 flex flex-col justify-between transition hover:border-white/10 shadow-xl relative overflow-hidden" id="card-prediction-form">
        {/* Accent highlight decoration indicator */}
        <div className="absolute top-0 right-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-80" />

        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-red-500/10 text-red-500">
                <Gamepad2 size={18} />
              </span>
              <div>
                <h3 className="text-sm font-black text-white">پیش‌بینی تقابل‌های پیش‌ رو</h3>
                <span className="text-[10px] text-red-400 font-bold block">ثبت حدس عادلانه بازی‌های زنده</span>
              </div>
            </div>
            {matchedMatch && (
              <span className="rounded bg-gray-950 px-2 py-0.5 text-[9px] font-bold text-gray-400 border border-white/5 flex items-center gap-1">
                <Radio size={10} className="text-red-500 animate-pulse" />
                <span>برگزار نشده</span>
              </span>
            )}
          </div>

          {predictMatches.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-xs">
              مسابقه‌ای برای حدس‌زنی فعال نیست.
            </div>
          ) : (
            <div className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-1.5">کدام رقابت را پیش‌بینی می‌کنید؟</label>
                <select
                  value={selectedMatchId}
                  onChange={(e) => {
                    setSelectedMatchId(e.target.value);
                    setPredictionType(null);
                    setScoreHome("");
                    setScoreAway("");
                  }}
                  className="w-full bg-gray-950 text-xs border border-white/5 rounded-lg py-2 px-2.5 focus:outline-none focus:border-red-500 text-white font-bold transition"
                >
                  {predictMatches.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.teamHome} - {m.teamAway} ({m.league === "pro-league" ? "لیگ برتر" : "جام حذفی"})
                    </option>
                  ))}
                </select>
              </div>

              {matchedMatch && (
                <div className="p-3 rounded-xl bg-gray-950/50 border border-white/5 space-y-3">
                  {/* Team Logos Matchup */}
                  <div className="flex items-center justify-between text-center py-1">
                    <div className="flex-1 flex flex-col items-center">
                      <TeamLogo logo={matchedMatch.teamHomeLogo} fallback="⚽" size="md" />
                      <span className="text-[11px] font-black text-white truncate max-w-[95px]">{matchedMatch.teamHome}</span>
                    </div>

                    <div className="px-2 flex flex-col items-center">
                      <span className="text-[9px] font-black text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full mb-1">vs</span>
                      <div className="flex items-center gap-1 text-[9px] text-gray-500">
                        <Clock size={10} />
                        <span>{matchedMatch.time}</span>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col items-center">
                      <TeamLogo logo={matchedMatch.teamAwayLogo} fallback="⚽" size="md" />
                      <span className="text-[11px] font-black text-white truncate max-w-[95px]">{matchedMatch.teamAway}</span>
                    </div>
                  </div>

                  {hasVotedMap[selectedMatchId] ? (
                    <div className="py-2.5 text-center bg-green-500/5 rounded-lg border border-green-500/15">
                      <div className="inline-flex p-1 w-6 h-6 items-center justify-center bg-green-500/10 text-green-400 rounded-full mb-1">
                        <Check size={14} className="stroke-[3]" />
                      </div>
                      <p className="text-[11px] font-black text-green-400">پیش‌بینی شما با موفقیت ثبت شد!</p>
                      <p className="text-[9px] text-gray-500 mt-0.5">آمار توزیع آرا را در ستون بعدی مشاهده کنید</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Choices buttons */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => setPredictionType("home")}
                          className={`py-1.5 px-1 rounded-lg text-[10px] font-black border transition cursor-pointer text-center ${
                            predictionType === "home"
                              ? "bg-red-655 border-red-500 text-white shadow-md"
                              : "bg-gray-950 border-white/5 text-gray-400 hover:text-white"
                          }`}
                        >
                          برد میزبان
                        </button>
                        <button
                          onClick={() => setPredictionType("draw")}
                          className={`py-1.5 px-1 rounded-lg text-[10px] font-black border transition cursor-pointer text-center ${
                            predictionType === "draw"
                              ? "bg-red-655 border-red-500 text-white shadow-md"
                              : "bg-gray-950 border-white/5 text-gray-400 hover:text-white"
                          }`}
                        >
                          مساوی
                        </button>
                        <button
                          onClick={() => setPredictionType("away")}
                          className={`py-1.5 px-1 rounded-lg text-[10px] font-black border transition cursor-pointer text-center ${
                            predictionType === "away"
                              ? "bg-red-655 border-red-500 text-white shadow-md"
                              : "bg-gray-950 border-white/5 text-gray-400 hover:text-white"
                          }`}
                        >
                          برد مهمان
                        </button>
                      </div>

                      {/* Precise core details */}
                      <div className="flex items-center justify-center gap-2 pt-1 border-t border-white/5">
                        <span className="text-[10px] text-gray-500 font-bold ml-1">تعداد گل احتمالی:</span>
                        <input
                          type="number"
                          placeholder="میزبان"
                          value={scoreHome}
                          onChange={(e) => setScoreHome(e.target.value)}
                          className="w-12 bg-gray-950 text-center text-xs border border-white/5 rounded py-1 text-white font-mono"
                          min="0"
                          max="9"
                        />
                        <span className="text-gray-600">-</span>
                        <input
                          type="number"
                          placeholder="مهمان"
                          value={scoreAway}
                          onChange={(e) => setScoreAway(e.target.value)}
                          className="w-12 bg-gray-950 text-center text-xs border border-white/5 rounded py-1 text-white font-mono"
                          min="0"
                          max="9"
                        />
                      </div>

                      <button
                        onClick={handleVoteSubmit}
                        disabled={!predictionType}
                        className={`w-full py-2 rounded-lg font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-98 ${
                          predictionType 
                            ? "bg-gradient-to-l from-red-655 to-red-700 hover:from-red-700 hover:to-red-655 text-white cursor-pointer shadow-lg shadow-red-950/20"
                            : "bg-gray-955 text-gray-600 border border-white/5 cursor-not-allowed"
                        }`}
                      >
                        <span>ثبت حدس هواداری مسابقه</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pt-2 text-[9px] text-gray-500 flex items-center gap-1 border-t border-white/5">
          <Sparkles size={11} className="text-gray-650" />
          <span>۱۵۰ امتیاز باشگاه هواداران برای پاسخ صحیح</span>
        </div>
      </div>

      {/* CARD 3: VOTE STATISTICS & RESULTS */}
      <div className="bg-[#121215] rounded-2xl border border-white/5 p-5 flex flex-col justify-between transition hover:border-white/10 shadow-xl relative overflow-hidden" id="card-vote-statistics">
        {/* Accent highlight decoration indicator */}
        <div className="absolute top-0 right-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-80" />

        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <PieChart size={18} />
            </span>
            <div>
              <h3 className="text-sm font-black text-white">آمار جامعه آماری هواداران</h3>
              <span className="text-[10px] text-emerald-400 font-bold block">توزیع ترجیحات رای‌دهندگان قبلی</span>
            </div>
          </div>

          <div className="mb-2">
            <span className="text-[10px] font-bold text-gray-500 block mb-1">مشاهده آمار جزئیات مسابقه:</span>
            <div className="flex gap-1 overflow-x-auto pb-1.5 select-none no-scrollbar">
              {predictMatches.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMatchForStats(m.id)}
                  className={`flex-shrink-0 px-2 py-1 rounded text-[9px] font-bold transition-all border ${
                    selectedMatchForStats === m.id
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-gray-950 border-white/5 text-gray-400 hover:text-white"
                  }`}
                >
                  {m.teamHome.slice(0, 10)} - {m.teamAway.slice(0, 10)}
                </button>
              ))}
            </div>
          </div>

          {matchedStatsMatch && (
            <div className="space-y-3">
              <div className="p-3 bg-gray-950/40 rounded-xl border border-white/5 space-y-3">
                <div className="flex items-center justify-between text-[10px] text-gray-400 border-b border-white/5 pb-1.5">
                  <span className="font-bold">{matchedStatsMatch.teamHome} × {matchedStatsMatch.teamAway}</span>
                  <span className="font-mono bg-emerald-900/10 border border-emerald-950 px-1.5 py-0.5 rounded text-emerald-400 font-bold">
                    {total.toLocaleString("fa-IR")} رای ثبت شده
                  </span>
                </div>

                {/* Vertical Bar chart widgets */}
                <div className="space-y-2 text-[11px]">
                  {/* Home Win */}
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-gray-300 font-bold">برد {matchedStatsMatch.teamHome}</span>
                      <span className="text-emerald-400 font-black font-mono">{pctHome.toLocaleString("fa-IR")}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-950 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pctHome}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  {/* Draw */}
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-gray-300 font-bold">نتیجه مساوی</span>
                      <span className="text-amber-505 font-black font-mono">{pctDraw.toLocaleString("fa-IR")}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-950 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pctDraw}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  {/* Away Win */}
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-gray-300 font-bold">برد {matchedStatsMatch.teamAway}</span>
                      <span className="text-blue-400 font-black font-mono">{pctAway.toLocaleString("fa-IR")}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-950 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pctAway}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Exact Score distribution stats */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-gray-500 block">پرتکرارترین نتایج پیش‌بینی شده:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries<number>(currentMatchStats.scorePredictions || {})
                    .slice(0, 4)
                    .sort((a,b) => b[1] - a[1])
                    .map(([sc, count], idx) => {
                      const sharePct = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={sc} className="py-1 px-2.5 rounded bg-gray-950/85 border border-white/5 flex items-center justify-between text-[10px]">
                          <span className="font-mono bg-gray-900 border border-white/5 px-1 rounded text-gray-300 font-black">{sc}</span>
                          <span className="text-emerald-400 font-bold font-mono">{sharePct.toLocaleString("fa-IR")}%</span>
                        </div>
                      );
                    })}
                </div>
              </div>

            </div>
          )}
        </div>

        <div className="pt-2 text-[9px] text-gray-500 flex items-center gap-1 border-t border-white/5">
          <span className="text-xs">📈</span>
          <span>به‌روزرسانی خودکار آرا همگام با مشارکت جامعه آماری</span>
        </div>
      </div>
      
    </div>
  );
}

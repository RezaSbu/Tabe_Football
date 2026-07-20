import React, { useState, useEffect } from "react";

interface PollOption {
  text: string;
  emoji: string;
}

interface PollConfig {
  question: string;
  votesCount: number[];
  options: PollOption[];
}

interface WeeklySportsPollProps {
  pollConfig?: PollConfig;
}

const DEFAULT_POLL_CONFIG: PollConfig = {
  question: "کدام گزینه شانس بیشتری برای قهرمانی در فصل جاری فوتبال ایران دارد؟",
  votesCount: [100, 100, 100, 100],
  options: [
    { text: "پرسپولیس تهران", emoji: "🔴" },
    { text: "استقلال تهران", emoji: "🔵" },
    { text: "سپاهان اصفهان", emoji: "🟡" },
    { text: "تراکتور تبریز", emoji: "🚜" }
  ]
};

export default function WeeklySportsPoll({ pollConfig = DEFAULT_POLL_CONFIG }: WeeklySportsPollProps) {
  const [weeklyVoted, setWeeklyVoted] = useState<number | null>(null);
  const [weeklyVotes, setWeeklyVotes] = useState<number[]>([]);
  
  useEffect(() => {
    const saved = localStorage.getItem("weekly_sports_poll");
    const initialVotes = [...pollConfig.votesCount];
    if (saved !== null) {
      const idx = parseInt(saved, 10);
      setWeeklyVoted(idx);
      // Ensure index is valid
      if (initialVotes[idx] !== undefined) {
        initialVotes[idx]++;
      }
    }
    setWeeklyVotes(initialVotes);
  }, [pollConfig]);
  
  const handleWeeklyVote = (idx: number) => {
    if (weeklyVoted !== null) return;
    setWeeklyVoted(idx);
    localStorage.setItem("weekly_sports_poll", idx.toString());
    setWeeklyVotes(prev => {
      const clone = [...prev];
      if (clone[idx] !== undefined) {
        clone[idx]++;
      }
      return clone;
    });
  };
  
  const tv = weeklyVotes.reduce((a, b) => a + b, 0) || 1;
  const options = pollConfig.options;

  return (
    <div className="rounded-2xl border border-gray-850 bg-gradient-to-b from-gray-900 via-gray-900/40 to-slate-950 p-4.5 space-y-3.5 shadow-lg font-sans">
      <div className="flex items-center gap-1.5 border-b border-gray-800 pb-1.5 font-bold">
        <span className="w-1.5 h-3 bg-red-650 rounded-full animate-ping bg-red-550" />
        <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">نظرسنجی داغ برنامه تب فوتبال</span>
      </div>
      
      <h4 className="text-xs font-black text-white leading-snug">
        {pollConfig.question}
      </h4>

      <div className="space-y-2">
        {options.map((opt, idx) => {
          const voteCount = weeklyVotes[idx] || 0;
          const pct = Math.round((voteCount / tv) * 100);
          const isSelected = weeklyVoted === idx;
          const hasChosen = weeklyVoted !== null;

          return (
            <button
              key={idx}
              disabled={hasChosen}
              onClick={() => handleWeeklyVote(idx)}
              className={`w-full text-right rounded-xl p-2.5 text-[11px] font-bold transition duration-200 relative overflow-hidden border ${
                isSelected
                  ? "bg-red-955/20 border-red-500/40 text-white font-black"
                  : hasChosen
                  ? "bg-[#09090b]/80 border-white/5 text-gray-500 cursor-default"
                  : "bg-gray-950 border-white/5 text-slate-300 hover:border-gray-700 hover:bg-gray-900 cursor-pointer"
              }`}
            >
              {hasChosen && (
                <div 
                  className={`absolute top-0 right-0 bottom-0 transition-all duration-1000 ${isSelected ? 'bg-red-600/10' : 'bg-white/5'}`} 
                  style={{ width: `${Math.min(100, pct)}%`, zIndex: 0 }}
                />
              )}

              <div className="flex justify-between items-center relative z-10">
                <span className="flex items-center gap-1.5">
                  <span className="text-[10px]">{opt.emoji}</span>
                  <span>{opt.text}</span>
                  {isSelected && <span className="rounded bg-red-500/10 px-1.5 py-0.2 text-[8px] text-red-400 font-extrabold">رای شما</span>}
                </span>
                {hasChosen && (
                  <span className="font-mono font-black text-xs text-left">%{Math.min(100, pct).toLocaleString("fa-IR")}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="text-[9px] text-gray-500 flex justify-between items-center pt-1.5 border-t border-gray-850/60 font-bold">
        <span>مشارکت: {tv.toLocaleString("fa-IR")} هوادار</span>
        <span className="font-bold text-red-500 font-sans">موتور آرا هوشمند</span>
      </div>
    </div>
  );
}

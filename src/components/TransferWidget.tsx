import React from "react";
import { TransferItem } from "../types";
import { Shuffle, ArrowLeftRight, Coins, Calendar, Info } from "lucide-react";

interface TransferWidgetProps {
  transfers: TransferItem[];
  limit?: number;
}

export default function TransferWidget({ transfers = [], limit = 4 }: TransferWidgetProps) {
  const visibleTransfers = transfers.slice(0, limit);

  return (
    <div className="w-full bg-[#18181c]/50 border border-white/5 rounded-2xl p-4 text-white" dir="rtl">
      <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <Shuffle className="h-4 w-4 text-cyan-400" />
          <h3 className="font-extrabold text-sm text-slate-100">نقل و انتقالات داغ لیگ</h3>
        </div>
        <span className="text-[10px] text-slate-500 font-semibold">بقل‌های روزانه صادر شده</span>
      </div>

      <div className="space-y-3">
        {visibleTransfers.map((item) => (
          <div
            key={item.id}
            className="p-3 bg-black/35 rounded-xl border border-white/5 space-y-2 hover:border-cyan-500/10 transition-all"
          >
            {/* Header info */}
            <div className="flex items-center justify-between">
              <strong className="text-white text-xs">{item.playerName}</strong>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                item.type === "دائمی" 
                  ? "bg-cyan-950 text-cyan-400 border border-cyan-900/30" 
                  : item.type === "قرضی" 
                  ? "bg-amber-955 text-amber-500 bg-amber-950 text-amber-400 border border-amber-900/20" 
                  : "bg-slate-800 text-slate-300"
              }`}>
                {item.type}
              </span>
            </div>

            {/* Path routing */}
            <div className="flex items-center justify-center gap-2 p-1.5 bg-[#121215]/60 rounded-lg text-center" dir="ltr">
              <span className="text-[10px] text-slate-400 text-center font-bold px-1.5">{item.fromTeam}</span>
              <ArrowLeftRight className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span className="text-[10px] text-emerald-400 text-center font-black px-1.5">{item.toTeam}</span>
            </div>

            {/* Extra meta */}
            <div className="flex justify-between items-center text-[9px] text-slate-500 pt-1">
              <span className="flex items-center gap-1">
                <Coins className="h-3 w-3 text-emerald-555 text-emerald-550" />
                هزینه: <span className="font-bold text-slate-350">{item.fee}</span>
              </span>
              <span>موقعیت: {item.position}</span>
            </div>

            {(() => {
              const rawDesc = item.details || item.description || "";
              if (!rawDesc || rawDesc.trim() === "") return null;
              const maxChars = 150;
              const truncated = rawDesc.length > maxChars ? rawDesc.slice(0, maxChars) + "..." : rawDesc;
              return (
                <p className="text-[10px] text-slate-400 text-justify bg-[#121215]/20 p-2 rounded leading-relaxed border-r-2 border-slate-700 animate-in fade-in">
                  {truncated}
                </p>
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}

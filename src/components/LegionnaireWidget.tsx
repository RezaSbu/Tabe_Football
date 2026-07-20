import React from "react";
import { LegionnaireItem } from "../types";
import { Users, ExternalLink, Star } from "lucide-react";

interface LegionnaireWidgetProps {
  legionnaires: LegionnaireItem[];
  onSelectLegionnaire?: (leg: LegionnaireItem) => void;
}

export default function LegionnaireWidget({
  legionnaires = [],
  onSelectLegionnaire
}: LegionnaireWidgetProps) {
  return (
    <div className="w-full bg-[#18181c]/50 border border-white/5 rounded-2xl p-4 text-white" dir="rtl">
      <div className="flex items-center gap-2 mb-4 pb-2.5 border-b border-white/[0.04]">
        <Users className="h-4 w-4 text-emerald-450 text-emerald-500" />
        <h3 className="font-extrabold text-sm text-slate-100">ستارگان لژیونر هفته</h3>
      </div>

      <div className="space-y-3">
        {legionnaires.map((leg) => (
          <div
            key={leg.id}
            onClick={() => onSelectLegionnaire?.(leg)}
            className="p-3 bg-black/35 rounded-xl border border-white/5 flex gap-3 hover:border-emerald-550 hover:border-emerald-500/20 cursor-pointer transition-all items-center"
          >
            {leg.image && (
              <img
                src={leg.image}
                alt={leg.name}
                className="h-11 w-11 rounded-full object-cover border border-white/10 shrink-0"
                referrerPolicy="no-referrer"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-0.5">
                <h4 className="font-extrabold text-xs text-white truncate">{leg.name}</h4>
              </div>
              <p className="text-[10px] text-slate-450 text-slate-400 truncate">{leg.team} ({leg.league})</p>
              <p className="text-[9px] text-slate-500 line-clamp-1 mt-1 font-medium">{leg.performance}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

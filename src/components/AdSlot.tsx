import { useEffect } from "react";
import { AdItem } from "../types";

interface AdSlotProps {
  slot: AdItem;
  className?: string;
}

export function isWithinSchedule(ad: Pick<AdItem, "startDate" | "endDate">): boolean {
  const now = Date.now();
  if (ad.startDate) {
    const start = new Date(ad.startDate).getTime();
    if (!isNaN(start) && now < start) return false;
  }
  if (ad.endDate) {
    const end = new Date(ad.endDate).getTime();
    if (!isNaN(end) && now > end) return false;
  }
  return true;
}

export function isAdActive(ad: AdItem): boolean {
  return ad.isActive !== false && isWithinSchedule(ad);
}

export function trackAdView(adId: string) {
  try {
    fetch(`/api/ads/${adId}/view`, { method: "POST" }).catch(() => {});
  } catch { /* network unavailable */ }
}

export function trackAdClick(adId: string) {
  try {
    fetch(`/api/ads/${adId}/click`, { method: "POST" }).catch(() => {});
  } catch { /* network unavailable */ }
}

export function getAdViews(adId: string): number {
  try {
    return parseInt(localStorage.getItem(`ad_views_${adId}`) || "0", 10);
  } catch {
    return 0;
  }
}

export function resetAdViews(adId: string) {
  try {
    localStorage.removeItem(`ad_views_${adId}`);
  } catch { /* storage unavailable */ }
}

function AdSlotInner({ slot, className = "" }: AdSlotProps) {
  useEffect(() => {
    if (isAdActive(slot)) trackAdView(slot.id);
  }, [slot.id]);

  const maxWidth = `${slot.width}px`;
  const ratio = `${slot.width} / ${slot.height}`;
  const mode = slot.imageUrl && slot.description ? "mixed" : slot.imageUrl ? "image" : "text";

  if (mode === "image") {
    return (
      <div
        className={`mx-auto overflow-hidden rounded-xl border border-white/5 animate-in fade-in duration-300 ${className}`}
        style={{ maxWidth, aspectRatio: ratio }}
      >
        <a href={slot.linkUrl || "#"} target="_blank" referrerPolicy="no-referrer" onClick={() => trackAdClick(slot.id)} className="group block w-full h-full">
          <img
            src={slot.imageUrl}
            alt={slot.title || "تبلیغات"}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition group-hover:scale-[1.02]"
          />
        </a>
      </div>
    );
  }

  if (mode === "mixed") {
    return (
      <div
        className={`mx-auto overflow-hidden rounded-xl border border-white/5 bg-gradient-to-r from-emerald-950/20 via-slate-900/60 to-gray-950 animate-in fade-in duration-300 ${className}`}
        style={{ maxWidth }}
      >
        <a href={slot.linkUrl || "#"} target="_blank" referrerPolicy="no-referrer" onClick={() => trackAdClick(slot.id)} className="group flex items-stretch transition hover:from-emerald-950/30">
          <div className="w-1/3 shrink-0 overflow-hidden">
            <img
              src={slot.imageUrl}
              alt={slot.title || "تبلیغات"}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition group-hover:scale-[1.02]"
            />
          </div>
          <div className="flex flex-1 items-center justify-between gap-3 px-4 py-3 min-w-0">
            <div className="min-w-0">
              {slot.title && <p className="text-[11px] font-black text-emerald-400 truncate">{slot.title}</p>}
              {slot.description && <p className="text-[9px] text-gray-500 truncate mt-0.5">{slot.description}</p>}
              {slot.promo && (
                <p className="text-[9px] text-gray-400 mt-1">
                  کد: <span className="font-mono font-bold text-white bg-gray-900/60 border border-white/5 px-1 py-0.5 rounded">{slot.promo}</span>
                </p>
              )}
            </div>
            {slot.btnText && (
              <span className="shrink-0 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[9px] font-bold text-emerald-400 transition group-hover:bg-emerald-500/20">
                {slot.btnText}
              </span>
            )}
          </div>
        </a>
      </div>
    );
  }

  // Default: text mode
  return (
    <div
      className={`mx-auto overflow-hidden rounded-xl border border-white/5 animate-in fade-in duration-300 ${className}`}
      style={{ maxWidth, aspectRatio: ratio }}
    >
      <a
        href={slot.linkUrl || "#"}
        target="_blank"
        referrerPolicy="no-referrer"
        onClick={() => trackAdClick(slot.id)}
        className="group flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-950/20 via-slate-900/60 to-gray-950 px-4 py-2 transition hover:from-emerald-950/30 w-full h-full"
      >
        <div className="flex items-center gap-2 min-w-0">
          {slot.promo && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 text-[10px] font-bold text-black">
              {slot.promo.slice(0, 2)}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-black text-emerald-400 truncate">{slot.title}</p>
            <p className="text-[9px] text-gray-500 truncate">{slot.description}</p>
          </div>
        </div>
        {slot.btnText && (
          <span className="shrink-0 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[9px] font-bold text-emerald-400 transition group-hover:bg-emerald-500/20">
            {slot.btnText}
          </span>
        )}
      </a>
    </div>
  );
}

export default AdSlotInner;

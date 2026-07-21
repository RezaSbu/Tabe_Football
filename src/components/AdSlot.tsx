interface AdSlotData {
  id: string;
  name: string;
  width: number;
  height: number;
  isActive: boolean;
  adTitle: string;
  adPromo: string;
  adDesc: string;
  adLink: string;
  adBtnText: string;
  customBannerUrl: string;
}

interface AdSlotProps {
  slot: AdSlotData;
  className?: string;
}

export default function AdSlot({ slot, className = "" }: AdSlotProps) {
  if (!slot || !slot.isActive) return null;

  const maxWidth = `${slot.width}px`;
  const ratio = `${slot.width} / ${slot.height}`;

  return (
    <div
      className={`mx-auto overflow-hidden rounded-xl border border-white/5 animate-in fade-in duration-300 ${className}`}
      style={{ maxWidth, aspectRatio: ratio }}
    >
      {slot.customBannerUrl ? (
        <a
          href={slot.adLink || "#"}
          target="_blank"
          referrerPolicy="no-referrer"
          className="group block w-full h-full"
        >
          <img
            src={slot.customBannerUrl}
            alt={slot.adTitle || "تبلیغات"}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition group-hover:scale-[1.02]"
          />
        </a>
      ) : (
        <a
          href={slot.adLink || "#"}
          target="_blank"
          referrerPolicy="no-referrer"
          className="group flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-950/20 via-slate-900/60 to-gray-950 px-4 py-2 transition hover:from-emerald-950/30"
          style={{ aspectRatio: ratio }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {slot.adPromo && (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 text-[10px] font-bold text-black">
                {slot.adPromo.slice(0, 2)}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-black text-emerald-400 truncate">{slot.adTitle}</p>
              <p className="text-[9px] text-gray-500 truncate">{slot.adDesc}</p>
            </div>
          </div>
          {slot.adBtnText && (
            <span className="shrink-0 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[9px] font-bold text-emerald-400 transition group-hover:bg-emerald-500/20">
              {slot.adBtnText}
            </span>
          )}
        </a>
      )}
    </div>
  );
}

import { useEffect } from "react";
import { AdItem } from "../types";

interface AdSlotProps {
  slot: AdItem;
  className?: string;
  fluid?: boolean;
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

// Image-only creative: just the image/GIF (or video poster) linking out.
// No card, no border, no title/text/button — the creative itself is the ad.
// <img> supports GIF natively; object-contain shows the whole creative.
function AdSlotInner({ slot, className = "", fluid = false }: AdSlotProps) {
  useEffect(() => {
    if (isAdActive(slot)) trackAdView(slot.id);
  }, [slot.id]);

  if (!slot.imageUrl) return null;

  const maxWidth = fluid ? "100%" : `${slot.width}px`;
  const ratio = `${slot.width} / ${slot.height}`;

  return (
    <a
      href={slot.linkUrl || "#"}
      target="_blank"
      referrerPolicy="no-referrer"
      onClick={() => trackAdClick(slot.id)}
      className={`block overflow-hidden ${fluid ? "w-full" : "mx-auto"} ${className}`}
      style={{ maxWidth, aspectRatio: ratio }}
      aria-label="تبلیغات"
    >
      <img
        src={slot.imageUrl}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="h-full w-full bg-[#0a0a0c] object-contain"
      />
    </a>
  );
}

export default AdSlotInner;

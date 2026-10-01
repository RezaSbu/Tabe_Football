import React, { useState } from "react";
import { Share2, Check } from "lucide-react";

// Share button with Web Share API + clipboard fallback.
// All detail pages already expose canonical URLs — this just surfaces them.
export default function ShareButton({ title, url }: { title: string; url?: string }) {
  const [copied, setCopied] = useState(false);
  const link = url || (typeof window !== "undefined" ? window.location.href : "");

  const onShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: link });
        return;
      } catch {
        return; // user dismissed — stay silent
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <button
      type="button"
      onClick={onShare}
      aria-label="اشتراک‌گذاری"
      title="اشتراک‌گذاری"
      className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-[11px] font-black text-slate-300 hover:text-white hover:border-emerald-500/40 hover:bg-emerald-500/10 transition active:scale-95"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
      <span>{copied ? "کپی شد" : "اشتراک"}</span>
    </button>
  );
}

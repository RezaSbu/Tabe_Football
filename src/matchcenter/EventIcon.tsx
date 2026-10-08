import React from "react";

// Unified match-event icon set (adapted from the Figma UI kit).
// Single SVG language: 24x24 viewBox, consistent stroke widths, size prop.
// No emoji, no jersey numbers. Covers the 11 stored event types + MVP star.

interface IconProps {
  size?: number;
  className?: string;
}

function useUid(prefix: string): string {
  const [id] = React.useState(() => `${prefix}-${Math.random().toString(36).slice(2, 9)}`);
  return id;
}

export function BallIcon({ size = 16, className = "" }: IconProps) {
  const gid = useUid("ball");
  const cid = useUid("ballclip");
  // Classic truncated-icosahedron look: shaded white leather, dark central
  // pentagon, seam lines radiating out, partial dark patches at the rim.
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={`shrink-0 ${className}`} aria-hidden="true">
      <defs>
        <radialGradient id={gid} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f1f5f9" />
          <stop offset="85%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </radialGradient>
        <clipPath id={cid}>
          <circle cx="12" cy="12" r="9.4" />
        </clipPath>
      </defs>
      <circle cx="12" cy="12" r="9.6" fill={`url(#${gid})`} stroke="#1e293b" strokeWidth="1" />
      <g clipPath={`url(#${cid})`}>
        {/* rim patches (partial pentagons peeking from the edge) */}
        <circle cx="17.5" cy="4.5" r="2.7" fill="#0f172a" />
        <circle cx="20.8" cy="14.9" r="2.7" fill="#0f172a" />
        <circle cx="12" cy="21.3" r="2.7" fill="#0f172a" />
        <circle cx="3.2" cy="14.9" r="2.7" fill="#0f172a" />
        <circle cx="6.5" cy="4.5" r="2.7" fill="#0f172a" />
        {/* seams from the central pentagon to the rim */}
        <g stroke="#0f172a" strokeWidth="0.9" strokeLinecap="round">
          <line x1="12" y1="8.6" x2="12" y2="2.4" />
          <line x1="15.2" y1="11" x2="20.9" y2="9.1" />
          <line x1="14" y1="14.8" x2="17.6" y2="19.7" />
          <line x1="10" y1="14.8" x2="6.4" y2="19.7" />
          <line x1="8.8" y1="11" x2="3.1" y2="9.1" />
        </g>
        {/* central pentagon */}
        <polygon points="12,8.6 15.2,11 14,14.8 10,14.8 8.8,11" fill="#0f172a" />
        {/* specular highlight */}
        <ellipse cx="9" cy="7.5" rx="3.4" ry="2.2" fill="#ffffff" opacity="0.55" transform="rotate(-20 9 7.5)" />
      </g>
    </svg>
  );
}

export function AssistBadge({ size = 16, className = "" }: IconProps) {
  const fontSize = Math.max(9, Math.round(size * 0.58));
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 text-slate-950 font-black font-mono shadow-md border border-sky-200 shrink-0 select-none ${className}`}
      style={{ width: size, height: size, fontSize, lineHeight: 1 }}
      title="پاس گل"
      aria-hidden="true"
    >
      A
    </span>
  );
}

export function YellowCardIcon({ size = 16, className = "" }: IconProps) {
  return (
    <span
      className={`inline-block rounded-[2.5px] border border-amber-300 shrink-0 ${className}`}
      style={{ width: Math.round(size * 0.75), height: size, transform: "rotate(-6deg)", background: "linear-gradient(135deg, #fef08a 0%, #facc15 60%, #eab308 100%)", boxShadow: "0 2px 4px rgba(0,0,0,0.3)" }}
      title="کارت زرد"
    />
  );
}

export function RedCardIcon({ size = 16, className = "" }: IconProps) {
  return (
    <span
      className={`inline-block rounded-[2.5px] border border-red-400 shrink-0 ${className}`}
      style={{ width: Math.round(size * 0.75), height: size, transform: "rotate(-6deg)", background: "linear-gradient(135deg, #f87171 0%, #ef4444 60%, #b91c1c 100%)", boxShadow: "0 2px 4px rgba(0,0,0,0.3)" }}
      title="کارت قرمز"
    />
  );
}

export function SubIcon({ size = 16, className = "" }: IconProps) {
  return (
    <span className={`inline-flex items-center justify-center rounded-md bg-slate-900/90 border border-slate-700/80 p-0.5 shadow-sm shrink-0 ${className}`} style={{ width: size, height: size }} title="تعویض">
      <svg viewBox="0 0 20 20" fill="none" className="w-full h-full" aria-hidden="true">
        <path d="M 5 14 C 5 9 8 7 14 7" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M 11 4 L 15 7 L 11 10" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 15 6 C 15 11 12 13 6 13" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M 9 16 L 5 13 L 9 10" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function PenaltyIcon({ size = 16, className = "" }: IconProps) {
  return (
    <span className={`relative inline-flex items-center justify-center shrink-0 ${className}`} style={{ width: size, height: size }}>
      <BallIcon size={size} />
      <span className="absolute -bottom-1 -right-1 px-1 rounded bg-amber-400 text-slate-950 font-black text-[8px] font-mono leading-none border border-slate-950 shadow">P</span>
    </span>
  );
}

export function MissedPenaltyIcon({ size = 16, className = "" }: IconProps) {
  return (
    <span className={`relative inline-flex items-center justify-center shrink-0 ${className}`} style={{ width: size, height: size }}>
      <span className="opacity-60 inline-flex"><BallIcon size={size} /></span>
      <svg viewBox="0 0 20 20" className="absolute inset-0 w-full h-full text-rose-500 drop-shadow" aria-hidden="true">
        <line x1="5" y1="5" x2="15" y2="15" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
        <line x1="15" y1="5" x2="5" y2="15" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function OwnGoalIcon({ size = 16, className = "" }: IconProps) {
  return (
    <span className={`relative inline-flex items-center justify-center shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#ef4444" stroke="#991b1b" strokeWidth="1" />
        <polygon points="12,8 15,10.2 13.8,14 10.2,14 9,10.2" fill="#ffffff" />
      </svg>
      <span className="absolute -bottom-1 -right-1 px-1 rounded bg-rose-800 text-white font-black text-[7px] font-mono leading-none border border-white/50 shadow">OG</span>
    </span>
  );
}

export function VarIcon({ size = 16, className = "", isDisallowed = false }: IconProps & { isDisallowed?: boolean }) {
  return (
    <span className={`px-1.5 py-0.5 rounded-md border text-[10px] font-mono font-black flex items-center gap-1 shadow-sm shrink-0 ${isDisallowed ? "bg-rose-950/80 border-rose-500/70 text-rose-200" : "bg-purple-950/80 border-purple-500/70 text-purple-200"}`} title="بررسی VAR">
      <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 12, height: 12 }} aria-hidden="true">
        <path d="M2 3h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm6 10h-2v1h4v-1h-2z" />
      </svg>
      <span>VAR</span>
      {isDisallowed && <span className="text-rose-400 font-bold">✕</span>}
    </span>
  );
}

export function InjuryIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#fb7185" strokeWidth="2" strokeLinecap="round" className={`shrink-0 ${className}`} aria-hidden="true">
      <title>مصدومیت</title>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function WhistleIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="#94a3b8" stroke="#475569" strokeWidth="1.2" className={`shrink-0 ${className}`} aria-hidden="true">
      <path d="M11 5a3 3 0 0 1 3 3v2h6l1 2v2a2 2 0 0 1-2 2h-8a5 5 0 0 1-5-5V9a4 4 0 0 1 5-4z" />
      <circle cx="8" cy="11" r="2.2" fill="#334155" />
    </svg>
  );
}

export function MvpStarIcon({ size = 16, className = "" }: IconProps) {
  const gid = useUid("star");
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={`url(#${gid})`} stroke="#b45309" strokeWidth="1.2" className={`shrink-0 drop-shadow ${className}`} aria-hidden="true">
      <title>بهترین بازیکن زمین</title>
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

// Maps the 11 stored event types to the unified icon language.
export function EventIcon({ type, size = 16, className = "" }: { type: string; size?: number; className?: string }) {
  switch (type) {
    case "goal": return <BallIcon size={size} className={className} />;
    case "penalty": return <PenaltyIcon size={size} className={className} />;
    case "own-goal": return <OwnGoalIcon size={size} className={className} />;
    case "assist": return <AssistBadge size={size} className={className} />;
    case "yellow-card": return <YellowCardIcon size={size} className={className} />;
    case "red-card": return <RedCardIcon size={size} className={className} />;
    case "substitution": return <SubIcon size={size} className={className} />;
    case "missed-penalty": return <MissedPenaltyIcon size={size} className={className} />;
    case "injury": return <InjuryIcon size={size} className={className} />;
    case "var": return <VarIcon size={size} className={className} />;
    default: return <WhistleIcon size={size} className={className} />;
  }
}

export function ratingColor(rating: number): string {
  if (rating >= 8.0) return "bg-[#008848] text-white border-[#00b05b]";
  if (rating >= 7.0) return "bg-[#5cb85c] text-white border-[#75cc75]";
  if (rating >= 6.0) return "bg-[#f0ad4e] text-slate-950 border-[#f5be72]";
  return "bg-[#d9534f] text-white border-[#e27370]";
}

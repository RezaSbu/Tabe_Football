import React from "react";

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d} روز`);
  if (h > 0) parts.push(`${h} ساعت`);
  if (m > 0) parts.push(`${m} دقیقه`);
  parts.push(`${s} ثانیه`);
  return parts.join(" و ");
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  try {
    return d.toLocaleString("fa-IR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export function formatDateShort(day?: string): string {
  if (!day) return "—";
  try {
    return new Date(day + "T00:00:00").toLocaleDateString("fa-IR", { month: "2-digit", day: "2-digit" });
  } catch {
    return day;
  }
}

export function toPersian(n: number): string {
  try {
    return n.toLocaleString("fa-IR");
  } catch {
    return String(n);
  }
}

export function Card({ title, icon, children, className = "", accent = "text-emerald-400" }: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  accent?: string;
}) {
  return (
    <div className={`p-4 rounded-2xl bg-[#18181c]/90 border border-white/5 space-y-3 ${className}`}>
      <h3 className="font-bold text-sm text-slate-200 border-b border-white/5 pb-2 flex items-center gap-2">
        {icon && <span className={accent}>{icon}</span>}
        <span>{title}</span>
      </h3>
      {children}
    </div>
  );
}

export function Stat({ label, value, color = "text-slate-200", sub, card = false }: {
  label: React.ReactNode;
  value: React.ReactNode;
  color?: string;
  sub?: React.ReactNode;
  card?: boolean;
}) {
  return (
    <div className={card ? "p-3.5 rounded-2xl bg-[#18181c]/90 border border-white/5" : "flex items-center justify-between p-2.5 rounded-xl bg-black/20"}>
      {card ? (
        <>
          <div className="text-[9px] text-slate-400 mb-1">{label}</div>
          <div className="font-mono text-lg font-black flex items-center gap-2">
            {sub}
            <span className={color}>{value}</span>
          </div>
        </>
      ) : (
        <>
          <span className="text-slate-400 text-[11px]">{label}</span>
          <span className="flex items-center gap-2">
            {sub}
            <span className={`font-mono text-xs font-bold ${color}`}>{value}</span>
          </span>
        </>
      )}
    </div>
  );
}

export function ProgressBar({ percent, colorClass = "from-emerald-500 to-emerald-400", label }: {
  percent: number;
  colorClass?: string;
  label?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="h-2 bg-slate-800/60 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${colorClass} rounded-full transition-all`}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      {label && <div className="text-[9px] text-slate-500 font-mono">{label}</div>}
    </div>
  );
}

export function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${color}`}>{children}</span>
  );
}

export function EmptyState({ message, height = "h-24" }: { message: string; height?: string }) {
  return (
    <div className={`flex items-center justify-center ${height} text-xs text-slate-500`}>{message}</div>
  );
}

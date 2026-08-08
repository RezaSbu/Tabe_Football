import React, { useState, useEffect } from "react";
import {
  Activity,
  RefreshCw,
  Trash2,
  Search,
  Clock,
  Server,
  LayoutDashboard,
  Database,
  Cpu,
  Gauge,
  Images,
  History,
  Users,
  TerminalSquare,
  HardDriveDownload,
  Sparkles
} from "lucide-react";
import OverviewSection from "./diagnostics/OverviewSection";
import DatabaseSection from "./diagnostics/DatabaseSection";
import VpsSection from "./diagnostics/VpsSection";
import HttpSection from "./diagnostics/HttpSection";
import MediaSection from "./diagnostics/MediaSection";
import AuditSection from "./diagnostics/AuditSection";
import VisitorsSection from "./diagnostics/VisitorsSection";

interface LogItem {
  timestamp: string;
  level: "info" | "warn" | "error";
  category: "database" | "api" | "auth" | "general";
  message: string;
  details?: any;
}

type TabId = "overview" | "db" | "vps" | "http" | "media" | "audit" | "visitors" | "logs";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "نمای کلی", icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
  { id: "db", label: "دیتابیس و بکاپ", icon: <Database className="h-3.5 w-3.5" /> },
  { id: "vps", label: "سرور (VPS)", icon: <Cpu className="h-3.5 w-3.5" /> },
  { id: "http", label: "سلامت و امنیت", icon: <Gauge className="h-3.5 w-3.5" /> },
  { id: "media", label: "تصاویر و رسانه", icon: <Images className="h-3.5 w-3.5" /> },
  { id: "audit", label: "فعالیت ادمین‌ها", icon: <History className="h-3.5 w-3.5" /> },
  { id: "visitors", label: "بازدید کاربران", icon: <Users className="h-3.5 w-3.5" /> },
  { id: "logs", label: "کنسول لاگ", icon: <TerminalSquare className="h-3.5 w-3.5" /> }
];

export default function DiagnosticsPanel() {
  const [tab, setTab] = useState<TabId>("overview");
  const [diag, setDiag] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilter, setLogFilter] = useState<string>("all");
  const [logCategory, setLogCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchDiag = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/diagnostics");
      if (res.ok) {
        setDiag(await res.json());
        setError("");
      } else {
        setError("خطا در دریافت اطلاعات تشخیصی");
      }
    } catch (e) {
      setError("عدم اتصال به سرور جهت دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error("Fetch system logs error:", e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const clearServerLogs = async () => {
    if (!window.confirm("آیا از پاکسازی تمام لاگ‌های ذخیره‌شده مطمئن هستید؟")) return;
    try {
      const res = await fetch("/api/logs", { method: "DELETE" });
      if (res.ok) setLogs([]);
    } catch (e) {
      console.error("Clear logs error:", e);
    }
  };

  const runBackup = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/diagnostics/backup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "خطا در پشتیبان‌گیری");
      } else {
        alert(`پشتیبان‌گیری با موفقیت انجام شد:\n${data.file}`);
        await fetchDiag();
      }
    } catch (e) {
      alert("خطا در پشتیبان‌گیری");
    } finally {
      setBusy(false);
    }
  };

  const runVacuum = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/diagnostics/vacuum", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "خطا در بهینه‌سازی");
      } else {
        alert("بهینه‌سازی (VACUUM / ANALYZE) با موفقیت انجام شد.");
        await fetchDiag();
      }
    } catch (e) {
      alert("خطا در بهینه‌سازی");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    fetchDiag();
    fetchLogs();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const logsInterval = setInterval(fetchLogs, 5000);
    const diagInterval = setInterval(fetchDiag, 30000);
    return () => {
      clearInterval(logsInterval);
      clearInterval(diagInterval);
    };
  }, [autoRefresh]);

  const filteredLogs = logs.filter(log => {
    if (logFilter !== "all" && log.level !== logFilter) return false;
    if (logCategory !== "all" && log.category !== logCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.category.toLowerCase().includes(q) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(q))
      );
    }
    return true;
  });

  const levelColors: Record<string, string> = {
    info: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    warn: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    error: "bg-red-500/10 text-red-400 border border-red-500/20"
  };
  const categoryLabels: Record<string, string> = {
    database: "DB",
    api: "API",
    auth: "AUTH",
    general: "SYS"
  };

  return (
    <div className="w-full space-y-6 text-right text-slate-100" dir="rtl">
      {/* Title */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-[#121215] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <Activity className="h-6 w-6 text-emerald-400 animate-pulse" />
            <h2 className="font-extrabold text-lg text-white">سامانه نظارت و مانیتورینگ سیستم</h2>
          </div>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            وضعیت سرور، PostgreSQL، تصاویر، فعالیت ادمین‌ها، بازدید کاربران و عملیات بکاپ
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={runBackup}
            disabled={busy}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-xs text-black font-extrabold rounded-xl transition disabled:opacity-50 cursor-pointer"
          >
            <HardDriveDownload className="h-3.5 w-3.5" />
            <span>{busy ? "در حال انجام..." : "پشتیبان‌گیری"}</span>
          </button>
          <button
            onClick={runVacuum}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-bold rounded-xl border border-white/5 transition disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>VACUUM</span>
          </button>
          <button
            onClick={fetchDiag}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-bold rounded-xl border border-white/5 transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>به‌روزرسانی</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-950/30 border border-red-900/40 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1.5 rounded-2xl bg-[#18181c]/90 border border-white/5">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold transition cursor-pointer ${
              tab === t.id
                ? "bg-emerald-500 text-black shadow-lg shadow-emerald-950/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {tab === "overview" && <OverviewSection diag={diag} loading={loading} onRefresh={fetchDiag} />}
        {tab === "db" && <DatabaseSection diag={diag} onBackup={runBackup} onVacuum={runVacuum} busy={busy} />}
        {tab === "vps" && <VpsSection diag={diag} />}
        {tab === "http" && <HttpSection diag={diag} />}
        {tab === "media" && <MediaSection diag={diag} />}
        {tab === "audit" && <AuditSection diag={diag} />}
        {tab === "visitors" && <VisitorsSection diag={diag} />}
        {tab === "logs" && (
          <div className="p-5 rounded-2xl bg-[#18181c]/90 border border-white/5 space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-black/25 p-3 rounded-xl border border-white/5">
              <div className="flex items-center gap-2.5">
                <Server className="h-4 w-4 text-emerald-400" />
                <span className="font-extrabold text-xs text-slate-200">کنسول رویدادهای سیستم</span>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-950">
                  {filteredLogs.length} لاگ
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <label className="flex items-center gap-1.5 text-slate-400 ml-2 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded bg-slate-900 border-white/10 text-emerald-500 focus:ring-opacity-0 h-3.5 w-3.5"
                  />
                  <span className="text-[10px]">تازه‌سازی خودکار</span>
                </label>

                <select
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  className="bg-slate-900 border border-white/5 rounded-lg px-2 py-1 text-slate-300 text-[10px] focus:outline-none cursor-pointer font-bold"
                >
                  <option value="all">همه سطح‌ها</option>
                  <option value="info">INFO</option>
                  <option value="warn">WARN</option>
                  <option value="error">ERROR</option>
                </select>

                <select
                  value={logCategory}
                  onChange={(e) => setLogCategory(e.target.value)}
                  className="bg-slate-900 border border-white/5 rounded-lg px-2 py-1 text-slate-300 text-[10px] focus:outline-none cursor-pointer font-bold"
                >
                  <option value="all">همه دسته‌ها</option>
                  <option value="database">دیتابیس</option>
                  <option value="api">API</option>
                  <option value="auth">امنیتی</option>
                  <option value="general">عمومی</option>
                </select>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="جستجو..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-900 border border-white/5 rounded-lg pr-7 pl-2 py-1 text-[10px] focus:outline-none text-slate-300 max-w-[130px]"
                  />
                  <Search className="absolute right-2 top-2 h-3 w-3 text-slate-500" />
                </div>
              </div>
            </div>

            <div className="bg-black/40 rounded-xl p-3 border border-white/5 h-[400px] overflow-y-auto space-y-2.5 font-mono text-[11px] scrollbar-thin">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg flex flex-col md:flex-row gap-3 items-start justify-between border border-transparent hover:bg-white/[0.012] transition"
                  >
                    <div className="space-y-1.5 flex-1 pr-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${levelColors[log.level]}`}>
                          {log.level.toUpperCase()}
                        </span>
                        <span className="text-cyan-400 bg-cyan-950/20 px-1.5 py-0.5 rounded text-[9px] font-bold">
                          {categoryLabels[log.category] || log.category.toUpperCase()}
                        </span>
                        <span className="text-slate-500 text-[10px] flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(log.timestamp).toLocaleTimeString("fa-IR")}
                        </span>
                      </div>
                      <p className="text-slate-200 mt-1 font-sans text-xs leading-relaxed">{log.message}</p>

                      {log.details && (
                        <div className="p-2.5 bg-black/50 border border-white/5 rounded-lg text-[9px] text-slate-400 max-w-full overflow-x-auto max-h-[80px] select-all font-mono leading-relaxed" dir="ltr">
                          {typeof log.details === "object" ? JSON.stringify(log.details, null, 2) : String(log.details)}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2 py-10">
                  <Database className="h-8 w-8 text-slate-600 animate-pulse" />
                  <span className="text-xs">هیچ لاگی یافت نشد.</span>
                </div>
              )}
            </div>

            <button
              onClick={clearServerLogs}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-950/40 text-red-400 border border-red-900/30 hover:bg-red-950/80 active:scale-95 text-xs font-black rounded-xl transition cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>حذف لاگ‌ها</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

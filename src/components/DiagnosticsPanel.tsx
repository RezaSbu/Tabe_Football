import React, { useState, useEffect } from "react";
import { 
  Activity, 
  RefreshCw, 
  Database, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Search, 
  Clock, 
  Info,
  Server,
  Cpu,
  HardDrive
} from "lucide-react";

interface LogItem {
  timestamp: string;
  level: "info" | "warn" | "error";
  category: "database" | "api" | "auth" | "general";
  message: string;
  details?: any;
}

interface TestDbResult {
  connected: boolean;
  message: string;
  config: {
    host: string;
    port: string;
    database: string;
    user: string;
    nodeEnv: string;
  };
  server?: {
    uptime: number;
    memoryHeapUsed?: number;
    memoryHeapTotal?: number;
    memoryRss?: number;
    nodeVersion: string;
    platform: string;
  };
  storage?: {
    databaseSizeBytes: number;
    uploadsSizeBytes: number;
    uploadsDir: string;
    disk: {
      totalBytes: number;
      usedBytes: number;
      freeBytes: number;
    } | null;
  };
  tables?: Record<string, number>;
}

export default function DiagnosticsPanel() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [dbStatus, setDbStatus] = useState<TestDbResult | null>(null);
  const [loadingTest, setLoadingTest] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  
  const [logFilter, setLogFilter] = useState<string>("all");
  const [logCategory, setLogCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes <= 0) return "0";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatUptime = (seconds: number) => {
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
  };

  const fetchStatus = async () => {
    setLoadingTest(true);
    try {
      const res = await fetch("/api/testdb");
      const data = await res.json();
      setDbStatus(data);
    } catch (e) {
      setDbStatus({
        connected: false,
        message: "عدم اتصال به سرور جهت اجرای تست",
        config: { host: "", port: "", database: "", user: "", nodeEnv: "" }
      });
    } finally {
      setLoadingTest(false);
    }
  };

  const handleForceSync = async () => {
    setLoadingTest(true);
    try {
      await fetch("/api/testdb?refresh=true");
      window.location.reload();
    } catch (e) {
      console.error("Force sync failed:", e);
    } finally {
      setLoadingTest(false);
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

  useEffect(() => {
    fetchStatus();
    fetchLogs();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
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

  const tableLabels: Record<string, string> = {
    news: "اخبار",
    teams: "تیم‌ها",
    players: "بازیکنان",
    coaches: "مربیان",
    matches: "مسابقات",
    transfers: "نقل و انتقالات",
    legionnaires: "لژیونرها",
    media: "تصاویر گالری",
    hero_slides: "اسلایدر",
    contact_messages: "پیام‌ها",
    standings: "جدول رده‌بندی",
    stats: "آمار لیگ"
  };

  const tableColors: Record<string, string> = {
    news: "text-emerald-400",
    teams: "text-blue-400",
    players: "text-cyan-400",
    coaches: "text-violet-400",
    matches: "text-amber-400",
    transfers: "text-yellow-400",
    legionnaires: "text-purple-400",
    media: "text-pink-400",
    hero_slides: "text-orange-400",
    contact_messages: "text-teal-400",
    standings: "text-rose-400",
    stats: "text-indigo-400"
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
            گزارش وضعیت سرور، پایگاه داده PostgreSQL، لاگ‌های سیستمی و اطلاعات لحظه‌ای
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={fetchStatus}
            disabled={loadingTest}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-xs text-black font-extrabold rounded-xl transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingTest ? "animate-spin" : ""}`} />
            <span>تست اتصال دیتابیس</span>
          </button>

          <button 
            onClick={fetchLogs}
            disabled={loadingLogs}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-bold rounded-xl border border-white/5 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingLogs ? "animate-spin" : ""}`} />
            <span>به‌روزرسانی لاگ‌ها</span>
          </button>

          <button 
            onClick={clearServerLogs}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-950/40 text-red-400 border border-red-900/30 hover:bg-red-950/80 active:scale-95 text-xs font-black rounded-xl transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>حذف لاگ‌ها</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connection Status */}
        <div className="p-5 rounded-2xl bg-[#18181c]/90 border border-white/5 space-y-4">
          <h3 className="font-bold text-sm text-slate-200 border-b border-white/5 pb-2 flex items-center gap-2">
            <Server className="h-4 w-4 text-emerald-400" />
            <span>وضیعت دیتابیس PostgreSQL</span>
          </h3>
          
          {dbStatus ? (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/20">
                <span className="text-slate-400">اتصال</span>
                {dbStatus.connected ? (
                  <span className="flex items-center gap-1.5 font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-950">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>متصل (Online)</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 font-bold text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-950">
                    <XCircle className="h-3.5 w-3.5" />
                    <span>قطع (Offline)</span>
                  </span>
                )}
              </div>

              <div className="p-2.5 rounded-xl bg-black/20 space-y-1.5 font-mono text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">هاست:</span>
                  <span className="text-slate-300 truncate max-w-[180px]" dir="ltr">{dbStatus.config.host || "—"}:{dbStatus.config.port}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">دیتابیس:</span>
                  <span className="text-slate-300">{dbStatus.config.database || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">کاربر:</span>
                  <span className="text-slate-300">{dbStatus.config.user || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">محیط:</span>
                  <span className="text-emerald-400 uppercase font-bold">{dbStatus.config.nodeEnv || "N/A"}</span>
                </div>
              </div>

              {/* Server info */}
              {dbStatus.server && (
                <div className="p-2.5 rounded-xl bg-black/20 space-y-1.5 font-mono text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Node.js:</span>
                    <span className="text-slate-300">{dbStatus.server.nodeVersion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">پلتفرم:</span>
                    <span className="text-slate-300">{dbStatus.server.platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">آپتایم:</span>
                    <span className="text-emerald-400">{formatUptime(dbStatus.server.uptime)}</span>
                  </div>
                  {dbStatus.server.memoryRss && (
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-sans">حافظه مصرفی:</span>
                      <span className="text-cyan-400">{dbStatus.server.memoryRss} MB</span>
                    </div>
                  )}
                </div>
              )}

              <div className={`p-2.5 rounded-xl text-[11px] leading-relaxed ${dbStatus.connected ? "bg-emerald-950/10 text-emerald-300 border border-emerald-500/10" : "bg-red-950/10 text-red-300 border border-red-500/10"}`}>
                <span className="font-bold">پیغام: </span>
                <span>{dbStatus.message}</span>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleForceSync}
                  disabled={loadingTest}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50 text-white font-sans text-xs font-bold transition-all shadow-md shadow-emerald-950/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingTest ? "animate-spin" : ""}`} />
                  <span>همگام‌سازی و بارگذاری مجدد</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-xs text-slate-500 animate-pulse">
              درحال دریافت اطلاعات...
            </div>
          )}
        </div>

        {/* Table Counts */}
        <div className="p-5 rounded-2xl bg-[#18181c]/90 border border-white/5 space-y-3 lg:col-span-2">
          <h3 className="font-bold text-sm text-slate-200 border-b border-white/5 pb-2 flex items-center gap-2">
            <Database className="h-4 w-4 text-cyan-400" />
            <span>آمار جداول دیتابیس</span>
          </h3>

          {dbStatus && dbStatus.tables ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 py-1">
              {Object.entries(dbStatus.tables).map(([key, count]) => (
                <div key={key} className="bg-black/15 p-2.5 rounded-xl border border-white/[0.02] hover:border-slate-800 transition text-center select-none">
                  <span className="block text-[10px] text-slate-400 font-medium truncate">{tableLabels[key] || key}</span>
                  <span className={`block font-mono text-lg font-black mt-1 ${tableColors[key] || "text-slate-300"}`}>{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-28 text-xs text-slate-500">
              {dbStatus?.connected ? "درحال دریافت آمار جداول..." : "جهت مشاهده آمار، دیتابیس را متصل کنید."}
            </div>
          )}

          <div className="bg-slate-800/20 rounded-xl px-4 py-2.5 border border-white/5 text-[10px] text-slate-400 leading-relaxed flex items-center gap-2">
            <Info className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <span>تمامی داده‌ها از حافظه داخلی سرور (In-Memory Cache) خوانده می‌شوند و به‌صورت دوره‌ای با PostgreSQL همگام می‌گردند.</span>
          </div>
        </div>
      </div>

      {/* Storage & Database Size */}
      <div className="p-5 rounded-2xl bg-[#18181c]/90 border border-white/5 space-y-4">
        <h3 className="font-bold text-sm text-slate-200 border-b border-white/5 pb-2 flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-amber-400" />
          <span>فضای ذخیره‌سازی و حجم دیتابیس</span>
        </h3>

        {dbStatus && dbStatus.storage ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {/* VPS Disk Usage */}
            <div className="bg-black/20 p-3.5 rounded-xl border border-white/5">
              <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold mb-2">
                <HardDrive className="h-3.5 w-3.5 text-amber-400" />
                <span>دیسک سرور (VPS)</span>
              </span>
              {dbStatus.storage.disk ? (
                <div className="space-y-2">
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-slate-400">کل:</span>
                    <span className="text-slate-200">{formatBytes(dbStatus.storage.disk.totalBytes)}</span>
                  </div>
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-slate-400">استفاده‌شده:</span>
                    <span className="text-amber-400 font-bold">{formatBytes(dbStatus.storage.disk.usedBytes)}</span>
                  </div>
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-slate-400">آزاد:</span>
                    <span className="text-emerald-400 font-bold">{formatBytes(dbStatus.storage.disk.freeBytes)}</span>
                  </div>
                  <div className="h-2 bg-slate-800/60 rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (dbStatus.storage.disk.usedBytes / Math.max(1, dbStatus.storage.disk.totalBytes)) * 100)}%`
                      }}
                    />
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">
                    {Math.round((dbStatus.storage.disk.usedBytes / Math.max(1, dbStatus.storage.disk.totalBytes)) * 100)}٪ استفاده
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 py-3">در دسترس نیست</div>
              )}
            </div>

            {/* Uploads Folder Size */}
            <div className="bg-black/20 p-3.5 rounded-xl border border-white/5">
              <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold mb-2">
                <Server className="h-3.5 w-3.5 text-cyan-400" />
                <span>حجم تصاویر (پوشه uploads)</span>
              </span>
              <div className="space-y-2">
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-slate-400">حجم کل:</span>
                  <span className="text-cyan-400 font-black text-sm">{formatBytes(dbStatus.storage.uploadsSizeBytes)}</span>
                </div>
                <div className="text-[9px] text-slate-500 font-mono truncate" dir="ltr">{dbStatus.storage.uploadsDir}</div>
              </div>
            </div>

            {/* Database Size */}
            <div className="bg-black/20 p-3.5 rounded-xl border border-white/5">
              <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold mb-2">
                <Database className="h-3.5 w-3.5 text-emerald-400" />
                <span>حجم دیتابیس PostgreSQL</span>
              </span>
              <div className="space-y-2">
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-slate-400">حجم کل:</span>
                  <span className="text-emerald-400 font-black text-sm">{formatBytes(dbStatus.storage.databaseSizeBytes)}</span>
                </div>
                <div className="text-[9px] text-slate-500">شامل جداول، ایندکس‌ها و داده‌های هر جدول</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-24 text-xs text-slate-500">
            {dbStatus?.connected ? "درحال دریافت حجم فضای ذخیره‌سازی..." : "جهت مشاهده حجم فضا، دیتابیس را متصل کنید."}
          </div>
        )}
      </div>

      {/* Log Terminal */}
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
              className="bg-slate-900 border border-white/5 rounded-lg px-2 py-1 text-slate-300 text-[10px] focus:outline-none focus:border-slate-705 cursor-pointer font-bold"
            >
              <option value="all">همه سطح‌ها</option>
              <option value="info">INFO</option>
              <option value="warn">WARN</option>
              <option value="error">ERROR</option>
            </select>

            <select 
              value={logCategory} 
              onChange={(e) => setLogCategory(e.target.value)}
              className="bg-slate-900 border border-white/5 rounded-lg px-2 py-1 text-slate-300 text-[10px] focus:outline-none focus:border-slate-750 cursor-pointer font-bold"
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
                className="bg-slate-900 border border-white/5 rounded-lg pr-7 pl-2 py-1 text-[10px] focus:outline-none focus:border-emerald-500 text-slate-350 max-w-[130px]"
              />
              <Search className="absolute right-2 top-2 h-3 w-3 text-slate-500" />
            </div>
          </div>
        </div>

        {/* Logs list */}
        <div className="bg-black/40 rounded-xl p-3 border border-white/5 h-[400px] overflow-y-auto space-y-2.5 font-mono text-[11px] scrollbar-thin">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log, index) => {
              const levelColors = {
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
                        {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : String(log.details)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2 py-10">
              <Database className="h-8 w-8 text-slate-600 animate-pulse" />
              <span className="text-xs">هیچ لاگی یافت نشد.</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

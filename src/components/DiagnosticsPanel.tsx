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
  ShieldAlert, 
  Info,
  Server,
  FileSpreadsheet
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
    hasUrl: boolean;
    hasKey: boolean;
    url: string;
    nodeEnv: string;
  };
  tables?: {
    news: number;
    matches: number;
    teams: number;
    players: number;
    transfers: number;
    legionnaires: number;
    media: number;
    polls: number;
    contact_messages: number;
    hero_slides: number;
  };
}

export default function DiagnosticsPanel() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [dbStatus, setDbStatus] = useState<TestDbResult | null>(null);
  const [loadingTest, setLoadingTest] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  
  // Search and filter logs state
  const [logFilter, setLogFilter] = useState<string>("all");
  const [logCategory, setLogCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchStatus = async () => {
    setLoadingTest(true);
    try {
      const res = await fetch("/api/testdb");
      const data = await res.json();
      setDbStatus(data);
    } catch (e) {
      console.error("Test DB query fail:", e);
      setDbStatus({
        connected: false,
        message: "عدم اتصال به سرور Express جهت اجرای پینگ تست",
        config: { hasUrl: false, hasKey: false, url: "", nodeEnv: "" }
      });
    } finally {
      setLoadingTest(false);
    }
  };

  const handleForceSync = async () => {
    setLoadingTest(true);
    try {
      const res = await fetch("/api/testdb?refresh=true");
      const data = await res.json();
      setDbStatus(data);
      // Reload app data
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
      if (res.ok) {
        setLogs([]);
      }
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
    const interval = setInterval(() => {
      fetchLogs();
    }, 5000);
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

  return (
    <div className="w-full space-y-6 text-right text-slate-100" dir="rtl">
      
      {/* Title block */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-[#121215] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <Activity className="h-6 w-6 text-emerald-400 animate-pulse" />
            <h2 className="font-extrabold text-lg text-white">سامانه نظارت زنده و مانیتورینگ اتصال Supabase (تب فوتبال)</h2>
          </div>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            گزارش‌گیری بلادرنگ از کوئری‌های SQL اگزکیوت شده، سلامت سرور، متغیرهای محیطی و خطاهای احتمالی دیتابیس.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={fetchStatus}
            disabled={loadingTest}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-xs text-black font-extrabold rounded-xl transition duration-155 disabled:opacity-50 select-none"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingTest ? "animate-spin" : ""}`} />
            <span>اجرای تست مجدد دیتابیس (Test DB)</span>
          </button>

          <button 
            onClick={fetchLogs}
            disabled={loadingLogs}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-bold rounded-xl border border-white/5 transition duration-155 disabled:opacity-50 select-none"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingLogs ? "animate-spin" : ""}`} />
            <span>به‌روزرسانی خودکار</span>
          </button>

          <button 
            onClick={clearServerLogs}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-950/40 text-red-400 border border-red-900/30 hover:bg-red-950/80 active:scale-95 text-xs font-black rounded-xl transition duration-155 select-none"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>حذف لاگ‌ها</span>
          </button>
        </div>
      </div>

      {/* Database Connection Summary & Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Connection Status Widget */}
        <div className="p-5 rounded-2xl bg-[#18181c]/90 border border-white/5 space-y-4">
          <h3 className="font-bold text-sm text-slate-200 border-b border-white/5 pb-2 flex items-center gap-2">
            <Server className="h-4 w-4 text-emerald-400" />
            <span>وضیعت دیتابیس Supabase</span>
          </h3>
          
          {dbStatus ? (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/20">
                <span className="text-slate-400">سیگنال اتصال</span>
                {dbStatus.connected ? (
                  <span className="flex items-center gap-1.5 font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-950">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>متصل (Online)</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 font-bold text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-950">
                    <XCircle className="h-3.5 w-3.5" />
                    <span>قطع ارتباط (Offline)</span>
                  </span>
                )}
              </div>

              <div className="p-2.5 rounded-xl bg-black/20 space-y-1.5 font-mono text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">هاست Supabase:</span>
                  <span className="text-slate-300 truncate max-w-[180px]" dir="ltr">{dbStatus?.config?.url || "تنظیم نشده"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">متغیر URL:</span>
                  <span>{dbStatus?.config?.hasUrl ? "✅ OK" : "❌ خالی"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">متغیر Publishable Key:</span>
                  <span>{dbStatus?.config?.hasKey ? "✅ OK" : "❌ خالی"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">محیط اجرا (Env):</span>
                  <span className="text-emerald-400 uppercase font-bold">{dbStatus?.config?.nodeEnv || "N/A"}</span>
                </div>
              </div>

              <div className={`p-2.5 rounded-xl text-[11px] leading-relaxed ${dbStatus.connected ? "bg-emerald-950/10 text-slate-305 text-emerald-300 border border-emerald-500/10" : "bg-red-950/10 text-red-300 border border-red-500/10"}`}>
                <span className="font-bold">پیغام سیستم: </span>
                <span>{dbStatus.connected ? "اتصال با موفقیت برقرار شد. تمام داده‌ها مستقیما از ترانزکشن‌های Supabase استخراج می‌شوند." : dbStatus.message}</span>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleForceSync}
                  disabled={loadingTest}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50 text-white font-sans text-xs font-bold transition-all shadow-md shadow-emerald-950/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingTest ? "animate-spin" : ""}`} />
                  <span>بروزرسانی زنده اطلاعات از سوپابیس</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-xs text-slate-500 animate-pulse">
              درحال استخراج وضیت دیتابیس...
            </div>
          )}
        </div>

        {/* PostgreSQL Table Counts Summary */}
        <div className="p-5 rounded-2xl bg-[#18181c]/90 border border-white/5 space-y-3 lg:col-span-2">
          <h3 className="font-bold text-sm text-slate-200 border-b border-white/5 pb-2 flex items-center gap-2">
            <Database className="h-4 w-4 text-cyan-400" />
            <span>آمار جداول و ظرفیت‌های دیتابیس خلیج فارس</span>
          </h3>

          {dbStatus && dbStatus.tables ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 py-1">
              {[
                { name: "اخبار (news)", count: dbStatus.tables.news, color: "text-emerald-400" },
                { name: "تیم‌ها (teams)", count: dbStatus.tables.teams, color: "text-blue-400" },
                { name: "بازیکنان (players)", count: dbStatus.tables.players, color: "text-cyan-400" },
                { name: "مسابقات (matches)", count: dbStatus.tables.matches, color: "text-amber-400" },
                { name: "نقل و انتقالات (transfers)", count: dbStatus.tables.transfers, color: "text-yellow-400" },
                { name: "لژیونرها (legionnaires)", count: dbStatus.tables.legionnaires, color: "text-purple-400" },
                { name: "تصاویر گالری (media)", count: dbStatus.tables.media, color: "text-pink-400" },
                { name: "اسلایدر (hero_slides)", count: dbStatus.tables.hero_slides, color: "text-orange-400" },
                { name: "پیام‌ها (contact_messages)", count: dbStatus.tables.contact_messages, color: "text-teal-400" },
                { name: "نظرسنجی‌ها (polls)", count: dbStatus.tables.polls, color: "text-rose-400" }
              ].map((table, i) => (
                <div key={i} className="bg-black/15 p-2.5 rounded-xl border border-white/[0.02] hover:border-slate-800 transition text-center select-none">
                  <span className="block text-[10px] text-slate-400 font-medium truncate">{table.name}</span>
                  <span className={`block font-mono text-lg font-black mt-1 ${table.color}`}>{table.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-28 text-xs text-slate-500">
              {dbStatus?.connected ? "درحال تجمیع اطلاعات جداول..." : "جهت مشاهده رکورد جداول دیتابیس را متصل کنید."}
            </div>
          )}

          <div className="bg-slate-800/20 rounded-xl px-4 py-2.5 border border-white/5 text-[10px] text-slate-400 leading-relaxed flex items-center gap-2">
            <Info className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <span>توضیح: هر کوئری که فرانت‌اند در این لحظه ارسال می‌کند، بلافاصله کوئری مربوطه را در سطح Supabase ردیابی و کش می‌کند. برای همگام‌سازی، دیتابیس را مستقیماً شارژ کنید.</span>
          </div>
        </div>

      </div>

      {/* Log Terminal Block */}
      <div className="p-5 rounded-2xl bg-[#18181c]/90 border border-white/5 space-y-4">
        
        {/* Terminal Options Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-black/25 p-3 rounded-xl border border-white/5">
          <div className="flex items-center gap-2.5">
            <Server className="h-4 w-4 text-emerald-400" />
            <span className="font-extrabold text-xs text-slate-200">کنسول تحلیل ترانزکش‌ها و رویدادهای زنده سیستم</span>
            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-950">
              {filteredLogs.length} لاگ فعال
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Auto refresh box */}
            <label className="flex items-center gap-1.5 text-slate-400 ml-2 select-none cursor-pointer">
              <input 
                type="checkbox" 
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded bg-slate-900 border-white/10 text-emerald-500 focus:ring-opacity-0 h-3.5 w-3.5"
              />
              <span className="text-[10px]">به‌روزرسانی متناوب (۵ ثانیه)</span>
            </label>

            {/* Level search */}
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

            {/* Category search */}
            <select 
              value={logCategory} 
              onChange={(e) => setLogCategory(e.target.value)}
              className="bg-slate-900 border border-white/5 rounded-lg px-2 py-1 text-slate-300 text-[10px] focus:outline-none focus:border-slate-750 cursor-pointer font-bold"
            >
              <option value="all">همه دسته‌ها</option>
              <option value="database">دیتابیس Supabase</option>
              <option value="api">API Routes</option>
              <option value="auth">امنیتی / Auth</option>
              <option value="general">عمومی</option>
            </select>

            {/* Search query field */}
            <div className="relative">
              <input 
                type="text" 
                placeholder="جستجوی متنی لاگ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-white/5 rounded-lg pr-7 pl-2 py-1 text-[10px] focus:outline-none focus:border-emerald-500 text-slate-350 max-w-[130px]"
              />
              <Search className="absolute right-2 top-2 h-3 w-3 text-slate-500" />
            </div>
          </div>
        </div>

        {/* Logs viewport list */}
        <div className="bg-black/40 rounded-xl p-3 border border-white/5 h-[400px] overflow-y-auto space-y-2.5 font-mono text-[11px] scrollbar-thin">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log, index) => {
              const levelColors = {
                info: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                warn: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                error: "bg-red-500/10 text-red-400 border border-red-500/20"
              };

              const categoryLabels = {
                database: "DATABASE",
                api: "API_ROUTE",
                auth: "SECURITY",
                general: "SYSTEM"
              };

              return (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg flex flex-col md:flex-row gap-3 items-start justify-between border border-transparent hover:bg-white/[0.012] transition`}
                >
                  <div className="space-y-1.5 flex-1 pr-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${levelColors[log.level]}`}>
                        {log.level.toUpperCase()}
                      </span>
                      <span className="text-cyan-405 text-cyan-400 bg-cyan-950/20 px-1.5 py-0.5 rounded text-[9px] font-bold">
                        {categoryLabels[log.category] || log.category.toUpperCase()}
                      </span>
                      <span className="text-slate-505 text-slate-500 text-[10px] flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(log.timestamp).toLocaleTimeString("fa-IR")}
                      </span>
                    </div>
                    <p className="text-slate-205 text-slate-200 mt-1 font-sans text-xs leading-relaxed">{log.message}</p>
                    
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
              <span className="text-xs">هیچ لاگی منطبق با فیلترهای بالا یافت نشد.</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

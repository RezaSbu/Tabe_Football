import { Search } from "lucide-react";
import { LegionnaireItem } from "../types";

interface LegionnairesPageProps {
  legionnaires: LegionnaireItem[];
  legionnairesSearch: string;
  setLegionnairesSearch: (value: string) => void;
  handleSelectLegionnaire: (leg: LegionnaireItem) => void;
  getSafeImageUrl: (url: string) => string;
}

function LegionnairesPage({
  legionnaires,
  legionnairesSearch,
  setLegionnairesSearch,
  handleSelectLegionnaire,
  getSafeImageUrl,
}: LegionnairesPageProps) {
  return (
    <div className="space-y-6 animate-in fade-in" dir="rtl">
      <div className="rounded-2xl bg-gradient-to-l from-indigo-950/15 via-gray-900 to-gray-900 p-5 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-2xl text-white flex items-center gap-1.5">🌍 لژیونرها و ایرانیان شاخص خارج در قاره‌ها</h2>
          <p className="text-xs text-gray-400 mt-1">رصد دقیق ستاره‌های وفادار ایران در سری‌آ ایتالیا، کوپا بلژیک، سوپرلیگ عربستان، امارات و اروپا</p>
        </div>

        <div className="relative flex items-center bg-gray-950 border border-white/5 rounded-xl px-3 py-2 w-full md:max-w-xs">
          <Search className="h-4 w-4 text-gray-555 absolute right-3 pointer-events-none" />
          <input
            type="text"
            placeholder="جستجوی لژیونر، تیم یا لیگ..."
            className="w-full bg-transparent text-xs text-white pr-7 outline-none placeholder:text-gray-500"
            value={legionnairesSearch}
            onChange={(e) => setLegionnairesSearch(e.target.value)}
          />
          {legionnairesSearch && (
            <button onClick={() => setLegionnairesSearch("")} className="text-gray-555 hover:text-white text-xs pl-1 absolute left-3">✕</button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {legionnaires.filter((leg) => {
          if (!legionnairesSearch) return true;
          const q = legionnairesSearch.toLowerCase();
          return (leg.name || "").toLowerCase().includes(q) ||
                 (leg.team || "").toLowerCase().includes(q) ||
                 (leg.league || "").toLowerCase().includes(q) ||
                 (leg.performance || leg.description || "").toLowerCase().includes(q) ||
                 (leg.tags || []).some((t: string) => t.toLowerCase().includes(q));
        }).map((leg) => {
          const perf = leg.performance || leg.description || "";
          const hasDesc = perf && perf.trim() !== "";
          const maxChars = 200;
          const truncatedPerformance = perf.length > maxChars ? perf.slice(0, maxChars) + "..." : perf;

          return (
            <div
              key={leg.id}
              onClick={() => hasDesc && handleSelectLegionnaire(leg)}
              className={`group flex gap-4 rounded-2xl bg-gray-900 border border-white/5 p-4 transition duration-300 shadow-md ${
                hasDesc
                  ? "hover:border-emerald-500/40 hover:bg-[#121215] cursor-pointer"
                  : "opacity-80"
              }`}
              title={hasDesc ? "کلیک برای مشاهده جزئیات عملکرد کامل" : undefined}
            >
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-950 border border-white/5">
                <img
                  src={getSafeImageUrl(leg.image || "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=300")}
                  alt={leg.name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition group-hover:scale-104"
                />
              </div>

              <div className="flex flex-col justify-between flex-1">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className={`font-black text-sm text-white transition ${hasDesc ? "group-hover:text-emerald-400" : ""}`}>{leg.name}</h3>
                  </div>

                  <p className="text-xs text-gray-400 mt-1 font-semibold">{leg.team} / <span className="text-gray-500">{leg.league}</span></p>
                  {hasDesc ? (
                    <>
                      <p className="text-xs text-gray-300 leading-relaxed mt-2 text-justify line-clamp-2">{truncatedPerformance}</p>
                      <span className="text-[10px] text-emerald-400 font-extrabold mt-1.5 inline-block opacity-0 group-hover:opacity-100 transition duration-200">← مشاهده خبر و تحلیل کامل</span>
                    </>
                  ) : (
                    <p className="text-[11px] text-gray-500 italic mt-3">بدون تحلیل یا بررسی فنی ثبت‌شده</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LegionnairesPage;

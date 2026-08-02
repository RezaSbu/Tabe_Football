import React, { useState, useEffect } from "react";
import { MatchItem, TeamItem } from "../types";
import { convertGregorianToShamsi, convertShamsiToGregorian, convertGregorianToShamsiNumeric, getTodayShamsi, toPersianDigits } from "../utils";
import { X, Check, Calendar, Clock, MapPin, ShieldAlert, Award } from "lucide-react";

const normalizeWeekLabel = (w?: string): string => {
  if (!w) return "هفته 1";
  const en = w.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  const num = en.match(/\d+/);
  if (!num) return "هفته 1";
  const n = Math.min(40, Math.max(1, parseInt(num[0], 10)));
  return `هفته ${n}`;
};

interface AdminFeatureMatchFormProps {
  match?: MatchItem | null; // index/null for edit/create
  teams: TeamItem[];
  sport: "football" | "futsal";
  onSave: (matchData: any) => void;
  onCancel: () => void;
}

export default function AdminFeatureMatchForm({
  match,
  teams = [],
  sport,
  onSave,
  onCancel
}: AdminFeatureMatchFormProps) {
  // Local state for all fields
  const [selectedSport, setSelectedSport] = useState<"football" | "futsal">(sport);
  const [league, setLeague] = useState("");
  const [season, setSeason] = useState("۱۴۰۴-۱۴۰۵");
  const [week, setWeek] = useState("هفته 1");
  const [teamHome, setTeamHome] = useState("");
  const [teamAway, setTeamAway] = useState("");
  const [teamHomeLogo, setTeamHomeLogo] = useState("🔴");
  const [teamAwayLogo, setTeamAwayLogo] = useState("🔵");
  
  // Date in Jalali format in the UI (e.g. "1405/03/17")
  const [jalaliDate, setJalaliDate] = useState("");
  const [time, setTime] = useState("");
  const [venue, setVenue] = useState("");
  const [referee, setReferee] = useState("");
  const [odds, setOdds] = useState("برد میزبان: ۲.۰ | مساوی: ۳.۰ | برد میهمان: ۳.۵");
  const [previewDesc, setPreviewDesc] = useState("");
  const [mediaInfo, setMediaInfo] = useState("");
  const [probableHome, setProbableHome] = useState("");
  const [probableAway, setProbableAway] = useState("");
  
  // Custom stage status & score states for manual creations/edits
  const [status, setStatus] = useState<"not-started" | "live" | "finished">("not-started");
  const [scoreHome, setScoreHome] = useState<number>(0);
  const [scoreAway, setScoreAway] = useState<number>(0);

  // Initialize form on edit
  useEffect(() => {
    if (match) {
      setSelectedSport(match.sport || sport);
      setLeague(match.league || "");
      setSeason(match.season || "۱۴۰۴-۱۴۰۵");
      setWeek(normalizeWeekLabel(match.week));
      setTeamHome(match.teamHome || "");
      setTeamAway(match.teamAway || "");
      setTeamHomeLogo(match.teamHomeLogo || "🔴");
      setTeamAwayLogo(match.teamAwayLogo || "🔵");
      
      // Convert database ISO/Gregorian date to UI Shamsi
      if (match.date) {
        let cleanDate = match.date;
        if (cleanDate.includes("T")) {
          cleanDate = cleanDate.split("T")[0];
        }
        setJalaliDate(convertGregorianToShamsiNumeric(cleanDate) || getTodayShamsi());
      } else {
        setJalaliDate(getTodayShamsi());
      }
      
      setTime(match.time || "18:30");
      setVenue(match.venue || "");
      setReferee(match.referee || "");
      setOdds(match.odds || "برد میزبان: ۲.۰ | مساوی: ۳.۰ | برد میهمان: ۳.۵");
      setPreviewDesc(match.previewDesc || "");
      setMediaInfo(match.mediaInfo || "");
      
      if (match.probableLineups) {
        setProbableHome((match.probableLineups.home || []).join("، "));
        setProbableAway((match.probableLineups.away || []).join("، "));
      } else {
        setProbableHome("");
        setProbableAway("");
      }
      
      setStatus(match.status as any || "not-started");
      setScoreHome(match.scoreHome !== undefined ? Number(match.scoreHome) : 0);
      setScoreAway(match.scoreAway !== undefined ? Number(match.scoreAway) : 0);
    } else {
      // Default dates
      setJalaliDate(getTodayShamsi());
      setTime("18:30");
      setLeague(sport === "futsal" ? "futsal" : "pro-league");
      setStatus("not-started");
      setScoreHome(0);
      setScoreAway(0);
    }
  }, [match, sport]);

  // Handle home team change - auto lookup logo
  const handleHomeTeamChange = (name: string) => {
    setTeamHome(name);
    const matched = teams.find(t => t.name === name);
    if (matched && matched.logo) {
      setTeamHomeLogo(matched.logo);
    }
  };

  // Handle away team change - auto lookup logo
  const handleAwayTeamChange = (name: string) => {
    setTeamAway(name);
    const matched = teams.find(t => t.name === name);
    if (matched && matched.logo) {
      setTeamAwayLogo(matched.logo);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamHome || !teamAway) {
      alert("لطفا تیم‌های میزبان و میهمان را انتخاب کنید.");
      return;
    }
    if (teamHome === teamAway) {
      alert("تیم میزبان و میهمان نمی‌توانند یکسان باشند.");
      return;
    }

    // Convert Shamsi date in UI to standard ISO Gregorian for Server API
    // e.g., "1405/03/17" -> "2026-06-07" -> "2026-06-07T18:30:00Z"
    let gregorianDateStr = convertShamsiToGregorian(jalaliDate);
    if (!gregorianDateStr || gregorianDateStr === jalaliDate) {
      gregorianDateStr = "2026-06-07"; // fallback
    }
    
    const isoDateTime = `${gregorianDateStr}T${time || "18:00"}:00.000Z`;

    const payload = {
      sport: selectedSport,
      league,
      season,
      week,
      teamHome,
      teamAway,
      teamHomeLogo,
      teamAwayLogo,
      date: isoDateTime,
      time,
      venue,
      referee,
      odds,
      previewDesc,
      mediaInfo,
      probableLineups: {
        home: probableHome.split(/[،,.]/).map(n => n.trim()).filter(Boolean),
        away: probableAway.split(/[،,.]/).map(n => n.trim()).filter(Boolean)
      },
      status: status,
      scoreHome: Number(scoreHome),
      scoreAway: Number(scoreAway)
    };

    onSave(payload);
  };

  // Filter teams depending on sport selected
  const isFutsalTeam = (t: any) => {
    const id = (t.id || "").toLowerCase();
    const name = (t.name || "").toLowerCase();
    const sport = (t.sport || "").toLowerCase();
    const league = (t.league || "").toLowerCase();
    return sport === "futsal" ||
           league === "futsal" ||
           id.startsWith("futsal-") ||
           id.includes("futsal") ||
           id.includes("sungun") ||
           id.includes("giti") ||
           name.includes("فوتسال") ||
           name.includes("گیتی") ||
           name.includes("سونگون");
  };

  const filteredTeams = teams.filter(t => {
    const isFutsal = isFutsalTeam(t);
    return selectedSport === "futsal" ? isFutsal : !isFutsal;
  });

  return (
    <div className="bg-[#111115]/90 border border-white/5 rounded-2xl p-6 text-white max-w-4xl mx-auto" dir="rtl" id="admin-match-form-root">
      <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-6">
        <h3 className="font-extrabold text-base text-white flex items-center gap-2">
          <Calendar className="h-5 w-5 text-emerald-400" />
          {match ? "ویرایش و اصلاح اطلاعات مسابقه" : `تعریف مسابقه پیش‌رو (${selectedSport === "football" ? "فوتبال" : "فوتسال"})`}
        </h3>
        <button onClick={onCancel} className="p-1 rounded bg-[#222227] hover:bg-red-900/35 text-slate-400 hover:text-white transition cursor-pointer" id="btn-cancel-match-form">
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Row 1: Sport, League, Week, Season */}
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-bold">انتخاب مداخله ورزشی</label>
            <select
              value={selectedSport}
              onChange={(e) => {
                const sp = e.target.value as "football" | "futsal";
                setSelectedSport(sp);
                setLeague(sp === "futsal" ? "futsal" : "pro-league");
                setTeamHome("");
                setTeamAway("");
              }}
              className="w-full text-xs rounded-lg bg-[#07070a] border border-white/5 p-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
            >
              <option value="football">فوتبال (Football)</option>
              <option value="futsal">فوتسال (Futsal)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-bold">لیگ / مسابقات مربوطه</label>
            {selectedSport === "futsal" ? (
              <select
                value={league}
                onChange={(e) => setLeague(e.target.value)}
                className="w-full text-xs rounded-lg bg-[#07070a] border border-white/5 p-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
              >
                <option value="futsal">لیگ برتر فوتسال ایران</option>
              </select>
            ) : (
              <select
                value={league}
                onChange={(e) => setLeague(e.target.value)}
                className="w-full text-xs rounded-lg bg-[#07070a] border border-white/5 p-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
              >
                <option value="pro-league">لیگ برتر (خلیج فارس)</option>
                <option value="league-1">لیگ یک (آزادگان)</option>
                <option value="league-2">لیگ دو</option>
                <option value="hazfi-cup">جام حذفی</option>
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-bold">فصل رقابت‌ها</label>
            <input
              type="text"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              placeholder="مثال: ۱۴۰۴-۱۴۰۵"
              className="w-full text-xs rounded-lg bg-[#07070a] border border-white/5 p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-bold">هفته مسابقه</label>
            <select
              value={week}
              onChange={(e) => setWeek(e.target.value)}
              className="w-full text-xs rounded-lg bg-[#07070a] border border-white/5 p-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
            >
              {Array.from({ length: 40 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={`هفته ${n}`}>هفته {toPersianDigits(n)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Home Team vs Away Team */}
        <div className="grid gap-4 md:grid-cols-2 bg-slate-900/40 p-4 rounded-xl border border-white/[0.03]">
          {/* Home team and Logo input */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black text-emerald-400 mb-1">🏠 تیم میزبان (میزبان)</h4>
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-3">
                <label className="block text-[10px] text-slate-500 mb-1">انتخاب باشگاه</label>
                <select
                  value={teamHome}
                  onChange={(e) => handleHomeTeamChange(e.target.value)}
                  className="w-full text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white font-bold focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- انتخاب تیم --</option>
                  {filteredTeams.map(t => (
                    <option key={t.id || t.name} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">لوگو/اموجی</label>
                <input
                  type="text"
                  value={teamHomeLogo}
                  onChange={(e) => setTeamHomeLogo(e.target.value)}
                  className="w-full text-center text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white font-bold focus:outline-none"
                />
              </div>
            </div>
            <div className="text-[10px] text-slate-500">
              اگر تیم در لیست نیست، آن را ابتدا در تب "کلوپ‌ها" ایجاد کنید.
            </div>
          </div>

          {/* Away team and Logo input */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black text-blue-400 mb-1">✈️ تیم میهمان (میهمان)</h4>
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-3">
                <label className="block text-[10px] text-slate-500 mb-1">انتخاب باشگاه</label>
                <select
                  value={teamAway}
                  onChange={(e) => handleAwayTeamChange(e.target.value)}
                  className="w-full text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white font-bold focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- انتخاب تیم --</option>
                  {filteredTeams.map(t => (
                    <option key={t.id || t.name} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">لوگو/اموجی</label>
                <input
                  type="text"
                  value={teamAwayLogo}
                  onChange={(e) => setTeamAwayLogo(e.target.value)}
                  className="w-full text-center text-xs rounded bg-[#07070a] border border-white/5 p-2 text-white font-bold focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Date, Time, Venue, Referee */}
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-bold flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-450 text-slate-400" />
              تاریخ شمسی در پنل
            </label>
            <input
              type="text"
              value={jalaliDate}
              onChange={(e) => setJalaliDate(e.target.value)}
              placeholder="مثال: ۱۴۰۵/۰۳/۱۷"
              required
              className="w-full text-xs rounded-lg bg-[#07070a] border border-white/5 p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-center font-bold"
            />
            <span className="text-[9px] text-slate-500 mt-1 block">رشته شمسی معتبر برای تبدیل به ISO در دیتابیس</span>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-bold flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              ساعت شروع بازی
            </label>
            <input
              type="text"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="مثال: ۱۸:۳۰"
              required
              className="w-full text-xs rounded-lg bg-[#07070a] border border-white/5 p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-center font-bold"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-bold flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              استادیوم / سالن مسابقه
            </label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="مثال: ورزشگاه آزادی"
              className="w-full text-xs rounded-lg bg-[#07070a] border border-white/5 p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-bold flex items-center gap-1">
              <Award className="h-3.5 w-3.5 text-slate-400" />
              داور مسابقه
            </label>
            <input
              type="text"
              value={referee}
              onChange={(e) => setReferee(e.target.value)}
              placeholder="داور وسط"
              className="w-full text-xs rounded-lg bg-[#07070a] border border-white/5 p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Odds & Details */}
        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-bold flex items-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5 text-yellow-500" />
            ضرایب و پیش‌بینی مسابقه (پیشنهادی)
          </label>
          <input
            type="text"
            value={odds}
            onChange={(e) => setOdds(e.target.value)}
            className="w-full text-xs rounded-lg bg-[#07070a] border border-white/5 p-2.5 text-white focus:outline-none focus:border-emerald-500 font-bold"
          />
        </div>

        {/* Preview and media */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-bold">توضیحات کلی یا پیش‌نمایش بازی</label>
            <textarea
              value={previewDesc}
              onChange={(e) => setPreviewDesc(e.target.value)}
              rows={3}
              placeholder="جایگاه جدول، تاریخچه تقابل، غایبین و شرایط تیم‌ها..."
              className="w-full text-xs rounded-lg bg-[#07070a] border border-white/5 p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 leading-relaxed resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-bold">اطلاعات رسانه‌ای و پخش زنده</label>
            <textarea
              value={mediaInfo}
              onChange={(e) => setMediaInfo(e.target.value)}
              rows={3}
              placeholder="مثال: پخش زنده شبکه سه سیما با گزارش عادل فردوسی‌پور / کیفیت HD اسپورت پورتال"
              className="w-full text-xs rounded-lg bg-[#07070a] border border-white/5 p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 leading-relaxed resize-none"
            />
          </div>
        </div>

        {/* Probable lineups */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-bold">ترکیب احتمالی {teamHome || "میزبان"} (با ویرگول جدا کنید)</label>
            <input
              type="text"
              value={probableHome}
              onChange={(e) => setProbableHome(e.target.value)}
              placeholder="مهاجم، هافبک چپ، مدافع، دروازه‌بان..."
              className="w-full text-xs rounded-lg bg-[#07070a] border border-white/5 p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-bold">ترکیب احتمالی {teamAway || "میهمان"} (با ویرگول جدا کنید)</label>
            <input
              type="text"
              value={probableAway}
              onChange={(e) => setProbableAway(e.target.value)}
              placeholder="علیرضا، مهدی، رامین، سامان..."
              className="w-full text-xs rounded-lg bg-[#07070a] border border-white/5 p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Status and Score controller for full CRUD & Manual Finished Match Support */}
        <div className="p-4 rounded-xl bg-[#0d0d12] border border-emerald-500/15 space-y-4">
          <h4 className="text-xs font-black text-emerald-400 flex items-center gap-1.5 border-b border-white/5 pb-2">
            ⚙️ پنل وضعیت و نتیجه نهایی مسابقه (مدیریت مستقیم ادمین)
          </h4>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-bold">وضعیت لحظه‌ای بازی</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full text-xs rounded-lg bg-black border border-white/5 p-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
              >
                <option value="not-started">not-started (پیش‌رو / برگزار نشده)</option>
                <option value="live">live (در حال برگزاری / زنده)</option>
                <option value="finished">finished (خاتمه یافته / بازی فینیش‌شده)</option>
              </select>
            </div>
            <div>
              <label className="block text-[#dadcde] text-xs mb-1.5 font-bold">گل میزبان ({teamHome || "میزبان"})</label>
              <input
                type="number"
                min={0}
                value={scoreHome}
                onChange={(e) => setScoreHome(parseInt(e.target.value) || 0)}
                className="w-full text-xs rounded-lg bg-black border border-white/5 p-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[#dadcde] text-xs mb-1.5 font-bold">گل میهمان ({teamAway || "میهمان"})</label>
              <input
                type="number"
                min={0}
                value={scoreAway}
                onChange={(e) => setScoreAway(parseInt(e.target.value) || 0)}
                className="w-full text-xs rounded-lg bg-black border border-white/5 p-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <span className="text-[10px] text-slate-500 block leading-relaxed">
            * نکته ادمین: پس از ذخیره بازی با وضعیت finished، آمار جدول لیگ، رده‌بندی‌ها، تعداد بازی بازیکنان و تفاضل مجدداً به صورت کاملاً زنده محاسبه و همگام می‌شوند.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-[#18181c] border border-white/5 text-slate-350 hover:bg-white/5 hover:text-white transition cursor-pointer"
          >
            انصراف
          </button>
          
          <button
            type="submit"
            className="px-5 py-2 text-xs font-black rounded-lg bg-emerald-500 text-black hover:bg-emerald-450 transition flex items-center gap-1.5 shadow-md shadow-emerald-500/10 cursor-pointer"
            id="btn-save-match-details"
          >
            <Check className="h-4 w-4" /> ذخیره اطلاعات مسابقه پیش‌رو
          </button>
        </div>
      </form>
    </div>
  );
}

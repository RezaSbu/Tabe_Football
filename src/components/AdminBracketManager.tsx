import React, { useState, useEffect } from "react";
import { MatchItem } from "../types";
import { Trophy, Calendar, Check, AlertCircle, Trash2, ArrowLeftRight, HelpCircle } from "lucide-react";

interface AdminBracketManagerProps {
  bracket: {
    round16: any[];
    quarterFinals: any[];
    semiFinals: any[];
    final: any;
  } | null;
  matches: MatchItem[];
  onRefreshData: () => void;
  showShortSuccess: (msg: string) => void;
}

export default function AdminBracketManager({
  bracket,
  matches = [],
  onRefreshData,
  showShortSuccess
}: AdminBracketManagerProps) {
  // Filter only Hazfi Cup matches
  const cupMatches = matches.filter(
    (m) => (m.league || "").toLowerCase() === "hazfi-cup"
  );

  const [r16Ids, setR16Ids] = useState<string[]>(Array(8).fill(""));
  const [r16Winners, setR16Winners] = useState<string[]>(Array(8).fill(""));

  const [qfIds, setQfIds] = useState<string[]>(Array(4).fill(""));
  const [qfWinners, setQfWinners] = useState<string[]>(Array(4).fill(""));

  const [sfIds, setSfIds] = useState<string[]>(Array(2).fill(""));
  const [sfWinners, setSfWinners] = useState<string[]>(Array(2).fill(""));

  const [finalId, setFinalId] = useState<string>("");
  const [finalWinner, setFinalWinner] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Initialize selected values from the loaded bracket
  useEffect(() => {
    if (bracket) {
      const r16Arr = bracket.round16 || [];
      const qfArr = bracket.quarterFinals || [];
      const sfArr = bracket.semiFinals || [];
      
      const newR16 = Array(8).fill("");
      const newR16Winners = Array(8).fill("");
      r16Arr.forEach((m, idx) => {
        if (m && m.id && !m.id.startsWith("placeholder-") && !m.id.startsWith("r16-placeholder-")) {
          newR16[idx] = m.id;
        }
        newR16Winners[idx] = m?.winner || "";
      });

      const newQf = Array(4).fill("");
      const newQfWinners = Array(4).fill("");
      qfArr.forEach((m, idx) => {
        if (m && m.id && !m.id.startsWith("placeholder-") && !m.id.startsWith("qf-placeholder-")) {
          newQf[idx] = m.id;
        }
        newQfWinners[idx] = m?.winner || "";
      });

      const newSf = Array(2).fill("");
      const newSfWinners = Array(2).fill("");
      sfArr.forEach((m, idx) => {
        if (m && m.id && !m.id.startsWith("placeholder-") && !m.id.startsWith("sf-placeholder-")) {
          newSf[idx] = m.id;
        }
        newSfWinners[idx] = m?.winner || "";
      });

      setR16Ids(newR16);
      setR16Winners(newR16Winners);
      setQfIds(newQf);
      setQfWinners(newQfWinners);
      setSfIds(newSf);
      setSfWinners(newSfWinners);

      if (bracket.final && bracket.final.id && !bracket.final.id.startsWith("placeholder-") && !bracket.final.id.startsWith("final-placeholder")) {
        setFinalId(bracket.final.id);
      } else {
        setFinalId("");
      }
      setFinalWinner(bracket.final?.winner || "");
    }
  }, [bracket]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Build objects mapped from match IDs, falling back to clean structures if empty
      const round16 = r16Ids.map((id, index) => {
        const found = cupMatches.find((m) => String(m.id) === String(id));
        const item = found ? { ...found } : {
          id: `r16-placeholder-${index}`,
          teamHome: "",
          teamAway: "",
          scoreHome: 0,
          scoreAway: 0,
          status: "not-started",
          date: "",
          winner: ""
        };
        item.winner = r16Winners[index] || "";
        return item;
      });

      const quarterFinals = qfIds.map((id, index) => {
        const found = cupMatches.find((m) => String(m.id) === String(id));
        const item = found ? { ...found } : {
          id: `qf-placeholder-${index}`,
          teamHome: "",
          teamAway: "",
          scoreHome: 0,
          scoreAway: 0,
          status: "not-started",
          date: "",
          winner: ""
        };
        item.winner = qfWinners[index] || "";
        return item;
      });

      const semiFinals = sfIds.map((id, index) => {
        const found = cupMatches.find((m) => String(m.id) === String(id));
        const item = found ? { ...found } : {
          id: `sf-placeholder-${index}`,
          teamHome: "",
          teamAway: "",
          scoreHome: 0,
          scoreAway: 0,
          status: "not-started",
          date: "",
          winner: ""
        };
        item.winner = sfWinners[index] || "";
        return item;
      });

      const foundFinal = cupMatches.find((m) => String(m.id) === String(finalId));
      const final = foundFinal ? { ...foundFinal } : {
        id: "final-placeholder",
        teamHome: "",
        teamAway: "",
        scoreHome: 0,
        scoreAway: 0,
        status: "not-started",
        date: "",
        winner: ""
      };
      final.winner = finalWinner || "";

      const payload = {
        round16,
        quarterFinals,
        semiFinals,
        final
      };

      const res = await fetch("/api/bracket", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showShortSuccess("درخت رقابت‌های جام حذفی با موفقیت بازچینی و برندگان صعودکننده اعمال گردیدند.");
        onRefreshData();
      } else {
        alert("خطا در پاسخ دیتابیس.");
      }
    } catch {
      alert("خطای اتصال شبکه.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("آیا از پاکسازی تمام دیتای نمودار جاری و ریست کردن آن اطمینان کامل دارید؟ این کار اطلاعات رندوم قبلی را حذف می‌کند.")) return;
    setIsSaving(true);
    try {
      const payload = {
        round16: Array(8).fill(null).map((_, i) => ({
          id: `r16-placeholder-${i}`,
          teamHome: "",
          teamAway: "",
          scoreHome: 0,
          scoreAway: 0,
          status: "not-started",
          date: "",
          winner: ""
        })),
        quarterFinals: Array(4).fill(null).map((_, i) => ({
          id: `qf-placeholder-${i}`,
          teamHome: "",
          teamAway: "",
          scoreHome: 0,
          scoreAway: 0,
          status: "not-started",
          date: "",
          winner: ""
        })),
        semiFinals: Array(2).fill(null).map((_, i) => ({
          id: `sf-placeholder-${i}`,
          teamHome: "",
          teamAway: "",
          scoreHome: 0,
          scoreAway: 0,
          status: "not-started",
          date: "",
          winner: ""
        })),
        final: {
          id: "final-placeholder",
          teamHome: "",
          teamAway: "",
          scoreHome: 0,
          scoreAway: 0,
          status: "not-started",
          date: "",
          winner: ""
        }
      };

      const res = await fetch("/api/bracket", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setR16Ids(Array(8).fill(""));
        setR16Winners(Array(8).fill(""));
        setQfIds(Array(4).fill(""));
        setQfWinners(Array(4).fill(""));
        setSfIds(Array(2).fill(""));
        setSfWinners(Array(2).fill(""));
        setFinalId("");
        setFinalWinner("");
        showShortSuccess("نمودار جام حذفی به صورت کامل پاکسازی و بازنشانی شد.");
        onRefreshData();
      } else {
        alert("خطا در پاسخ دیتابیس.");
      }
    } catch {
      alert("خطای شبکه.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderSelect = (
    label: string,
    currentValue: string,
    onChange: (val: string) => void,
    winnerValue: string,
    onWinnerChange: (val: string) => void,
    slotNumber: number
  ) => {
    const selectedMatch = cupMatches.find((m) => String(m.id) === String(currentValue));

    return (
      <div key={`${label}-${slotNumber}`} className="bg-[#18181c]/80 p-3.5 border border-white/5 rounded-xl space-y-2.5 transition animate-fadeIn" id={`slot-${label}-${slotNumber}`}>
        <label className="block text-[11px] text-slate-400 font-bold">
          {label} (جایگاه {slotNumber})
        </label>
        <select
          value={currentValue}
          onChange={(e) => {
            onChange(e.target.value);
            onWinnerChange(""); // Reset winner when match changes
          }}
          className="w-full text-xs rounded-lg bg-slate-950 border border-white/5 p-2 text-white font-bold focus:outline-none focus:border-red-655"
        >
          <option value="">-- خالی / بدون اِنتساب مسابقه --</option>
          {cupMatches.map((m) => (
            <option key={m.id} value={m.id}>
              {m.teamHome} {m.scoreHome} - {m.scoreAway} {m.teamAway} ({m.date || "بدون تاریخ"})
            </option>
          ))}
        </select>

        {/* Dynamic inline winner selector */}
        {selectedMatch && selectedMatch.teamHome && (
          <div className="pt-2 border-t border-white/[0.04] space-y-1 bg-black/20 p-2 rounded-lg animate-fadeIn text-right">
            <span className="text-[10px] text-emerald-400 font-black block mb-1">
              🟢 تیم صعود‌کننده (برنده):
            </span>
            <div className="flex gap-1.5 justify-end">
              <button
                type="button"
                onClick={() => onWinnerChange(selectedMatch.teamHome)}
                className={`flex-1 py-1 text-[10px] font-black rounded-lg border transition ${
                  winnerValue === selectedMatch.teamHome
                    ? "bg-emerald-500/15 text-emerald-350 border-emerald-500/40"
                    : "bg-slate-900/40 text-slate-400 border-white/5 hover:text-white"
                }`}
              >
                {selectedMatch.teamHomeLogo || "⚽"} {selectedMatch.teamHome}
              </button>
              <button
                type="button"
                onClick={() => onWinnerChange(selectedMatch.teamAway)}
                className={`flex-1 py-1 text-[10px] font-black rounded-lg border transition ${
                  winnerValue === selectedMatch.teamAway
                    ? "bg-emerald-500/15 text-emerald-350 border-emerald-500/40"
                    : "bg-slate-900/40 text-slate-400 border-white/5 hover:text-white"
                }`}
              >
                {selectedMatch.teamAwayLogo || "⚽"} {selectedMatch.teamAway}
              </button>
              <button
                type="button"
                onClick={() => onWinnerChange("")}
                className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition ${
                  !winnerValue
                    ? "bg-red-500/10 text-red-00 border-red-500/30"
                    : "bg-slate-900/40 text-slate-400 border-white/5 hover:text-white"
                }`}
                title="عدم انتخاب برنده"
              >
                حذف
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-[#0b0b0f] border border-white/5 rounded-3xl p-6 space-y-6" dir="rtl" id="bracket-builder-root">
      {/* Header instructions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500 animate-pulse" />
            <h2 className="text-base font-black text-white">مدیریت هوشمند درخت جام حذفی کشور</h2>
          </div>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            از منوی افتادنی زیر می‌توانید بازی‌های تعریف‌شده فوتبال در مرحله جام حذفی را به جایگاه‌های درختی دلخواه وصل کنید. تغییرات بلافاصله با هویت زنده در نمودار منعکس می‌گردد.
          </p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={handleClearAll}
            disabled={isSaving}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs bg-red-950/45 text-red-400 border border-red-900/40 rounded-xl hover:bg-red-900/30 transition cursor-pointer font-bold w-full md:w-auto"
            id="btn-clear-bracket"
            title="کل اطلاعات قبلی نمودار را کاملا حذف کنید"
          >
            <Trash2 className="h-4 w-4" />
            <span>پاکسازی کامل نمودار (خالی کردن)</span>
          </button>
        </div>
      </div>

      {cupMatches.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-amber-500/5 border border-dashed border-amber-500/10 text-amber-500 space-y-3">
          <AlertCircle className="h-8 w-8 mx-auto animate-bounce" />
          <p className="text-xs font-bold leading-relaxed">
            هیچ بازی جام حذفی (Hazfi Cup) در بخش مدیریت بازی‌ها تعریف نشده است!
          </p>
          <p className="text-[11px] text-gray-400">
            برای چیدن درخت قرعه‌کشی، ابتدا باید از بخش **«مدیریت بازی‌ها»**، بازی فوتبال جدیدی تعریف کرده و لیگ آن را روی **«جام حذفی»** قرار دهید.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section 1: Round of 16 */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-300 border-r-2 border-red-500 pr-2">
              یک‌هشتم نهایی (۸ بازی - ۱۶ تیم)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {Array(8)
                .fill(null)
                .map((_, i) =>
                  renderSelect(
                    "یک‌هشتم",
                    r16Ids[i] || "",
                    (val) => {
                      const copy = [...r16Ids];
                      copy[i] = val;
                      setR16Ids(copy);
                    },
                    r16Winners[i] || "",
                    (val) => {
                      const copy = [...r16Winners];
                      copy[i] = val;
                      setR16Winners(copy);
                    },
                    i + 1
                  )
                )}
            </div>
          </div>

          {/* Section 2: Quarter Finals */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-cyan-400 border-r-2 border-cyan-500 pr-2">
              یک‌چهارم نهایی (۴ بازی - ۸ تیم)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {Array(4)
                .fill(null)
                .map((_, i) =>
                  renderSelect(
                    "یک‌چهارم",
                    qfIds[i] || "",
                    (val) => {
                      const copy = [...qfIds];
                      copy[i] = val;
                      setQfIds(copy);
                    },
                    qfWinners[i] || "",
                    (val) => {
                      const copy = [...qfWinners];
                      copy[i] = val;
                      setQfWinners(copy);
                    },
                    i + 1
                  )
                )}
            </div>
          </div>

          {/* Section 3: Semi Finals */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-amber-400 border-r-2 border-amber-500 pr-2">
              نیمه‌نهایی (۲ بازی - ۴ تیم)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array(2)
                .fill(null)
                .map((_, i) =>
                  renderSelect(
                    "نیمه‌نهایی",
                    sfIds[i] || "",
                    (val) => {
                      const copy = [...sfIds];
                      copy[i] = val;
                      setSfIds(copy);
                    },
                    sfWinners[i] || "",
                    (val) => {
                      const copy = [...sfWinners];
                      copy[i] = val;
                      setSfWinners(copy);
                    },
                    i + 1
                  )
                )}
            </div>
          </div>

          {/* Section 4: Golden Final match details */}
          <div className="space-y-4 max-w-sm">
            <h3 className="text-xs font-black text-emerald-400 border-r-2 border-emerald-500 pr-2">
              فینال نهایی جام حذفی (تک بازی بقا)
            </h3>
            {renderSelect("فینال بزرگ", finalId, setFinalId, finalWinner, setFinalWinner, 1)}
          </div>

          {/* Save panel */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-6 py-3 text-xs bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-black font-extrabold rounded-2xl transition duration-150 disabled:opacity-50 cursor-pointer"
              id="btn-save-bracket"
            >
              <Check className="h-4 w-4" />
              <span>{isSaving ? "درحال همگام‌سازی..." : "ذخیره نهایی ترتیب درخت جام حذفی"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from "react";
import { CoachItem, TeamItem } from "../types";
import { toPersianDigits, getSafeImageUrl } from "../utils";
import { Users, Plus, Trash2, Edit2, Search, X, Check, Save, Trophy } from "lucide-react";

interface AdminCoachProfilesProps {
  coaches: CoachItem[];
  teams: TeamItem[];
  onRefreshData: () => void;
  showShortSuccess: (msg: string) => void;
}

export default function AdminCoachProfiles({
  coaches = [],
  teams = [],
  onRefreshData,
  showShortSuccess
}: AdminCoachProfilesProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<CoachItem> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleCreateNew = () => {
    setEditingItem({
      id: "",
      name: "",
      age: 45,
      nationality: "ایرانی",
      teamId: "",
      teamName: "مربی آزاد",
      image: "",
      biography: "",
      seasonStats: { matches: 0, wins: 0, draws: 0, losses: 0, winRate: 0, goalsFor: 0, goalsAgainst: 0 },
      titles: [],
      coachingStyle: "",
      teamHistory: [],
      licenseLevel: "A",
      experienceYears: 10
    });
    setIsEditing(true);
  };

  const handleEdit = (item: CoachItem) => {
    setEditingItem(JSON.parse(JSON.stringify(item)));
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("آیا از حذف این پروفایل مربی اطمینان دارید؟")) return;
    try {
      const res = await fetch(`/api/coaches/${id}`, { method: "DELETE" });
      if (res.ok) {
        showShortSuccess("پروفایل مربی با موفقیت از پایگاه داده حذف گردید.");
        onRefreshData();
      } else {
        alert("خطا در پاسخگویی کلاینت دیتابیس.");
      }
    } catch {
      alert("خطای سرور.");
    }
  };

  const handleSave = async () => {
    if (!editingItem?.name) {
      alert("نام مربی را وارد نمایید.");
      return;
    }

    const isNew = !editingItem.id;
    const url = isNew ? "/api/coaches" : `/api/coaches/${editingItem.id}`;
    const method = isNew ? "POST" : "PUT";

    if (editingItem.teamId) {
      const selectedTeam = teams.find(t => t.id === editingItem.teamId);
      if (selectedTeam) {
        editingItem.teamName = selectedTeam.name;
      }
    } else {
      editingItem.teamId = "";
      editingItem.teamName = "مربی آزاد";
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingItem)
      });
      if (res.ok) {
        showShortSuccess(isNew ? "پروفایل مربی جدید با موفقیت ذخیره گردید." : "تغییرات پروفایل مربی با موفقیت ثبت شد.");
        setIsEditing(false);
        setEditingItem(null);
        onRefreshData();
      } else {
        alert("خطا در ذخیره‌سازی.");
      }
    } catch {
      alert("بروز خطای غیرمنتظره سرور.");
    }
  };

  const filteredCoaches = coaches.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.teamName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-[#0b0b0f] border border-white/5 rounded-3xl p-6 space-y-6" dir="rtl">
      {!isEditing ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-red-500" />
                <span>مدیریت پروفایل‌های مربیان</span>
              </h2>
              <p className="text-[10px] text-gray-400 mt-0.5">در این بخش پروفایل مربیان را تعریف و ویرایش کنید.</p>
            </div>
            <button
              onClick={handleCreateNew}
              className="bg-red-655 hover:bg-red-750 font-black text-white text-xs px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1 transition self-stretch sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>ایجاد پروفایل مربی جدید</span>
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="جستجوی سریع مربی بر اساس نام یا نام تیم..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-gray-950 border border-white/5 rounded-xl pr-9 pl-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-655"
            />
            <Search className="absolute right-3 top-3.5 h-4 w-4 text-gray-500" />
          </div>

          {filteredCoaches.length === 0 ? (
            <div className="text-center py-10 bg-gray-950/40 rounded-2xl border border-white/5">
              <p className="text-xs text-gray-500">هیچ مربی‌ای یافت نشد.</p>
            </div>
          ) : (
            <div className="grid gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {filteredCoaches.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3.5 rounded-xl bg-gray-950/40 border border-white/5 hover:border-red-550/20 transition">
                  <div className="flex items-center gap-3">
                    <img
                      src={getSafeImageUrl(c.image)}
                      alt={c.name}
                      className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="text-xs font-black text-white">{c.name}</div>
                      <div className="text-[10px] text-gray-400 flex items-center gap-2 mt-0.5">
                        <span className="font-bold text-red-400">{c.nationality}</span>
                        <span>•</span>
                        <span>{c.teamName}</span>
                        <span>•</span>
                        <span>{toPersianDigits(c.seasonStats?.wins || 0)} برد</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono">
                    <button
                      onClick={() => handleEdit(c)}
                      className="p-1.5 rounded-lg bg-gray-900 border border-white/5 text-gray-300 hover:text-white hover:border-red-555/40 transition cursor-pointer"
                      title="ویرایش پروفایل"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1.5 rounded-lg bg-red-955/20 border border-red-900/30 text-red-400 hover:bg-red-955/40 transition cursor-pointer"
                      title="حذف مربی"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-red-500" />
                <span>{editingItem?.id ? "ویرایش مشخصات مربی" : "تعریف مشخصات مربی جدید"}</span>
              </h2>
              <p className="text-[10px] text-gray-400">فیلدهای زیر را برای پروفایل مربی پر نمایید.</p>
            </div>
            <button
              onClick={() => { setIsEditing(false); setEditingItem(null); }}
              className="p-2 bg-gray-900 border border-white/5 hover:bg-gray-800 text-gray-400 rounded-xl transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-gray-400 font-bold mb-1.5">نام کامل مربی *</label>
              <input
                type="text"
                value={editingItem?.name || ""}
                onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655"
                placeholder="مثال: یحیی گل‌محمدی"
              />
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 font-bold mb-1.5">تیم باشگاهی فعلی</label>
              <select
                value={editingItem?.teamId || ""}
                onChange={e => {
                  const val = e.target.value;
                  const targetTeam = teams.find(t => t.id === val);
                  setEditingItem({
                    ...editingItem,
                    teamId: val,
                    teamName: targetTeam ? targetTeam.name : "مربی آزاد"
                  });
                }}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655 font-bold"
              >
                <option value="">بدون تیم / مربی آزاد</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 font-bold mb-1.5">ملیت</label>
              <input
                type="text"
                value={editingItem?.nationality || ""}
                onChange={e => setEditingItem({ ...editingItem, nationality: e.target.value })}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655"
                placeholder="ایرانی"
              />
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 font-bold mb-1.5">سن</label>
              <input
                type="text"
                value={editingItem?.age || ""}
                onChange={e => setEditingItem({ ...editingItem, age: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655 font-mono"
                placeholder="45"
              />
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 font-bold mb-1.5">سبک مربیگری</label>
              <input
                type="text"
                value={editingItem?.coachingStyle || ""}
                onChange={e => setEditingItem({ ...editingItem, coachingStyle: e.target.value })}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655"
                placeholder="هجومی، تدافعی، مالکانه، ..."
              />
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 font-bold mb-1.5">مدرک مربیگری</label>
              <select
                value={editingItem?.licenseLevel || ""}
                onChange={e => setEditingItem({ ...editingItem, licenseLevel: e.target.value })}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655 font-bold"
              >
                <option value="C">C</option>
                <option value="B">B</option>
                <option value="A">A</option>
                <option value="UEFA Pro">UEFA Pro</option>
                <option value="UEFA A">UEFA A</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 font-bold mb-1.5">سال‌های تجربه</label>
              <input
                type="text"
                value={editingItem?.experienceYears || ""}
                onChange={e => setEditingItem({ ...editingItem, experienceYears: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655 font-mono"
                placeholder="10"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] text-gray-400 font-bold mb-1.5">لینک عکس مربی (آدرس URL)</label>
              <input
                type="text"
                value={editingItem?.image || ""}
                onChange={e => setEditingItem({ ...editingItem, image: e.target.value })}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655 font-mono"
                placeholder="https://images.unsplash.com/..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] text-gray-400 font-bold mb-1.5">بیوگرافی</label>
              <textarea
                value={editingItem?.biography || ""}
                onChange={e => setEditingItem({ ...editingItem, biography: e.target.value })}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655 h-24"
                placeholder="متن معرفی و بیوگرافی مربی..."
              />
            </div>
          </div>

          <div className="bg-gray-950/40 p-4 border border-white/5 rounded-2xl space-y-3">
            <h3 className="text-xs font-black text-red-400">آمار مربی در فصل جاری</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[10px] text-slate-450 mb-1">تعداد بازی</label>
                <input
                  type="number"
                  value={editingItem?.seasonStats?.matches ?? 0}
                  onChange={e => setEditingItem({
                    ...editingItem,
                    seasonStats: { ...(editingItem.seasonStats || { matches: 0, wins: 0, draws: 0, losses: 0, winRate: 0, goalsFor: 0, goalsAgainst: 0 }), matches: parseInt(e.target.value, 10) || 0 }
                  })}
                  className="w-full bg-slate-950 border border-white/5 rounded-lg px-2.5 py-2 text-white font-mono text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-450 mb-1">برد</label>
                <input
                  type="number"
                  value={editingItem?.seasonStats?.wins ?? 0}
                  onChange={e => setEditingItem({
                    ...editingItem,
                    seasonStats: { ...(editingItem.seasonStats || { matches: 0, wins: 0, draws: 0, losses: 0, winRate: 0, goalsFor: 0, goalsAgainst: 0 }), wins: parseInt(e.target.value, 10) || 0 }
                  })}
                  className="w-full bg-slate-950 border border-white/5 rounded-lg px-2.5 py-2 text-white font-mono text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-450 mb-1">مساوی</label>
                <input
                  type="number"
                  value={editingItem?.seasonStats?.draws ?? 0}
                  onChange={e => setEditingItem({
                    ...editingItem,
                    seasonStats: { ...(editingItem.seasonStats || { matches: 0, wins: 0, draws: 0, losses: 0, winRate: 0, goalsFor: 0, goalsAgainst: 0 }), draws: parseInt(e.target.value, 10) || 0 }
                  })}
                  className="w-full bg-slate-950 border border-white/5 rounded-lg px-2.5 py-2 text-white font-mono text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-450 mb-1">باخت</label>
                <input
                  type="number"
                  value={editingItem?.seasonStats?.losses ?? 0}
                  onChange={e => setEditingItem({
                    ...editingItem,
                    seasonStats: { ...(editingItem.seasonStats || { matches: 0, wins: 0, draws: 0, losses: 0, winRate: 0, goalsFor: 0, goalsAgainst: 0 }), losses: parseInt(e.target.value, 10) || 0 }
                  })}
                  className="w-full bg-slate-950 border border-white/5 rounded-lg px-2.5 py-2 text-white font-mono text-center"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-950/40 p-4 border border-white/5 rounded-2xl space-y-3">
            <h3 className="text-xs font-black text-red-400 flex items-center gap-1.5">
              <Trophy className="h-4 w-4" />
              <span>افتخارات و عناوین (هر خط یک عنوان)</span>
            </h3>
            <textarea
              value={(editingItem?.titles || []).join("\n")}
              onChange={e => setEditingItem({
                ...editingItem,
                titles: e.target.value.split("\n").filter(t => t.trim())
              })}
              className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655 h-20"
              placeholder="قهرمان لیگ برتر ۱۴۰۲&#10;نایب قهرمان جام حذفی&#10;..."
            />
          </div>

          {/* teamHistory Segmented Coach Career Timeline */}
          <div className="bg-gray-950/40 p-4 border border-white/5 rounded-2xl space-y-4">
            <h3 className="text-xs font-black text-red-400">سوابق فعالیت و سابقه باشگاهی مربی (teamHistory)</h3>
            <p className="text-[10px] text-gray-400">سوابق همکاری مربی با باشگاه‌های مختلف را به صورت بازه زمانی ثبت کنید تا در تاریخچه سوابق مربی نمایش داده شود.</p>

            {editingItem?.teamHistory && editingItem.teamHistory.length > 0 ? (
              <div className="space-y-2">
                {editingItem.teamHistory.map((h, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-white/5 text-xs font-bold">
                    <div className="flex flex-wrap gap-3 text-gray-300">
                      <span className="text-white font-extrabold">{h.teamName}</span>
                      <span>•</span>
                      <span className="text-emerald-400">{toPersianDigits(h.role || "سرمربی")}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-400">{toPersianDigits(h.startYear)} تا {toPersianDigits(h.endYear || "اکنون")}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newHistory = [...(editingItem.teamHistory || [])];
                        newHistory.splice(idx, 1);
                        setEditingItem({
                          ...editingItem,
                          teamHistory: newHistory
                        });
                      }}
                      className="p-1 rounded bg-red-955/20 text-red-400 hover:bg-red-955/40 transition text-[10px]"
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-gray-500">هیچ سابقه همکاری ثبت نشده است.</p>
            )}

            {/* Form to add coach history item */}
            <div className="border-t border-white/5 pt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">نام باشگاه</label>
                <select
                  id="new-hist-team"
                  className="w-full bg-slate-950 border border-white/5 rounded-lg px-2 py-1.5 text-xs text-white font-bold"
                >
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                  <option value="custom">باشگاه خارج از سیستم (نام دستی)...</option>
                </select>
                <input
                  type="text"
                  id="new-hist-team-custom"
                  placeholder="نام باشگاه دستی"
                  className="w-full bg-slate-950 border border-white/5 rounded-lg px-2 py-1 text-[10px] text-white mt-1 hidden"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">نقش / سمت</label>
                <input
                  type="text"
                  id="new-hist-role"
                  placeholder="سرمربی / مربی"
                  defaultValue="سرمربی"
                  className="w-full bg-slate-950 border border-white/5 rounded-lg px-2 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">سال شروع (شمسی)</label>
                <input
                  type="text"
                  id="new-hist-start"
                  placeholder="1401"
                  className="w-full bg-slate-950 border border-white/5 rounded-lg px-2 py-1.5 text-xs text-white text-center font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">سال پایان (شمسی)</label>
                <input
                  type="text"
                  id="new-hist-end"
                  placeholder="1403 یا اکنون"
                  className="w-full bg-slate-950 border border-white/5 rounded-lg px-2 py-1.5 text-xs text-white text-center font-mono"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <button
                  type="button"
                  onClick={() => {
                    const teamSelect = document.getElementById("new-hist-team") as HTMLSelectElement;
                    const customInp = document.getElementById("new-hist-team-custom") as HTMLInputElement;
                    const roleInp = document.getElementById("new-hist-role") as HTMLInputElement;
                    const startInp = document.getElementById("new-hist-start") as HTMLInputElement;
                    const endInp = document.getElementById("new-hist-end") as HTMLInputElement;

                    if (teamSelect) {
                      let tId = teamSelect.value;
                      let tName = "";
                      if (tId === "custom") {
                        tName = customInp?.value || "باشگاه ناشناس";
                        tId = "custom-" + Date.now();
                      } else {
                        const tObj = teams.find(t => t.id === tId);
                        tName = tObj ? tObj.name : "باشگاه ناشناس";
                      }

                      const newItem = {
                        teamId: tId,
                        teamName: tName,
                        role: roleInp?.value || "سرمربی",
                        startYear: startInp?.value || "۱۴۰۲",
                        endYear: endInp?.value || "اکنون"
                      };

                      const currentHistory = editingItem?.teamHistory || [];
                      const updatedHistory = [...currentHistory, newItem];

                      setEditingItem({
                        ...editingItem,
                        teamHistory: updatedHistory
                      });

                      // Reset inputs
                      if (customInp) customInp.value = "";
                      if (startInp) startInp.value = "";
                      if (endInp) endInp.value = "";
                    }
                  }}
                  className="w-full bg-red-655 hover:bg-red-750 text-white font-bold text-xs py-2 rounded-lg cursor-pointer transition"
                >
                  ثبت سابقه مربیگری
                </button>
              </div>
            </div>
            
            {/* Simple toggle listener script-effect for custom team field */}
            <span className="hidden">
              {(() => {
                setTimeout(() => {
                  const sel = document.getElementById("new-hist-team") as HTMLSelectElement;
                  const cus = document.getElementById("new-hist-team-custom") as HTMLInputElement;
                  if (sel && cus) {
                    sel.onchange = () => {
                      if (sel.value === "custom") {
                        cus.classList.remove("hidden");
                      } else {
                        cus.classList.add("hidden");
                      }
                    };
                  }
                }, 100);
                return null;
              })()}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <button
              onClick={() => { setIsEditing(false); setEditingItem(null); }}
              className="bg-transparent hover:bg-white/5 text-gray-400 hover:text-white font-bold text-xs px-5 py-2.5 rounded-xl border border-white/5 transition"
            >
              انصراف
            </button>
            <button
              onClick={handleSave}
              className="bg-red-655 hover:bg-red-750 text-white font-black text-xs px-6 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 transition"
            >
              <Save className="h-4 w-4" />
              <span>ذخیره پروفایل مربی</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

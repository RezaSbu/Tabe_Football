import React, { useState } from "react";
import { PlayerItem, TeamItem } from "../types";
import { toPersianDigits, getSafeImageUrl } from "../utils";
import { Users, Plus, Trash2, Edit2, Search, X, Check, Save } from "lucide-react";

const PLAYER_POSITIONS = [
  "دروازه‌بان",
  "مدافع",
  "مدافع کناری",
  "هافبک",
  "هافبک دفاعی",
  "هافبک هجومی",
  "وینگر",
  "مهاجم",
  "مهاجم نوک"
];

interface AdminPlayerProfilesProps {
  players: PlayerItem[];
  teams: TeamItem[];
  onRefreshData: () => void;
  showShortSuccess: (msg: string) => void;
}

export default function AdminPlayerProfiles({
  players = [],
  teams = [],
  onRefreshData,
  showShortSuccess
}: AdminPlayerProfilesProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<PlayerItem> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const recalculateStats = (list: any[]) => {
    const sum = { matches: 0, goals: 0, assists: 0, cleanSheets: 0 };
    list.forEach(item => {
      sum.matches += parseInt(item.matches as any, 10) || 0;
      sum.goals += parseInt(item.goals as any, 10) || 0;
      sum.assists += parseInt(item.assists as any, 10) || 0;
      sum.cleanSheets += parseInt(item.cleanSheets as any, 10) || 0;
    });
    return sum;
  };

  const handleCreateNew = () => {
    setEditingItem({
      id: "",
      name: "",
      number: "10",
      position: "هافبک",
      age: "24",
      nationality: "ایرانی",
      teamId: "",
      teamName: "بازیکن آزاد",
      image: "",
      seasonStats: {
        matches: 0,
        goals: 0,
        assists: 0,
        cleanSheets: 0
      },
      statsByTeam: []
    });
    setIsEditing(true);
  };

  const handleEdit = (item: PlayerItem) => {
    setEditingItem(JSON.parse(JSON.stringify(item))); // Deep copy
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("آیا از حذف این پروفایل بازیکن اطمینان دارید؟")) return;
    try {
      const res = await fetch(`/api/players/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        showShortSuccess("پروفایل بازیکن با موفقیت از پایگاه داده کلان حذف گردید.");
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
      alert("نام بازیکن را وارد نمایید.");
      return;
    }

    const isNew = !editingItem.id;
    const url = isNew ? "/api/players" : `/api/players/${editingItem.id}`;
    const method = isNew ? "POST" : "PUT";

    // Re-verify teamName based on chosen teamId
    if (editingItem.teamId) {
      const selectedTeam = teams.find(t => t.id === editingItem.teamId);
      if (selectedTeam) {
        editingItem.teamName = selectedTeam.name;
      }
    } else {
      editingItem.teamId = "";
      editingItem.teamName = "بازیکن آزاد";
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingItem)
      });
      if (res.ok) {
        showShortSuccess(isNew ? "پروفایل بازیکن جدید با موفقیت ذخیره گردید." : "تغییرات پروفایل بازیکن با موفقیت ثبت شد.");
        setIsEditing(false);
        setEditingItem(null);
        onRefreshData();
      } else if (res.status === 409) {
        const data = await res.json();
        const reload = window.confirm(`${data.message || "این بازیکن توسط شخص دیگری ویرایش شده است."}\nبرای بارگذاری اطلاعات جدید «تایید» را بزنید.`);
        if (reload) {
          setIsEditing(false);
          setEditingItem(null);
          onRefreshData();
        }
      } else {
        alert("خطا در ذخیره‌سازی.");
      }
    } catch {
      alert("بروز خطای غیرمنتظره سرور.");
    }
  };

  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.teamName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-[#0b0b0f] border border-white/5 rounded-3xl p-6 space-y-6" dir="rtl">
      
      {!isEditing ? (
        // LIST VIEW VIEWPORT
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-red-500" />
                <span>مدیریت پروفایل‌های بازیکنان</span>
              </h2>
              <p className="text-[10px] text-gray-400 mt-0.5">در این بخش پروفایل بازیکنانی را تعریف کنید که در نتایج جستجوی ادمین و ترکیب هفته نمایش داده می‌شوند.</p>
            </div>
            
            <button
              onClick={handleCreateNew}
              className="bg-red-655 hover:bg-red-750 font-black text-white text-xs px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1 transition self-stretch sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>ایجاد پروفایل بازیکن جدید</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="جستجوی سریع بازیکن بر اساس نام یا نام تیم..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-gray-950 border border-white/5 rounded-xl pr-9 pl-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-655"
            />
            <Search className="absolute right-3 top-3.5 h-4 w-4 text-gray-500" />
          </div>

          {filteredPlayers.length === 0 ? (
            <div className="text-center py-10 bg-gray-950/40 rounded-2xl border border-white/5">
              <p className="text-xs text-gray-500">هیچ بازیکنی یافت نشد.</p>
            </div>
          ) : (
            <div className="grid gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {filteredPlayers.map(p => (
                <div 
                  key={p.id} 
                  className="flex items-center justify-between p-3.5 rounded-xl bg-gray-950/40 border border-white/5 hover:border-red-550/20 transition"
                >
                  <div className="flex items-center gap-3">
                    <img loading="lazy" decoding="async" 
                      src={getSafeImageUrl(p.image)} 
                      alt={p.name}
                      className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="text-xs font-black text-white">{p.name}</div>
                      <div className="text-[10px] text-gray-400 flex items-center gap-2 mt-0.5">
                        <span className="font-bold text-red-400">{p.position}</span>
                        <span>•</span>
                        <span>{p.teamName}</span>
                        <span>•</span>
                        <span>پیراهن: {toPersianDigits(p.number || "0")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono">
                    <button
                      onClick={() => handleEdit(p)}
                      className="p-1.5 rounded-lg bg-gray-900 border border-white/5 text-gray-300 hover:text-white hover:border-red-555/40 transition cursor-pointer"
                      title="ویرایش پروفایل"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 rounded-lg bg-red-955/20 border border-red-900/30 text-red-400 hover:bg-red-955/40 transition cursor-pointer"
                      title="حذف بازیکن"
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
        // EDIT/CREATE VIEWPORT
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-red-500" />
                <span>{editingItem?.id ? "ویرایش مشخصات بازیکن" : "تعریف مشخصات بازیکن جدید"}</span>
              </h2>
              <p className="text-[10px] text-gray-400">فیلدهای زیر را برای بازنویسی مشخصات هویتی و ورزشی بازیکن پر نمایید.</p>
            </div>
            
            <button
              onClick={() => {
                setIsEditing(false);
                setEditingItem(null);
              }}
              className="p-2 bg-gray-900 border border-white/5 hover:bg-gray-800 text-gray-400 rounded-xl transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-gray-400 font-bold mb-1.5">نام کامل بازیکن *</label>
              <input
                type="text"
                value={editingItem?.name || ""}
                onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655"
                placeholder="مثال: مهدی طارمی"
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
                    teamName: targetTeam ? targetTeam.name : "بازیکن آزاد" 
                  });
                }}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655 font-bold"
              >
                <option value="">بدون تیم / بازیکن آزاد</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 font-bold mb-1.5">پست تخصصى بازیکن</label>
              <select
                value={editingItem?.position || ""}
                onChange={e => setEditingItem({ ...editingItem, position: e.target.value })}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655 font-bold"
              >
                <option value="">انتخاب پست تخصصی</option>
                {editingItem?.position && !PLAYER_POSITIONS.includes(editingItem.position) && (
                  <option value={editingItem.position}>{editingItem.position}</option>
                )}
                {PLAYER_POSITIONS.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 font-bold mb-1.5">شماره پیراهن</label>
              <input
                type="text"
                value={editingItem?.number || ""}
                onChange={e => setEditingItem({ ...editingItem, number: e.target.value, shirt_number: e.target.value })}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655 font-mono"
                placeholder="10"
              />
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 font-bold mb-1.5">سن بازیکن</label>
              <input
                type="text"
                value={editingItem?.age || ""}
                onChange={e => setEditingItem({ ...editingItem, age: e.target.value })}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655 font-mono"
                placeholder="27"
              />
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
              <label className="block text-[11px] text-gray-400 font-bold mb-1.5">پای تخصصی (راست/چپ/دوپا)</label>
              <select
                value={editingItem?.foot || ""}
                onChange={e => setEditingItem({ ...editingItem, foot: e.target.value })}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655 font-bold"
              >
                <option value="">نامشخص</option>
                <option value="راست">راست‌پا</option>
                <option value="چپ">چپ‌پا</option>
                <option value="دوپا">دوپا</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 font-bold mb-1.5">قد بازیکن</label>
              <input
                type="text"
                value={editingItem?.height || ""}
                onChange={e => setEditingItem({ ...editingItem, height: e.target.value })}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655 font-mono"
                placeholder="مثال: 182 cm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] text-gray-400 font-bold mb-1.5">لینک عکس چهره بازیکن (آدرس URL)</label>
              <input
                type="text"
                value={editingItem?.image || ""}
                onChange={e => setEditingItem({ ...editingItem, image: e.target.value })}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655 font-mono"
                placeholder="https://images.unsplash.com/..."
              />
            </div>
          </div>

          {/* Player stats box */}
          <div className="bg-gray-950/40 p-4 border border-white/5 rounded-2xl space-y-3">
            <h3 className="text-xs font-black text-red-400">آمار بازیکن در فصل جاری</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[10px] text-slate-450 mb-1">تعداد بازی</label>
                <input
                  type="number"
                  value={editingItem?.seasonStats?.matches ?? 0}
                  onChange={e => setEditingItem({
                    ...editingItem!,
                    seasonStats: { ...(editingItem!.seasonStats || { matches: 0, goals: 0, assists: 0, cleanSheets: 0 }), matches: parseInt(e.target.value, 10) || 0 }
                  })}
                  className="w-full bg-slate-950 border border-white/5 rounded-lg px-2.5 py-2 text-white font-mono text-center"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-450 mb-1">گل‌های زده</label>
                <input
                  type="number"
                  value={editingItem?.seasonStats?.goals ?? 0}
                  onChange={e => setEditingItem({
                    ...editingItem!,
                    seasonStats: { ...(editingItem!.seasonStats || { matches: 0, goals: 0, assists: 0, cleanSheets: 0 }), goals: parseInt(e.target.value, 10) || 0 }
                  })}
                  className="w-full bg-slate-950 border border-white/5 rounded-lg px-2.5 py-2 text-white font-mono text-center"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-450 mb-1">پاس گل‌</label>
                <input
                  type="number"
                  value={editingItem?.seasonStats?.assists ?? 0}
                  onChange={e => setEditingItem({
                    ...editingItem!,
                    seasonStats: { ...(editingItem!.seasonStats || { matches: 0, goals: 0, assists: 0, cleanSheets: 0 }), assists: parseInt(e.target.value, 10) || 0 }
                  })}
                  className="w-full bg-slate-950 border border-white/5 rounded-lg px-2.5 py-2 text-white font-mono text-center"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-450 mb-1">کلین‌شیت‌ها</label>
                <input
                  type="number"
                  value={editingItem?.seasonStats?.cleanSheets ?? 0}
                  onChange={e => setEditingItem({
                    ...editingItem!,
                    seasonStats: { ...(editingItem!.seasonStats || { matches: 0, goals: 0, assists: 0, cleanSheets: 0 }), cleanSheets: parseInt(e.target.value, 10) || 0 }
                  })}
                  className="w-full bg-slate-950 border border-white/5 rounded-lg px-2.5 py-2 text-white font-mono text-center"
                />
              </div>
            </div>
          </div>

          {/* statsByTeam Segmented Statistics */}
          <div className="bg-gray-950/40 p-4 border border-white/5 rounded-2xl space-y-4">
            <h3 className="text-xs font-black text-red-400">آمار تفکیکی به تفکیک تیم‌ها (statsByTeam)</h3>
            <p className="text-[10px] text-gray-400">اگر بازیکن در طول فصل بین تیم‌ها جابجا شده است، آمار او را در هر تیم اضافه کنید. مجموع این آمار جایگزین آمار کلی بالا خواهد شد.</p>

            {editingItem?.statsByTeam && editingItem.statsByTeam.length > 0 ? (
              <div className="space-y-2">
                {editingItem.statsByTeam.map((st, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-white/5 text-xs font-bold">
                    <div className="flex flex-wrap gap-3 text-gray-300">
                      <span className="text-white">{st.teamName}</span>
                      <span>•</span>
                      <span>{toPersianDigits(st.matches)} بازی</span>
                      <span>•</span>
                      <span className="text-emerald-400">{toPersianDigits(st.goals)} گل</span>
                      <span>•</span>
                      <span className="text-cyan-400">{toPersianDigits(st.assists)} پاس گل</span>
                      {st.cleanSheets !== undefined && (
                        <>
                          <span>•</span>
                          <span className="text-amber-500">{toPersianDigits(st.cleanSheets)} کلین‌شیت</span>
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newStats = [...(editingItem.statsByTeam || [])];
                        newStats.splice(idx, 1);
                        const cumulative = recalculateStats(newStats);
                        setEditingItem({
                          ...editingItem,
                          statsByTeam: newStats,
                          seasonStats: cumulative
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
              <p className="text-[10px] text-gray-500">هیچ آمار تفکیکی ثبت نشده است (آمار کلی بالای صفحه استفاده می‌شود).</p>
            )}

            {/* Adding form */}
            <div className="border-t border-white/5 pt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">انتخاب تیم</label>
                <select
                  id="new-stat-team"
                  className="w-full bg-slate-950 border border-white/5 rounded-lg px-2 py-1.5 text-xs text-white"
                >
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">تعداد بازی</label>
                <input
                  type="number"
                  id="new-stat-matches"
                  placeholder="0"
                  className="w-full bg-slate-950 border border-white/5 rounded-lg px-2 py-1.5 text-xs text-white text-center font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">گل زده</label>
                <input
                  type="number"
                  id="new-stat-goals"
                  placeholder="0"
                  className="w-full bg-slate-950 border border-white/5 rounded-lg px-2 py-1.5 text-xs text-white text-center font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">پاس گل / کلین‌شیت</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    id="new-stat-assists"
                    placeholder="پاس"
                    className="w-1/2 bg-slate-950 border border-white/5 rounded-lg px-2 py-1.5 text-xs text-white text-center font-mono"
                  />
                  <input
                    type="number"
                    id="new-stat-cleansheets"
                    placeholder="کلین"
                    className="w-1/2 bg-slate-950 border border-white/5 rounded-lg px-2 py-1.5 text-xs text-white text-center font-mono"
                  />
                </div>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <button
                  type="button"
                  onClick={() => {
                    const teamSelect = document.getElementById("new-stat-team") as HTMLSelectElement;
                    const matchesInp = document.getElementById("new-stat-matches") as HTMLInputElement;
                    const goalsInp = document.getElementById("new-stat-goals") as HTMLInputElement;
                    const assistsInp = document.getElementById("new-stat-assists") as HTMLInputElement;
                    const cleanInp = document.getElementById("new-stat-cleansheets") as HTMLInputElement;

                    if (teamSelect && teamSelect.value) {
                      const selectedTeam = teams.find(t => t.id === teamSelect.value);
                      const matchesVal = parseInt(matchesInp?.value, 10) || 0;
                      const goalsVal = parseInt(goalsInp?.value, 10) || 0;
                      const assistsVal = parseInt(assistsInp?.value, 10) || 0;
                      const cleanVal = parseInt(cleanInp?.value, 10) || 0;

                      const newItem = {
                        teamId: teamSelect.value,
                        teamName: selectedTeam ? selectedTeam.name : "نامشخص",
                        matches: matchesVal,
                        goals: goalsVal,
                        assists: assistsVal,
                        cleanSheets: cleanVal
                      };

                      const currentStats = editingItem?.statsByTeam || [];
                      // Prevent duplicate team records
                      const filteredStats = currentStats.filter(s => s.teamId !== newItem.teamId);
                      const updatedList = [...filteredStats, newItem];
                      const cumulative = recalculateStats(updatedList);

                      setEditingItem({
                        ...editingItem,
                        statsByTeam: updatedList,
                        seasonStats: cumulative
                      });

                      // Reset inputs
                      if (matchesInp) matchesInp.value = "";
                      if (goalsInp) goalsInp.value = "";
                      if (assistsInp) assistsInp.value = "";
                      if (cleanInp) cleanInp.value = "";
                    }
                  }}
                  className="w-full bg-red-655 hover:bg-red-750 text-white font-bold text-xs py-2 rounded-lg cursor-pointer transition"
                >
                  ثبت آمار تیم
                </button>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <button
              onClick={() => {
                setIsEditing(false);
                setEditingItem(null);
              }}
              className="bg-transparent hover:bg-white/5 text-gray-400 hover:text-white font-bold text-xs px-5 py-2.5 rounded-xl border border-white/5 transition"
            >
              انصراف
            </button>
            <button
              onClick={handleSave}
              className="bg-red-655 hover:bg-red-750 text-white font-black text-xs px-6 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 transition"
            >
              <Save className="h-4 w-4" />
              <span>ذخیره پروفایل بازیکن</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

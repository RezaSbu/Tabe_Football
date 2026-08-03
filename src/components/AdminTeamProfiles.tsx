import React, { useState } from "react";
import { TeamItem } from "../types";
import { toPersianDigits, getSafeImageUrl } from "../utils";
import { Shield, Plus, Trash2, Edit2, Search, X, Check, Save } from "lucide-react";

interface AdminTeamProfilesProps {
  teams: TeamItem[];
  onRefreshData: () => void;
  showShortSuccess: (msg: string) => void;
}

const getLeagueName = (key?: string) => {
  switch (key) {
    case "pro-league": return "لیگ برتر";
    case "league-1": return "لیگ یک";
    case "league-2-group-a": return "لیگ دو (گروه الف)";
    case "league-2-group-b": return "لیگ دو (گروه ب)";
    case "futsal": return "فوتسال";
    default: return "لیگ برتر";
  }
};

export default function AdminTeamProfiles({
  teams = [],
  onRefreshData,
  showShortSuccess
}: AdminTeamProfilesProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<TeamItem> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleCreateNew = () => {
    setEditingItem({
      id: "",
      name: "",
      logo: "",
      coverImage: "",
      founded: "1350",
      stadium: "استادیوم آزادی",
      stadiumCapacity: "78,000",
      coach: "سرمربی جدید",
      city: "تهران",
      sport: "football",
      divisionKey: "pro-league",
      stats: {
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        points: 0
      }
    });
    setIsEditing(true);
  };

  const handleEdit = (item: TeamItem) => {
    setEditingItem(JSON.parse(JSON.stringify(item))); // Deep copy
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("آیا از حذف این پروفایل تیم اطمینان دارید؟ تمامی ارجاع‌های بازیکنان به این تیم ممکن است تحت تأثیر قرار گیرد.")) return;
    try {
      const res = await fetch(`/api/teams/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        showShortSuccess("پروفایل تیم ورزشی با موفقیت کامل حذف گردید.");
        onRefreshData();
      } else {
        alert("خطا در برقراری ارتباط با پکیج دیتابیس.");
      }
    } catch {
      alert("خطای سرور.");
    }
  };

  const handleSave = async () => {
    if (!editingItem?.name) {
      alert("لطفا نام تیم را وارد کنید.");
      return;
    }

    const isNew = !editingItem.id;
    const url = isNew ? "/api/teams" : `/api/teams/${editingItem.id}`;
    const method = isNew ? "POST" : "PUT";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingItem)
      });
      if (res.ok) {
        showShortSuccess(isNew ? "پروفایل تیم جدید با موفقیت ایجاد شد." : "پروفایل تیم با موفقیت بازنویسی گردید.");
        setIsEditing(false);
        setEditingItem(null);
        onRefreshData();
      } else {
        alert("خطا در ذخیره‌سازی.");
      }
    } catch {
      alert("بروز خطای سرور.");
    }
  };

  const filteredTeams = teams.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-[#0b0b0f] border border-white/5 rounded-3xl p-6 space-y-6" dir="rtl">
      
      {!isEditing ? (
        // LIST VIEW VIEWPORT
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-500" />
                <span>مدیریت پروفایل‌های تیم‌ها</span>
              </h2>
              <p className="text-[10px] text-gray-400 mt-0.5">پروفایل تیم‌ها، استادیوم‌های خانگی، سال تاسیس و رکوردهای کلی باشگاه‌های کشور را در این بخش مدیریت کنید.</p>
            </div>
            
            <button
              onClick={handleCreateNew}
              className="bg-red-655 hover:bg-red-750 font-black text-white text-xs px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1 transition self-stretch sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>ایجاد پروفایل تیم جدید</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="جستجوی سریع تیم بر اساس نام باشگاه یا شهر..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-gray-950 border border-white/5 rounded-xl pr-9 pl-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-655"
            />
            <Search className="absolute right-3 top-3.5 h-4 w-4 text-gray-500" />
          </div>

          {filteredTeams.length === 0 ? (
            <div className="text-center py-10 bg-gray-950/40 rounded-2xl border border-white/5">
              <p className="text-xs text-gray-500">هیچ تیمی یافت نشد.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {filteredTeams.map(t => (
                <div 
                  key={t.id} 
                  className="flex items-center justify-between p-3.5 rounded-xl bg-gray-950/40 border border-white/5 hover:border-red-550/20 transition"
                >
                  <div className="flex items-center gap-3">
                    <img loading="lazy" decoding="async" 
                      src={getSafeImageUrl(t.logo)} 
                      alt={t.name}
                      className="w-10 h-10 rounded-xl object-contain bg-slate-900 border border-white/10 p-1 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="text-xs font-black text-white flex items-center gap-1.5 flex-wrap">
                        <span>{t.name}</span>
                        <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-bold font-sans">
                          {getLeagueName(t.divisionKey)}
                        </span>
                        {t.isEliminated && (
                          <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-bold">
                            حذف شده
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        <span>شهر: {t.city || "ثبت‌نشده"}</span>
                        <span className="mx-1.5">•</span>
                        <span>مربی: {t.coach || "ثبت‌نشده"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono">
                    <button
                      onClick={() => handleEdit(t)}
                      className="p-1.5 rounded-lg bg-gray-900 border border-white/5 text-gray-300 hover:text-white hover:border-red-555/40 transition cursor-pointer"
                      title="ویرایش پروفایل"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-1.5 rounded-lg bg-red-955/20 border border-red-900/30 text-red-400 hover:bg-red-955/40 transition cursor-pointer"
                      title="حذف تیم"
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
                <Shield className="h-5 w-5 text-red-555" />
                <span>{editingItem?.id ? "ویرایش مشخصات تیم" : "تعریف باشگاه جدید"}</span>
              </h2>
              <p className="text-[10px] text-gray-400">فیلدهای زیر را برای بازنویسی مشخصات هویتی و امکانات رفاهی و فیزیکی باشگاه پر نمایید.</p>
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
              <label className="block text-[11px] text-gray-400 font-bold mb-1.5">نام کامل باشگاه / تیم *</label>
              <input
                type="text"
                value={editingItem?.name || ""}
                onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655"
                placeholder="مثال: پرسپولیس تهران"
              />
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 font-bold mb-1.5">لیگ / دسته مسابقاتی *</label>
              <select
                value={editingItem?.divisionKey || "pro-league"}
                onChange={e => {
                  const val = e.target.value;
                  const sport = val === "futsal" ? "futsal" : "football";
                  setEditingItem({ ...editingItem, divisionKey: val, sport: sport as any });
                }}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655"
              >
                <option value="pro-league">🏆 لیگ برتر خلیج فارس</option>
                <option value="league-1">🥈 لیگ یک (آزادگان)</option>
                <option value="league-2-group-a">🥉 لیگ دو - گروه الف</option>
                <option value="league-2-group-b">🥉 لیگ دو - گروه ب</option>
                <option value="futsal">🥅 لیگ برتر فوتسال</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 font-bold mb-1.5">رشته ورزشی باشگاه</label>
              <select
                value={editingItem?.sport || "football"}
                onChange={e => setEditingItem({ ...editingItem, sport: e.target.value as any })}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655 bg-slate-900/40"
                disabled
              >
                <option value="football">⚽ فوتبال بزرگسالان</option>
                <option value="futsal">🥅 فوتسال سالنی</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 font-bold mb-1.5">شهر خانگی باشگاه</label>
              <input
                type="text"
                value={editingItem?.city || ""}
                onChange={e => setEditingItem({ ...editingItem, city: e.target.value })}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655"
                placeholder="تهران، تبریز، اصفهان..."
              />
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 font-bold mb-1.5">سرمربی باشگاه</label>
              <input
                type="text"
                value={editingItem?.coach || ""}
                onChange={e => setEditingItem({ ...editingItem, coach: e.target.value })}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655"
                placeholder="خوان کارلوس گاریدو"
              />
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 font-bold mb-1.5">سال تاسیس (هجری شمسی یا میلادی)</label>
              <input
                type="text"
                value={editingItem?.founded || ""}
                onChange={e => setEditingItem({ ...editingItem, founded: e.target.value })}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655 font-mono"
                placeholder="1342"
              />
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 font-bold mb-1.5">استادیوم خانگی</label>
              <input
                type="text"
                value={editingItem?.stadium || ""}
                onChange={e => setEditingItem({ ...editingItem, stadium: e.target.value })}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655"
                placeholder="استادیوم آزادی"
              />
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 font-bold mb-1.5">ظرفیت استادیوم خانگی</label>
              <input
                type="text"
                value={editingItem?.stadiumCapacity || ""}
                onChange={e => setEditingItem({ ...editingItem, stadiumCapacity: e.target.value })}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655 font-mono"
                placeholder="78,116"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] text-gray-400 font-bold mb-1.5">آدرس اینترنتی تصویر لوگو / نشان باشگاه</label>
              <input
                type="text"
                value={editingItem?.logo || ""}
                onChange={e => setEditingItem({ ...editingItem, logo: e.target.value })}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655 font-mono"
                placeholder="https://upload.wikimedia.org/..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] text-gray-400 font-bold mb-1.5">آدرس اینترنتی تصویر کاور (بنر بالای پروفایل باشگاه)</label>
              <input
                type="text"
                value={editingItem?.coverImage || ""}
                onChange={e => setEditingItem({ ...editingItem, coverImage: e.target.value })}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655 font-mono"
                placeholder="https://images.unsplash.com/..."
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-3 bg-red-955/15 border border-red-500/20 p-4 rounded-xl">
              <input
                type="checkbox"
                id="isEliminated"
                checked={editingItem?.isEliminated || false}
                onChange={e => setEditingItem({ ...editingItem, isEliminated: e.target.checked })}
                className="h-4 w-4 rounded border-white/10 text-red-600 focus:ring-red-500 bg-slate-950"
              />
              <div>
                <label htmlFor="isEliminated" className="block text-[11px] text-white font-extrabold cursor-pointer">باشگاه از دور رقابت‌ها حذف شده است (is_eliminated)</label>
                <p className="text-[10px] text-gray-400 mt-0.5">علامت‌گذاری این گزینه مشخص می‌کند که باشگاه در مسابقات جام حذفی یا پلی‌آف حذف گردیده است.</p>
              </div>
            </div>
          </div>

          {/* Core historical record statistics table */}
          <div className="bg-gray-950/40 p-4 border border-white/5 rounded-2xl space-y-3">
            <h3 className="text-xs font-black text-red-500">رکوردها و جدول خلاصه عملکرد باشگاه</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div>
                <label className="block text-[10px] text-slate-450 mb-1">تعداد بازی</label>
                <input
                  type="number"
                  value={editingItem?.stats?.played ?? 0}
                  onChange={e => setEditingItem({
                    ...editingItem!,
                    stats: { ...(editingItem!.stats || { played: 0, won: 0, drawn: 0, lost: 0, points: 0 }), played: parseInt(e.target.value, 10) || 0 }
                  })}
                  className="w-full bg-slate-950 border border-white/5 rounded-lg px-2.5 py-2 text-white font-mono text-center"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-450 mb-1">بردهای شیرین</label>
                <input
                  type="number"
                  value={editingItem?.stats?.won ?? 0}
                  onChange={e => setEditingItem({
                    ...editingItem!,
                    stats: { ...(editingItem!.stats || { played: 0, won: 0, drawn: 0, lost: 0, points: 0 }), won: parseInt(e.target.value, 10) || 0 }
                  })}
                  className="w-full bg-slate-950 border border-white/5 rounded-lg px-2.5 py-2 text-white font-mono text-center"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-450 mb-1">بازی‌های مساوی</label>
                <input
                  type="number"
                  value={editingItem?.stats?.drawn ?? 0}
                  onChange={e => setEditingItem({
                    ...editingItem!,
                    stats: { ...(editingItem!.stats || { played: 0, won: 0, drawn: 0, lost: 0, points: 0 }), drawn: parseInt(e.target.value, 10) || 0 }
                  })}
                  className="w-full bg-slate-950 border border-white/5 rounded-lg px-2.5 py-2 text-white font-mono text-center"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-450 mb-1">باخت‌ها</label>
                <input
                  type="number"
                  value={editingItem?.stats?.lost ?? 0}
                  onChange={e => setEditingItem({
                    ...editingItem!,
                    stats: { ...(editingItem!.stats || { played: 0, won: 0, drawn: 0, lost: 0, points: 0 }), lost: parseInt(e.target.value, 10) || 0 }
                  })}
                  className="w-full bg-slate-950 border border-white/5 rounded-lg px-2.5 py-2 text-white font-mono text-center"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] text-slate-450 mb-1">مجموع امتیازات</label>
                <input
                  type="number"
                  value={editingItem?.stats?.points ?? 0}
                  onChange={e => setEditingItem({
                    ...editingItem!,
                    stats: { ...(editingItem!.stats || { played: 0, won: 0, drawn: 0, lost: 0, points: 0 }), points: parseInt(e.target.value, 10) || 0 }
                  })}
                  className="w-full bg-slate-950 border border-white/5 rounded-lg px-2.5 py-2 text-white font-mono text-center"
                />
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
              <span>ذخیره مشخصات باشگاه</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

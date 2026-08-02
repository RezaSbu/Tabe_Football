import React, { useState } from "react";
import { Plus, Trash2, Edit, Eye, MousePointerClick, Save } from "lucide-react";
import { AdItem } from "../types";
import { isWithinSchedule } from "./AdSlot";

const AD_TYPES: { value: AdItem["type"]; label: string }[] = [
  { value: "banner", label: "بنر بالای صفحه" },
  { value: "slot", label: "جایگاه تبلیغاتی" },
  { value: "popup", label: "پاپ‌آپ تمام‌صفحه" },
  { value: "floating", label: "شناور گوشه صفحه" },
  { value: "bottom_bar", label: "نوار پایین صفحه" },
  { value: "slide_in", label: "لغزنده کنار صفحه" },
];

const PLACEMENTS = ["top", "sidebar", "feed", "campaign", "square", "general", "skyscraper", "inline"];

const TYPE_LABEL: Record<string, string> = {
  banner: "بنر",
  slot: "جایگاه",
  popup: "پاپ‌آپ",
  floating: "شناور",
  bottom_bar: "نوار پایین",
  slide_in: "لغزنده",
};

function emptyAdForm(): AdItem {
  return {
    id: "",
    type: "slot",
    name: "",
    placement: "sidebar",
    title: "",
    promo: "",
    description: "",
    linkUrl: "",
    imageUrl: "",
    btnText: "",
    width: 728,
    height: 90,
    priority: 0,
    startDate: "",
    endDate: "",
    isActive: true,
    settings: {},
    viewCount: 0,
    clickCount: 0
  };
}

interface AdsManagerProps {
  ads: AdItem[];
  onRefreshData: () => void;
}

export default function AdsManager({ ads, onRefreshData }: AdsManagerProps) {
  const [form, setForm] = useState<AdItem | null>(null);
  const [settings, setSettings] = useState<Record<string, any>>({});

  const openForm = (item: AdItem | null) => {
    const base = item ? { ...item } : emptyAdForm();
    setForm(base);
    setSettings(base.settings || {});
  };

  const updateField = (field: string, value: any) => {
    setForm(prev => (prev ? { ...prev, [field]: value } : prev));
  };

  const updateSetting = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const payload = {
      ...form,
      settings,
      width: parseInt(String(form.width)) || 728,
      height: parseInt(String(form.height)) || 90,
      priority: parseInt(String(form.priority)) || 0
    };
    try {
      const isNew = !form.id;
      const url = isNew ? "/api/ads" : `/api/ads/${form.id}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setForm(null);
        onRefreshData();
        alert(isNew ? "تبلیغ جدید با موفقیت ثبت شد." : "تبلیغ با موفقیت به‌روزرسانی شد.");
      } else {
        alert("خطا در ذخیره تبلیغ.");
      }
    } catch {
      alert("خطا در ارتباط با سرور.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("آیا از حذف این تبلیغ اطمینان دارید؟")) return;
    try {
      const res = await fetch(`/api/ads/${id}`, { method: "DELETE" });
      if (res.ok) onRefreshData();
      else alert("خطا در حذف تبلیغ.");
    } catch {
      alert("خطا در ارتباط با سرور.");
    }
  };

  const toggleActive = async (item: AdItem) => {
    try {
      await fetch(`/api/ads/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, isActive: !item.isActive })
      });
      onRefreshData();
    } catch {
      alert("خطا در ارتباط با سرور.");
    }
  };

  const renderOverlaySettings = () => {
    if (!form) return null;
    if (form.type === "popup") {
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-[10px] text-slate-500 mb-1 font-bold">تاخیر نمایش (ثانیه)</label>
            <input type="number" value={settings.delay ?? 3} onChange={e => updateSetting("delay", parseInt(e.target.value) || 3)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white" />
          </div>
        </div>
      );
    }
    if (form.type === "floating") {
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-[10px] text-slate-500 mb-1 font-bold">موقعیت</label>
            <select value={settings.corner || "bottom-left"} onChange={e => updateSetting("corner", e.target.value)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white">
              <option value="bottom-left">پایین چپ</option>
              <option value="bottom-right">پایین راست</option>
              <option value="top-left">بالا چپ</option>
              <option value="top-right">بالا راست</option>
            </select>
          </div>
        </div>
      );
    }
    if (form.type === "slide_in") {
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-[10px] text-slate-500 mb-1 font-bold">موقعیت</label>
            <select value={settings.side || "left"} onChange={e => updateSetting("side", e.target.value)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white">
              <option value="left">چپ</option>
              <option value="right">راست</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-1 font-bold">نمایش پس از اسکرول (px)</label>
            <input type="number" value={settings.showAfterScroll ?? 400} onChange={e => updateSetting("showAfterScroll", parseInt(e.target.value) || 400)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white" />
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#0b0b0f] border border-white/5 p-5 rounded-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h3 className="font-extrabold text-sm text-white">📢 مدیریت تبلیغات پورتال ({ads.length})</h3>
        <button onClick={() => openForm(null)} className="flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer">
          <Plus className="h-3 w-3" /> افزودن تبلیغ جدید
        </button>
      </div>

      {form && (
        <form onSubmit={handleSave} className="bg-slate-900/40 border border-white/5 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs text-emerald-400">{form.id ? "ویرایش تبلیغ" : "افزودن تبلیغ جدید"}</h4>
            <button type="button" onClick={() => setForm(null)} className="text-[10px] bg-white/5 text-slate-400 px-2 py-1 rounded cursor-pointer">انصراف</button>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 font-bold">نوع تبلیغ</label>
              <select value={form.type} onChange={e => updateField("type", e.target.value)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white">
                {AD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 font-bold">نام تبلیغ</label>
              <input type="text" value={form.name} onChange={e => updateField("name", e.target.value)} placeholder="مثلاً: اسپانسر اسنپ" className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white placeholder-slate-600" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 font-bold">جایگاه نمایش (slot)</label>
              <select value={form.placement} onChange={e => updateField("placement", e.target.value)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white">
                {PLACEMENTS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 font-bold">عنوان</label>
              <input type="text" value={form.title} onChange={e => updateField("title", e.target.value)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 font-bold">کد تخفیف / پرومو</label>
              <input type="text" value={form.promo} onChange={e => updateField("promo", e.target.value)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 mb-1 font-bold">توضیحات</label>
            <input type="text" value={form.description} onChange={e => updateField("description", e.target.value)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 font-bold">لینک ارجاع</label>
              <input type="text" value={form.linkUrl} onChange={e => updateField("linkUrl", e.target.value)} placeholder="https://..." className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white placeholder-slate-600" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 font-bold">متن دکمه</label>
              <input type="text" value={form.btnText} onChange={e => updateField("btnText", e.target.value)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 mb-1 font-bold">آدرس تصویر</label>
            <input type="text" value={form.imageUrl} onChange={e => updateField("imageUrl", e.target.value)} placeholder="https://example.com/ad.jpg" className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white placeholder-slate-600" />
            {form.imageUrl && (
              <div className="mt-2 rounded border border-white/5 overflow-hidden">
                <img src={form.imageUrl} alt="پیش‌نمایش" loading="lazy" decoding="async" className="w-full max-h-24 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 font-bold">عرض (px)</label>
              <input type="number" value={form.width} onChange={e => updateField("width", parseInt(e.target.value) || 728)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 font-bold">ارتفاع (px)</label>
              <input type="number" value={form.height} onChange={e => updateField("height", parseInt(e.target.value) || 90)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 font-bold">اولویت</label>
              <input type="number" value={form.priority} onChange={e => updateField("priority", parseInt(e.target.value) || 0)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white" />
            </div>
            <div className="flex items-end pb-1">
              <div className="flex items-center justify-between w-full border border-white/5 rounded-lg p-2">
                <span className="text-[10px] font-bold text-white">فعال</span>
                <button type="button" onClick={() => updateField("isActive", !form.isActive)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${form.isActive ? "bg-emerald-500" : "bg-gray-700"}`}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${form.isActive ? "translate-x-4.5" : "translate-x-0.5"}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 font-bold">تاریخ شروع (اختیاری)</label>
              <input type="date" value={form.startDate || ""} onChange={e => updateField("startDate", e.target.value)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 font-bold">تاریخ پایان (اختیاری)</label>
              <input type="date" value={form.endDate || ""} onChange={e => updateField("endDate", e.target.value)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white" />
            </div>
          </div>

          {renderOverlaySettings()}

          <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
            <button type="submit" className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs px-4 py-2 rounded-lg cursor-pointer">
              <Save className="h-3.5 w-3.5" /> ذخیره تبلیغ
            </button>
          </div>
        </form>
      )}

      {ads.length === 0 ? (
        <p className="text-xs text-slate-500 italic py-8 text-center">هیچ تبلیغی تعریف نشده است. روی «افزودن تبلیغ جدید» کلیک کنید.</p>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {ads.map((ad) => {
            const expired = !isWithinSchedule(ad);
            return (
              <div key={ad.id} className={`border rounded-xl p-3.5 space-y-2 bg-white/[0.01] ${expired ? "border-red-500/30 opacity-60" : "border-white/5"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-black bg-red-655/90 text-white px-2 py-0.5 rounded">{TYPE_LABEL[ad.type] || ad.type}</span>
                    <span className="text-xs font-extrabold text-white truncate max-w-[160px]">{ad.name || ad.title || "(بدون عنوان)"}</span>
                    {expired && <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">منقضی</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded font-mono flex items-center gap-1"><Eye className="h-3 w-3" /> {ad.viewCount || 0}</span>
                    <span className="text-[9px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded font-mono flex items-center gap-1"><MousePointerClick className="h-3 w-3" /> {ad.clickCount || 0}</span>
                    <button onClick={() => openForm(ad)} className="p-1 rounded bg-white/5 text-slate-300 hover:text-white cursor-pointer"><Edit className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDelete(ad.id)} className="p-1 rounded bg-white/5 text-red-500 hover:bg-red-950/30 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleActive(ad)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${ad.isActive !== false ? "bg-emerald-500" : "bg-gray-700"}`}>
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${ad.isActive !== false ? "translate-x-4.5" : "translate-x-0.5"}`} />
                    </button>
                    <span className={`text-[10px] font-bold ${ad.isActive !== false ? "text-emerald-400" : "text-slate-500"}`}>
                      {ad.isActive !== false ? "فعال" : "غیرفعال"}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-600 bg-white/5 px-1.5 py-0.5 rounded">{ad.placement}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

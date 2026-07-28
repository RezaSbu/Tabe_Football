import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Edit,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Image as ImageIcon,
  FileText,
  ArrowRightLeft,
  Globe,
  Palette,
  X,
  Check,
  GripVertical,
} from "lucide-react";
import { HeroSlideItem, NewsItem, TransferItem, LegionnaireItem, ImageItem } from "../types";
import { getSafeImageUrl } from "../utils";

interface AdminHeroSlidesProps {
  heroSlides: HeroSlideItem[];
  news: NewsItem[];
  transfers: TransferItem[];
  legionnaires: LegionnaireItem[];
  images: ImageItem[];
  onRefreshData: () => void;
  showShortSuccess: (msg: string) => void;
}

export default function AdminHeroSlides({
  heroSlides = [],
  news = [],
  transfers = [],
  legionnaires = [],
  images = [],
  onRefreshData,
  showShortSuccess,
}: AdminHeroSlidesProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState<"news" | "transfers" | "legionnaires" | "gallery" | "custom">("news");
  const [editingSlide, setEditingSlide] = useState<HeroSlideItem | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [customSubtitle, setCustomSubtitle] = useState("");
  const [customImage, setCustomImage] = useState("");
  const [customLink, setCustomLink] = useState("");

  const sortedSlides = [...heroSlides].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const handleAddFromSource = async (
    sourceType: HeroSlideItem["sourceType"],
    sourceId: string,
    image: string,
    title: string,
    subtitle: string,
    link: string,
  ) => {
    if (heroSlides.length >= 10) {
      alert("حداکثر ۱0 اسلاید مجاز است. ابتدا یک اسلاید حذف کنید.");
      return;
    }
    const maxOrder = heroSlides.reduce((max, s) => Math.max(max, s.sort_order || 0), 0);
    const payload: Partial<HeroSlideItem> = {
      image,
      title,
      subtitle,
      link,
      sourceType,
      sourceId,
      active: true,
      sort_order: maxOrder + 1,
    };
    try {
      const res = await fetch("/api/hero-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showShortSuccess(`اسلاید "${title.slice(0, 30)}..." به اسلایدر اضافه شد.`);
        onRefreshData();
        setShowPicker(false);
      }
    } catch {
      alert("خطا در افزودن اسلاید.");
    }
  };

  const handleAddCustom = async () => {
    if (!customTitle || !customImage) {
      alert("عنوان و تصویر الزامی هستند.");
      return;
    }
    await handleAddFromSource("custom", "", customImage, customTitle, customSubtitle, customLink);
    setCustomTitle("");
    setCustomSubtitle("");
    setCustomImage("");
    setCustomLink("");
  };

  const handleToggleActive = async (slide: HeroSlideItem) => {
    try {
      const res = await fetch(`/api/hero-slides/${slide.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !slide.active }),
      });
      if (res.ok) {
        showShortSuccess(slide.active ? "اسلاید غیرفعال شد." : "اسلاید فعال شد.");
        onRefreshData();
      }
    } catch {
      alert("خطا در تغییر وضعیت اسلاید.");
    }
  };

  const handleReorder = async (slide: HeroSlideItem, direction: "up" | "down") => {
    const idx = sortedSlides.findIndex((s) => s.id === slide.id);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sortedSlides.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const swapSlide = sortedSlides[swapIdx];

    try {
      await Promise.all([
        fetch(`/api/hero-slides/${slide.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: swapSlide.sort_order || 0 }),
        }),
        fetch(`/api/hero-slides/${swapSlide.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: slide.sort_order || 0 }),
        }),
      ]);
      onRefreshData();
    } catch {
      alert("خطا در تغییر ترتیب.");
    }
  };

  const handleEdit = async () => {
    if (!editingSlide) return;
    try {
      const res = await fetch(`/api/hero-slides/${editingSlide.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editingSlide.title, subtitle: editingSlide.subtitle, image: editingSlide.image, link: editingSlide.link }),
      });
      if (res.ok) {
        showShortSuccess("اسلاید ویرایش شد.");
        setEditingSlide(null);
        onRefreshData();
      }
    } catch {
      alert("خطا در ویرایش اسلاید.");
    }
  };

  const handleDelete = async (slide: HeroSlideItem) => {
    if (!window.confirm(`آیا از حذف اسلاید "${slide.title.slice(0, 40)}..." اطمینان دارید؟`)) return;
    try {
      const res = await fetch(`/api/hero-slides/${slide.id}`, { method: "DELETE" });
      if (res.ok) {
        showShortSuccess("اسلاید حذف شد.");
        onRefreshData();
      }
    } catch {
      alert("خطا در حذف اسلاید.");
    }
  };

  const getSourceIcon = (type: HeroSlideItem["sourceType"]) => {
    switch (type) {
      case "news": return <FileText className="h-3.5 w-3.5 text-emerald-400" />;
      case "transfer": return <ArrowRightLeft className="h-3.5 w-3.5 text-cyan-400" />;
      case "legionnaire": return <Globe className="h-3.5 w-3.5 text-purple-400" />;
      case "image": return <Palette className="h-3.5 w-3.5 text-amber-400" />;
      default: return <ImageIcon className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  const getSourceLabel = (type: HeroSlideItem["sourceType"]) => {
    switch (type) {
      case "news": return "خبر";
      case "transfer": return "نقل و انتقالات";
      case "legionnaire": return "لژیونر";
      case "image": return "گالری";
      default: return "سفارشی";
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="bg-[#0c0c10] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-sm text-white">مدیریت اسلایدر اصلی صفحه خانه</h3>
            <p className="text-[10px] text-slate-400 mt-1">
              پست‌های مورد نظر را از بخش‌های مختلف سایت انتخاب کنید تا در اسلایدر اصلی نمایش داده شوند.
            </p>
          </div>
          <button
            onClick={() => setShowPicker(!showPicker)}
            disabled={heroSlides.length >= 10}
            className={`font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              heroSlides.length >= 10
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-500 text-black"
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>افزودن اسلاید ({heroSlides.length}/۱۰)</span>
          </button>
        </div>

        {heroSlides.length === 0 && (
          <div className="text-center py-10 text-slate-500 text-xs border border-dashed border-white/10 rounded-xl">
            هیچ اسلایدی تعریف نشده است. روی «افزودن اسلاید» کلیک کنید.
          </div>
        )}

        {sortedSlides.length > 0 && (
          <div className="space-y-2">
            {sortedSlides.map((slide, idx) => (
              <div
                key={slide.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                  slide.active
                    ? "bg-slate-900/50 border-white/5"
                    : "bg-slate-950/50 border-white/3 opacity-50"
                }`}
              >
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => handleReorder(slide, "up")}
                    disabled={idx === 0}
                    className="p-0.5 text-slate-500 hover:text-white disabled:opacity-20 transition cursor-pointer"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleReorder(slide, "down")}
                    disabled={idx === sortedSlides.length - 1}
                    className="p-0.5 text-slate-500 hover:text-white disabled:opacity-20 transition cursor-pointer"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="w-16 h-10 rounded-lg overflow-hidden bg-slate-800 shrink-0">
                  <img
                    src={getSafeImageUrl(slide.image)}
                    alt={slide.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {getSourceIcon(slide.sourceType)}
                    <span className="text-[9px] text-slate-500 font-bold">{getSourceLabel(slide.sourceType)}</span>
                  </div>
                  <p className="text-xs font-bold text-white truncate">{slide.title}</p>
                  {slide.subtitle && (
                    <p className="text-[10px] text-slate-400 truncate">{slide.subtitle}</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleToggleActive(slide)}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      slide.active
                        ? "bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50"
                        : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                    }`}
                    title={slide.active ? "غیرفعال کردن" : "فعال کردن"}
                  >
                    {slide.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => setEditingSlide({ ...slide })}
                    className="p-1.5 rounded-lg bg-blue-900/20 text-blue-400 hover:bg-blue-900/40 transition cursor-pointer"
                    title="ویرایش"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(slide)}
                    className="p-1.5 rounded-lg bg-red-900/20 text-red-400 hover:bg-red-900/40 transition cursor-pointer"
                    title="حذف"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showPicker && (
        <div className="bg-[#0c0c10] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-xs text-white">انتخاب پست برای اسلایدر</h4>
            <button onClick={() => setShowPicker(false)} className="text-slate-500 hover:text-white cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { key: "news", label: "اخبار", count: news.length },
                { key: "transfers", label: "نقل و انتقالات", count: transfers.length },
                { key: "legionnaires", label: "لژیونرها", count: legionnaires.length },
                { key: "gallery", label: "گالری تصاویر", count: images.length },
                { key: "custom", label: "سفارشی", count: 0 },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setPickerTab(tab.key)}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition cursor-pointer ${
                  pickerTab === tab.key
                    ? "bg-emerald-500 text-black"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {tab.label} {tab.count > 0 && `(${tab.count})`}
              </button>
            ))}
          </div>

          {pickerTab === "custom" && (
            <div className="space-y-3 bg-slate-900/30 p-4 rounded-xl border border-white/5">
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="عنوان اسلاید *"
                className="w-full text-xs rounded bg-black border border-white/5 p-2.5 text-white"
              />
              <input
                type="text"
                value={customSubtitle}
                onChange={(e) => setCustomSubtitle(e.target.value)}
                placeholder="زیرعنوان (اختیاری)"
                className="w-full text-xs rounded bg-black border border-white/5 p-2.5 text-white"
              />
              <input
                type="text"
                value={customImage}
                onChange={(e) => setCustomImage(e.target.value)}
                placeholder="آدرس تصویر (URL) *"
                className="w-full text-xs rounded bg-black border border-white/5 p-2.5 text-white"
              />
              <input
                type="text"
                value={customLink}
                onChange={(e) => setCustomLink(e.target.value)}
                placeholder="لینک (اختیاری)"
                className="w-full text-xs rounded bg-black border border-white/5 p-2.5 text-white"
              />
              <button
                onClick={handleAddCustom}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
              >
                افزودن اسلاید سفارشی
              </button>
            </div>
          )}

          {pickerTab === "news" && (
            <div className="grid gap-2 max-h-[400px] overflow-y-auto">
              {news.map((item) => {
                const alreadyAdded = heroSlides.some((s) => s.sourceType === "news" && s.sourceId === item.id);
                return (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/30 border border-white/5">
                    <div className="w-12 h-8 rounded overflow-hidden bg-slate-800 shrink-0">
                      <img src={getSafeImageUrl(item.image)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{item.title}</p>
                      <p className="text-[9px] text-slate-500">{item.category}</p>
                    </div>
                    <button
                      onClick={() =>
                        handleAddFromSource(
                          "news",
                          item.id,
                          item.image,
                          item.title,
                          item.summary.slice(0, 120),
                          `/news/${item.id}`,
                        )
                      }
                      disabled={alreadyAdded}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer shrink-0 ${
                        alreadyAdded
                          ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                          : "bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50"
                      }`}
                    >
                      {alreadyAdded ? "افزوده شده" : "+ افزودن"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {pickerTab === "transfers" && (
            <div className="grid gap-2 max-h-[400px] overflow-y-auto">
              {transfers.map((item) => {
                const alreadyAdded = heroSlides.some((s) => s.sourceType === "transfer" && s.sourceId === String(item.id));
                return (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/30 border border-white/5">
                    <div className="w-12 h-8 rounded overflow-hidden bg-slate-800 shrink-0">
                      <img src={getSafeImageUrl(item.image || "")} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{item.playerName} — {item.fromTeam} → {item.toTeam}</p>
                      <p className="text-[9px] text-slate-500">{item.fee || "توافقی"}</p>
                    </div>
                    <button
                      onClick={() =>
                        handleAddFromSource(
                          "transfer",
                          String(item.id),
                          item.image || "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=300",
                          `انتقال: ${item.playerName} به ${item.toTeam}`,
                          `${item.fromTeam} → ${item.toTeam} | ${item.fee || "توافقی"}`,
                          `/transfer/${item.id}`,
                        )
                      }
                      disabled={alreadyAdded}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer shrink-0 ${
                        alreadyAdded
                          ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                          : "bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50"
                      }`}
                    >
                      {alreadyAdded ? "افزوده شده" : "+ افزودن"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {pickerTab === "legionnaires" && (
            <div className="grid gap-2 max-h-[400px] overflow-y-auto">
              {legionnaires.map((item) => {
                const alreadyAdded = heroSlides.some((s) => s.sourceType === "legionnaire" && s.sourceId === item.id);
                return (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/30 border border-white/5">
                    <div className="w-12 h-8 rounded overflow-hidden bg-slate-800 shrink-0">
                      <img src={getSafeImageUrl(item.image)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{item.name} — {item.team}</p>
                      <p className="text-[9px] text-slate-500">{item.league}</p>
                    </div>
                    <button
                      onClick={() =>
                        handleAddFromSource(
                          "legionnaire",
                          item.id,
                          item.image,
                          `لژیونر: ${item.name} در ${item.league}`,
                          `${item.team} | عملکرد: ${(item.performance || "").slice(0, 80)}`,
                          `/legionnaire/${item.id}`,
                        )
                      }
                      disabled={alreadyAdded}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer shrink-0 ${
                        alreadyAdded
                          ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                          : "bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50"
                      }`}
                    >
                      {alreadyAdded ? "افزوده شده" : "+ افزودن"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {pickerTab === "gallery" && (
            <div className="grid gap-2 max-h-[400px] overflow-y-auto">
              {images.map((item) => {
                const alreadyAdded = heroSlides.some((s) => s.sourceType === "image" && s.sourceId === item.id);
                return (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/30 border border-white/5">
                    <div className="w-12 h-8 rounded overflow-hidden bg-slate-800 shrink-0">
                      <img src={getSafeImageUrl(item.url)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{item.caption || "بدون عنوان"}</p>
                      <p className="text-[9px] text-slate-500">{item.tags?.join(", ") || "عمومی"}</p>
                    </div>
                    <button
                      onClick={() =>
                        handleAddFromSource(
                          "image",
                          item.id,
                          item.url,
                          item.caption || "تصویر گالری",
                          item.description || "",
                          "",
                        )
                      }
                      disabled={alreadyAdded}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer shrink-0 ${
                        alreadyAdded
                          ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                          : "bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50"
                      }`}
                    >
                      {alreadyAdded ? "افزوده شده" : "+ افزودن"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {editingSlide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEditingSlide(null)}>
          <div className="bg-[#111115] border border-white/10 rounded-2xl p-6 w-full max-w-lg space-y-4" onClick={(e) => e.stopPropagation()} dir="rtl">
            <h4 className="font-black text-sm text-white">ویرایش اسلاید</h4>

            <div className="space-y-3">
              <input
                type="text"
                value={editingSlide.title}
                onChange={(e) => setEditingSlide({ ...editingSlide, title: e.target.value })}
                placeholder="عنوان"
                className="w-full text-xs rounded bg-black border border-white/5 p-2.5 text-white"
              />
              <input
                type="text"
                value={editingSlide.subtitle}
                onChange={(e) => setEditingSlide({ ...editingSlide, subtitle: e.target.value })}
                placeholder="زیرعنوان"
                className="w-full text-xs rounded bg-black border border-white/5 p-2.5 text-white"
              />
              <input
                type="text"
                value={editingSlide.image}
                onChange={(e) => setEditingSlide({ ...editingSlide, image: e.target.value })}
                placeholder="آدرس تصویر"
                className="w-full text-xs rounded bg-black border border-white/5 p-2.5 text-white"
              />
              <input
                type="text"
                value={editingSlide.link}
                onChange={(e) => setEditingSlide({ ...editingSlide, link: e.target.value })}
                placeholder="لینک"
                className="w-full text-xs rounded bg-black border border-white/5 p-2.5 text-white"
              />
            </div>

            {editingSlide.image && (
              <div className="w-full h-32 rounded-xl overflow-hidden bg-slate-800">
                <img src={getSafeImageUrl(editingSlide.image)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditingSlide(null)}
                className="bg-white/5 text-slate-300 font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
              >
                انصراف
              </button>
              <button
                onClick={handleEdit}
                className="bg-emerald-500 text-black font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1"
              >
                <Check className="h-3.5 w-3.5" />
                ذخیره
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

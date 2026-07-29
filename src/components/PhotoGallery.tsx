import React, { useState } from "react";
import { ImageItem } from "../types";
import { Camera, Search, ChevronLeft, Eye, Tag, Download, Calendar, Maximize2 } from "lucide-react";
import { getSafeImageUrl } from "../utils";

interface PhotoGalleryProps {
  images: ImageItem[];
  initialSearchTag?: string;
}

export default function PhotoGallery({ images, initialSearchTag = "" }: PhotoGalleryProps) {
  const [searchTag, setSearchTag] = useState(initialSearchTag);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    setSearchTag(initialSearchTag);
  }, [initialSearchTag]);

  React.useEffect(() => {
    if (!selectedImage) return;
    const trackView = async () => {
      try {
        const res = await fetch(`/api/images/${selectedImage.id}/view`, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setSelectedImage(prev => prev && prev.id === selectedImage.id ? { ...prev, viewCount: data.viewCount } : prev);
          }
        }
      } catch (_e) { /* view tracking failed */ }
    };
    trackView();
  }, [selectedImage?.id]);

  const allUniqueTags = Array.from(
    new Set(images.flatMap((img) => img.tags || []))
  ).filter(Boolean);

  const filteredImages = images.filter((img) => {
    if (!searchTag.trim()) return true;
    const cleanSearch = searchTag.trim().toLowerCase();
    return (img.tags || []).some((tag) => tag.toLowerCase().includes(cleanSearch));
  });

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (selectedImage) {
    const caption = selectedImage.caption || "لحظات برتر رقابت‌های لیگ برتر ایران";
    const desc = selectedImage.description || selectedImage.altText || "";

    return (
      <div className="rounded-2xl bg-[#121215] p-5 border border-white/5 shadow-2xl animate-in fade-in duration-300" dir="rtl" id="photo-detail-view">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => setSelectedImage(null)}
            className="flex items-center gap-1.5 rounded-xl bg-[#0a0a0c] px-4 py-2 text-xs text-slate-300 border border-white/5 hover:bg-[#1a1a1f] hover:text-white transition cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4 text-emerald-400 rotate-180" />
            <span>بازگشت به آلبوم</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-black/40 rounded-full px-3 py-1.5 border border-white/10">
              <Eye className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[11px] font-bold text-white">{(selectedImage.viewCount || 0).toLocaleString("fa-IR")}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-12 items-start">
          {/* Main image */}
          <div className="lg:col-span-8 space-y-4">
            <div className="overflow-hidden rounded-2xl bg-black border border-white/5 shadow-lg">
              <img
                loading="lazy" decoding="async"
                src={getSafeImageUrl(selectedImage.url)}
                alt={caption}
                referrerPolicy="no-referrer"
                className="max-h-[68vh] object-contain w-full"
              />
            </div>

            {/* Description box — separate from image */}
            <div className="bg-[#0a0a0c] rounded-xl border border-white/5 p-5 space-y-2">
              <h3 className="text-sm sm:text-base font-black text-white leading-relaxed">{caption}</h3>
              {desc && (
                <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            {/* Info card */}
            <div className="bg-[#0a0a0c] rounded-2xl border border-white/5 p-5 space-y-4">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">شناسنامه تصویر</h4>
              
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-gray-500 flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5" /> بازدیدها
                  </span>
                  <span className="font-bold text-white">{(selectedImage.viewCount || 0).toLocaleString("fa-IR")}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-gray-500 flex items-center gap-2">
                    <Camera className="h-3.5 w-3.5" /> دسته‌بندی
                  </span>
                  <span className="font-bold text-white">لیگ برتر ایران</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-500 flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" /> تاریخ
                  </span>
                  <span className="font-bold text-white text-[11px]">{new Date().toLocaleDateString("fa-IR")}</span>
                </div>
              </div>

              {/* Download button */}
              <a
                href={getSafeImageUrl(selectedImage.url)}
                download={`tabefootball-${selectedImage.id || "photo"}.jpg`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full rounded-xl bg-gradient-to-l from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 py-3 text-xs font-black text-black transition flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-950/30 active:scale-[0.98]"
              >
                <Download className="h-4 w-4" />
                <span>دانلود تصویر با کیفیت بالا</span>
              </a>

              {/* Copy link */}
              <button
                onClick={() => handleCopyLink(getSafeImageUrl(selectedImage.url))}
                className="w-full rounded-xl bg-[#121215] border border-white/5 hover:border-emerald-500/30 py-2.5 text-xs text-gray-400 hover:text-white transition flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <span className="text-emerald-400">✓</span>
                    <span className="text-emerald-400">کپی شد</span>
                  </>
                ) : (
                  <>
                    <span>🔗</span>
                    <span>کپی لینک تصویر</span>
                  </>
                )}
              </button>
            </div>

            {/* Tags */}
            {selectedImage.tags && selectedImage.tags.length > 0 && (
              <div className="bg-[#0a0a0c] rounded-xl border border-white/5 p-4">
                <h4 className="text-xs font-bold text-gray-400 mb-3 flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-emerald-400" /> برچسب‌ها
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedImage.tags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => {
                        setSearchTag(tag);
                        setSelectedImage(null);
                      }}
                      className="rounded-lg bg-[#121215] hover:bg-emerald-950/40 hover:text-emerald-400 px-2.5 py-1 text-[11px] text-gray-400 border border-white/5 transition"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- STANDARD GALLERY INDEX VIEW ---
  return (
    <div className="rounded-2xl bg-[#121215] p-4 border border-white/5 shadow-xl animate-in fade-in duration-300" dir="rtl" id="photo-gallery-box">
      {/* Header */}
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-emerald-400" />
          <h2 className="font-bold text-lg text-white">گالری مصور فوتبال ایران</h2>
        </div>

        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="جستجوی تصاویر با برچسب..."
            value={searchTag}
            onChange={(e) => setSearchTag(e.target.value)}
            className="w-full rounded-xl bg-[#0a0a0c] px-3.5 py-2 pl-9 text-xs text-white placeholder-slate-500 border border-white/5 focus:outline-none focus:border-emerald-500"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
        </div>
      </div>

      {/* Tags */}
      {allUniqueTags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1 bg-[#0a0a0c] p-2.5 rounded-xl border border-white/5">
          <span className="text-[10px] text-slate-500 font-bold self-center ml-2 flex items-center gap-1">
            <Tag className="h-3 w-3 text-emerald-400" /> میانبر:
          </span>
          <button
            onClick={() => setSearchTag("")}
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition ${
              searchTag === ""
                ? "bg-emerald-500 text-black font-black"
                : "bg-[#121215] text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            همه
          </button>
          {allUniqueTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSearchTag(tag)}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition ${
                searchTag === tag
                  ? "bg-emerald-500 text-black font-black"
                  : "bg-[#121215] text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Gallery Grid */}
      {filteredImages.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          هیچ عکسی با برچسب <strong className="text-emerald-400">"{searchTag}"</strong> پیدا نشد.
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {filteredImages.map((img) => (
            <div
              key={img.id}
              onClick={() => setSelectedImage(img)}
              className="group relative cursor-pointer overflow-hidden rounded-xl bg-[#0a0a0c] border border-white/5 hover:border-emerald-500/30 transition duration-350 shadow-lg"
            >
              <div className="h-48 w-full overflow-hidden sm:h-52">
                <img
                  loading="lazy" decoding="async"
                  src={getSafeImageUrl(img.url)}
                  alt={img.caption}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/20 to-transparent opacity-90 transition p-3 flex flex-col justify-end">
                <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-emerald-400 transition">
                  {img.caption}
                </h4>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9px] text-gray-400 flex items-center gap-1">
                    <Eye className="h-2.5 w-2.5" /> {(img.viewCount || 0).toLocaleString("fa-IR")}
                  </span>
                  <Maximize2 className="h-3 w-3 text-gray-500 group-hover:text-emerald-400 transition" />
                </div>
                
                {img.tags && img.tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {img.tags.slice(0, 3).map((tag) => (
                      <button key={tag} onClick={(e) => { e.stopPropagation(); setSearchTag(tag); }} className="rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-gray-300 border border-white/5 hover:bg-emerald-950/40 hover:text-emerald-400 transition cursor-pointer">
                        #{tag}
                      </button>
                    ))}
                    {img.tags.length > 3 && <span className="text-[9px] text-gray-500 self-center">...</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

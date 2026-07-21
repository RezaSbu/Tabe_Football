import React, { useState } from "react";
import { ImageItem } from "../types";
import { Camera, Search, User, Map, ChevronLeft, Crop, HardDrive, Copy, Check, Tag, Eye } from "lucide-react";
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
      } catch {}
    };
    trackView();
  }, [selectedImage?.id]);

  // Extract all unique tags present across all images
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
    setTimeout(() => setCopied(false), 2005);
  };

  // --- RENDER DEDICATED MEDIA DETAIL VIEW ---
  if (selectedImage) {
    const rawAlt = selectedImage.description || selectedImage.altText || "لحظات برتر رقابت‌های لیگ برتر ایران";
    
    // Limits character lengths as requested
    const maxCaptionChars = 110;
    const maxDescChars = 150;
    
    const truncatedCaption = selectedImage.caption.length > maxCaptionChars 
      ? selectedImage.caption.slice(0, maxCaptionChars) + "..." 
      : selectedImage.caption;
      
    const truncatedAlt = rawAlt.length > maxDescChars 
      ? rawAlt.slice(0, maxDescChars) + "..." 
      : rawAlt;

    return (
      <div className="rounded-2xl bg-[#121215] p-5 border border-white/5 shadow-2xl animate-in fade-in duration-300" dir="rtl" id="photo-detail-view">
        {/* Back control */}
        <button
          onClick={() => setSelectedImage(null)}
          className="mb-6 flex items-center gap-1.5 rounded-xl bg-[#0a0a0c] px-4 py-2 text-xs text-slate-300 border border-white/5 hover:bg-[#121215] hover:text-white transition active:scale-98 cursor-pointer"
        >
          <ChevronLeft className="h-4.5 w-4.5 text-emerald-400 rotate-180" />
          <span>بازگشت به آلبوم گالری</span>
        </button>

        {/* Master layout grid */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          
          {/* Main Visual Image */}
          <div className="lg:col-span-8 space-y-4">
            <div className="overflow-hidden rounded-2xl bg-black border border-white/5 flex items-center justify-center p-1.5 shadow-lg group">
              <img loading="lazy" decoding="async"                 src={getSafeImageUrl(selectedImage.url)}
                alt={truncatedCaption}
                referrerPolicy="no-referrer"
                className="max-h-[64vh] object-contain w-full rounded-xl group-hover:scale-101 transition duration-500"
              />
            </div>
            
            {/* Visual caption */}
            <div className="bg-[#0a0a0c]/60 p-4 rounded-xl border border-white/[0.03]">
              <h3 className="text-sm sm:text-base font-black text-white leading-relaxed">{truncatedCaption}</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">توضیحات عکس: {truncatedAlt}</p>
            </div>
          </div>

          {/* Editorial Metadata Box */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#0a0a0c] rounded-2xl border border-white/5 p-4.5 space-y-4.5 shadow-md">
              <h4 className="text-xs font-black text-emerald-400 border-b border-white/5 pb-2 uppercase tracking-wider">🔒 شناسنامه تصاویر رسانه ورزشی تب فوتبال</h4>
              
              {/* Better stats rows */}
              <div className="space-y-3.5 text-xs text-slate-300">
                <div className="flex items-center justify-between border-b border-white/[0.02] pb-2">
                  <span className="text-slate-500 flex items-center gap-1.5">📂 دسته‌بندی رسانه:</span>
                  <span className="font-extrabold text-white">پوشش حرفه‌ای لیگ برتر ایران</span>
                </div>

                <div className="flex items-center justify-between border-b border-white/[0.02] pb-2">
                  <span className="text-slate-500 flex items-center gap-1.5">⚖️ مالکیت حقوقی:</span>
                  <span className="font-extrabold text-emerald-400">حق تالیف عکاسان مجهز تب فوتبال</span>
                </div>

                <div className="flex items-center justify-between border-b border-white/[0.02] pb-2">
                  <span className="text-slate-500 flex items-center gap-1.5">✨ هدیه رسانه:</span>
                  <span className="font-bold text-white">دانلود مجانی برای والپیپر هواداران</span>
                </div>

                <div className="flex items-center justify-between border-b border-white/[0.02] pb-2">
                  <span className="text-[#94a3b8] flex items-center gap-1.5">🛡️ وضعیت لایسنس:</span>
                  <span className="font-bold text-yellow-500">غیرتجاری / تبرک غیر تبلیغاتی</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> بازدیدها:</span>
                  <span className="font-extrabold text-white">{(selectedImage.viewCount || 0).toLocaleString("fa-IR")}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2">
                <a
                  href={getSafeImageUrl(selectedImage.url)}
                  download={`sports360-photo-${selectedImage.id || "download"}.jpg`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full rounded-xl bg-gradient-to-l from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 py-3 text-xs font-black text-black transition flex items-center justify-center gap-2 cursor-pointer text-center shadow-lg hover:shadow-emerald-950/20 active:scale-[0.99] font-black"
                >
                  <span className="text-sm">📥</span>
                  <span>دانلود مستقیم تصویر با کیفیت بالا</span>
                </a>
              </div>
            </div>

            {/* Related Tags Pill Box */}
            {selectedImage.tags && selectedImage.tags.length > 0 && (
              <div className="bg-[#0a0a0c]/40 rounded-xl border border-white/5 p-4.5">
                <h4 className="text-xs font-black text-slate-400 mb-3 flex items-center gap-1"><Tag className="h-3.5 w-3.5 text-emerald-400" /> دسته‌بندی تگ‌ها:</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedImage.tags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => {
                        setSearchTag(tag);
                        setSelectedImage(null);
                      }}
                      className="rounded-lg bg-[#0a0a0c] hover:bg-emerald-950/40 hover:text-emerald-400 px-2.5 py-1 text-[11px] text-slate-400 border border-white/5 transition"
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

        {/* Tag searching input */}
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="جستجوی تصاویر با برچسب (مثلا: دربی، پرسپولیس...)"
            value={searchTag}
            onChange={(e) => setSearchTag(e.target.value)}
            className="w-full rounded-xl bg-[#0a0a0c] px-3.5 py-2 pl-9 text-xs text-white placeholder-slate-500 border border-white/5 focus:outline-none focus:border-emerald-500"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
        </div>
      </div>

      {/* Suggested Quick Tag Tags / Pills */}
      {allUniqueTags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1 bg-[#0a0a0c] p-2.5 rounded-xl border border-white/5">
          <span className="text-[10px] text-slate-500 font-bold self-center ml-2 flex items-center gap-1">
            <Tag className="h-3 w-3 text-emerald-400" /> میانبر برچسب‌ها:
          </span>
          <button
            onClick={() => setSearchTag("")}
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition ${
              searchTag === ""
                ? "bg-emerald-500 text-black font-black shadow-sm shadow-emerald-500/10"
                : "bg-[#121215] text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            همه تصاویر
          </button>
          {allUniqueTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSearchTag(tag)}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition ${
                searchTag === tag
                  ? "bg-emerald-500 text-black font-black shadow-sm shadow-emerald-500/10"
                  : "bg-[#121215] text-slate-400 hover:bg-white/5 text-slate-300 hover:text-white"
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
          هیچ عکسی با برچسب تگ <strong className="text-emerald-400">"{searchTag}"</strong> پیدا نشد.
          <p className="text-xs text-slate-600 mt-1">از پنل مدیریت می‌توانید عکس‌های جدید همراه تگ ثبت نمایید.</p>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {filteredImages.map((img) => (
            <div
              key={img.id}
              onClick={() => setSelectedImage(img)}
              className="group relative cursor-pointer overflow-hidden rounded-xl bg-[#0a0a0c] border border-white/5 hover:border-emerald-500/30 transition duration-350 shadow-lg"
            >
              {/* Image box */}
              <div className="h-48 w-full overflow-hidden sm:h-52">
                <img loading="lazy" decoding="async"                   src={getSafeImageUrl(img.url)}
                  alt={img.caption}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-104"
                />
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/20 to-transparent opacity-90 transition p-3 flex flex-col justify-end">
                <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-emerald-400 transition">
                  {img.caption}
                </h4>
                <span className="text-[9px] text-gray-400 mt-1 flex items-center gap-1">
                  <Eye className="h-2.5 w-2.5" /> {(img.viewCount || 0).toLocaleString("fa-IR")}
                </span>
                
                {/* Image tags preview */}
                {img.tags && img.tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {img.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-gray-300 border border-white/5">
                        #{tag}
                      </span>
                    ))}
                    {img.tags.length > 3 && (
                      <span className="text-[9px] text-gray-500 self-center">...</span>
                    )}
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

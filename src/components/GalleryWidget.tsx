import React, { useState } from "react";
import { ImageItem } from "../types";
import { Image, Tag, Camera, Eye } from "lucide-react";

interface GalleryWidgetProps {
  images: ImageItem[];
  onSelectImage?: (img: ImageItem) => void;
}

export default function GalleryWidget({ images = [], onSelectImage }: GalleryWidgetProps) {
  const [selectedTag, setSelectedTag] = useState("all");

  // Fetch unique tags in images
  const allTags = ["all", ...Array.from(new Set(images.flatMap((img) => img.tags || [])))];

  const filteredImages = selectedTag === "all"
    ? images
    : images.filter((img) => img.tags?.includes(selectedTag));

  return (
    <div className="w-full bg-[#18181c]/50 border border-white/5 rounded-2xl p-4 text-white" dir="rtl">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 pb-2.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <Image className="h-4 w-4 text-emerald-500" />
          <h3 className="font-extrabold text-sm text-slate-100">شکار لحظه‌ها عکاسان تب فوتبال</h3>
        </div>

        {/* Tag Pill Selector */}
        <div className="flex flex-wrap gap-1">
          {allTags.slice(0, 5).map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTag(t)}
              className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold cursor-pointer border transition-all ${
                selectedTag === t
                  ? "bg-emerald-500 text-black border-emerald-500"
                  : "bg-white/5 text-slate-400 border-white/5 hover:border-slate-700"
              }`}
            >
              {t === "all" ? "همه‌ی عکس‌ها" : t}
            </button>
          ))}
        </div>
      </div>

      {filteredImages.length > 0 ? (
        <div className="columns-2 sm:columns-3 gap-3 space-y-3">
          {filteredImages.map((img) => (
            <div
              key={img.id}
              onClick={() => onSelectImage?.(img)}
              className="break-inside-avoid relative rounded-xl overflow-hidden border border-white/5 bg-black hover:border-emerald-500/25 cursor-pointer group shadow transition-all duration-300"
            >
              <img
                src={img.url}
                alt={img.caption}
                className="w-full object-cover rounded-xl group-hover:scale-102 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              {/* Image info overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-2.5 flex flex-col justify-end">
                <p className="text-[9px] text-white font-medium line-clamp-2 leading-snug">
                  {img.caption}
                </p>
                <span className="text-[8px] text-emerald-400 font-bold mt-1.5 flex items-center gap-1">
                  <Camera className="h-3 w-3" />
                  عکاسی فوتبال برتر
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-slate-550">تصویری یافت نشد.</div>
      )}
    </div>
  );
}

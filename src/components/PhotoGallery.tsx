import React, { useMemo, useState } from "react";
import { ImageItem, GalleryPhoto } from "../types";
import { Camera, Search, ChevronLeft, ChevronRight, Eye, Tag, Download, Calendar, X, User, Clock, Images, Lock } from "lucide-react";
import { getSafeImageUrl, getTimeAgoPersian, toPersianDigits } from "../utils";

interface PhotoGalleryProps {
  images: ImageItem[];
  initialSearchTag?: string;
}

const MAX_GALLERY_PHOTOS = 30;

const COVER_CELLS = 4;

function formatPersianDateTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("fa-IR", { dateStyle: "full", timeStyle: "short" }).format(d);
  } catch {
    return iso;
  }
}

function getAlbumPhotos(album: ImageItem): GalleryPhoto[] {
  const photos = album.photos && album.photos.length > 0 ? album.photos : album.url ? [{ url: album.url, caption: album.caption }] : [];
  return photos.slice(0, MAX_GALLERY_PHOTOS);
}

function getAlbumTitle(album: ImageItem): string {
  return album.title || album.caption || "گالری مصور فوتبال";
}

interface LightboxProps {
  photos: GalleryPhoto[];
  index: number;
  onClose: () => void;
  onNavigate: (delta: number) => void;
}

function Lightbox({ photos, index, onClose, onNavigate }: LightboxProps) {
  const photo = photos[index];
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4" dir="rtl" onClick={onClose} role="dialog" aria-modal="true">
      <div className="absolute top-4 right-4 left-4 flex items-center justify-between">
        <span className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-[11px] text-slate-300">
          <Images className="h-3.5 w-3.5 text-emerald-400" />
          {toPersianDigits(index + 1)} از {toPersianDigits(photos.length)}
        </span>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          aria-label="بستن"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(-1); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/15 transition cursor-pointer"
          aria-label="عکس قبلی"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
      {index < photos.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(1); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/15 transition cursor-pointer"
          aria-label="عکس بعدی"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      <div className="max-h-[85vh] max-w-[88vw]" onClick={(e) => e.stopPropagation()}>
        <img
          loading="lazy" decoding="async"
          src={getSafeImageUrl(photo.url)}
          alt={photo.caption || "تصویر گالری"}
          referrerPolicy="no-referrer"
          className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl"
        />
        {photo.caption && (
          <p className="mt-3 text-center text-xs leading-relaxed text-slate-300">{photo.caption}</p>
        )}
        <div className="mt-3 flex justify-center">
          <a
            href={getSafeImageUrl(photo.url)}
            download={`tabefootball-gallery-${index + 1}.jpg`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-[11px] font-black text-black hover:bg-emerald-400 transition"
          >
            <Download className="h-3.5 w-3.5" />
            دانلود تصویر
          </a>
        </div>
      </div>
    </div>
  );
}

export default function PhotoGallery({ images, initialSearchTag = "" }: PhotoGalleryProps) {
  const [searchTag, setSearchTag] = useState(initialSearchTag);
  const [selectedAlbum, setSelectedAlbum] = useState<ImageItem | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  React.useEffect(() => {
    setSearchTag(initialSearchTag);
  }, [initialSearchTag]);

  React.useEffect(() => {
    if (!selectedAlbum) return;
    const trackView = async () => {
      try {
        const res = await fetch(`/api/images/${selectedAlbum.id}/view`, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setSelectedAlbum(prev => prev && prev.id === selectedAlbum.id ? { ...prev, viewCount: data.viewCount } : prev);
          }
        }
      } catch (_e) { /* view tracking failed */ }
    };
    trackView();
  }, [selectedAlbum?.id]);

  const allUniqueTags = useMemo(
    () => Array.from(new Set(images.flatMap((img) => img.tags || []))).filter(Boolean),
    [images]
  );

  const sortedImages = useMemo(
    () => [...images].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))),
    [images]
  );

  const filteredAlbums = sortedImages.filter((img) => {
    if (!searchTag.trim()) return true;
    const cleanSearch = searchTag.trim().toLowerCase();
    return (img.tags || []).some((tag) => tag.toLowerCase().includes(cleanSearch));
  });

  // --- ALBUM DETAIL (POST) VIEW ---
  if (selectedAlbum) {
    const photos = getAlbumPhotos(selectedAlbum);
    const title = getAlbumTitle(selectedAlbum);
    const desc = selectedAlbum.description || selectedAlbum.altText || "";
    const photographer = selectedAlbum.photographer || "";
    const timeAgo = getTimeAgoPersian(selectedAlbum.createdAt);

    return (
      <div className="rounded-2xl bg-[#121215] p-5 border border-white/5 shadow-2xl animate-in fade-in duration-300" dir="rtl" id="photo-detail-view">
        {lightboxIndex !== null && (
          <Lightbox
            photos={photos}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={(delta) => setLightboxIndex(prev => Math.min(photos.length - 1, Math.max(0, (prev ?? 0) + delta)))}
          />
        )}

        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => { setSelectedAlbum(null); setLightboxIndex(null); }}
            className="flex items-center gap-1.5 rounded-xl bg-[#0a0a0c] px-4 py-2 text-xs text-slate-300 border border-white/5 hover:bg-[#1a1a1f] hover:text-white transition cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4 text-emerald-400 rotate-180" />
            <span>بازگشت به گالری</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-black/40 rounded-full px-3 py-1.5 border border-white/10">
              <Eye className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[11px] font-bold text-white">{(selectedAlbum.viewCount || 0).toLocaleString("fa-IR")}</span>
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div className="mb-4 flex flex-wrap items-center gap-2 text-[10px]">
          <span className="flex items-center gap-1 rounded-lg bg-black/40 border border-white/5 px-2.5 py-1 text-slate-400">
            <Lock className="h-3 w-3 text-emerald-400" />
            کد خبر: {selectedAlbum.id}
          </span>
          {selectedAlbum.createdAt && (
            <span className="flex items-center gap-1 rounded-lg bg-black/40 border border-white/5 px-2.5 py-1 text-slate-400">
              <Calendar className="h-3 w-3 text-emerald-400" />
              {formatPersianDateTime(selectedAlbum.createdAt)}
            </span>
          )}
          {timeAgo && (
            <span className="flex items-center gap-1 rounded-lg bg-black/40 border border-white/5 px-2.5 py-1 text-slate-400">
              <Clock className="h-3 w-3 text-emerald-400" />
              {timeAgo}
            </span>
          )}
          {photographer && (
            <span className="flex items-center gap-1 rounded-lg bg-black/40 border border-white/5 px-2.5 py-1 text-slate-400">
              <User className="h-3 w-3 text-emerald-400" />
              {photographer}
            </span>
          )}
          <span className="flex items-center gap-1 rounded-lg bg-black/40 border border-white/5 px-2.5 py-1 text-slate-400">
            <Images className="h-3 w-3 text-emerald-400" />
            {toPersianDigits(photos.length)} عکس
          </span>
        </div>

        {/* Title + description */}
        <div className="mb-5">
          <h1 className="text-base sm:text-xl font-black text-white leading-relaxed">{title}</h1>
          {desc && (
            <p className="mt-2 text-xs leading-relaxed text-gray-400">{desc}</p>
          )}
        </div>

        {/* Masonry gallery */}
        {photos.length > 0 ? (
          <div className="columns-1 gap-3 sm:columns-2 lg:columns-3 [&>*]:mb-3">
            {photos.map((photo, idx) => (
              <figure key={`${photo.url}-${idx}`} className="break-inside-avoid rounded-xl overflow-hidden border border-white/5 bg-[#0a0a0c] shadow-lg group cursor-pointer" onClick={() => setLightboxIndex(idx)}>
                <img
                  loading="lazy" decoding="async"
                  src={getSafeImageUrl(photo.url)}
                  alt={photo.caption || title}
                  referrerPolicy="no-referrer"
                  className="w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                />
                {photo.caption && (
                  <figcaption className="p-2.5 text-[10px] leading-relaxed text-slate-400">{photo.caption}</figcaption>
                )}
              </figure>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 py-12 text-center text-xs text-slate-500">
            عکسی برای این آلبوم ثبت نشده است.
          </div>
        )}

        {/* Tags */}
        {selectedAlbum.tags && selectedAlbum.tags.length > 0 && (
          <div className="mt-6 rounded-xl bg-[#0a0a0c] border border-white/5 p-4">
            <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold text-gray-400">
              <Tag className="h-3.5 w-3.5 text-emerald-400" /> برچسب‌ها
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {selectedAlbum.tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    setSearchTag(tag);
                    setSelectedAlbum(null);
                  }}
                  className="rounded-lg bg-[#121215] hover:bg-emerald-950/40 hover:text-emerald-400 px-2.5 py-1 text-[11px] text-gray-400 border border-white/5 transition cursor-pointer"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- GALLERY INDEX VIEW (varzesh3-style album boxes) ---
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
            placeholder="جستجوی گالری با برچسب..."
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
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition cursor-pointer ${
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
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition cursor-pointer ${
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

      {/* Album boxes */}
      {filteredAlbums.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          {images.length === 0 ? (
            <>هیچ آلبوم تصویری‌ای ثبت نشده است. <span className="text-emerald-400">از پنل مدیریت اقدام کنید.</span></>
          ) : (
            <>هیچ گالری‌ای با برچسب <strong className="text-emerald-400">"{searchTag}"</strong> پیدا نشد.</>
          )}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAlbums.map((album) => {
            const photos = getAlbumPhotos(album);
            const coverPhotos = photos.slice(0, COVER_CELLS);
            const title = getAlbumTitle(album);
            const timeAgo = getTimeAgoPersian(album.createdAt);
            const photographer = album.photographer || "";
            const viewCount = album.viewCount || 0;

            return (
              <button
                key={album.id}
                onClick={() => setSelectedAlbum(album)}
                className="group flex cursor-pointer flex-col overflow-hidden rounded-xl bg-[#0a0a0c] border border-white/5 hover:border-emerald-500/30 transition duration-350 shadow-lg text-right"
              >
                {/* Thumbnail collage */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#0a0a0c]">
                  <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5">
                    {Array.from({ length: COVER_CELLS }).map((_, idx) => {
                      const photo = coverPhotos[idx];
                      return (
                        <div key={idx} className="relative h-full w-full overflow-hidden min-h-0">
                          {photo ? (
                            <img
                              loading="lazy" decoding="async"
                              src={getSafeImageUrl(photo.url)}
                              alt={photo.caption || title}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="h-full w-full bg-gradient-to-br from-emerald-950/40 via-[#121215] to-[#0a0a0c]" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Photo count badge */}
                  <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/70 backdrop-blur border border-white/10 px-2 py-1 text-[9px] font-bold text-white">
                    <Images className="h-3 w-3 text-emerald-400" />
                    {toPersianDigits(photos.length)} عکس
                  </span>

                  {/* View badge */}
                  <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/70 backdrop-blur border border-white/10 px-2 py-1 text-[9px] font-bold text-white">
                    <Eye className="h-3 w-3 text-emerald-400" />
                    {viewCount.toLocaleString("fa-IR")}
                  </span>
                </div>

                {/* Text */}
                <div className="flex flex-1 flex-col p-3">
                  <h4 className="line-clamp-2 text-xs font-bold leading-relaxed text-white group-hover:text-emerald-400 transition">
                    {title}
                  </h4>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1 truncate">
                      <User className="h-3 w-3 shrink-0 text-emerald-400/80" />
                      <span className="truncate">{photographer || "عکاس تب فوتبال"}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <Clock className="h-3 w-3 text-emerald-400/80" />
                      {timeAgo || "جدید"}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

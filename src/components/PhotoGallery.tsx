import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ImageItem, GalleryPhoto } from "../types";
import { Camera, Search, Eye, Tag, User, Clock, Images } from "lucide-react";
import { getSafeImageUrl, getTimeAgoPersian, toPersianDigits } from "../utils";

interface PhotoGalleryProps {
  images: ImageItem[];
  initialSearchTag?: string;
}

const COVER_CELLS = 4;

function getAlbumPhotos(album: ImageItem): GalleryPhoto[] {
  const photos = album.photos && album.photos.length > 0 ? album.photos : album.url ? [{ url: album.url, caption: album.caption }] : [];
  return photos;
}

function getAlbumTitle(album: ImageItem): string {
  return album.title || album.caption || "گالری مصور فوتبال";
}

export default function PhotoGallery({ images, initialSearchTag = "" }: PhotoGalleryProps) {
  const [searchParams] = useSearchParams();
  const queryTag = searchParams.get("tag") || "";
  const [searchTag, setSearchTag] = useState(queryTag || initialSearchTag);

  React.useEffect(() => {
    if (queryTag) {
      setSearchTag(queryTag);
    } else {
      setSearchTag(initialSearchTag);
    }
  }, [queryTag, initialSearchTag]);

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
              <Link
                key={album.id}
                to={`/gallery/${album.id}`}
                className="group flex flex-col overflow-hidden rounded-xl bg-[#0a0a0c] border border-white/5 hover:border-emerald-500/30 transition duration-350 shadow-lg text-right"
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
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

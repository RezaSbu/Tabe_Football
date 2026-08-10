import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Loader2, Eye, Tag, Calendar, User, Clock, Images, X, ChevronLeft, ChevronRight, Download, Lock } from "lucide-react";
import { ImageItem, GalleryPhoto } from "../types";
import { getSafeImageUrl, getTimeAgoPersian, toPersianDigits } from "../utils";

const MAX_GALLERY_PHOTOS = 30;

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

function Lightbox({ photos, index, onClose, onNavigate }: {
  photos: GalleryPhoto[];
  index: number;
  onClose: () => void;
  onNavigate: (delta: number) => void;
}) {
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

export default function GalleryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [album, setAlbum] = useState<ImageItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(false);
    fetch(`/api/detail/image/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then(data => {
        if (data.success && data.data) {
          setAlbum(data.data);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/detail/image/${id}/view`, { method: "POST" }).catch(() => {});
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="text-center py-20 space-y-4" dir="rtl">
        <h1 className="text-2xl font-bold text-white">گالری یافت نشد</h1>
        <p className="text-gray-400 text-sm">مورد نظر شما وجود ندارد یا حذف شده است.</p>
        <Link to="/gallery" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm">
          <ArrowRight className="h-4 w-4" /> بازگشت به گالری
        </Link>
      </div>
    );
  }

  const photos = getAlbumPhotos(album);
  const title = album.title || album.caption || "گالری مصور فوتبال";
  const desc = album.description || album.altText || "";
  const photographer = album.photographer || "";
  const timeAgo = getTimeAgoPersian(album.createdAt);

  return (
    <>
      <Helmet>
        <title>{title} | تب فوتبال</title>
        <meta name="description" content={desc || title} />
        <link rel="canonical" href={`https://tabefotbal.ir/gallery/${id}`} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={desc || title} />
        <meta property="og:image" content={getSafeImageUrl(photos[0]?.url || album.url)} />
        <meta property="og:url" content={`https://tabefotbal.ir/gallery/${id}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={desc || title} />
        <meta name="twitter:image" content={getSafeImageUrl(photos[0]?.url || album.url)} />
      </Helmet>

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
        <Link
          to="/gallery"
          className="mb-5 flex w-fit items-center gap-1.5 rounded-xl bg-[#0a0a0c] px-4 py-2 text-xs text-slate-300 border border-white/5 hover:bg-[#1a1a1f] hover:text-white transition"
        >
          <ArrowRight className="h-4 w-4 text-emerald-400" />
          <span>بازگشت به گالری</span>
        </Link>

        {/* Meta row */}
        <div className="mb-4 flex flex-wrap items-center gap-2 text-[10px]">
          <span className="flex items-center gap-1 rounded-lg bg-black/40 border border-white/5 px-2.5 py-1 text-slate-400">
            <Lock className="h-3 w-3 text-emerald-400" />
            کد خبر: {album.id}
          </span>
          {album.createdAt && (
            <span className="flex items-center gap-1 rounded-lg bg-black/40 border border-white/5 px-2.5 py-1 text-slate-400">
              <Calendar className="h-3 w-3 text-emerald-400" />
              {formatPersianDateTime(album.createdAt)}
            </span>
          )}
          {timeAgo && (
            <span className="flex items-center gap-1 rounded-lg bg-black/40 border border-white/5 px-2.5 py-1 text-slate-400">
              <Clock className="h-3 w-3 text-emerald-400" />
              {timeAgo}
            </span>
          )}
          <span className="flex items-center gap-1 rounded-lg bg-black/40 border border-white/5 px-2.5 py-1 text-slate-400">
            <Eye className="h-3 w-3 text-emerald-400" />
            {(album.viewCount || 0).toLocaleString("fa-IR")} بازدید
          </span>
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
              <figure
                key={`${photo.url}-${idx}`}
                className="break-inside-avoid rounded-xl overflow-hidden border border-white/5 bg-[#0a0a0c] shadow-lg group cursor-pointer"
                onClick={() => setLightboxIndex(idx)}
              >
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
        {album.tags && album.tags.length > 0 && (
          <div className="mt-6 rounded-xl bg-[#0a0a0c] border border-white/5 p-4">
            <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold text-gray-400">
              <Tag className="h-3.5 w-3.5 text-emerald-400" /> برچسب‌ها
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {album.tags.map(tag => (
                <Link
                  key={tag}
                  to={`/gallery?tag=${encodeURIComponent(tag)}`}
                  className="rounded-lg bg-[#121215] hover:bg-emerald-950/40 hover:text-emerald-400 px-2.5 py-1 text-[11px] text-gray-400 border border-white/5 transition"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

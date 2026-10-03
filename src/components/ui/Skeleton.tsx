import React from "react";

// Shimmer placeholder that mirrors the shape of what's loading.
// Prevents layout shift and reads as intentional loading in both themes.
export function SkeletonCard({ imageHeight = "h-44" }: { imageHeight?: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-[#18181c]/40 overflow-hidden" aria-hidden="true">
      <div className={`skeleton-shimmer w-full ${imageHeight}`} />
      <div className="p-3.5 space-y-2">
        <div className="skeleton-shimmer h-3.5 rounded-md w-11/12" />
        <div className="skeleton-shimmer h-3 rounded-md w-2/3" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5" aria-hidden="true">
      <div className="skeleton-shimmer h-9 w-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="skeleton-shimmer h-3 rounded-md w-1/2" />
        <div className="skeleton-shimmer h-2.5 rounded-md w-1/3" />
      </div>
      <div className="skeleton-shimmer h-6 w-12 rounded-lg shrink-0" />
    </div>
  );
}

export function SkeletonGrid({ count = 6, imageHeight = "h-44" }: { count?: number; imageHeight?: string }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} imageHeight={imageHeight} />
      ))}
    </div>
  );
}

export function SkeletonList({ count = 6 }: { count?: number }) {
  return (
    <div className="divide-y divide-white/[0.04] rounded-2xl border border-white/5 bg-[#121215]/40 overflow-hidden" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

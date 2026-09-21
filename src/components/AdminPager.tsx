import React from "react";
import { formatStatNumber } from "../utils";

interface AdminPagerProps {
  page: number;
  totalPages: number;
  total: number;
  unitLabel: string;
  onPage: (page: number) => void;
}

// Phase-3 perf: shared compact pager so admin lists render one page only.
export default function AdminPager({ page, totalPages, total, unitLabel, onPage }: AdminPagerProps) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2" dir="rtl">
      <button
        onClick={() => onPage(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="rounded-xl px-3 py-1.5 text-xs font-black bg-gray-950 text-gray-300 border border-white/5 hover:text-white disabled:opacity-40 disabled:cursor-default transition"
      >
        قبلی
      </button>
      <span className="text-[11px] text-slate-500 font-bold font-mono">
        صفحه {formatStatNumber(page)} از {formatStatNumber(totalPages)} ــ {formatStatNumber(total)} {unitLabel}
      </span>
      <button
        onClick={() => onPage(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="rounded-xl px-3 py-1.5 text-xs font-black bg-gray-950 text-gray-300 border border-white/5 hover:text-white disabled:opacity-40 disabled:cursor-default transition"
      >
        بعدی
      </button>
    </div>
  );
}

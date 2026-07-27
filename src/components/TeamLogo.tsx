import React from "react";

function isImageUrl(val: string): boolean {
  if (!val) return false;
  const v = val.trim();
  return (
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("data:image") ||
    v.startsWith("data:image/") ||
    v.startsWith("/") ||
    v.startsWith("./") ||
    v.startsWith("../") ||
    v.endsWith(".png") ||
    v.endsWith(".jpg") ||
    v.endsWith(".jpeg") ||
    v.endsWith(".svg") ||
    v.endsWith(".webp") ||
    v.endsWith(".gif")
  );
}

interface TeamLogoProps {
  logo?: string | null;
  fallback?: string;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const sizeClasses: Record<string, string> = {
  xs: "h-5 w-5",
  sm: "h-7 w-7",
  md: "h-10 w-10",
  lg: "h-14 w-14",
  xl: "h-24 w-24",
};

const fontSizeClasses: Record<string, string> = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-5xl",
};

export default function TeamLogo({
  logo,
  fallback = "⚽",
  className = "",
  size = "sm",
}: TeamLogoProps) {
  if (!logo || !isImageUrl(logo)) {
    return (
      <span className={`${fontSizeClasses[size]} ${className}`}>
        {logo || fallback}
      </span>
    );
  }

  return (
    <img
      src={logo}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={`${sizeClasses[size]} object-contain ${className}`}
    />
  );
}

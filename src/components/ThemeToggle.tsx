import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

const THEME_KEY = "tabefotbal-theme";

export default function ThemeToggle() {
  const [isLight, setIsLight] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("light");
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isLight) {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
    try {
      localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");
    } catch {
      // localStorage در دسترس نیست
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", isLight ? "#dce3ee" : "#030712");
    }
  }, [isLight]);

  return (
    <button
      type="button"
      onClick={() => setIsLight((v) => !v)}
      title={isLight ? "تغییر به تم تیره" : "تغییر به تم روشن"}
      aria-label="تغییر تم روشن/تیره"
      className="flex items-center justify-center shrink-0 h-10 w-10 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all duration-200 active:scale-95 cursor-pointer"
    >
      {isLight ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
    </button>
  );
}

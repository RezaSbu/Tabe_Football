import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Trophy, 
  Newspaper, 
  Shuffle, 
  Image as ImageIcon, 
  Users, 
  Activity, 
  BarChart3, 
  Menu, 
  X,
  Compass,
  Mail
} from "lucide-react";

const TAB_TO_PATH: Record<string, string> = {
  "home": "/",
  "news": "/news",
  "pro-league": "/pro-league",
  "league-1": "/league-1",
  "league-2": "/league-2",
  "hazfi-cup": "/hazfi-cup",
  "futsal": "/futsal",
  "transfers": "/transfers",
  // "legionnaires": "/legionnaires",   // [غیرفعال] بخش لژیونرها از منو حذف شده؛ برای بازگردانی فعالش کنید
  "stats": "/stats",
  "live-scores": "/live-scores",
  "images": "/gallery",
};

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Navbar({
  activeTab,
  setActiveTab,
}: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { id: "home", label: "خانه", icon: Newspaper },
    { id: "news", label: "آخرین خبر", icon: Newspaper },
    { id: "pro-league", label: "لیگ برتر", icon: Trophy },
    { id: "league-1", label: "لیگ یک", icon: Compass },
    { id: "league-2", label: "لیگ دو", icon: Compass },
    { id: "hazfi-cup", label: "جام حذفی", icon: Trophy },
    { id: "futsal", label: "فوتسال", icon: Trophy },
    { id: "transfers", label: "نقل و انتقالات", icon: Shuffle },
    // { id: "legionnaires", label: "لژیونرها", icon: Users },   // [غیرفعال] بخش لژیونرها حذف شده؛ برای بازگردانی فعالش کنید
    { id: "stats", label: "آمار بازیکنان", icon: BarChart3 },
    { id: "live-scores", label: "نتایج زنده", icon: Activity },
    { id: "images", label: "گالری", icon: ImageIcon },
  ];

  const isActive = (itemId: string) => {
    const path = TAB_TO_PATH[itemId];
    if (path) return location.pathname === path;
    return activeTab === itemId;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#121215]/95 backdrop-blur-md text-white shadow-xl" id="app-navigation-bar">
      <nav dir="rtl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-center justify-between md:hidden py-2">
            <span className="text-xs font-bold text-slate-400">ناوبری سریع</span>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          <ul className="hidden md:flex gap-1 py-1 flex-wrap select-none">
            {navItems.map((item) => {
              const IconComp = item.icon;
              const active = isActive(item.id);
              return (
                <li key={item.id}>
                  <Link
                    to={TAB_TO_PATH[item.id] || "/"}
                    className={`flex items-center gap-1.5 px-3.5 py-3 text-sm font-medium transition-all ${
                      active
                        ? "text-emerald-400 border-b-2 border-emerald-500 bg-white/5"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <IconComp className={`h-4 w-4 ${active ? "text-emerald-400" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {isMobileMenuOpen && (
            <ul className="md:hidden pb-2 space-y-0.5 max-h-[60vh] overflow-y-auto">
              {navItems.map((item) => {
                const IconComp = item.icon;
                const active = isActive(item.id);
                return (
                  <li key={item.id}>
                    <Link
                      to={TAB_TO_PATH[item.id] || "/"}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium rounded-lg transition ${
                        active
                          ? "text-emerald-400 bg-emerald-500/10"
                          : "text-gray-300 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <IconComp className={`h-4 w-4 ${active ? "text-emerald-400" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </nav>
    </header>
  );
}

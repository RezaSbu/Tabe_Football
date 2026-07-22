import React, { useState } from "react";
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
  Lock,
  Mail
} from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onAdminOpen: () => void;
  isAdminLoggedIn: boolean;
  onLogout: () => void;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  onAdminOpen,
  isAdminLoggedIn,
  onLogout
}: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: "home", label: "خانه", icon: Newspaper },
    { id: "news", label: "آخرین خبر", icon: Newspaper },
    { id: "pro-league", label: "لیگ برتر", icon: Trophy },
    { id: "league-1", label: "لیگ یک", icon: Compass },
    { id: "league-2", label: "لیگ دو", icon: Compass },
    { id: "hazfi-cup", label: "جام حذفی", icon: Trophy },
    { id: "futsal", label: "فوتسال", icon: Trophy },
    { id: "transfers", label: "نقل و انتقالات", icon: Shuffle },
    { id: "legionnaires", label: "لژیونرها", icon: Users },
    { id: "stats", label: "آمار بازیکنان", icon: BarChart3 },
    { id: "live-scores", label: "نتایج زنده", icon: Activity },
    { id: "images", label: "گالری", icon: ImageIcon },
    { id: "diagnostics", label: "لاگ و تست سیستم", icon: Activity }
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#121215]/95 backdrop-blur-md text-white shadow-xl" id="app-navigation-bar">
      <nav dir="rtl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* Desktop: horizontal scroll | Mobile: toggle menu */}
          <div className="flex items-center justify-between md:hidden py-2">
            <span className="text-xs font-bold text-slate-400">ناوبری سریع</span>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Desktop nav */}
          <ul className="hidden md:flex gap-1 py-1 flex-wrap select-none">
            {navItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-3 text-sm font-medium transition-all ${
                      isActive
                        ? "text-emerald-400 border-b-2 border-emerald-500 bg-white/5"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <IconComp className={`h-4 w-4 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Mobile dropdown menu */}
          {isMobileMenuOpen && (
            <ul className="md:hidden pb-2 space-y-0.5 max-h-[60vh] overflow-y-auto">
              {navItems.map((item) => {
                const IconComp = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                      className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium rounded-lg transition ${
                        isActive
                          ? "text-emerald-400 bg-emerald-500/10"
                          : "text-gray-300 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <IconComp className={`h-4 w-4 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                    </button>
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

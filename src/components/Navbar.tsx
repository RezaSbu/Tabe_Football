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
      {/* Main Nav Bar (Horizontal list with scroll on mobile, flex-wrap on desktop) */}
      <nav dir="rtl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <ul className="flex gap-1 py-1 overflow-x-auto whitespace-nowrap md:flex-wrap select-none scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              return (
                <li key={item.id} className="inline-block md:block">
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-3 text-sm font-medium transition-all ${
                      isActive
                        ? "text-emerald-450 md:text-emerald-400 md:border-b-2 md:border-emerald-500 bg-white/5"
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
        </div>
      </nav>
    </header>
  );
}

import React, { useState } from "react";
import { Search, Send } from "lucide-react";
import { NewsItem, TeamItem, PlayerItem, CoachItem } from "../types";
import TeamLogo from "./TeamLogo";

interface HeaderProps {
  news: NewsItem[];
  teams: TeamItem[];
  players: PlayerItem[];
  coaches?: CoachItem[];
  onSelectArticle: (art: NewsItem) => void;
  onSelectTeam: (teamId: string) => void;
  onSelectPlayer: (playerId: string) => void;
  onSelectCoach?: (coachId: string) => void;
  setActiveTab: (tab: string) => void;
}

export default function Header({
  news = [],
  teams = [],
  players = [],
  coaches = [],
  onSelectArticle,
  onSelectTeam,
  onSelectPlayer,
  onSelectCoach,
  setActiveTab
}: HeaderProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);

  // Search logic across news, teams, and players
  const filteredTeams = searchTerm
    ? teams.filter((t) => t.name.includes(searchTerm))
    : [];
  const filteredPlayers = searchTerm
    ? players.filter((p) => p.name.includes(searchTerm))
    : [];
  const filteredCoaches = searchTerm
    ? coaches.filter((c) => c.name.includes(searchTerm))
    : [];
  const filteredNews = searchTerm
    ? news.filter((n) => n.title.includes(searchTerm) || n.summary.includes(searchTerm))
    : [];

  const hasResults = filteredTeams.length > 0 || filteredPlayers.length > 0 || filteredCoaches.length > 0 || filteredNews.length > 0;

  const handleSelectItem = (type: "team" | "player" | "coach" | "news", id: string, item?: any) => {
    setSearchTerm("");
    setShowResults(false);
    if (type === "team") {
      onSelectTeam(id);
    } else if (type === "player") {
      onSelectPlayer(id);
    } else if (type === "coach" && onSelectCoach) {
      onSelectCoach(id);
    } else if (type === "news" && item) {
      onSelectArticle(item);
    }
  };

  return (
    <div className="w-full bg-[#121215] text-white border-b border-white/5" id="app-header" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center gap-4">
        {/* Right: Brand & Logo */}
        <div 
          onClick={() => { setActiveTab("home"); }} 
          className="flex items-center gap-3 cursor-pointer select-none group shrink-0"
        >
          <div className="h-11 w-11 rounded-2xl overflow-hidden border border-white/10 shadow-lg shadow-emerald-500/5 group-hover:scale-105 transition-all duration-350 flex items-center justify-center bg-slate-900">
            <img loading="lazy" decoding="async" 
              src="https://mfkpmjknckfrdwvmmizs.supabase.co/storage/v1/object/public/media_assets/general/1782058553909_sports360-photo-gallery-1782053249175.jpg" 
              alt="تب فوتبال" 
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="hidden sm:block">
            <span className="font-black text-lg tracking-tight bg-gradient-to-l from-emerald-400 to-cyan-400 bg-clip-text text-transparent leading-none" style={{fontStyle: "normal", WebkitTextStroke: "0"}}>
              تب فوتبال
            </span>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">پورتال تحلیلی، نتایج زنده و آمار عمیق مسابقات</p>
          </div>
        </div>

        {/* Center: Search Engine */}
        <div className="relative w-full max-w-md mx-auto flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="جستجوی تیم، بازیکن یا خبر داغ..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              className="w-full h-10 pr-10 pl-4 rounded-full bg-[#18181c] border border-white/5 focus:border-emerald-500 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all"
            />
            <Search className="absolute right-3.5 top-3 h-4 w-4 text-slate-500" />
            {searchTerm && (
              <button 
                onClick={() => { setSearchTerm(""); setShowResults(false); }} 
                className="absolute left-3.5 top-2.5 text-slate-500 hover:text-white text-xs font-bold"
              >
                لغو
              </button>
            )}
          </div>

          {/* Search Dropdown Panel */}
          {showResults && searchTerm && (
            <div className="absolute top-12 left-0 z-50 w-full rounded-2xl bg-[#18181c] border border-white/10 p-3 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150 max-h-[360px] overflow-y-auto">
              {hasResults ? (
                <div className="space-y-4">
                  {/* Teams category */}
                  {filteredTeams.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-emerald-400 border-b border-white/5 pb-1 mb-1.5">تیم‌ها</h4>
                      <div className="space-y-1">
                        {filteredTeams.map((team) => (
                          <div
                            key={team.id}
                            onClick={() => handleSelectItem("team", team.id)}
                            className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition text-xs"
                          >
                            <TeamLogo logo={team.logo} size="xs" />
                            <span className="font-semibold text-slate-200">{team.name}</span>
                            <span className="text-[10px] text-slate-500 mr-auto">
                              {team.id.startsWith("futsal-") ? "لیگ برتر فوتسال" : "لیگ برتر فوتبال"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Players category */}
                  {filteredPlayers.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-cyan-400 border-b border-white/5 pb-1 mb-1.5">بازیکنان</h4>
                      <div className="space-y-1">
                        {filteredPlayers.map((player) => (
                          <div
                            key={player.id}
                            onClick={() => handleSelectItem("player", player.id)}
                            className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition text-xs"
                          >
                            <span className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-cyan-400">
                              {player.number}
                            </span>
                            <div>
                              <span className="font-semibold text-slate-200 block">{player.name}</span>
                              <span className="text-[9px] text-slate-500">{player.teamName} - {player.position}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Coaches category */}
                  {filteredCoaches.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-purple-400 border-b border-white/5 pb-1 mb-1.5">مربیان</h4>
                      <div className="space-y-1">
                        {filteredCoaches.map((coach) => (
                          <div
                            key={coach.id}
                            onClick={() => handleSelectItem("coach", coach.id)}
                            className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition text-xs"
                          >
                            <span className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center text-[9px] font-bold text-purple-400">
                              {coach.nationality?.[0] || "م"}
                            </span>
                            <div>
                              <span className="font-semibold text-slate-200 block">{coach.name}</span>
                              <span className="text-[9px] text-slate-500">{coach.teamName} - مربی</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* News category */}
                  {filteredNews.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-amber-400 border-b border-white/5 pb-1 mb-1.5">اخبار مرتبط</h4>
                      <div className="space-y-1">
                        {filteredNews.map((art) => (
                          <div
                            key={art.id}
                            onClick={() => handleSelectItem("news", art.id, art)}
                            className="p-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition text-xs"
                          >
                            <span className="font-medium text-slate-200 line-clamp-1 hover:text-emerald-450">{art.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-slate-400">
                  موردی یافت نشد. عبارت دیگری را امتحان کنید!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Left: Channel link */}
        <a
          href="https://t.me/tabefootball"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center gap-2 shrink-0 px-3 py-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 transition-all text-[11px] font-semibold"
        >
          <Send className="h-3.5 w-3.5" />
          <span>کانال تلگرام</span>
        </a>
      </div>
    </div>
  );
}

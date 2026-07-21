import React, { useState } from "react";
import { SelectedCombination, PlayerItem, TeamItem } from "../types";
import { toPersianDigits, getSafeImageUrl } from "../utils";
import { Award, Plus, Trash2, Edit2, Search, Check, X, Shield, Star, Save, LayoutGrid, LayoutList } from "lucide-react";

interface AdminSelectedCombinationsProps {
  combinations: SelectedCombination[];
  players: PlayerItem[];
  teams: TeamItem[];
  onRefreshData: () => void;
  showShortSuccess: (msg: string) => void;
}

export default function AdminSelectedCombinations({
  combinations = [],
  players = [],
  teams = [],
  onRefreshData,
  showShortSuccess
}: AdminSelectedCombinationsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<SelectedCombination> | null>(null);
  
  // View mode switcher: "pitch" (visual 3-5-2 field) vs "list" (tabular list)
  const [viewMode, setViewMode] = useState<"pitch" | "list">("pitch");
  
  // Search state for player picker
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [activePickerPosition, setActivePickerPosition] = useState<string | null>(null); // e.g. "gk", "cb1"
  
  // Rating state for active picked player
  const [pickedPlayerRating, setPickedPlayerRating] = useState<number>(8.0);

  const leagues = [
    { key: "pro-league", label: "لیگ برتر" },
    { key: "league-1", label: "لیگ یک" },
    { key: "league-2", label: "لیگ دو" }
  ];

  const positions = [
    { key: "gk", label: "دروازه‌بان (GK)" },
    { key: "cb1", label: "مدافع چپ (CB L)" },
    { key: "cb2", label: "مدافع وسط (CB C)" },
    { key: "cb3", label: "مدافع راست (CB R)" },
    { key: "lm", label: "هافبک چپ (LM)" },
    { key: "cm1", label: "هافبک وسط چپ (CM L)" },
    { key: "cm2", label: "هافبک بازیساز وسط (CM C)" },
    { key: "cm3", label: "هافبک وسط راست (CM R)" },
    { key: "rm", label: "هافبک راست (RM)" },
    { key: "st1", label: "مهاجم چپ (ST L)" },
    { key: "st2", label: "مهاجم راست (ST R)" }
  ];

  // Tactical Pitch relative position configuration for 3-5-2 formation
  const visualPositions = [
    { key: "gk", label: "GK", title: "دروازه‌بان", coords: "bottom-[4%] left-1/2 -translate-x-1/2" },
    
    { key: "cb1", label: "CB L", title: "مدافع چپ", coords: "bottom-[21%] left-[16%] md:left-[22%]" },
    { key: "cb2", label: "CB C", title: "مدافع وسط", coords: "bottom-[21%] left-1/2 -translate-x-1/2" },
    { key: "cb3", label: "CB R", title: "مدافع راست", coords: "bottom-[21%] right-[16%] md:right-[22%]" },
    
    { key: "lm", label: "LM", title: "هایبک چپ", coords: "bottom-[45%] left-[4%] md:left-[8%]" },
    { key: "cm1", label: "CM L", title: "هافبک چپ‌وسط", coords: "bottom-[41%] left-[24%] md:left-[28%]" },
    { key: "cm2", label: "CM C", title: "بازیساز وسط", coords: "bottom-[51%] left-1/2 -translate-x-1/2" },
    { key: "cm3", label: "CM R", title: "هافبک راست‌وسط", coords: "bottom-[41%] right-[24%] md:right-[28%]" },
    { key: "rm", label: "RM", title: "هافبک راست", coords: "bottom-[45%] right-[4%] md:right-[8%]" },
    
    { key: "st1", label: "ST L", title: "مهاجم چپ", coords: "bottom-[75%] left-[26%] md:left-[32%]" },
    { key: "st2", label: "ST R", title: "مهاجم راست", coords: "bottom-[75%] right-[26%] md:right-[32%]" }
  ];

  const handleCreateNew = () => {
    const currentMaxWeek = combinations.length > 0 ? Math.max(...combinations.map(c => c.week)) : 0;
    
    setEditingItem({
      id: "",
      leagueKey: "pro-league",
      week: currentMaxWeek + 1,
      players: {
        gk: null, cb1: null, cb2: null, cb3: null,
        lm: null, cm1: null, cm2: null, cm3: null, rm: null,
        st1: null, st2: null
      }
    });
    setIsEditing(true);
  };

  const handleEdit = (item: SelectedCombination) => {
    const copy = JSON.parse(JSON.stringify(item));
    if (copy.players && typeof copy.players === "string") {
      try {
        copy.players = JSON.parse(copy.players);
      } catch (e) {
        copy.players = {};
      }
    }
    if (!copy.players || typeof copy.players !== "object") {
      copy.players = {};
    }
    setEditingItem(copy);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("آیا از حذف این ترکیب منتخب منتخب اطمینان دارید؟")) return;
    try {
      const res = await fetch(`/api/selected-combinations/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        showShortSuccess("ترکیب منتخب هفته با موفقیت حذف گردید.");
        onRefreshData();
      } else {
        alert("خطایی رخ داد.");
      }
    } catch {
      alert("بروز خطای سرور.");
    }
  };

  const handleSave = async () => {
    if (!editingItem?.week) {
      alert("لطفا شماره هفته را وارد نمایید.");
      return;
    }

    const isNew = !editingItem.id;
    const url = isNew ? "/api/selected-combinations" : `/api/selected-combinations/${editingItem.id}`;
    const method = isNew ? "POST" : "PUT";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingItem)
      });
      if (res.ok) {
        showShortSuccess(isNew ? "ترکیب منتخب جدید با موفقیت ایجاد شد." : "تغییرات با موفقیت ذخیره گردید.");
        setIsEditing(false);
        setEditingItem(null);
        onRefreshData();
      } else {
        const err = await res.json();
        alert(err.message || "خطا در برقراری ارتباط.");
      }
    } catch {
      alert("بروز خطای غیرمنتظره.");
    }
  };

  // Autocomplete Player search handler
  const filteredPlayersList = playerSearchQuery.trim() === ""
    ? players.slice(0, 15)
    : players.filter(p => p.name.toLowerCase().includes(playerSearchQuery.toLowerCase()));

  const handleSelectPlayerForPos = (player: PlayerItem, pos: string) => {
    if (!editingItem) return;
    let currentPlayers = editingItem.players || {};
    if (typeof currentPlayers === "string") {
      try {
        currentPlayers = JSON.parse(currentPlayers);
      } catch (e) {
        currentPlayers = {};
      }
    }
    const playersCopy = { ...currentPlayers };
    
    playersCopy[pos] = {
      id: player.id?.toString(),
      name: player.name,
      teamName: player.teamName,
      image: player.image,
      rating: Number(pickedPlayerRating)
    };

    setEditingItem({
      ...editingItem,
      players: playersCopy
    });

    setActivePickerPosition(null);
    setPlayerSearchQuery("");
    setPickedPlayerRating(8.0);
  };

  const handleRemovePlayerFromPos = (pos: string) => {
    if (!editingItem) return;
    let currentPlayers = editingItem.players || {};
    if (typeof currentPlayers === "string") {
      try {
        currentPlayers = JSON.parse(currentPlayers);
      } catch (e) {
        currentPlayers = {};
      }
    }
    const playersCopy = { ...currentPlayers };
    playersCopy[pos] = null;
    
    setEditingItem({
      ...editingItem,
      players: playersCopy
    });
  };

  return (
    <div className="bg-[#0b0b0f] border border-white/5 rounded-3xl p-6 space-y-6" dir="rtl">
      
      {!isEditing ? (
        // LIST VIEW VIEWPORT (ALL SAVED COMBINATIONS)
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500 animate-pulse" />
                <span>مدیریت ترکیب‌های منتخب هفته</span>
              </h2>
              <p className="text-[10px] text-gray-400 mt-0.5">ترکیب‌های ۳-۵-۲ هفته‌های مختلف را برای هر سه رده لیگ‌ها در این ترمینال ایجاد و پیرایش کنید.</p>
            </div>
            
            <button
              onClick={handleCreateNew}
              className="bg-amber-500 hover:bg-amber-600 font-black text-slate-950 text-xs px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1 transition"
            >
              <Plus className="h-4 w-4 stroke-[3px]" />
              <span>ایجاد ترکیب هفته جدید</span>
            </button>
          </div>

          {combinations.length === 0 ? (
            <div className="text-center py-10 bg-gray-950/40 rounded-2xl border border-white/5">
              <p className="text-xs text-gray-500">هیچ ترکیب منتخبی تاکنون ثبت نشده است.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {combinations.map(item => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-4 rounded-xl bg-gray-950/40 border border-white/5 hover:border-amber-500/20 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-center min-w-[50px]">
                      <span className="block text-[9px] font-bold text-gray-400 leading-none">هفته</span>
                      <span className="block text-base font-black mt-1 leading-none">{toPersianDigits(item.week)}</span>
                    </div>
                    <div>
                      <div className="text-xs font-black text-white">
                        {leagues.find(l => l.key === item.leagueKey)?.label || item.leagueKey}
                      </div>
                      <div className="text-[10px] text-gray-400 flex items-center gap-2 mt-1">
                        <span>مشتمل بر ۱۱ بازیکن منتخب هفته</span>
                        <span>•</span>
                        <span className="text-amber-500 font-bold">فرمت ۳-۵-۲ استراتژیک</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 rounded-lg bg-gray-900 border border-white/5 text-gray-300 hover:text-white hover:border-amber-500/40 transition cursor-pointer"
                      title="ویرایش ترکیب منتخب"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 rounded-lg bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-950/40 transition cursor-pointer"
                      title="حذف هفته"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // EDIT/CREATE VIEWPORT WITH PREMIUM GRAPHICS
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-4 gap-3">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-550" />
                <span>{editingItem?.id ? "ویرایش ترکیب منتخب هفته" : "ایجاد ترکیب منتخب جدید"}</span>
              </h2>
              <p className="text-[10px] text-slate-400">توسط فیلد استراتژیک زیر چیدمان تیم هفته را به صورت تعاملی پیکربندی کنید.</p>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {/* Toggle View Mode Buttons */}
              <div className="bg-[#121216] border border-white/5 p-1 rounded-xl flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setViewMode("pitch")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    viewMode === "pitch" 
                      ? "bg-amber-500 text-slate-950" 
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>نمای زمین فوتبال</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    viewMode === "list" 
                      ? "bg-amber-500 text-slate-950" 
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  <span>نمای لیست کلاسیک</span>
                </button>
              </div>

              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditingItem(null);
                }}
                className="p-2 bg-gray-900 border border-white/5 hover:bg-gray-800 text-gray-400 rounded-xl transition cursor-pointer"
                title="انصراف"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Meta Inputs (Week / League selector) */}
            <div className="md:col-span-6 bg-gray-950/40 p-4 rounded-2xl border border-white/5 space-y-1">
              <label className="block text-[11px] text-gray-400 font-black">انتخاب رده لیگ</label>
              <select
                value={editingItem?.leagueKey || ""}
                onChange={e => setEditingItem({ ...editingItem, leagueKey: e.target.value })}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold mt-1"
              >
                {leagues.map(l => (
                  <option key={l.key} value={l.key}>{l.label}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-6 bg-gray-950/40 p-4 rounded-2xl border border-white/5 space-y-1">
              <label className="block text-[11px] text-gray-400 font-black">شماره هفته</label>
              <input
                type="number"
                value={editingItem?.week || ""}
                onChange={e => setEditingItem({ ...editingItem, week: parseInt(e.target.value, 10) })}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono font-bold mt-1"
                placeholder="1"
              />
            </div>
          </div>

          {/* Core Position Editor Board */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-amber-400">تنظیم ارنج بازیکنان ترکیب هفته منتخب</h3>
              <span className="text-[10px] text-gray-450 bg-gray-950 px-2 py-1 rounded border border-white/5">فرمت استراتژیک ۳-۵-۲</span>
            </div>

            {viewMode === "pitch" ? (
              /* INTERACTIVE TACTICAL FOOTBALL FIELD DIAGRAM */
              <div 
                className="relative w-full aspect-[4/5] sm:aspect-[3/4] md:aspect-[4/5] max-w-2xl mx-auto rounded-3xl bg-gradient-to-b from-[#061510] via-[#092218] to-[#040c09] border-2 border-emerald-500/20 overflow-hidden shadow-2xl p-4 transition-all duration-300"
                style={{ direction: "ltr" }}
              >
                {/* Tactical pitch graphics lines */}
                <div className="absolute inset-4 border border-white/10 rounded-xl pointer-events-none">
                  {/* Half field line */}
                  <div className="absolute top-1/2 left-0 right-0 h-0 border-t border-white/10" />
                  {/* Center circle */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border border-white/10" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/20 rounded-full" />
                  
                  {/* Penalty Box (Top) */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[45%] h-[15%] border-b border-x border-white/10">
                    {/* Goal box */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-[35%] border-b border-x border-white/5" />
                  </div>
                  
                  {/* Penalty Box (Bottom) */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[45%] h-[15%] border-t border-x border-white/10">
                    {/* Goal box */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[40%] h-[35%] border-t border-x border-white/5" />
                  </div>
                </div>

                {/* Draw Player Nodes */}
                {visualPositions.map(pos => {
                  const rawPlayer = editingItem?.players?.[pos.key];
                  const livePlayer = rawPlayer?.id ? players.find(p => p.id?.toString() === rawPlayer.id.toString()) : null;
                  const player = rawPlayer ? {
                    ...rawPlayer,
                    name: livePlayer?.name || rawPlayer.name,
                    image: livePlayer?.image || rawPlayer.image,
                    teamName: livePlayer?.teamName || rawPlayer.teamName,
                  } : null;

                  return (
                    <div 
                      key={pos.key}
                      className={`absolute ${pos.coords} z-10`}
                    >
                      <div className="flex flex-col items-center select-none text-center">
                        {player ? (
                          // ACTIVE PLAYER NODE CARD ON FIELD
                          <div className="group relative flex flex-col items-center">
                            {/* Star badge only */}
                            <div className="absolute -top-1 -right-1 z-20 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 p-1 rounded-full shadow-lg flex items-center justify-center border border-amber-300/35">
                              <Star className="h-2.5 w-2.5 fill-black stroke-none animate-pulse" />
                            </div>

                            {/* Circular avatar box */}
                            <button
                              type="button"
                              onClick={() => {
                                setActivePickerPosition(pos.key);
                                setPlayerSearchQuery("");
                                setPickedPlayerRating(player.rating || 8.0);
                              }}
                              className="w-13 h-13 sm:w-16 sm:h-16 rounded-full bg-slate-950 border-2 border-amber-500/80 shadow-md transform hover:scale-105 hover:border-amber-400 transition cursor-pointer overflow-hidden p-0.5"
                            >
                              <img loading="lazy" decoding="async" 
                                src={getSafeImageUrl(player.image)} 
                                alt={player.name}
                                className="w-full h-full rounded-full object-cover bg-slate-900"
                                referrerPolicy="no-referrer"
                              />
                            </button>

                            {/* Player name label block */}
                            <div className="mt-1 bg-black/85 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-md max-w-[85px] sm:max-w-[110px] shadow-md">
                              <p className="text-[9px] sm:text-[10px] font-black text-white truncate text-center" style={{ direction: "rtl" }}>
                                {player.name}
                              </p>
                              <p className="text-[7px] sm:text-[8px] text-amber-400 font-extrabold truncate text-center" style={{ direction: "rtl" }}>
                                {player.teamName}
                              </p>
                            </div>

                            {/* Rapid Floating Quick Action Box */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemovePlayerFromPos(pos.key);
                              }}
                              className="absolute -bottom-1 -right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full shadow-md hover:scale-110 active:scale-95 transition opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                              title="حذف بازیکن از ترکیب"
                            >
                              <X className="h-2.5 w-2.5 stroke-[3px]" />
                            </button>
                          </div>
                        ) : (
                          // EMPTY SLOT PLACEHOLDER BUTTON
                          <button
                            type="button"
                            onClick={() => {
                              setActivePickerPosition(pos.key);
                              setPlayerSearchQuery("");
                              setPickedPlayerRating(8.0);
                            }}
                            className="group flex flex-col items-center gap-1 cursor-pointer"
                          >
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-dashed border-white/20 bg-zinc-950/60 hover:bg-zinc-950 hover:border-amber-500/50 flex items-center justify-center text-gray-500 hover:text-amber-500 transition-all duration-300">
                              <Plus className="h-4.5 w-4.5 group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="bg-black/70 px-1.5 py-0.5 rounded-md border border-white/5">
                              <span className="text-[8px] sm:text-[9px] text-gray-400 font-bold block">{pos.label}</span>
                              <span className="text-[7px] text-gray-500 block truncate max-w-[70px]">{pos.title}</span>
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* CLASSIC ROW-BY-ROW TABLE LIST VIEW */
              <div className="space-y-2.5 p-4 bg-gray-950/40 rounded-3xl border border-white/5 max-h-[55vh] overflow-y-auto">
                {positions.map(pos => {
                  const rawPlayer = editingItem?.players?.[pos.key];
                  const livePlayer = rawPlayer?.id ? players.find(p => p.id?.toString() === rawPlayer.id.toString()) : null;
                  const player = rawPlayer ? {
                    ...rawPlayer,
                    name: livePlayer?.name || rawPlayer.name,
                    image: livePlayer?.image || rawPlayer.image,
                    teamName: livePlayer?.teamName || rawPlayer.teamName,
                  } : null;

                  return (
                    <div 
                      key={pos.key}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-950/60 p-3 rounded-xl border border-white/5 hover:border-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-900 border border-dashed border-white/10 flex items-center justify-center text-gray-500 shrink-0">
                          {player ? (
                            <img loading="lazy" decoding="async" 
                              src={getSafeImageUrl(player.image)} 
                              alt={player.name}
                              className="w-full h-full rounded-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <Shield className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <div className="text-[10px] font-black text-amber-500">{pos.label}</div>
                          {player ? (
                            <div className="text-xs font-black text-white mt-0.5">
                              {player.name} <span className="text-[10px] text-slate-400 font-bold">({player.teamName})</span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-500 italic mt-0.5">بازیکنی قرار نگرفته است</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {player && (
                          <div className="text-[11px] font-bold text-amber-400 bg-amber-950/20 border border-amber-800/30 px-2.5 py-1 rounded-lg flex items-center gap-1">
                            <Star className="h-3 w-3 fill-amber-400" />
                            <span>بازیکن منتخب</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setActivePickerPosition(pos.key);
                            setPlayerSearchQuery("");
                            setPickedPlayerRating(player?.rating || 8.0);
                          }}
                          className="bg-gray-900 hover:bg-gray-800 text-gray-300 font-bold text-[10px] px-3 py-1.5 rounded-lg border border-white/5 hover:border-amber-500/20 transition cursor-pointer flex items-center gap-1"
                        >
                          <Search className="h-3.5 w-3.5" />
                          <span>{player ? "تغییر بازیکن" : "جستجوی بازیکن در پورتال"}</span>
                        </button>

                        {player && (
                          <button
                            type="button"
                            onClick={() => handleRemovePlayerFromPos(pos.key)}
                            className="bg-red-950/10 hover:bg-red-950/30 border border-red-900/30 text-red-400 p-1.5 rounded-lg hover:text-red-350 transition cursor-pointer"
                            title="حذف بازیکن"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <button
              onClick={() => {
                setIsEditing(false);
                setEditingItem(null);
              }}
              className="bg-transparent hover:bg-white/5 text-gray-400 hover:text-white font-bold text-xs px-5 py-2.5 rounded-xl border border-white/5 transition cursor-pointer"
            >
              انصراف
            </button>
            <button
              onClick={handleSave}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs px-6 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 transition"
            >
              <Save className="h-4 w-4" />
              <span>ذخیره کل ترکیب منتخب</span>
            </button>
          </div>
        </div>
      )}

      {/* POPUP MODAL DIALOG: INTUITIVE AUTOCOMPLETE SEARCH PLAYER DIALOG */}
      {activePickerPosition && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-2xl relative animate-in zoom-in-95 duration-200" dir="rtl">
            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
              <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                <Search className="h-4 w-4 text-amber-500" />
                <span>قرار دادن بازیکن در موقعیت: {positions.find(p => p.key === activePickerPosition)?.label}</span>
              </h4>
              <button 
                onClick={() => {
                  setActivePickerPosition(null);
                  setPlayerSearchQuery("");
                }} 
                className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Autocomplete Input Search field */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="جستجوی بازیکن بر اساس نام..."
                  value={playerSearchQuery}
                  onChange={e => setPlayerSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 rounded-xl pr-9 pl-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  autoFocus
                />
                <Search className="absolute right-3 top-3.5 h-4 w-4 text-gray-500" />
              </div>

              {/* Autocomplete matching items */}
              <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                <div className="text-[9px] text-amber-500 font-bold px-1.5 pb-1 block border-b border-white/5">نتایج تطبیقی از پایگاه داده فدراسیون:</div>
                
                {filteredPlayersList.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">بازیکنی یافت نشد. برای غنی‌تر شدن لیست ابتدا از بخش چپ بازیکن اضافه کنید.</p>
                ) : (
                  filteredPlayersList.map(p => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectPlayerForPos(p, activePickerPosition)}
                      className="group flex items-center justify-between p-2 rounded-xl bg-gray-950/20 hover:bg-gray-950/80 border border-white/5 hover:border-amber-500/20 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <img loading="lazy" decoding="async"                           src={getSafeImageUrl(p.image)}
                          alt={p.name}
                          className="w-8 h-8 rounded-full border border-white/10 object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="text-xs font-black text-white group-hover:text-amber-300 transition-colors">{p.name}</div>
                          <div className="text-[10px] text-gray-400">{p.teamName} • پست: {p.position}</div>
                        </div>
                      </div>
                      
                      <div className="p-1 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition">
                        <Check className="h-4 w-4 stroke-[3px]" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

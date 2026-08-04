import React, { useState } from "react";
import { 
  FileText, 
  RefreshCw, 
  Image as ImageIcon, 
  Mail, 
  Tv, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  X,
  Upload,
  Calendar,
  Layers,
  Link2,
  Lock,
} from "lucide-react";
import TeamLogo from "./TeamLogo";
import AdsManager from "./AdsManager";
import { NewsItem, TransferItem, ImageItem, ContactSubmission, LegionnaireItem, AdItem } from "../types";
import { isWithinSchedule } from "./AdSlot";

interface AdminPortalHubProps {
  news: NewsItem[];
  transfers: TransferItem[];
  teamTransfersList?: any[];
  images: ImageItem[];
  submissions: ContactSubmission[];
  legionnaires?: LegionnaireItem[];
  ads?: AdItem[];
  onSaveAds?: (ads: AdItem[]) => void;
  onRefreshData: () => void;
  permissions?: string[];
}

export default function AdminPortalHub({
  news = [],
  transfers = [],
  teamTransfersList = [],
  images = [],
  submissions = [],
  legionnaires = [],
  ads = [],
  onSaveAds,
  onRefreshData,
  permissions = []
}: AdminPortalHubProps) {
  const [subTab, setSubTab] = useState<"news" | "transfers" | "teamTransfers" | "legionnaires" | "gallery" | "submissions" | "ads">("news");

  const SUBTAB_PERMISSION: Record<string, string> = {
    news: "portal.news",
    transfers: "portal.transfers",
    teamTransfers: "portal.teamTransfers",
    legionnaires: "portal.legionnaires",
    gallery: "portal.gallery",
    ads: "portal.ads",
    submissions: "portal.submissions"
  };
  const canSeeSubTab = (key: string) => permissions.includes(SUBTAB_PERMISSION[key] ?? "");
  const firstAllowedSubTab = (["news", "transfers", "teamTransfers", "legionnaires", "gallery", "ads", "submissions"] as const).find(canSeeSubTab) ?? "news";
  const subTabForRender = canSeeSubTab(subTab) ? subTab : firstAllowedSubTab;

  const [lockedWarning, setLockedWarning] = useState("");

  const handleSubTabClick = (key: string) => {
    setShowForm(null);
    if (!canSeeSubTab(key)) {
      setLockedWarning("دسترسی شما برای این بخش کافی نیست. این بخش فقط برای صاحب سایت باز است.");
      setTimeout(() => setLockedWarning(""), 3500);
      return;
    }
    setSubTab(key as any);
  };

  const handleDeleteSubmission = async (id: string) => {
    if (window.confirm("آیا از حذف این پیام اطمینان دارید؟")) {
      try {
        const res = await fetch(`/api/submissions/${id}`, { method: "DELETE" });
        if (res.ok) {
          onRefreshData();
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleMarkAsRead = async (id: string, isRead: boolean) => {
    try {
      const res = await fetch(`/api/submissions/${id}/read`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead })
      });
      if (res.ok) {
        onRefreshData();
      }
    } catch (e) {
      console.error(e);
    }
  };
  
  // FORM / EDIT COMMON STATE
  const [showForm, setShowForm] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // NEWS FORM STATE
  const [newsTitle, setNewsTitle] = useState("");
  const [newsSummary, setNewsSummary] = useState("");
  const [newsContent, setNewsContent] = useState("");
  const [newsCategory, setNewsCategory] = useState("pro-league");
  const [newsImage, setNewsImage] = useState("");

  // TRANSFER FORM STATE
  const [trPlayerName, setTrPlayerName] = useState("");
  const [trPlayerImage, setTrPlayerImage] = useState("");
  const [trFromTeam, setTrFromTeam] = useState("");
  const [trToTeam, setTrToTeam] = useState("");
  const [trFee, setTrFee] = useState("");
  const [trType, setTrType] = useState("دائمی");
  const [trDetails, setTrDetails] = useState("");

  // IMAGE FORM STATE
  const [imageUrl, setImageUrl] = useState("");
  const [imageCaption, setImageCaption] = useState("");
  const [imageDescription, setImageDescription] = useState("");

  // LEGIONNAIRE FORM STATE
  const [legName, setLegName] = useState("");
  const [legImage, setLegImage] = useState("");
  const [legLeague, setLegLeague] = useState("");
  const [legTeam, setLegTeam] = useState("");
  const [legPerformance, setLegPerformance] = useState("");
  const [legSummary, setLegSummary] = useState("");

  // TAGS STATE FOR FORMS
  const [newsTags, setNewsTags] = useState("");
  const [trTags, setTrTags] = useState("");
  const [legTags, setLegTags] = useState("");
  const [imgTags, setImgTags] = useState("");

  // AD FORM STATE
  const [adForm, setAdForm] = useState<AdItem | null>(null);
  const [adSettings, setAdSettings] = useState<Record<string, any>>({});

  const emptyAdForm = (): AdItem => ({
    id: "",
    type: "slot",
    name: "",
    placement: "sidebar",
    title: "",
    promo: "",
    description: "",
    linkUrl: "",
    imageUrl: "",
    btnText: "",
    width: 728,
    height: 90,
    priority: 0,
    startDate: "",
    endDate: "",
    isActive: true,
    settings: {},
    viewCount: 0,
    clickCount: 0
  });

  const openAdForm = (item: AdItem | null) => {
    const base = item || emptyAdForm();
    setAdForm({ ...base });
    setAdSettings(base.settings || {});
  };

  const updateAdField = (field: string, value: any) => {
    setAdForm(prev => (prev ? { ...prev, [field]: value } : prev));
  };

  const updateAdSetting = (field: string, value: any) => {
    setAdSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adForm) return;
    const payload = {
      ...adForm,
      settings: adSettings,
      width: parseInt(String(adForm.width)) || 728,
      height: parseInt(String(adForm.height)) || 90,
      priority: parseInt(String(adForm.priority)) || 0
    };
    try {
      const isNew = !adForm.id;
      const url = isNew ? "/api/ads" : `/api/ads/${adForm.id}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setAdForm(null);
        onRefreshData();
        alert(isNew ? "تبلیغ جدید با موفقیت ثبت شد." : "تبلیغ با موفقیت به‌روزرسانی شد.");
      } else {
        alert("خطا در ذخیره تبلیغ.");
      }
    } catch {
      alert("خطا در ارتباط با سرور.");
    }
  };

  const handleDeleteAd = async (id: string) => {
    if (!window.confirm("آیا از حذف این تبلیغ اطمینان دارید؟")) return;
    try {
      const res = await fetch(`/api/ads/${id}`, { method: "DELETE" });
      if (res.ok) {
        onRefreshData();
      } else {
        alert("خطا در حذف تبلیغ.");
      }
    } catch {
      alert("خطا در ارتباط با سرور.");
    }
  };

  const handleBulkSaveAds = async () => {
    if (!onSaveAds) return;
    try {
      const res = await fetch("/api/ads", { method: "GET" });
      if (!res.ok) return;
      const current = await res.json();
      await onSaveAds(current);
      alert("لیست تبلیغات با موفقیت همگام شد.");
    } catch {
      alert("خطا در ارتباط با سرور.");
    }
  };

  // TEAM TRANSFERS FORM STATE
  const [teamTrName, setTeamTrName] = useState("");
  const [teamTrLogo, setTeamTrLogo] = useState("");
  const [teamTrLeague, setTeamTrLeague] = useState<"pro-league" | "league-1" | "league-2">("pro-league");
  const [teamTrLeagueFilter, setTeamTrLeagueFilter] = useState<"all" | "pro-league" | "league-1" | "league-2">("all");
  const [teamTrIncomings, setTeamTrIncomings] = useState<any[]>([]);
  const [teamTrOutgoings, setTeamTrOutgoings] = useState<any[]>([]);

  const addIncomingPlayer = () => {
    setTeamTrIncomings([
      ...teamTrIncomings,
      {
        id: `pl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        playerName: "",
        playerImage: "",
        fromTeam: "",
        toTeam: teamTrName,
        status: "قطعی"
      }
    ]);
  };

  const removeIncomingPlayer = (id: string) => {
    setTeamTrIncomings(teamTrIncomings.filter(p => p.id !== id));
  };

  const updateIncomingPlayer = (id: string, field: string, val: any) => {
    setTeamTrIncomings(teamTrIncomings.map(p => p.id === id ? { ...p, [field]: val } : p));
  };

  const addOutgoingPlayer = () => {
    setTeamTrOutgoings([
      ...teamTrOutgoings,
      {
        id: `pl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        playerName: "",
        playerImage: "",
        fromTeam: teamTrName,
        toTeam: "",
        status: "قطعی"
      }
    ]);
  };

  const removeOutgoingPlayer = (id: string) => {
    setTeamTrOutgoings(teamTrOutgoings.filter(p => p.id !== id));
  };

  const updateOutgoingPlayer = (id: string, field: string, val: any) => {
    setTeamTrOutgoings(teamTrOutgoings.map(p => p.id === id ? { ...p, [field]: val } : p));
  };

  const handleEditTeamTransfer = (item: any) => {
    setEditingId(item.id);
    setTeamTrName(item.teamName || "");
    setTeamTrLogo(item.teamLogo || "⚽");
    setTeamTrLeague(item.league || "pro-league");
    setTeamTrIncomings(item.incomings || []);
    setTeamTrOutgoings(item.outgoings || []);
    setShowForm("teamTransfer");
  };

  const handleDeleteTeamTransfer = async (id: string) => {
    if (!window.confirm("آیا مایل به حذف این سطر نقل و انتقال تیم هستید؟")) return;
    try {
      const res = await fetch(`/api/team-transfers/${id}`, { method: "DELETE" });
      if (res.ok) {
        onRefreshData();
      } else {
        alert("خطا در حذف سطر.");
      }
    } catch {
      alert("خطای ارتباط با سرور.");
    }
  };

  const handleSaveTeamTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamTrName.trim()) {
      alert("لطفاً نام تیم را وارد کنید.");
      return;
    }
    const payload = {
      teamName: teamTrName,
      teamLogo: teamTrLogo || "⚽",
      league: teamTrLeague,
      incomings: teamTrIncomings.map(p => ({
        ...p,
        toTeam: teamTrName
      })),
      outgoings: teamTrOutgoings.map(p => ({
        ...p,
        fromTeam: teamTrName
      }))
    };

    try {
      const url = editingId ? `/api/team-transfers/${editingId}` : "/api/team-transfers";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowForm(null);
        setEditingId(null);
        setTeamTrName("");
        setTeamTrLogo("");
        setTeamTrLeague("pro-league");
        setTeamTrIncomings([]);
        setTeamTrOutgoings([]);
        onRefreshData();
      } else {
        alert("خطا در ذخیره سطر.");
      }
    } catch {
      alert("خطای نامعتبر ارتباطی.");
    }
  };

  // 1. CHOOSE & EDIT HANDLERS
  const handleEditNews = (item: NewsItem) => {
    setEditingId(item.id);
    setNewsTitle(item.title);
    setNewsSummary(item.summary);
    setNewsContent(item.content);
    setNewsCategory(item.category || "pro-league");
    setNewsImage(item.image || "");
    setNewsTags(item.tags ? item.tags.join(", ") : "");
    setShowForm("news");
  };

  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: newsTitle,
      summary: newsSummary,
      content: newsContent,
      category: newsCategory,
      image: newsImage || "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800",
      tags: newsTags.split(",").map(t => t.trim()).filter(Boolean)
    };

    try {
      const url = editingId ? `/api/news/${editingId}` : "/api/news";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowForm(null);
        setEditingId(null);
        onRefreshData();
      } else {
        alert("خطا در ذخیره خبر.");
      }
    } catch {
      alert("خطا در شبکه.");
    }
  };

  const handleDeleteNews = async (id: string) => {
    if (!window.confirm("آیا از حذف این خبر اطمینان دارید؟")) return;
    try {
      const res = await fetch(`/api/news/${id}`, { method: "DELETE" });
      if (res.ok) onRefreshData();
    } catch {
      alert("خطا در اتصال به سرور.");
    }
  };

  // 2. TRANSFER ACTIONS
  const handleEditTransfer = (item: TransferItem) => {
    setEditingId(item.id);
    setTrPlayerName(item.playerName);
    setTrPlayerImage(item.playerImage || item.player_image || "");
    setTrFromTeam(item.fromTeam);
    setTrToTeam(item.toTeam);
    setTrFee(item.fee || "");
    setTrType(item.type || "دائمی");
    setTrDetails(item.details || item.description || "");
    setTrTags(item.tags ? item.tags.join(", ") : "");
    setShowForm("transfer");
  };

  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      playerName: trPlayerName,
      playerImage: trPlayerImage,
      player_image: trPlayerImage,
      fromTeam: trFromTeam,
      toTeam: trToTeam,
      fee: trFee,
      type: trType,
      details: trDetails,
      description: trDetails,
      tags: trTags.split(",").map(t => t.trim()).filter(Boolean)
    };

    try {
      const url = editingId ? `/api/transfers/${editingId}` : "/api/transfers";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowForm(null);
        setEditingId(null);
        onRefreshData();
      } else {
         alert("خطا در ثبت نقل و انتقال.");
      }
    } catch {
      alert("خطا در برقراری شبکه.");
    }
  };

  const handleDeleteTransfer = async (id: string) => {
    if (!window.confirm("آیا از حذف این شایعه/نقل و انتقال مطمئن هستید؟")) return;
    try {
      const res = await fetch(`/api/transfers/${id}`, { method: "DELETE" });
      if (res.ok) onRefreshData();
    } catch {
      alert("خطا در سرور.");
    }
  };

  // 3. IMAGE ACTIONS
  const handleEditImage = (item: any) => {
    setEditingId(item.id);
    setImageUrl(item.url || "");
    setImageCaption(item.caption || item.title || "");
    setImageDescription(item.description || "");
    setImgTags(item.tags ? item.tags.join(", ") : "");
    setShowForm("gallery");
  };

  const handleSaveImage = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      url: imageUrl,
      caption: imageCaption,
      title: imageCaption,
      description: imageDescription,
      tags: imgTags.split(",").map(t => t.trim()).filter(Boolean)
    };

    try {
      const url = editingId ? `/api/images/${editingId}` : "/api/images";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowForm(null);
        setEditingId(null);
        setImageUrl("");
        setImageCaption("");
        setImageDescription("");
        setImgTags("");
        onRefreshData();
      } else {
        alert("خطا در اضافه کردن عکس.");
      }
    } catch {
      alert("خطای اتصال شبکه.");
    }
  };

  const handleDeleteImage = async (id: string) => {
    if (!window.confirm("آیا مایل به حذف این عکس از گالری هستید؟")) return;
    try {
      const res = await fetch(`/api/images/${id}`, { method: "DELETE" });
      if (res.ok) onRefreshData();
    } catch {
      alert("خطا در دیتابیس.");
    }
  };

  // 4. LEGIONNAIRES ACTIONS
  const handleEditLegionnaire = (item: any) => {
    setEditingId(item.id);
    setLegName(item.name || "");
    setLegImage(item.image || "");
    setLegLeague(item.league || "");
    setLegTeam(item.team || "");
    setLegSummary(item.summary || "");
    setLegPerformance(item.performance || item.description || "");
    setLegTags(item.tags ? item.tags.join(", ") : "");
    setShowForm("legionnaire");
  };

  const handleSaveLegionnaire = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: legName,
      image: legImage,
      league: legLeague,
      team: legTeam,
      summary: legSummary,
      performance: legPerformance,
      description: legPerformance,
      tags: legTags.split(",").map(t => t.trim()).filter(Boolean)
    };

    try {
      const url = editingId ? `/api/legionnaires/${editingId}` : "/api/legionnaires";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowForm(null);
        setEditingId(null);
        setLegName("");
        setLegImage("");
        setLegLeague("");
        setLegTeam("");
        setLegSummary("");
        setLegPerformance("");
        onRefreshData();
      } else {
        alert("خطا در ذخیره اطلاعات لژیونر.");
      }
    } catch {
      alert("خطای اتصال به سرور.");
    }
  };

  const handleDeleteLegionnaire = async (id: string) => {
    if (!window.confirm("آیا مایل به حذف این لژیونر از بانک داده ورزشی هستید؟")) return;
    try {
      const res = await fetch(`/api/legionnaires/${id}`, { method: "DELETE" });
      if (res.ok) onRefreshData();
    } catch {
      alert("خطا در ارتباط با سرور.");
    }
  };

  const getLeagueLabel = (league: string) => {
    if (league === "league-1") return "لیگ یک";
    if (league === "league-2") return "لیگ دو";
    return "لیگ برتر";
  };

  const filteredTeamTransfersForAdmin = teamTransfersList.filter((item: any) => {
    if (teamTrLeagueFilter === "all") return true;
    return (item.league || "pro-league") === teamTrLeagueFilter;
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* Locked sub-tab access warning block */}
      {lockedWarning && (
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-700/40 text-xs font-black text-amber-400 flex items-center gap-2">
          <Lock className="h-4 w-4 text-amber-400" />
          <span>{lockedWarning}</span>
        </div>
      )}

      {/* Sub menu tabs row */}
      <div className="flex overflow-x-auto border-b border-white/5 pb-2 gap-2 text-xs scrollbar-hide">
        <button
          onClick={() => handleSubTabClick("news")}
          className={`flex items-center gap-1.5 px-4 py-2 font-bold rounded-lg transition cursor-pointer ${subTab === "news" ? "bg-red-655 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          📰 اخبار و مقالات ورزشی
          {!canSeeSubTab("news") && <Lock className="h-3 w-3 text-amber-500" />}
        </button>
        <button
          onClick={() => handleSubTabClick("transfers")}
          className={`flex items-center gap-1.5 px-4 py-2 font-bold rounded-lg transition cursor-pointer ${subTab === "transfers" ? "bg-red-655 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          🔄 نقل و انتقالات (بازیکن‌محور)
          {!canSeeSubTab("transfers") && <Lock className="h-3 w-3 text-amber-500" />}
        </button>
        <button
          onClick={() => handleSubTabClick("teamTransfers")}
          className={`flex items-center gap-1.5 px-4 py-2 font-bold rounded-lg transition cursor-pointer ${subTab === "teamTransfers" ? "bg-red-655 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          📊 نقل و انتقالات (تیم‌محور)
          {!canSeeSubTab("teamTransfers") && <Lock className="h-3 w-3 text-amber-500" />}
        </button>
        <button
          onClick={() => handleSubTabClick("legionnaires")}
          className={`flex items-center gap-1.5 px-4 py-2 font-bold rounded-lg transition cursor-pointer ${subTab === "legionnaires" ? "bg-red-655 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          🌍 مدیریت لژیونرها
          {!canSeeSubTab("legionnaires") && <Lock className="h-3 w-3 text-amber-500" />}
        </button>
        <button
          onClick={() => handleSubTabClick("gallery")}
          className={`flex items-center gap-1.5 px-4 py-2 font-bold rounded-lg transition cursor-pointer ${subTab === "gallery" ? "bg-red-655 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          🖼️ گالری عکاسی و استوری‌ها
          {!canSeeSubTab("gallery") && <Lock className="h-3 w-3 text-amber-500" />}
        </button>
        <button
          onClick={() => handleSubTabClick("ads")}
          className={`flex items-center gap-1.5 px-4 py-2 font-bold rounded-lg transition cursor-pointer ${subTab === "ads" ? "bg-red-655 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          📢 مدیریت تبلیغات ({ads.length})
          {!canSeeSubTab("ads") && <Lock className="h-3 w-3 text-amber-500" />}
        </button>
        <button
          onClick={() => handleSubTabClick("submissions")}
          className={`flex items-center gap-1.5 px-4 py-2 font-bold rounded-lg transition cursor-pointer ${subTab === "submissions" ? "bg-red-655 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          ✉️ پیام‌های تماس ({submissions.length})
          {!canSeeSubTab("submissions") && <Lock className="h-3 w-3 text-amber-500" />}
        </button>
      </div>

      {/* SUB-TAB 1: NEWS */}
      {subTabForRender === "news" && (
        <div className="bg-[#0b0b0f] border border-white/5 p-5 rounded-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h3 className="font-extrabold text-sm text-white">مدیریت تحریریه و خبرخوان پورتال</h3>
            <button
              onClick={() => {
                setEditingId(null);
                setNewsTitle("");
                setNewsSummary("");
                setNewsContent("");
                setNewsCategory("pro-league");
                setNewsImage("");
                setNewsTags("");
                setShowForm("news");
              }}
              className="bg-red-655 hover:bg-red-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl cursor-pointer"
            >
              + نوشتن خبر نو
            </button>
          </div>

          {showForm === "news" && (
            <form onSubmit={handleSaveNews} className="bg-slate-900/40 border border-white/5 p-4 rounded-xl space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="md:col-span-2">
                  <label className="block text-[10px] text-gray-500 mb-1">تیتر خبر</label>
                  <input type="text" value={newsTitle} onChange={e => setNewsTitle(e.target.value)} required className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">دسته‌بندی (لیگ مرتبط)</label>
                  <select value={newsCategory} onChange={e => setNewsCategory(e.target.value)} className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white">
                    <option value="pro-league">لیگ برتر خلیج فارس</option>
                    <option value="league-1">لیگ دسته یک آزادگان</option>
                    <option value="league-2">لیگ دسته دو</option>
                    <option value="hazfi-cup">جام حذفی</option>
                    <option value="futsal">فوتسال</option>
                    <option value="all">سراسری / سایر موضوعات</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 mb-1">خلاصه کوتاه خبر</label>
                <input type="text" value={newsSummary} onChange={e => setNewsSummary(e.target.value)} required className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white" />
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 mb-1">مشروح خبر (پشتیبانی از فرمت پاراگراف)</label>
                <textarea rows={5} value={newsContent} onChange={e => setNewsContent(e.target.value)} required className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white resize-none" />
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 mb-1">آدرس عکس خبر (اختیاری)</label>
                <input type="text" value={newsImage} onChange={e => setNewsImage(e.target.value)} placeholder="https://unsplash.com/..." className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white" />
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 mb-1">برچسب‌ها (با کاما "," جدا کنید)</label>
                <input type="text" value={newsTags} onChange={e => setNewsTags(e.target.value)} placeholder="لیگ برتر, پرسپولیس, نقل و انتقالات, استقلال" className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(null)} className="px-3 py-1.5 text-xs bg-white/5 text-slate-350 rounded">انصراف</button>
                <button type="submit" className="px-4 py-1.5 text-xs bg-emerald-500 text-black font-bold rounded">ذخیره خبر</button>
              </div>
            </form>
          )}

          <div className="grid gap-3 md:grid-cols-2 max-h-[500px] overflow-y-auto">
            {news.map(n => (
              <div key={n.id} className="p-3 bg-white/[0.01] border border-white/5 rounded-xl hover:bg-white/[0.03] transition flex justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-red-500 font-extrabold">
                    {n.category === "pro-league" ? "لیگ برتر" : 
                     n.category === "league-1" ? "لیگ یک" : 
                     n.category === "league-2" ? "لیگ دو" : 
                     n.category === "hazfi-cup" ? "جام حذفی" : 
                     n.category === "futsal" ? "فوتسال" : "سایر موضوعات"}
                  </span>
                  <p className="font-extrabold text-xs text-white line-clamp-1">{n.title}</p>
                  <p className="text-[10px] text-slate-400 line-clamp-2">{n.summary}</p>
                </div>
                <div className="flex flex-col justify-between items-end flex-shrink-0">
                  <span className="text-[9px] text-slate-500 font-mono">{n.createdAt ? n.createdAt.split("T")[0] : "۲ روز پیش"}</span>
                  <div className="flex gap-1.5 pt-2">
                    <button onClick={() => handleEditNews(n)} className="p-1 rounded bg-white/5 text-slate-300">
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDeleteNews(n.id)} className="p-1 rounded bg-white/5 text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: TRANSFERS */}
      {subTabForRender === "transfers" && (
        <div className="bg-[#0b0b0f] border border-white/5 p-5 rounded-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h3 className="font-extrabold text-sm text-white">ترانسفر مارکت و نقل و انتقالات (بازیکن‌محور)</h3>
            <button
              onClick={() => {
                setEditingId(null);
                setTrPlayerName("");
                setTrPlayerImage("");
                setTrFromTeam("");
                setTrToTeam("");
                setTrFee("");
                setTrType("دائمی");
                setTrDetails("");
                setTrTags("");
                setShowForm("transfer");
              }}
              className="bg-red-655 hover:bg-red-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl cursor-pointer"
            >
              + ثبت بمب ترانسفر فصلی
            </button>
          </div>

          {showForm === "transfer" && (
            <form onSubmit={handleSaveTransfer} className="bg-slate-900/40 border border-white/5 p-4 rounded-xl space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">اسم بازیکن</label>
                  <input type="text" value={trPlayerName} onChange={e => setTrPlayerName(e.target.value)} required className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">باشگاه مبدا</label>
                  <input type="text" value={trFromTeam} onChange={e => setTrFromTeam(e.target.value)} required className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">باشگاه مقصد</label>
                  <input type="text" value={trToTeam} onChange={e => setTrToTeam(e.target.value)} required className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white" />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">مبلغ قرارداد (ریال / دلار / تهاتر)</label>
                  <input type="text" value={trFee} onChange={e => setTrFee(e.target.value)} placeholder="مثال: ۱۲ میلیارد یا نامشخص" className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">نوع جذب بازیکن</label>
                  <select value={trType} onChange={e => setTrType(e.target.value)} className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white">
                    <option value="دائمی">خرید قطعی (دائمی)</option>
                    <option value="قرارداد قرضی">قرضی با بند خرید</option>
                    <option value="شایعه نقل و انتقال">شایعه و گمانه‌زنی رسانه‌ای</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">آدرس تصویر بازیکن (player_image)</label>
                  <input type="text" value={trPlayerImage} onChange={e => setTrPlayerImage(e.target.value)} placeholder="آدرس URL عکس..." className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 mb-1">تحلیل اختصاصی و اخبار کامل جابجایی (مشروح خبر)</label>
                <textarea rows={4} value={trDetails} onChange={e => setTrDetails(e.target.value)} placeholder="جزئیات این انتقال بزرگ، مدت زمان قرارداد، بندهای فسخ و نظر کارشناسان را برای دکمه 'مشاهده خبر کامل' بنویسید..." className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white resize-none" />
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 mb-1">برچسب‌ها (با کاما "," جدا کنید)</label>
                <input type="text" value={trTags} onChange={e => setTrTags(e.target.value)} placeholder="نقل و انتقالات, پرسپولیس, سپاهان, تراکتور" className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(null)} className="px-3 py-1.5 text-xs bg-white/5 text-slate-350 rounded">انصراف</button>
                <button type="submit" className="px-4 py-1.5 text-xs bg-emerald-500 text-black font-bold rounded">ثبت جابجایی</button>
              </div>
            </form>
          )}

          <div className="grid gap-3 md:grid-cols-3 max-h-[500px] overflow-y-auto">
            {transfers.map(tr => (
              <div key={tr.id} className="p-3 bg-white/[0.01] border border-white/5 rounded-xl hover:bg-white/[0.03] transition flex justify-between items-center text-xs">
                <div>
                  <span className="font-extrabold text-white text-xs block">{tr.playerName}</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">از {tr.fromTeam} ← به {tr.toTeam}</span>
                  <span className="text-[9px] bg-slate-950 p-1 rounded font-bold text-gray-500 mt-1 inline-block">نوع: {tr.type || "خرید"}</span>
                </div>

                <div className="flex gap-1.5">
                  <button onClick={() => handleEditTransfer(tr)} className="p-1 rounded bg-white/5 text-slate-300">
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDeleteTransfer(tr.id)} className="p-1 rounded bg-white/5 text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB: TEAM-CENTRIC TRANSFERS */}
      {subTabForRender === "teamTransfers" && (
        <div className="bg-[#0b0b0f] border border-white/5 p-5 rounded-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h3 className="font-extrabold text-sm text-white">ترانسفر مارکت و نقل و انتقالات (تیم‌محور)</h3>
            <button
              onClick={() => {
                setEditingId(null);
                setTeamTrName("");
                setTeamTrLogo("⚽");
                setTeamTrLeague("pro-league");
                setTeamTrIncomings([]);
                setTeamTrOutgoings([]);
                setShowForm("teamTransfer");
              }}
              className="bg-red-655 hover:bg-red-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl cursor-pointer"
            >
              + اضافه کردن سطر تیم‌ آزاد / لیگ
            </button>
          </div>

          {showForm === "teamTransfer" && (
            <form onSubmit={handleSaveTeamTransfer} className="bg-slate-900/40 border border-white/5 p-4 rounded-xl space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">نام تیم (مانند سپاهان، پرسپولیس، استقلال)</label>
                  <input
                    type="text"
                    value={teamTrName}
                    onChange={e => setTeamTrName(e.target.value)}
                    required
                    className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">نشان یا ایموجی تیم (مثلا 🛡️ یا 🔵 یا 🔴)</label>
                  <input
                    type="text"
                    value={teamTrLogo}
                    onChange={e => setTeamTrLogo(e.target.value)}
                    placeholder="⚽"
                    className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">لیگ مربوطه (برای فیلتر در سایت)</label>
                  <select
                    value={teamTrLeague}
                    onChange={e => setTeamTrLeague(e.target.value as any)}
                    className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white"
                  >
                    <option value="pro-league">لیگ برتر خلیج فارس</option>
                    <option value="league-1">لیگ دسته یک آزادگان</option>
                    <option value="league-2">لیگ دسته دو</option>
                  </select>
                </div>
              </div>

              {/* INCOMINGS SECTION */}
              <div className="border-t border-white/5 pt-3">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-bold text-emerald-400">⬇️ ورودی‌ها (بازیکنان جدید تیم {teamTrName || ""})</h4>
                  <button
                    type="button"
                    onClick={addIncomingPlayer}
                    className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg cursor-pointer"
                  >
                    + افزودن بازیکن ورودی
                  </button>
                </div>

                {teamTrIncomings.length === 0 ? (
                  <p className="text-[10px] text-gray-500">لیست بازیکنان ورودی خالی است.</p>
                ) : (
                  <div className="space-y-2">
                    {teamTrIncomings.map((p) => (
                      <div key={p.id} className="grid gap-2 md:grid-cols-4 p-2 bg-black/40 rounded border border-white/5 relative items-center">
                        <div>
                          <label className="block text-[8px] text-slate-500 mb-0.5">نام بازیکن</label>
                          <input
                            type="text"
                            value={p.playerName}
                            onChange={e => updateIncomingPlayer(p.id, "playerName", e.target.value)}
                            required
                            placeholder="مثلا احسان حسینی"
                            className="w-full text-[10px] rounded bg-black border border-white/10 p-1 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] text-slate-500 mb-0.5">تیم قبلی</label>
                          <input
                            type="text"
                            value={p.fromTeam}
                            onChange={e => updateIncomingPlayer(p.id, "fromTeam", e.target.value)}
                            required
                            placeholder="مثلا نساجی مازندران"
                            className="w-full text-[10px] rounded bg-black border border-white/10 p-1 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] text-slate-500 mb-0.5">وضعیت انتقال</label>
                          <select
                            value={p.status}
                            onChange={e => updateIncomingPlayer(p.id, "status", e.target.value)}
                            className="w-full text-[10px] rounded bg-black border border-white/10 p-1 text-white"
                          >
                            <option value="قطعی">قطعی (سفید/سبز)</option>
                            <option value="احتمالی">احتمالی (خاکستری/سفید)</option>
                            <option value="قرضی">قرضی (زرد)</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-between pt-3">
                          <div className="w-full mr-2">
                            <label className="block text-[8px] text-slate-500 mb-0.5">آدرس تصویر بازیکن (اختیاری)</label>
                            <input
                              type="text"
                              value={p.playerImage || ""}
                              onChange={e => updateIncomingPlayer(p.id, "playerImage", e.target.value)}
                              placeholder="URL عکس..."
                              className="w-[85%] text-[10px] rounded bg-black border border-white/10 p-1 text-white"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeIncomingPlayer(p.id)}
                            className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-white cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* OUTGOINGS SECTION */}
              <div className="border-t border-white/5 pt-3">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-bold text-red-400">⬆️ خروجی‌ها (بازیکنانی که از {teamTrName || ""} جدا شده‌اند)</h4>
                  <button
                    type="button"
                    onClick={addOutgoingPlayer}
                    className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold rounded-lg cursor-pointer"
                  >
                    + افزودن بازیکن خروجی
                  </button>
                </div>

                {teamTrOutgoings.length === 0 ? (
                  <p className="text-[10px] text-gray-500">لیست بازیکنان خروجی خالی است.</p>
                ) : (
                  <div className="space-y-2">
                    {teamTrOutgoings.map((p) => (
                      <div key={p.id} className="grid gap-2 md:grid-cols-4 p-2 bg-black/40 rounded border border-white/5 relative items-center">
                        <div>
                          <label className="block text-[8px] text-slate-500 mb-0.5">نام بازیکن</label>
                          <input
                            type="text"
                            value={p.playerName}
                            onChange={e => updateOutgoingPlayer(p.id, "playerName", e.target.value)}
                            required
                            placeholder="مثلا سید ابوالفضل جلالی"
                            className="w-full text-[10px] rounded bg-black border border-white/10 p-1 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] text-slate-500 mb-0.5">تیم بعدی</label>
                          <input
                            type="text"
                            value={p.toTeam}
                            onChange={e => updateOutgoingPlayer(p.id, "toTeam", e.target.value)}
                            required
                            placeholder="مثلا تراکتور تبریز"
                            className="w-full text-[10px] rounded bg-black border border-white/10 p-1 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] text-slate-500 mb-0.5">وضعیت انتقال</label>
                          <select
                            value={p.status}
                            onChange={e => updateOutgoingPlayer(p.id, "status", e.target.value)}
                            className="w-full text-[10px] rounded bg-black border border-white/10 p-1 text-white"
                          >
                            <option value="قطعی">قطعی (قرمز)</option>
                            <option value="احتمالی">احتمالی</option>
                            <option value="قرضی">قرضی</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-between pt-3">
                          <div className="w-full mr-2">
                            <label className="block text-[8px] text-slate-500 mb-0.5">آدرس تصویر بازیکن (اختیاری)</label>
                            <input
                              type="text"
                              value={p.playerImage || ""}
                              onChange={e => updateOutgoingPlayer(p.id, "playerImage", e.target.value)}
                              placeholder="URL عکس..."
                              className="w-[85%] text-[10px] rounded bg-black border border-white/10 p-1 text-white"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeOutgoingPlayer(p.id)}
                            className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-white cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button type="button" onClick={() => setShowForm(null)} className="px-3 py-1.5 text-xs bg-white/5 text-slate-400 rounded">انصراف</button>
                <button type="submit" className="px-4 py-1.5 text-xs bg-emerald-500 text-black font-bold rounded cursor-pointer">ذخیره جابجایی تیم‌ها</button>
              </div>
            </form>
          )}

          {/* LIST OF TEAMS TRANSFERS */}
          <div className="flex flex-wrap gap-2 border-b border-white/5 pb-3 text-xs">
            <span className="text-[10px] font-bold text-slate-500 self-center">فیلتر لیگ:</span>
            {(["all", "pro-league", "league-1", "league-2"] as const).map((lg) => (
              <button
                key={lg}
                onClick={() => setTeamTrLeagueFilter(lg)}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  teamTrLeagueFilter === lg ? "bg-red-655 text-white" : "bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                {lg === "all" ? "همه لیگ‌ها" : getLeagueLabel(lg)}
              </button>
            ))}
          </div>

          {filteredTeamTransfersForAdmin.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-white/5 rounded-2xl bg-black/10">
              هیچ سطر انتقال تیم‌محوری در این لیگ ثبت نشده است. ابتدا یک مورد اضافه کنید.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 max-h-[500px] overflow-y-auto">
              {filteredTeamTransfersForAdmin.map((item: any) => (
                <div key={item.id} className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl hover:bg-white/[0.03] transition flex justify-between items-start text-xs">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <TeamLogo logo={item.teamLogo} fallback="⚽" size="sm" />
                      <span className="text-white font-extrabold text-sm">{item.teamName}</span>
                      <span className="text-[9px] bg-emerald-950/40 border border-emerald-800/30 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                        {getLeagueLabel(item.league || "pro-league")}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] text-emerald-400 font-bold">
                        ورودی‌ها ({item.incomings?.length || 0}):{" "}
                        <span className="text-gray-400 font-normal">
                          {item.incomings?.map((p: any) => `${p.playerName} (از ${p.fromTeam})`).join("، ") || "خالی"}
                        </span>
                      </div>
                      <div className="text-[10px] text-red-500 font-bold">
                        خروجی‌ها ({item.outgoings?.length || 0}):{" "}
                        <span className="text-gray-400 font-normal">
                          {item.outgoings?.map((p: any) => `${p.playerName} (به ${p.toTeam})`).join("، ") || "خالی"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditTeamTransfer(item)}
                      className="p-1.5 rounded-lg bg-neutral-900 border border-white/10 text-slate-300 hover:text-white cursor-pointer"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTeamTransfer(item.id)}
                      className="p-1.5 rounded-lg bg-neutral-900 border border-white/10 text-red-500 hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: LEGIONNAIRES */}
      {subTabForRender === "legionnaires" && (
        <div className="bg-[#0b0b0f] border border-white/5 p-5 rounded-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h3 className="font-extrabold text-sm text-white">مدیریت عملکرد لژیونرها و ایرانیان شاخص</h3>
            <button
              onClick={() => {
                setEditingId(null);
                setLegName("");
                setLegImage("");
                setLegLeague("");
                setLegTeam("");
                setLegSummary("");
                setLegPerformance("");
                setLegTags("");
                setShowForm("legionnaire");
              }}
              className="bg-red-655 hover:bg-red-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl cursor-pointer"
            >
              + اضافه کردن لژیونر جدید
            </button>
          </div>

          {showForm === "legionnaire" && (
            <form onSubmit={handleSaveLegionnaire} className="bg-slate-900/40 border border-white/5 p-4 rounded-xl space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">نام ستاره لژیونر</label>
                  <input type="text" value={legName} onChange={e => setLegName(e.target.value)} required placeholder="مثال: علیرضا جهانبخش" className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">تیم باشگاهی فعلی</label>
                  <input type="text" value={legTeam} onChange={e => setLegTeam(e.target.value)} required placeholder="مثال: هیرنفین" className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">لیگ کشور میزبان / تورنمنت</label>
                  <input type="text" value={legLeague} onChange={e => setLegLeague(e.target.value)} required placeholder="مثال: اردیویسه هلند" className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white" />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">آدرس تصویر بازیکن (Image URL)</label>
                  <input type="text" value={legImage} onChange={e => setLegImage(e.target.value)} placeholder="آدرس تصویر عکسی..." className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">برچسب‌ها (با کاما "," جدا کنید)</label>
                  <input type="text" value={legTags} onChange={e => setLegTags(e.target.value)} placeholder="لژیونرها, طارمی, اینتر میلان" className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 mb-1">خلاصه عملکرد (نمایش در صفحه جزئیات)</label>
                <textarea rows={2} value={legSummary} onChange={e => setLegSummary(e.target.value)} required placeholder="خلاصه کوتاه از عملکرد بازیکن..." className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white resize-none" />
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 mb-1">تحلیل کامل فنی و اخبار لژیونر</label>
                <textarea rows={5} value={legPerformance} onChange={e => setLegPerformance(e.target.value)} required placeholder="بنویسید عملکرد بازیکن در بازی چگونه بود..." className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white resize-none" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(null)} className="px-3 py-1.5 text-xs bg-white/5 text-slate-350 rounded">انصراف</button>
                <button type="submit" className="px-4 py-1.5 text-xs bg-emerald-500 text-black font-bold rounded">ذخیره لژیونر</button>
              </div>
            </form>
          )}

          <div className="grid gap-3 md:grid-cols-3 max-h-[500px] overflow-y-auto">
            {legionnaires.map(leg => (
              <div key={leg.id} className="p-3 bg-white/[0.01] border border-white/5 rounded-xl hover:bg-white/[0.03] transition flex justify-between items-center text-xs">
                <div className="flex items-center gap-3">
                  {leg.image && <img loading="lazy" decoding="async" src={leg.image} alt={leg.name} referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover border border-white/10" />}
                  <div>
                    <span className="font-extrabold text-white text-xs block">{leg.name}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">باشگاه {leg.team} | {leg.league}</span>
                  </div>
                </div>

                <div className="flex gap-1.5">
                  <button onClick={() => handleEditLegionnaire(leg)} className="p-1 rounded bg-white/5 text-slate-300">
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDeleteLegionnaire(leg.id)} className="p-1 rounded bg-white/5 text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: GALLERY */}
      {subTabForRender === "gallery" && (
        <div className="bg-[#0b0b0f] border border-white/5 p-5 rounded-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h3 className="font-extrabold text-sm text-white">سالن عکاسی ورزشی</h3>
            <button
              onClick={() => { setEditingId(null); setImageUrl(""); setImageCaption(""); setImageDescription(""); setImgTags(""); setShowForm("gallery"); }}
              className="bg-red-655 hover:bg-red-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl cursor-pointer"
            >
              + اضافه کردن قاب عکاسی جدید
            </button>
          </div>

          {showForm === "gallery" && (
            <form onSubmit={handleSaveImage} className="bg-slate-900/40 border border-white/5 p-4 rounded-xl space-y-3">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">آدرس دقیق عکس هوایی (Image URL)</label>
                <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} required className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">کپشن / زیرنویس تصویر</label>
                <input type="text" value={imageCaption} onChange={e => setImageCaption(e.target.value)} required className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">توضیحات و جزئیات مفصل عکس (توضیحات عکاس)</label>
                <textarea rows={2} value={imageDescription} onChange={e => setImageDescription(e.target.value)} placeholder="بنویسید عکاس اختصاصی در چه دقیقه‌ای و برای کدام صحنه این عکس را ثبت کرد..." className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white resize-none" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">برچسب‌ها (با کاما "," جدا کنید)</label>
                <input type="text" value={imgTags} onChange={e => setImgTags(e.target.value)} placeholder="گالری, لیگ برتر, سپاهان, عکاسی" className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(null)} className="px-3 py-1.5 text-xs bg-white/5 rounded">انصراف</button>
                <button type="submit" className="px-4 py-1.5 text-xs bg-emerald-500 text-black font-bold rounded">ذخیره عکس</button>
              </div>
            </form>
          )}

          <div className="grid gap-4 md:grid-cols-4 max-h-[500px] overflow-y-auto">
            {images.map(img => (
              <div key={img.id} className="bg-slate-950 border border-white/5 p-2 rounded-xl relative group">
                <img loading="lazy" decoding="async" src={img.url} alt={img.caption} referrerPolicy="no-referrer" className="h-28 w-full object-cover rounded-lg" />
                <div className="flex justify-between items-start mt-2">
                  <span className="text-[10px] text-slate-400 block truncate max-w-[120px]">{img.caption}</span>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleEditImage(img)} className="p-1 rounded bg-white/5 text-slate-300 cursor-pointer hover:bg-white/10" title="ویرایش">
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDeleteImage(img.id)} className="p-1 rounded bg-white/5 text-red-500 cursor-pointer hover:bg-red-950/20" title="حذف">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

            {/* SUB-TAB: ADS MANAGEMENT */}
      {subTabForRender === "ads" && <AdsManager ads={ads} onRefreshData={onRefreshData} />}

      {/* SUB-TAB 5: CONTACTS inbox */}{/* SUB-TAB 5: CONTACTS inbox */}
      {subTabForRender === "submissions" && (
        <div className="bg-[#0b0b0f] border border-white/5 p-5 rounded-2xl space-y-4">
          <h3 className="font-extrabold text-sm text-white border-b border-white/5 pb-2 flex justify-between items-center">
            <span>✉️ صندوق شکایات، پیشنهادات و پیام‌های مردمی ({submissions.length})</span>
          </h3>
          
          {submissions.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-8 text-center text-slate-400">پیام جدیدی دریافت نگردیده است.</p>
          ) : (
            <div className="space-y-3.5 max-h-[500px] overflow-y-auto">
              {submissions.map((sub, idx) => (
                <div key={sub.id || idx} className={`border p-4 rounded-xl flex flex-col gap-2 transition ${sub.isRead ? "bg-white/[0.01] border-white/5 opacity-70 hover:opacity-100" : "bg-[#14231b]/20 border-emerald-500/20"}`}>
                  <div className="flex justify-between items-center text-[11px] font-bold border-b border-white/[0.04] pb-1.5 flex-wrap gap-2">
                    <span className="text-emerald-450 flex items-center gap-1.5">
                      {!sub.isRead && (
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="پیام جدید" />
                      )}
                      {sub.name} ({sub.email})
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black px-2 py-0.5 rounded bg-white/5 text-gray-400">
                        {sub.isRead ? "خوانده شده" : "جدید"}
                      </span>
                      <span className="text-gray-500 font-mono">{sub.createdAt ? sub.createdAt.split("T")[0] : "همین امروز"}</span>
                    </div>
                  </div>
                  <p className="text-white font-extrabold text-xs">موضوع پیام: {sub.subject}</p>
                  <p className="text-slate-350 text-xs bg-black/45 p-3 rounded-lg leading-relaxed">{sub.message}</p>
                  
                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2 pt-1 border-t border-white/[0.03] mt-1.5">
                    <button
                      onClick={() => handleMarkAsRead(sub.id, !sub.isRead)}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all ${sub.isRead ? "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white" : "bg-emerald-500/10 text-emerald-450 hover:bg-emerald-500/20"}`}
                    >
                      {sub.isRead ? "علامت خوانده نشده" : "✓ علامت خوانده شده"}
                    </button>
                    <button
                      onClick={() => handleDeleteSubmission(sub.id)}
                      className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all font-black"
                    >
                      حذف پیام
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

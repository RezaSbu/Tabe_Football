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
  Link2
} from "lucide-react";
import { NewsItem, TransferItem, ImageItem, ContactSubmission, LegionnaireItem } from "../types";
import { getAdViews, isWithinSchedule } from "./AdSlot";

interface AdminPortalHubProps {
  news: NewsItem[];
  transfers: TransferItem[];
  teamTransfersList?: any[];
  images: ImageItem[];
  submissions: ContactSubmission[];
  legionnaires?: LegionnaireItem[];
  adConfig?: { adTitle: string; adPromo: string; adDesc: string; adLink: string; adBtnText: string; customBannerUrl: string; adSlots?: any[] };
  onUpdateAdConfig?: (configData: any) => Promise<boolean>;
  onRefreshData: () => void;
}

export default function AdminPortalHub({
  news = [],
  transfers = [],
  teamTransfersList = [],
  images = [],
  submissions = [],
  legionnaires = [],
  adConfig,
  onUpdateAdConfig,
  onRefreshData
}: AdminPortalHubProps) {
  const [subTab, setSubTab] = useState<"news" | "transfers" | "teamTransfers" | "legionnaires" | "gallery" | "submissions" | "banner" | "adSlots">("news");
  const [adSlots, setAdSlots] = useState<any[]>(adConfig?.adSlots || []);

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
  const [legRating, setLegRating] = useState<string>("7.5");
  const [legGoals, setLegGoals] = useState("");
  const [legAssists, setLegAssists] = useState("");
  const [legMinutesPlayed, setLegMinutesPlayed] = useState("");
  const [legMatchStatus, setLegMatchStatus] = useState("۹۰ دقیقه بازی");
  const [legPerformance, setLegPerformance] = useState("");

  // TAGS STATE FOR FORMS
  const [newsTags, setNewsTags] = useState("");
  const [trTags, setTrTags] = useState("");
  const [legTags, setLegTags] = useState("");
  const [imgTags, setImgTags] = useState("");

  // AD CONFIG STATE (Initialized from DB via adConfig prop)
  const [adTitle, setAdTitle] = useState(adConfig?.adTitle || "");
  const [adPromo, setAdPromo] = useState(adConfig?.adPromo || "");
  const [adBtnText, setAdBtnText] = useState(adConfig?.adBtnText || "");
  const [adDesc, setAdDesc] = useState(adConfig?.adDesc || "");
  const [adLink, setAdLink] = useState(adConfig?.adLink || "");
  const [adBannerUrl, setAdBannerUrl] = useState(adConfig?.customBannerUrl || "");

  // TEAM TRANSFERS FORM STATE
  const [teamTrName, setTeamTrName] = useState("");
  const [teamTrLogo, setTeamTrLogo] = useState("");
  const [teamTrIncomings, setTeamTrIncomings] = useState<any[]>([]);
  const [teamTrOutgoings, setTeamTrOutgoings] = useState<any[]>([]);
  const [teamTrProbables, setTeamTrProbables] = useState<any[]>([]);

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

  const addProbablePlayer = () => {
    setTeamTrProbables([
      ...teamTrProbables,
      {
        id: `pl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        playerName: "",
        playerImage: "",
        fromTeam: "",
        toTeam: "",
        status: "احتمالی"
      }
    ]);
  };

  const removeProbablePlayer = (id: string) => {
    setTeamTrProbables(teamTrProbables.filter(p => p.id !== id));
  };

  const updateProbablePlayer = (id: string, field: string, val: any) => {
    setTeamTrProbables(teamTrProbables.map(p => p.id === id ? { ...p, [field]: val } : p));
  };

  const handleEditTeamTransfer = (item: any) => {
    setEditingId(item.id);
    setTeamTrName(item.teamName || "");
    setTeamTrLogo(item.teamLogo || "⚽");
    setTeamTrIncomings(item.incomings || []);
    setTeamTrOutgoings(item.outgoings || []);
    setTeamTrProbables(item.probables || []);
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
      incomings: teamTrIncomings.map(p => ({
        ...p,
        toTeam: teamTrName
      })),
      outgoings: teamTrOutgoings.map(p => ({
        ...p,
        fromTeam: teamTrName
      })),
      probables: teamTrProbables.map(p => ({
        ...p
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
        setTeamTrIncomings([]);
        setTeamTrOutgoings([]);
        setTeamTrProbables([]);
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
    setLegRating(item.rating ? String(item.rating) : "7.5");
    setLegGoals(item.goals ? String(item.goals) : "");
    setLegAssists(item.assists ? String(item.assists) : "");
    setLegMinutesPlayed(item.minutesPlayed ? String(item.minutesPlayed) : "");
    setLegMatchStatus(item.matchStatus || "۹۰ دقیقه بازی");
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
      rating: parseFloat(legRating) || 7.5,
      matchRating: legRating,
      goals: parseInt(legGoals) || 0,
      assists: parseInt(legAssists) || 0,
      minutesPlayed: parseInt(legMinutesPlayed) || 90,
      matchStatus: legMatchStatus,
      performance: legPerformance,
      description: legPerformance,
      logo: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=80",
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
        // Reset states
        setLegName("");
        setLegImage("");
        setLegLeague("");
        setLegTeam("");
        setLegRating("7.5");
        setLegGoals("");
        setLegAssists("");
        setLegMinutesPlayed("");
        setLegMatchStatus("۹۰ دقیقه بازی");
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

  // 5. AD BANNER ACTIONS
  const handleSaveAdConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateAdConfig) {
      alert("توابع ذخیره‌سازی در دسترس نیست.");
      return;
    }
    try {
      const success = await onUpdateAdConfig({ adTitle, adPromo, adBtnText, adDesc, adLink, customBannerUrl: adBannerUrl, adSlots });
      if (success) {
        alert("بنر تبلیغاتی با موفقیت ذخیره شد!");
      } else {
        alert("ذخیره تبلیغات موفقیت‌آمیز نبود.");
      }
    } catch {
      alert("خطا در ارتباط با سرور.");
    }
  };

  const handleAddAdSlot = () => {
    const newSlot = {
      id: `slot-${Date.now()}`,
      name: "",
      width: 728,
      height: 90,
      isActive: true,
      type: "text" as const,
      priority: 0,
      startDate: "",
      endDate: "",
      adTitle: "",
      adPromo: "",
      adDesc: "",
      adLink: "",
      adBtnText: "",
      customBannerUrl: ""
    };
    setAdSlots([...adSlots, newSlot]);
  };

  const handleUpdateAdSlot = (index: number, field: string, value: any) => {
    const updated = [...adSlots];
    updated[index] = { ...updated[index], [field]: value };
    setAdSlots(updated);
  };

  const handleDeleteAdSlot = (index: number) => {
    if (!window.confirm("آیا از حذف این جایگاه تبلیغاتی اطمینان دارید؟")) return;
    setAdSlots(adSlots.filter((_: any, i: number) => i !== index));
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Sub menu tabs row */}
      <div className="flex border-b border-white/5 pb-2 gap-2 text-xs">
        <button
          onClick={() => { setSubTab("news"); setShowForm(null); }}
          className={`px-4 py-2 font-bold rounded-lg transition ${subTab === "news" ? "bg-red-655 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          📰 اخبار و مقالات ورزشی
        </button>
        <button
          onClick={() => { setSubTab("transfers"); setShowForm(null); }}
          className={`px-4 py-2 font-bold rounded-lg transition ${subTab === "transfers" ? "bg-red-655 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          🔄 نقل و انتقالات (بازیکن‌محور)
        </button>
        <button
          onClick={() => { setSubTab("teamTransfers"); setShowForm(null); }}
          className={`px-4 py-2 font-bold rounded-lg transition ${subTab === "teamTransfers" ? "bg-red-655 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          📊 نقل و انتقالات (تیم‌محور)
        </button>
        <button
          onClick={() => { setSubTab("legionnaires"); setShowForm(null); }}
          className={`px-4 py-2 font-bold rounded-lg transition ${subTab === "legionnaires" ? "bg-red-655 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          🌍 مدیریت لژیونرها
        </button>
        <button
          onClick={() => { setSubTab("gallery"); setShowForm(null); }}
          className={`px-4 py-2 font-bold rounded-lg transition ${subTab === "gallery" ? "bg-red-655 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          🖼️ گالری عکاسی و استوری‌ها
        </button>
        <button
          onClick={() => { setSubTab("banner"); setShowForm(null); }}
          className={`px-4 py-2 font-bold rounded-lg transition ${subTab === "banner" ? "bg-red-655 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          📢 بنرهای تجاری پورتال
        </button>
        <button
          onClick={() => { setSubTab("adSlots"); setShowForm(null); }}
          className={`px-4 py-2 font-bold rounded-lg transition ${subTab === "adSlots" ? "bg-red-655 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          🎯 جایگاه‌های تبلیغاتی ({adSlots.length})
        </button>
        <button
          onClick={() => { setSubTab("submissions"); setShowForm(null); }}
          className={`px-4 py-2 font-bold rounded-lg transition ${subTab === "submissions" ? "bg-red-655 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          ✉️ پیام‌های تماس ({submissions.length})
        </button>
      </div>

      {/* SUB-TAB 1: NEWS */}
      {subTab === "news" && (
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
      {subTab === "transfers" && (
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
      {subTab === "teamTransfers" && (
        <div className="bg-[#0b0b0f] border border-white/5 p-5 rounded-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h3 className="font-extrabold text-sm text-white">ترانسفر مارکت و نقل و انتقالات (تیم‌محور)</h3>
            <button
              onClick={() => {
                setEditingId(null);
                setTeamTrName("");
                setTeamTrLogo("⚽");
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

              {/* PROBABLES SECTION */}
              <div className="border-t border-white/5 pt-3">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-bold text-slate-400">❓ احتمالی و شایعات (بازیکنان احتمالی تیم {teamTrName || ""})</h4>
                  <button
                    type="button"
                    onClick={addProbablePlayer}
                    className="px-2 py-1 bg-white/10 hover:bg-white/20 text-slate-350 text-[10px] font-bold rounded-lg cursor-pointer"
                  >
                    + افزودن بازیکن احتمالی
                  </button>
                </div>

                {teamTrProbables.length === 0 ? (
                  <p className="text-[10px] text-gray-500">لیست بازیکنان احتمالی خالی است.</p>
                ) : (
                  <div className="space-y-2">
                    {teamTrProbables.map((p) => (
                      <div key={p.id} className="grid gap-2 md:grid-cols-4 p-2 bg-black/40 rounded border border-white/5 relative items-center">
                        <div>
                          <label className="block text-[8px] text-slate-500 mb-0.5">نام بازیکن</label>
                          <input
                            type="text"
                            value={p.playerName}
                            onChange={e => updateProbablePlayer(p.id, "playerName", e.target.value)}
                            required
                            placeholder="مثلا علیرضا بیرانوند"
                            className="w-full text-[10px] rounded bg-black border border-white/10 p-1 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] text-slate-500 mb-0.5">تیم فعلی / مبدا</label>
                          <input
                            type="text"
                            value={p.fromTeam || ""}
                            onChange={e => updateProbablePlayer(p.id, "fromTeam", e.target.value)}
                            placeholder="مثل پرسپولیس"
                            className="w-full text-[10px] rounded bg-black border border-white/10 p-1 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] text-slate-500 mb-0.5">تیم احتمالی مقصد</label>
                          <input
                            type="text"
                            value={p.toTeam || ""}
                            onChange={e => updateProbablePlayer(p.id, "toTeam", e.target.value)}
                            placeholder="مثل استقلال / تراکتور"
                            className="w-full text-[10px] rounded bg-black border border-white/10 p-1 text-white"
                          />
                        </div>
                        <div className="flex items-center justify-between pt-3">
                          <div className="w-full mr-2">
                            <label className="block text-[8px] text-slate-500 mb-0.5">آدرس تصویر بازیکن (اختیاری)</label>
                            <input
                              type="text"
                              value={p.playerImage || ""}
                              onChange={e => updateProbablePlayer(p.id, "playerImage", e.target.value)}
                              placeholder="URL عکس..."
                              className="w-[85%] text-[10px] rounded bg-black border border-white/10 p-1 text-white"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeProbablePlayer(p.id)}
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
          {teamTransfersList.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-white/5 rounded-2xl bg-black/10">
              هیچ سطر انتقال تیم‌محوری ثبت نشده است. ابتدا یک مورد تستی اضافه کنید.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 max-h-[500px] overflow-y-auto">
              {teamTransfersList.map((item: any) => (
                <div key={item.id} className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl hover:bg-white/[0.03] transition flex justify-between items-start text-xs">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.teamLogo || "⚽"}</span>
                      <span className="text-white font-extrabold text-sm">{item.teamName}</span>
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
                      <div className="text-[10px] text-slate-400 font-bold">
                        احتمالی / شایعات ({item.probables?.length || 0}):{" "}
                        <span className="text-gray-500 font-normal">
                          {item.probables?.map((p: any) => `${p.playerName} (مبدا: ${p.fromTeam || "نامشخص"} ➔ مقصد: ${p.toTeam || "نامشخص"})`).join("، ") || "خالی"}
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
      {subTab === "legionnaires" && (
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
                setLegRating("7.5");
                setLegGoals("");
                setLegAssists("");
                setLegMinutesPlayed("");
                setLegMatchStatus("۹۰ دقیقه بازی");
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

              <div className="grid gap-3 md:grid-cols-4">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">نمره این هفته (Rating)</label>
                  <input type="text" value={legRating} onChange={e => setLegRating(e.target.value)} required placeholder="مثال: ۷.۸" className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">تعداد گل زده در بازی اخیر</label>
                  <input type="number" value={legGoals} onChange={e => setLegGoals(e.target.value)} placeholder="مثال: ۱" className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">تعداد پاس گل اخیر</label>
                  <input type="number" value={legAssists} onChange={e => setLegAssists(e.target.value)} placeholder="مثال: ۰" className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1 font-bold text-gray-400">دقایق بازی در زمین</label>
                  <input type="number" value={legMinutesPlayed} onChange={e => setLegMinutesPlayed(e.target.value)} placeholder="مثال: ۹۰" className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white" />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">وضعیت حضور یا عملکرد کوتاه</label>
                  <input type="text" value={legMatchStatus} onChange={e => setLegMatchStatus(e.target.value)} required placeholder="مثال: تعویض فیکس / ۹۰ دقیقه کامل" className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">آدرس آواتار / پرتره بازیکن (Image URL)</label>
                  <input type="text" value={legImage} onChange={e => setLegImage(e.target.value)} placeholder="آدرس تصویر عکسی..." className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-grey-500 mb-1">تحلیل کامل فنی و اخبار لژیونر (برای دکمه مشاهده خبر کامل)</label>
                <textarea rows={5} value={legPerformance} onChange={e => setLegPerformance(e.target.value)} required placeholder="بنویسید عملکرد بازیکن در بازی چگونه بود، چه نمره‌ای به دست آورد، چه افتخاری آفرید و تأثیر او بر کل بازی چه بود..." className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white resize-none" />
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 mb-1">برچسب‌ها (با کاما "," جدا کنید)</label>
                <input type="text" value={legTags} onChange={e => setLegTags(e.target.value)} placeholder="لژیونرها, طارمی, اینتر میلان, لژیونر" className="w-full text-xs rounded bg-black border border-white/5 p-2 text-white" />
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
                    <span className="text-[9px] text-emerald-400 font-mono mt-0.5 inline-block">نمره: {leg.rating || leg.matchRating || "۷.۵"}</span>
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
      {subTab === "gallery" && (
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

      {/* SUB-TAB 4: AD BANNER CONFIG */}
      {subTab === "banner" && (
        <div className="bg-[#0b0b0f] border border-white/5 p-5 rounded-2xl space-y-4">
          <h3 className="font-extrabold text-sm text-white border-b border-white/5 pb-2">📢 تنظیم بنر بازرگانی بالای خط هدر سراسری</h3>
          <form onSubmit={handleSaveAdConfig} className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-bold">نام آگهی دهنده</label>
              <input type="text" value={adTitle} onChange={e => setAdTitle(e.target.value)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2.5 text-white" />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-bold">کد تبلیغاتی (Promo Tag)</label>
                <input type="text" value={adPromo} onChange={e => setAdPromo(e.target.value)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2.5 text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-bold">متن دکمه فرود</label>
                <input type="text" value={adBtnText} onChange={e => setAdBtnText(e.target.value)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2.5 text-white" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-bold">جزئیات تخفیف یا اسپانسری کلوپ</label>
              <textarea value={adDesc} onChange={e => setAdDesc(e.target.value)} rows={2} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2.5 text-white resize-none" />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-bold">لینک ارجاع بیرونی (External URL)</label>
              <input type="text" value={adLink} onChange={e => setAdLink(e.target.value)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2.5 text-white" />
            </div>

            <div>
              <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs px-5 py-2.5 rounded-lg">
                بروزرسانی نهایی و فعال‌سازی بنر تبلیغاتی
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-TAB: AD SLOTS MANAGEMENT */}
      {subTab === "adSlots" && (
        <div className="bg-[#0b0b0f] border border-white/5 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="font-extrabold text-sm text-white">🎯 جایگاه‌های تبلیغاتی ({adSlots.length})</h3>
            <button onClick={handleAddAdSlot} className="flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition">
              <Plus className="h-3 w-3" /> افزودن جایگاه جدید
            </button>
          </div>

          {adSlots.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-8 text-center">هیچ جایگاه تبلیغاتی تعریف نشده. جایگاه جدید اضافه کنید.</p>
          ) : (
            <div className="space-y-4">
              {adSlots.map((slot: any, idx: number) => {
                const views = getAdViews(slot.id);
                const now = Date.now();
                let daysLeft: number | null = null;
                if (slot.endDate) {
                  const diff = new Date(slot.endDate).getTime() - now;
                  daysLeft = Math.max(0, Math.ceil(diff / 86400000));
                }
                let daysUntilStart: number | null = null;
                if (slot.startDate) {
                  const diff = new Date(slot.startDate).getTime() - now;
                  if (diff > 0) daysUntilStart = Math.ceil(diff / 86400000);
                }
                const expired = !isWithinSchedule(slot);
                const handleCopyLink = () => {
                  const url = `${window.location.origin}?ad=${encodeURIComponent(slot.name || slot.id)}`;
                  navigator.clipboard.writeText(url);
                  alert("لینک کپی شد!");
                };
                return (
                <div key={slot.id} className={`border rounded-xl p-4 space-y-3 bg-white/[0.01] ${expired ? "border-red-500/30 opacity-60" : "border-white/5"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleUpdateAdSlot(idx, "isActive", !slot.isActive)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${slot.isActive ? "bg-emerald-500" : "bg-gray-700"}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${slot.isActive ? "translate-x-4.5" : "translate-x-0.5"}`} />
                      </button>
                      <span className={`text-xs font-bold ${slot.isActive ? "text-emerald-400" : "text-slate-500"}`}>
                        {slot.isActive ? "فعال" : "غیرفعال"}
                      </span>
                      {expired && <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">منقضی</span>}
                      {daysUntilStart !== null && <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">شروع {daysUntilStart} روز دیگر</span>}
                      {daysLeft !== null && daysLeft <= 3 && daysLeft > 0 && !expired && <span className="text-[9px] font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">{daysLeft} روز باقی‌مانده</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-slate-600 bg-white/5 px-1.5 py-0.5 rounded font-mono" title="بازدیدها">
                        👁 {views}
                      </span>
                      <button onClick={handleCopyLink} className="text-slate-500 hover:text-emerald-400 transition p-1" title="کپی لینک تبلیغاتی">
                        <Link2 className="h-3 w-3" />
                      </button>
                      <button onClick={() => handleDeleteAdSlot(idx)} className="text-red-400 hover:text-red-300 transition p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1 font-bold">نام جایگاه</label>
                      <input type="text" value={slot.name || ""} onChange={e => handleUpdateAdSlot(idx, "name", e.target.value)} placeholder="مثلاً: بنر بالای صفحه" className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white placeholder-slate-600" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1 font-bold">نوع تبلیغ</label>
                      <select value={slot.type || "text"} onChange={e => handleUpdateAdSlot(idx, "type", e.target.value)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white">
                        <option value="text">📝 متنی</option>
                        <option value="image">🖼️ تصویری</option>
                        <option value="mixed">🔀 متن + تصویر</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1 font-bold">عرض (px)</label>
                        <input type="number" value={slot.width || 728} onChange={e => handleUpdateAdSlot(idx, "width", parseInt(e.target.value) || 728)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1 font-bold">ارتفاع (px)</label>
                        <input type="number" value={slot.height || 90} onChange={e => handleUpdateAdSlot(idx, "height", parseInt(e.target.value) || 90)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white" />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1 font-bold">اولویت (بزرگتر = بالاتر)</label>
                      <input type="number" value={slot.priority ?? 0} onChange={e => handleUpdateAdSlot(idx, "priority", parseInt(e.target.value) || 0)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1 font-bold">تاریخ شروع (اختیاری)</label>
                      <input type="date" value={slot.startDate || ""} onChange={e => handleUpdateAdSlot(idx, "startDate", e.target.value)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1 font-bold">تاریخ پایان (اختیاری)</label>
                      <input type="date" value={slot.endDate || ""} onChange={e => handleUpdateAdSlot(idx, "endDate", e.target.value)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white" />
                    </div>
                  </div>
                  {slot.startDate && new Date(slot.endDate || "2099-01-01").getTime() < Date.now() && (
                    <p className="text-[10px] text-red-400 font-bold flex items-center gap-1">
                      ⚠️ این تبلیغ منقضی شده و در سایت نمایش داده نمی‌شود
                    </p>
                  )}
                  {slot.startDate && new Date(slot.startDate).getTime() > Date.now() && (
                    <p className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                      ⏳ این تبلیغ هنوز شروع نشده
                    </p>
                  )}

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1 font-bold">عنوان آگهی</label>
                      <input type="text" value={slot.adTitle || ""} onChange={e => handleUpdateAdSlot(idx, "adTitle", e.target.value)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1 font-bold">کد تخفیف</label>
                      <input type="text" value={slot.adPromo || ""} onChange={e => handleUpdateAdSlot(idx, "adPromo", e.target.value)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 font-bold">توضیحات</label>
                    <input type="text" value={slot.adDesc || ""} onChange={e => handleUpdateAdSlot(idx, "adDesc", e.target.value)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white" />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1 font-bold">لینک</label>
                      <input type="text" value={slot.adLink || ""} onChange={e => handleUpdateAdSlot(idx, "adLink", e.target.value)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1 font-bold">متن دکمه</label>
                      <input type="text" value={slot.adBtnText || ""} onChange={e => handleUpdateAdSlot(idx, "adBtnText", e.target.value)} className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 font-bold">آدرس تصویر بنر (اختیاری)</label>
                    <input type="text" value={slot.customBannerUrl || ""} onChange={e => handleUpdateAdSlot(idx, "customBannerUrl", e.target.value)} placeholder="https://example.com/banner.jpg" className="w-full text-xs rounded-lg bg-black border border-white/5 p-2 text-white placeholder-slate-600" />
                    {slot.customBannerUrl && (
                      <div className="mt-2 rounded border border-white/5 overflow-hidden">
                        <img src={slot.customBannerUrl} alt="پیش‌نمایش" loading="lazy" decoding="async" className="w-full max-h-16 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    )}
                  </div>
                </div>
                );
              })}

              <button onClick={handleSaveAdConfig as any} className="bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs px-5 py-2.5 rounded-lg">
                ذخیره تمام جایگاه‌ها
              </button>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 5: CONTACTS inbox */}
      {subTab === "submissions" && (
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

import React, { useState, useEffect } from "react";
import { 
  Upload, 
  Search, 
  Trash2, 
  Copy, 
  Check, 
  Image as ImageIcon, 
  RefreshCw, 
  Database,
  ExternalLink,
  Edit2,
  FileCheck,
  ChevronRight,
  ChevronLeft,
  Tag,
  AlertTriangle,
  FileImage,
  X
} from "lucide-react";

interface MediaFile {
  id: string;
  title: string;
  file_name: string;
  file_path: string;
  image_url: string;
  file_size: number;
  mime_type: string;
  category: string;
  old_url?: string;
  created_at: string;
  updated_at: string;
}

export default function AdminMediaFiles() {
  const [mediaList, setMediaList] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  // Upload States
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("player_photo");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Edit States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");

  // Replacement States
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [replaceLoading, setReplaceLoading] = useState(false);

  // Copy States
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Migration States
  const [migrating, setMigrating] = useState(false);
  const [migrationResults, setMigrationResults] = useState<{ message: string; logs: string[] } | null>(null);
  const [showLogsModal, setShowLogsModal] = useState(false);

  // Custom Modal & Notification States
  const [deleteTarget, setDeleteTarget] = useState<MediaFile | null>(null);
  const [showMigrateConfirm, setShowMigrateConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const categories = [
    { value: "player_photo", label: "عکس بازیکنان" },
    { value: "team_logo", label: "لوگوی تیم‌ها" },
    { value: "coach_photo", label: "عکس مربیان" },
    { value: "news_image", label: "تصاویر اخبار و اسلایدر" },
    { value: "ad_banner", label: "بنرهای تبلیغاتی" },
    { value: "match_photo", label: "تصاویر مسابقات" },
    { value: "stadium_photo", label: "تصاویر ورزشگاه‌ها" },
    { value: "general", label: "سایر تصاویر عمومی" }
  ];

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const url = `/api/media?category=${categoryFilter}&q=${encodeURIComponent(searchQuery)}&page=${page}&limit=12`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setMediaList(data.data || []);
        setTotalCount(data.totalCount || 0);
      }
    } catch (err) {
      console.error("Error fetching media:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMedia();
    }, 350);
    return () => clearTimeout(timer);
  }, [page, categoryFilter, searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  // Convert file to base64
  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(",")[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    try {
      const base64Data = await toBase64(uploadFile);
      const payload = {
        title: uploadTitle || uploadFile.name,
        fileName: uploadFile.name,
        category: uploadCategory,
        fileData: base64Data
      };

      const response = await fetch("/api/media/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (data.success) {
        setUploadTitle("");
        setUploadFile(null);
        // Clear file input value
        const fileInput = document.getElementById("file-upload-input") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        
        showToast("تصویر با موفقیت آپلود و در فضای ابری ذخیره شد.", "success");
        setPage(1);
        fetchMedia();
      } else {
        showToast(data.message || "خطا در آپلود تصویر.", "error");
      }
    } catch (err) {
      console.error("Upload error:", err);
      showToast("خطا در آپلود تصویر از طریق شبکه.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = (id: string, name: string) => {
    const item = mediaList.find(m => m.id === id);
    if (item) {
      setDeleteTarget(item);
    }
  };

  const executeDeleteMedia = async (id: string) => {
    try {
      const response = await fetch(`/api/media/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (data.success) {
        showToast("تصویر با موفقیت از دیتابیس و استوریج حذف شد.", "success");
        fetchMedia();
      } else {
        showToast(data.message || "خطا در حذف تصویر.", "error");
      }
    } catch (err) {
      console.error("Delete error:", err);
      showToast("خطا در ارتباط با سرور دیتابیس.", "error");
    }
  };

  const handleEditInit = (item: MediaFile) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditCategory(item.category);
  };

  const handleEditSave = async (id: string) => {
    try {
      const response = await fetch(`/api/media/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, category: editCategory })
      });
      const data = await response.json();
      if (data.success) {
        setEditingId(null);
        showToast("تغییرات با موفقیت ذخیره شدند.", "success");
        fetchMedia();
      }
    } catch (err) {
      console.error("Save edit error:", err);
      showToast("خطا در ذخیره ویرایش تصویر.", "error");
    }
  };

  const handleReplaceImage = async (id: string, file: File) => {
    setReplacingId(id);
    setReplaceLoading(true);
    try {
      const base64Data = await toBase64(file);
      const response = await fetch(`/api/media/replace/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileData: base64Data, fileName: file.name })
      });
      const data = await response.json();
      if (data.success) {
        showToast("تصویر جدید با موفقیت جایگزین تصویر قبلی شد.", "success");
        fetchMedia();
      } else {
        showToast(data.message || "خطا در جایگزینی تصویر در استوریج.", "error");
      }
    } catch (err) {
      console.error("Replace image error:", err);
      showToast("خطا در فرآیند جایگزینی تصویر در شبکه.", "error");
    } finally {
      setReplacingId(null);
      setReplaceLoading(false);
    }
  };

  const handleMigrateAll = () => {
    setShowMigrateConfirm(true);
  };

  const executeMigration = async () => {
    setMigrating(true);
    try {
      const response = await fetch("/api/media/migrate", { method: "POST" });
      const data = await response.json();
      setMigrationResults({
        message: data.message,
        logs: data.logs || []
      });
      setShowLogsModal(true);
      fetchMedia();
    } catch (err) {
      console.error("Migration error:", err);
      showToast("خطا در انتقال خودکار تصاویر پیش‌فرض.", "error");
    } finally {
      setMigrating(false);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast("لینک یا آدرس تصویر با موفقیت در کلیپ‌بورد کپی شد.", "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const totalPages = Math.ceil(totalCount / 12);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Introduction Card */}
      <div className="p-6 bg-slate-900 border border-white/5 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 left-0 h-40 w-40 bg-red-655/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Database className="h-5 w-5 text-red-500" />
              مدیریت تصاویر و رسانه‌های ابری
            </h2>
            <p className="text-xs text-gray-400">
              با استفاده از فضای ابری Supabase Storage، تصاویر بازیکنان، لوگوی تیم‌ها و عکس خبرها را مدیریت و بارگذاری نمایید.
            </p>
          </div>
          <button
            onClick={handleMigrateAll}
            disabled={migrating}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-black rounded-xl transition shadow-lg shadow-red-950/20 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${migrating ? "animate-spin" : ""}`} />
            <span>{migrating ? "در حال مهاجرت تصاویر..." : "انتقال خودکار کلیه تصاویر خارجی دیتابیس"}</span>
          </button>
        </div>
      </div>

      {migrationResults && (
        <div className="p-4 bg-emerald-950/10 border border-emerald-800/30 rounded-2xl flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] text-emerald-400 font-bold block">مهاجرت موفق</span>
            <p className="text-xs text-slate-300 font-bold">{migrationResults.message}</p>
          </div>
          <button
            onClick={() => setShowLogsModal(true)}
            className="px-3 py-1.5 bg-emerald-800/20 hover:bg-emerald-800/30 border border-emerald-700/30 rounded-lg text-[10px] text-emerald-400 font-bold transition"
          >
            مشاهده جزییات لاگ‌ها
          </button>
        </div>
      )}

      {/* Main Grid: Upload Frame vs List File Panel */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Upload Form Box */}
        <div className="lg:col-span-4 bg-[#0b0b0f] border border-white/5 p-5 rounded-3xl h-fit">
          <h3 className="font-extrabold text-sm text-white mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
            <Upload className="h-4 w-4 text-red-500" />
            بارگذاری فایل جدید
          </h3>
          <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs text-right">
            <div>
              <label className="block text-slate-400 font-bold mb-1.5">عنوان تصویر (اختیاری)</label>
              <input
                type="text"
                value={uploadTitle}
                onChange={e => setUploadTitle(e.target.value)}
                placeholder="عنوان مثل: عکس رونالدو"
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-655"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1.5">دسته‌بندی مربوطه</label>
              <select
                value={uploadCategory}
                onChange={e => setUploadCategory(e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-655"
              >
                {categories.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1.5">انتخاب فایل از هارد</label>
              <div className="border border-dashed border-white/10 hover:border-red-500/30 rounded-xl p-4 text-center cursor-pointer relative bg-slate-950/40">
                <input
                  id="file-upload-input"
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <FileImage className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                <p className="text-[11px] text-gray-400">
                  {uploadFile ? (
                    <span className="text-emerald-400 font-bold">{uploadFile.name}</span>
                  ) : (
                    "فایل را به اینجا بکشید یا کلیک کنید"
                  )}
                </p>
                <p className="text-[9px] text-slate-500 mt-1">پسوندهای مجاز: WebP ,PNG ,JPEG ,SVG</p>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={uploading || !uploadFile}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs py-3 rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-lg shadow-red-950/20"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>{uploading ? "در حال آپلود..." : "شروع بارگذاری ابری"}</span>
            </button>
          </form>
        </div>

        {/* Media List Panel */}
        <div className="lg:col-span-8 space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col gap-3 bg-[#0b0b0f] p-4 rounded-3xl border border-white/5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => { setCategoryFilter("all"); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${categoryFilter === "all" ? "bg-red-655 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}
              >
                همه دسته‌ها
              </button>
              {categories.map(c => (
                <button
                  key={c.value}
                  onClick={() => { setCategoryFilter(c.value); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${categoryFilter === c.value ? "bg-red-655 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-red-500" />
              <input
                type="text"
                placeholder="جستجوی عنوان تصویر یا نام فایل..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full bg-slate-950 border border-white/5 rounded-xl py-2.5 pr-11 pl-10 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-red-655 focus:ring-1 focus:ring-red-655/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(""); setPage(1); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400 transition cursor-pointer"
                  title="پاک کردن جستجو"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </form>
          </div>

          {/* Files Grid View */}
          {loading ? (
            <div className="flex items-center justify-center p-20 bg-slate-950/20 border border-white/5 rounded-3xl">
              <div className="text-center space-y-2">
                <RefreshCw className="h-8 w-8 text-red-500 animate-spin mx-auto" />
                <p className="text-xs text-slate-400">در حال دریافت فایل‌ها از هارد...</p>
              </div>
            </div>
          ) : mediaList.length === 0 ? (
            <div className="p-16 text-center bg-slate-950/20 border border-white/5 rounded-3xl">
              <ImageIcon className="h-10 w-10 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-semibold mb-1">هیچ تصویری در این تیکت بارگذاری نشده است.</p>
              <p className="text-[10px] text-slate-500">می‌توانید با استفاده از فرم بارگذاری سمبلیک یا دکمه انتقال خودکار کار را شروع کنید.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {mediaList.map((item) => (
                <div key={item.id} className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden flex flex-col justify-between group relative">
                  {/* Category Badge */}
                  <span className="absolute top-2.5 right-2.5 bg-slate-950/80 backdrop-blur-md border border-white/10 text-slate-300 text-[8px] px-2 py-0.5 rounded-full font-bold z-10">
                    {categories.find(c => c.value === item.category)?.label || item.category}
                  </span>

                  {/* Thumbnail Frame */}
                  <div className="aspect-video w-full bg-slate-950 relative overflow-hidden flex items-center justify-center border-b border-white/5">
                    <img loading="lazy" decoding="async"                       src={item.image_url}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="object-cover max-h-full max-w-full transition group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=300";
                      }}
                    />
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition">
                      <a
                        href={item.image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-xl text-white transition"
                        title="مشاهده تمام صفحه"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <button
                        onClick={() => copyToClipboard(item.id, item.image_url)}
                        className="p-2 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-xl text-white transition cursor-pointer"
                        title="کپی آدرس تصویر"
                      >
                        {copiedId === item.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-3.5 space-y-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      {editingId === item.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 rounded px-2 py-1 text-[11px] text-white"
                          />
                          <select
                            value={editCategory}
                            onChange={e => setEditCategory(e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 rounded px-2 py-1 text-[10px] text-white"
                          >
                            {categories.map(c => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-1 text-right">
                          <h4 className="font-bold text-[11.5px] text-white truncate">{item.title}</h4>
                          <span className="text-[9px] text-slate-500 block font-mono truncate">{item.file_name}</span>
                        </div>
                      )}

                      {/* File Metrics */}
                      <div className="grid grid-cols-2 gap-1 pt-2 border-t border-white/5 mt-2.5 text-[9px] text-slate-400 font-mono">
                        <div>حجم: {formatBytes(item.file_size)}</div>
                        <div className="text-left font-sans">{new Date(item.created_at).toLocaleDateString("fa-IR")}</div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/5">
                      {editingId === item.id ? (
                        <button
                          onClick={() => handleEditSave(item.id)}
                          className="col-span-2 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-[10px] font-black text-white cursor-pointer"
                        >
                          ذخیره تغییرات
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEditInit(item)}
                          className="py-1 bg-white/5 hover:bg-white/15 rounded text-[10px] font-bold text-slate-300 transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>ویرایش</span>
                        </button>
                      )}

                      {editingId === item.id ? (
                        <button
                          onClick={() => setEditingId(null)}
                          className="py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-bold text-slate-300 cursor-pointer"
                        >
                          انصراف
                        </button>
                      ) : (
                        <div className="relative col-span-2 grid grid-cols-2 gap-1">
                          {/* File Replace Button representation */}
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              disabled={replacingId === item.id}
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleReplaceImage(item.id, e.target.files[0]);
                                }
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:pointer-events-none"
                            />
                            <button className="w-full h-full py-1 bg-indigo-900/40 hover:bg-indigo-900/60 border border-indigo-800/30 rounded text-[10px] font-bold text-indigo-400 transition flex items-center justify-center gap-1 cursor-pointer">
                              {replacingId === item.id && replaceLoading ? "..." : "جایگزینی"}
                            </button>
                          </div>

                          <button
                            onClick={() => handleDeleteMedia(item.id, item.title)}
                            className="py-1 bg-red-950/40 hover:bg-red-950/60 border border-red-900/30 rounded text-[10px] font-bold text-red-400 transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>حذف</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 bg-slate-900 border border-white/5 disabled:opacity-30 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="text-xs text-slate-400">
                صفحه <span className="font-bold text-white">{page}</span> از <span className="font-bold text-white">{totalPages}</span>
              </div>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 bg-slate-900 border border-white/5 disabled:opacity-30 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3 px-5 py-3.5 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl animate-bounce">
          <div className={`p-1 rounded-lg ${toastMessage.type === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
            <FileCheck className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold text-white pr-2" dir="rtl">{toastMessage.text}</span>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 p-6 rounded-3xl" dir="rtl">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 animate-pulse" />
              <h3 className="font-black text-sm">حذف قطعی تصویر و رسانه ابری</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              آیا از حذف دائم تصویر <span className="text-white font-black">"{deleteTarget.title}"</span> و فایل متناظر آن از فضای ابری مطمئن هستید؟ این تغییر بلافاصله انجام شده و غیرقابل بازگشت خواهد بود.
            </p>
            <div className="flex items-center justify-end gap-3 font-sans">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                انصراف
              </button>
              <button
                onClick={() => {
                  const targetId = deleteTarget.id;
                  setDeleteTarget(null);
                  executeDeleteMedia(targetId);
                }}
                className="px-5 py-2 bg-red-655 hover:bg-red-700 text-white rounded-xl text-xs font-black transition cursor-pointer"
              >
                تایید و حذف قطعی
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Migrate Confirmation Modal */}
      {showMigrateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 p-6 rounded-3xl" dir="rtl">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <RefreshCw className="h-5 w-5 animate-spin text-red-500" />
              <h3 className="font-black text-sm">مهاجرت همگانی دارایی‌های تصویری</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              آیا مایلید کلیه تصاویر پیش‌فرض با منابع خارجی را دانلود کرده، به فضای ابری Supabase Storage بخش مدیریت پورتال منتقل کرده و لینک‌ها را در دیتابیس جایگزین نمایید؟
              <br />
              <span className="text-amber-500 text-[10px] font-bold mt-2 block">نکته: انجام این عملیات روی تعداد زیاد رسانه‌ها ممکن است کمی زمان ببرد.</span>
            </p>
            <div className="flex items-center justify-end gap-3 font-sans">
              <button
                onClick={() => setShowMigrateConfirm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                انصراف
              </button>
              <button
                onClick={() => {
                  setShowMigrateConfirm(false);
                  executeMigration();
                }}
                className="px-5 py-2 bg-red-655 hover:bg-red-700 text-white rounded-xl text-xs font-black transition cursor-pointer"
              >
                شروع عملیات مهاجرت ابری
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Migration logs modal */}
      {showLogsModal && migrationResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-slate-900 border border-white/10 p-6 rounded-3xl max-h-[85vh] flex flex-col justify-between" dir="rtl">
            <div className="space-y-1.5 border-b border-white/5 pb-4">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-emerald-400" />
                کارنامه مهاجرت تصاویر دیتابیس
              </h3>
              <p className="text-[11px] text-slate-300">{migrationResults.message}</p>
            </div>

            <div className="flex-1 overflow-y-auto my-4 p-4 bg-slate-950 rounded-2xl border border-white/5 text-[10px] font-mono text-slate-400 space-y-1 text-right">
              {migrationResults.logs.length === 0 ? (
                <div className="text-center py-10 text-slate-600">بدون فعالیت جدید. کلیه فایل‌ها قبلاً مهاجرت شده‌اند.</div>
              ) : (
                migrationResults.logs.map((log, idx) => (
                  <div key={idx} className="border-b border-white/5 pb-1">
                    🟢 {log}
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-end">
              <button
                onClick={() => setShowLogsModal(false)}
                className="px-6 py-2 bg-red-655 hover:bg-red-700 text-white rounded-xl text-xs font-black transition cursor-pointer"
              >
                بستن پنجره گزارش
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

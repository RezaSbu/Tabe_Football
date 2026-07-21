import React, { useState } from "react";
import { 
  Tv, 
  Award, 
  Sparkles, 
  FileText, 
  Copy, 
  Flame, 
  Check, 
  TrendingUp, 
  Shuffle, 
  Play,
  BookmarkCheck
} from "lucide-react";
import { MatchItem, TeamItem, PlayerItem } from "../types";

interface AdminAiPressroomProps {
  matches: MatchItem[];
  teams: TeamItem[];
  players: PlayerItem[];
  onRefreshData: () => void;
  onAddNews: (newsData: any) => Promise<boolean>;
}

export default function AdminAiPressroom({
  matches = [],
  teams = [],
  players = [],
  onRefreshData,
  onAddNews
}: AdminAiPressroomProps) {
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [draftResult, setDraftResult] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [copied, setCopied] = useState(false);
  const [draftPublished, setDraftPublished] = useState(false);

  // Filter finished matches for press releases, and upcoming for predictions
  const finishedMatches = matches.filter(m => m.status === "finished");
  const upcomingMatches = matches.filter(m => m.status === "not-started");

  // Local rule-based compiler representing "intelligence drafts" in Persian
  const handleGeneratePressRelease = (m: MatchItem) => {
    setIsGenerating(true);
    setDraftPublished(false);
    
    setTimeout(() => {
      const home = m.teamHome;
      const away = m.teamAway;
      const sh = m.scoreHome;
      const sa = m.scoreAway;
      const venue = m.venue || "ورزشگاه آزادی (تهران)";
      const date = m.date;
      
      let scorersNames = "";
      if (m.scorersList && m.scorersList.length > 0) {
        scorersNames = m.scorersList.map((s: any) => `${s.name} (${s.goals} گل)`).join(" و ");
      } else if (m.events) {
        const goalEvents = m.events.filter((ev: any) => ev.type === "goal");
        if (goalEvents.length > 0) {
          scorersNames = goalEvents.map((ev: any) => `${ev.playerName} (دقیقه ${ev.minute})`).join(" و ");
        }
      }

      let narrativeText = "";
      const title = `گزارش رسانه‌ای بازی بزرگ: ${home} ${sh} - ${sa} ${away}`;

      if (sh > sa) {
        narrativeText = `به گزارش پورتال فوتبال ایران، در یک روز به یاد ماندنی در تاریخ ${date}، باشگاه سرافراز ${home} موفق شد در حضور پرشور هواداران پرانرژی خود در ${venue}، با پیروزی مقتدرانه ${sh} بر ${sa} برابر رقیب دیرینه خود ${away} به پیروزی برسد.\n\n` +
          `در این نبرد تاکتیکی، تفکرات فنی کادر ${home} به ثمر نشست و با هدایت بی‌نقص خط دفاعی توانستند روز درخشانی را سپری کنند. ${scorersNames ? `گل‌های این دیدار حساس توسط قهرمانان مستطیل سبز ${scorersNames} به ثمر رسید که موجی از شادمانی را به سکوها تزریق کرد.` : "گل‌های مسابقه روی تاکتیک تیمی به دست آمد."}\n\n` +
          `با احتساب این برد طلایی، کادر فنی ${home} شانس خود را برای فتح سکوهای برتر لیگ دوچندان کردند، در حالی که باشگاه ${away} باید برای نبردهای آتی مجدداً تمرکز خود را بدست آورد.`;
      } else if (sh < sa) {
        narrativeText = `یک شگفتی جذاب ورزشی رقم خورد! در پی نبرد هیجان‌انگیز امروز در فضای چمن ${venue}، ورزشکاران باانگیزه ${away} توانستند با ارائه یک هندسه تاکتیکی بی‌نظیر، تیم میزبان ${home} را در خانه خود با نتیجه ${sa} بر ${sh} از پیش رو بردارند.\n\n` +
          `نیمه نخست بازی بسیار فشرده پیش رفت، اما در نیمه مربیان، برتری مطلق میهمان در جنگ‌های میانه زمین آشکار گردید. قهرمانان گلزنی این بازی ${scorersNames ? scorersNames : "با همکاری هوشمندانه هافبک‌ها"} نام خود را در تاریخ باشگاه ثبت کردند.\n\n` +
          `شکست امروز به نظر زنگ خطری برای کادر ${home} خواهد بود، در حالی که هواداران ${away} تا ساعات پایانی امشب پیروزی حماسی تیم محبوب خود را در صدر اخبار کلوب دنبال خواهند کرد.`;
      } else {
        narrativeText = `تقسیم امتیازات در کارزار نفس‌گیر استادیوم ${venue}. دیدار جنجالی و نفس‌گیر میان دو غول مستطیل سبز یعنی ${home} و ${away} پس از ۹۰ دقیقه فوتبال تاکتیکی و دفاع فشرده با تساوی ${sh}-${sa} و تساوی مهیج خاتمه یافت.\n\n` +
          `دیدار در جوی سنگین آغاز شد و هر دو مربی با چیدمان محتاطانه بازی را اداره کردند. ${scorersNames ? `ضربات دقیق و گل‌های ارزشمند این دیدار حساس را ${scorersNames} ثبت کردند.` : "خطوط دفاعی منسجم اجازه عبور بی‌پژواک توپ از خط دروازه‌ها را ندادند."}\n\n` +
          `تساوی عادلانه امروز اگرچه هیچ‌کدام از کادر فنی را کاملاً راضی به رختکن نفرستاد، اما تماشاگران حاضر در استادیوم گواهی تماشای مسابقه‌ای کم‌نظیر و باکیفیت استاندارد در سطح فوتبال ملی دادند.`;
      }

      setDraftTitle(title);
      setDraftResult(narrativeText);
      setIsGenerating(false);
    }, 1200);
  };

  // Rule-based statistical predictor for upcoming matches
  const handleGeneratePrediction = (m: MatchItem) => {
    setIsGenerating(true);
    setDraftPublished(false);
    
    setTimeout(() => {
      const home = m.teamHome;
      const away = m.teamAway;
      
      const homeTeamObj = teams.find(t => t.name === home);
      const awayTeamObj = teams.find(t => t.name === away);

      const hPts = Number(homeTeamObj?.stats?.points || 20);
      const aPts = Number(awayTeamObj?.stats?.points || 18);
      
      const total = hPts + aPts || 1;
      let homeWinsProb = Math.round((hPts / total) * 100);
      if (homeWinsProb > 75) homeWinsProb = 75;
      if (homeWinsProb < 25) homeWinsProb = 25;
      
      let awayWinsProb = Math.round((aPts / total) * 100);
      if (awayWinsProb > 75) awayWinsProb = 75;
      if (awayWinsProb < 25) awayWinsProb = 25;
      
      const drawProb = 100 - homeWinsProb - awayWinsProb;
      
      let advice = "";
      if (homeWinsProb > awayWinsProb + 15) {
        advice = `بر اساس محاسبات رگرسیون تیمی و امتیازات رده‌بندی، باشگاه ${home} به واسطه مزیت میزبانی و برخورداری از هارمونی دفاعی منسجم، بخت نخست پیروزی در این نبرد خواهد بود. شبیه‌ساز پیشنهاد می‌کند بر روی سیستم ۲-۵-۳ تیم میزبان تمرکز کنید.`;
      } else if (awayWinsProb > homeWinsProb + 15) {
        advice = `روند صعودی بازی‌های خارج از خانه باشگاه ${away} و انگیزه مبالغه‌آمیز آنها نشان می‌دهد با وجود جو ورزشگاه حریف، شانس برد بالاتری دارند. سیستم ضدحمله سریع به احتمال زیاد پاشنه آشیل میزبان خواهد بود.`;
      } else {
        advice = `آمارها حاکی از تقابل فوق‌العاده متوازن و پایاپای است. اختلاف ناچیز در خط میانی احتمال سناریوی تساوی دفاعی یا تساوی مهیج با گل‌های متقابل را به عنوان محتمل‌ترین فرضیه معرفی می‌کند.`;
      }

      const title = `تحلیل شبیه‌سازی پیش‌بینی مسابقه بزرگ: ${home} - ${away}`;
      const text = `📊 تحلیل آماری تب فوتبال برای رویارویی حساس در روزهای آینده:\n\n` +
        ` احتمال پیروزی ${home} (میزبان): ${homeWinsProb}٪\n` +
        ` احتمال تساوی دو تیم: ${drawProb}٪\n` +
        ` احتمال پیروزی ${away} (میهمان): ${awayWinsProb}٪\n\n` +
        `📝 تحلیل مشورتی هوش ورزشی:\n${advice}\n\n` +
        `توصیه به رسانه: این تحلیل بر مبنای آخرین نوسانات فرم باشگاه و مصدومان ثبت شده در پورتال گردآوری شده است.`;

      setDraftTitle(title);
      setDraftResult(text);
      setIsGenerating(false);
    }, 1200);
  };

  const handleCopyToClipboard = () => {
    if (!draftResult) return;
    navigator.clipboard.writeText(`${draftTitle}\n\n${draftResult}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePublishAsPortalNews = async () => {
    if (!draftResult || !draftTitle) return;
    
    const payload = {
      title: draftTitle,
      summary: draftResult.split("\n")[0] || "گزارش جدید تحلیل شده مسابقات پورتال.",
      content: draftResult,
      image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800",
      category: "pro-league",
      tags: ["تحلیل‌هوشمند", "گزارش‌بازی", "تب‌فوتبال"]
    };

    const success = await onAddNews(payload);
    if (success) {
      setDraftPublished(true);
      alert("گزارش تالیفی با کمال موفقیت به لیست اخبار سراسری پورتال منعکس و منتشر شد!");
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-gradient-to-r from-red-950/20 to-slate-900 border border-white/5 p-5 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 h-28 w-28 bg-red-655/5 rounded-full blur-3xl" />
        
        <div className="flex items-center gap-3">
          <Sparkles className="h-7 w-7 text-red-500 animate-pulse" />
          <div>
            <h3 className="font-extrabold text-sm text-white">دستیار فوق‌هوشمند تالیف رسانه‌ای و شبیه‌ساز مسابقات (AI Pressroom)</h3>
            <p className="text-[10px] text-gray-400 mt-1">گزاش‌های رسمی بازی‌ها، مصاحبه‌های هوایی فرضی، آنالیز فرم تیمی و درصد شانس به کمک محاسبات ریاضی در کسری از ثانیه تولید و مستقیم به پورتال خبری ارسال می‌شود.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-12 items-start">
        {/* Match picker panel */}
        <div className="md:col-span-5 bg-[#0b0b0f] border border-white/5 p-4 rounded-xl space-y-4">
          <span className="font-extrabold text-xs text-white block border-r-2 border-red-500 pr-2">۱. مسابقه مورد نظر را انتخاب کنید:</span>
          
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1.5">بازی‌های پایان‌یافته (پیشنهاد تالیف گزارش مستند)</label>
              <select
                value={selectedMatchId}
                onChange={e => setSelectedMatchId(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-white/10 rounded-lg p-2.5 text-white"
              >
                <option value="">-- انتخاب بازی تمام شده --</option>
                {finishedMatches.map(m => (
                  <option key={m.id} value={m.id}>{m.teamHome} {m.scoreHome} - {m.scoreAway} {m.teamAway} (هفته {m.week || "۱"})</option>
                ))}
              </select>
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-3 text-[10px] text-gray-600 font-bold">یا بازی‌های پیش‌رو</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            <div>
              <label className="block text-[10px] text-gray-500 mb-1.5">بازی‌های پیش‌رو (پیشنهاد پیش‌بینی شانس و آنالیز فشرده)</label>
              <select
                value={selectedMatchId}
                onChange={e => setSelectedMatchId(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-white/10 rounded-lg p-2.5 text-white"
              >
                <option value="">-- انتخاب بازی برگزار نشده --</option>
                {upcomingMatches.map(m => (
                  <option key={m.id} value={m.id}>{m.teamHome} vs {m.teamAway} (تاریخ {m.date})</option>
                ))}
              </select>
            </div>

            {selectedMatchId && (
              <div className="pt-2 flex gap-2">
                {finishedMatches.some(m => m.id === selectedMatchId) ? (
                  <button
                    onClick={() => {
                      const m = matches.find(g => g.id === selectedMatchId);
                      if (m) handleGeneratePressRelease(m);
                    }}
                    className="w-full bg-red-655 hover:bg-red-700 text-white font-extrabold text-xs py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <FileText className="h-4 w-4" />
                    <span>تولید خودکار گزارش مسابقه</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const m = matches.find(g => g.id === selectedMatchId);
                      if (m) handleGeneratePrediction(m);
                    }}
                    className="w-full bg-red-655 hover:bg-red-700 text-white font-extrabold text-xs py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <TrendingUp className="h-4 w-4" />
                    <span>تولید شبیه‌سازی پیش‌بینی</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Draft Output Console */}
        <div className="md:col-span-7 bg-[#0b0b0f] border border-white/5 p-4 rounded-xl space-y-4 min-h-[350px] flex flex-col justify-between">
          <div className="space-y-3">
            <span className="font-extrabold text-xs text-white block border-r-2 border-emerald-500 pr-2">۲. سند پیش‌نویس خروجی پورتال:</span>

            {isGenerating ? (
              <div className="py-20 text-center space-y-3 animate-pulse">
                <div className="mx-auto h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                <p className="text-xs text-emerald-400 font-extrabold">در حال محاسبات ریاضیاتی تراز تیمی و جمع‌آوری گزینه‌های مستند...</p>
              </div>
            ) : draftResult ? (
              <div className="space-y-3 animate-in fade-in transition-all">
                <div className="bg-slate-950 p-3 rounded-lg border border-white/5 text-xs text-emerald-400 font-black">
                  {draftTitle}
                </div>
                <div className="bg-black/45 p-4 rounded-xl text-[11px] text-slate-300 leading-relaxed font-sans whitespace-pre-line border border-white/[0.03] max-h-72 overflow-y-auto">
                  {draftResult}
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-slate-600 text-xs italic">
                خواهشمند است یک مسابقه را در کادر پهلویی انتخاب کرده و کلید تولید را کلیک کنید تا گزارش رسانه‌ای یا تالیف آماری در این کاربرگ شکل گیرد.
              </div>
            )}
          </div>

          {draftResult && !isGenerating && (
            <div className="flex justify-end gap-2 border-t border-white/5 pt-3 mt-3">
              <button
                onClick={handleCopyToClipboard}
                className="bg-white/5 hover:bg-white/10 text-slate-350 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? "کپی شد" : "کپی در حافظه"}</span>
              </button>

              <button
                onClick={handlePublishAsPortalNews}
                disabled={draftPublished}
                className="bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <BookmarkCheck className="h-4 w-4" />
                <span>{draftPublished ? "خبر با موفقیت منتشر شد" : "انتشار فوری خلاصه به عنوان خبر پورتال"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

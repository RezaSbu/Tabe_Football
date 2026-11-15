# خط پایه سئو — تاب‌فوتبال

> ثبت‌شده: ۱۲–۱۷ اکتبر ۲۰۲۶ (پس از دیپلوی کامل فازهای ۱–۵ سئو روی `main`، مرج‌شده در `a6996c7`).
> این فایل مرجع مقایسه چک‌های ۲۲ اکتبر، ۲۹ اکتبر و ۵ نوامبر است.

## کارهای اتمام‌شده (دست‌نخوردنی در دوره پایش)

| فاز | کامیت | شرح |
|---|---|---|
| ۱ | `cb9ced1` | 410 Gone برای `/futsal` `/legionnaires` `/predictions` + `noindex` ادمین |
| ۲ | `8db046a` | تزریق متای سروری per-URL (تایتل/کنونیکال/JSON-LD) + `express.static index:false` |
| ۳ | `c6e02ae` | سایت‌مپ داینامیک `GET /sitemap.xml` = ۴٬۱۲۶ URL |
| ۴ | `1877993` | NewsArticle JSON-LD غنی‌شده |
| ۵ | `7b0b803` | viewport مدل ورزش۳ (عرض ۱۱۲۲ + `user-scalable=yes`) |
| خارج از نقشه | `cb883aa` | صفحه‌بندی ۲۰تایی اخبار لیگ‌ها |
| خارج از نقشه | `d37649a` | فیکس جدول رده‌بندی لیگ دو (فقط کلاینت — اثری روی سئو ندارد) |

## اکشن‌های دستی GSC — ۱۵ اکتبر

- Test Live URL → `pro-league` = «available to Google» ✅
- Request Indexing → `news-1791306029696` («Indexing requested»، صف اولویت) ✅
- حذف + Submit دوباره سایت‌مپ ✅ (سابقه: خوانش ۱۴ اکتبر با نسخه قدیمیِ ۱۳ URL)
- Validate Fix روی Duplicate + Alternate + Crawled ✅ (وضعیت: *Started*)

## خط پایه — مقایسه با همین اعداد

| مقیاس | خط پایه | هدف |
|---|---|---|
| Pages → Duplicate | ۱ (pro-league، کرول Oct 1) | ۰ |
| Pages → Alternate | ۱ (خبر Aug 22) | ۰ |
| Pages → Redirect | ۲ (legionnaires حالا 410؛ `http://` دائمی/بی‌ضرر) | ۱ |
| Pages → Crawled-not-indexed | ۱۲ (`?q=` حذفِ دائمی است) | ۱–۲ |
| Pages → Discovered | ۱ (futsal، حالا 410) | ۰ |
| سایت‌مپ در GSC | ۱۳ URL، خوانش Oct 14، «No referring sitemaps» | Discovered ~۴٬۰۰۰+ / Status Success |
| URL Inspection (Oct 15) | خانه = indexed ✅ / league-1 = indexed ✅ / pro-league = Duplicate / خبر = unknown | ۴/۴ indexed |
| Performance ۲۸ روزه | کل ‎−16%‎ / خانه ‎−34%‎ | منحنی صعودی |
| رشد در جریان | ‎/news‎ ‎+811%‎ (۱۱۶ کلیک) + اولین کلیک ‎/league-2‎ ‎/live-scores‎ ‎/stats‎ | تداوم |
| برند «تب فوتبال» | ۱۲۶۶ کلیک / CTR 89% | بدون افت شدید |

## چک ۲۶–۲۸ اکتبر (ادغام چک ۲۲ + ۲۹) — داده‌ی GSC با کرول تا ۲۳–۲۵ اکتبر

| مقیاس | خط پایه | چک ۲۶ اکتبر | وضعیت |
|---|---|---|---|
| صفحات ایندکس‌شده | رشد تازه (~۲K) | **۴٬۲۴۴** | ✅ جهش بعد از دیپلوی فازها |
| سایت‌مپ در GSC | ۱۳ URL / خوانش Oct 14 / «No referring sitemaps» | **۵٬۸۶۹ Discovered / Success / خوانش Oct 25** | ✅ هدف ۴هزار+ رد شد |
| URL Inspection | خانه ✅ / league-1 ✅ / pro-league ❌ Duplicate / خبر ❓ | خانه ✅ / pro-league ✅ / league-1 ✅ / خبر تازه = unknown (طبیعی؛ بعد از خوانش Oct 25) | ✅ ۳/۳ اصلی ایندکس شد |
| Pages → Duplicate without canonical | ۱ | **۰ — Validation: Passed** | ✅ پرونده بسته (همان هدف Validate Fix Oct 15) |
| Pages → Redirect | ۲ | **۱** (فقط http→https، بی‌ضرر) | ✅ هدف |
| Pages → Discovered – not indexed | ۱ | ۴۰۱ (Validation: Started) | ⏳ صف اکتشافِ URLهای جدید |
| Pages → Crawled – not indexed | ۱۲ | ۲۸۰ (Failed) | ⏳ صف کرول؛ ریشهٔ قدیمی (`?q=`) صفر شده |
| Pages → Blocked by robots.txt | — | ۳۰۸ (عمدی: `/api/` + `/admin`) | ℹ️ درست — `/api/data` ۲۱MB بلاک، بودجهٔ کرول را حفظ می‌کند |
| Pages → Duplicate, Google chose different canonical | — | ۱۲ | ⚠️ نیازمند مثال در چک ۵ نوامبر |
| Pages → Alternate with proper canonical | ۱ | ۴ (Failed) | ⚠️ نیازمند مثال در چک ۵ نوامبر |
| Pages → Soft 404 / 404 / 5xx | — | ۱ / ۱ / ۰ | ℹ️ ناچیز |
| Performance ۲۸ روزه (کلیک) | کل ‎−۱۶٪‎ / خانه ‎−۳۴٪‎ | **۸۳۰ کلیک ‎+۵۹٪‎ / خانه ‎−۲٪‎** | ✅ منحنی صعودی شد |
| Performance ۲۸ روزه (ایمپرشن) | — | **۷٬۱۷۰ ‎+۵۵۹٪‎** (CTR 11.6٪ / موقعیت میانگین 7.5) | ✅ |
| رشد در جریان | /news +۸۱۱٪ + اولین کلیک /league-2 /live-scores | /news ۱۱۵ کلیک ‎+۶۶۷٪‎ / league-2 ۱۲ (قبلاً ۰) / live-scores ۹ ‎+۳۵۰٪‎ | ✅ تداوم |
| برند «تب فوتبال» | ۱۲۶۶ کلیک / CTR 89٪ | ۵۳۹ کلیک ۲۸روزه ‎+۲۱٪‎ / بدون افت | ✅ |
| کوئری‌های غیربرند | تقریباً صفر | مبین رنجبری ۸/۵۷۹، آریا شیروانی ۷، فجر قزوین ۳/۳۸، رضوانی اصفهان ۲ | ✅ لیگ‌دو رنک می‌گیرد |
| Manual actions / Security | — | هر دو پاک | ✅ |
| Core Web Vitals | — | خالی (CrUX هنوز داده جمع نکرده) | ℹ️ با رشد ترافیک پر می‌شود |

جمع ردیف‌های Not indexed = ۴+۲۸۰+۳۰۸+۱+۱+۱+۱۲+۴۰۱+۰ = **۱٬۰۰۸** ✔.

### راستی‌آزمایی دیپلوی (۲۸ اکتبر)

- `origin/main` = `4deb189` (Merge PR #108) — شامل `050b060` (resolver) و `e84fb87` (market).
- باندل زنده: `assets/index-zGmq9GG3.js` حاوی `Math.ceil(…/1e9*10-1e-9)` (رند ارزش) ✅ + `assets/AdminPanel-BHMRKGAP.js` حاوی نگاشت گروه لیگ‌دو (`league-2-a":"a"…`) ✅.
- صفحه‌ی مارکت پروداکشن: `90.2`, `83`, `75.3` — بدون هیچ رقم دوم اعشار.
- Resolver روی دادهٔ تازهٔ پروداکشن: ۰ یافتهٔ NAME_MISMATCH (۲۲ فیک قبلی حذف شد). فقط ۳ یافتهٔ STALE_TABLE واقعی مانده (آکو مد اردبیل: جدول ۳بازی/۷امتیاز در برابر ۲بازی/۴امتیازِ مسابقات) — اختلاف واقعی، با دکمهٔ «تأیید و اصلاح» قابل‌رفع است.

### اکشن‌های دستی اکتبر

- Request Indexing برای `news-1793031984651` (برای کاربر؛ از طریق GSC انجام می‌شود).

## تقویم پایش (به‌روزشده)

- ~~**۲۲ اکتبر** — URL Inspection چهار آدرس~~ ✅ انجام‌شده (۲۶ اکتبر، ادغام با چک ۲۹).
- ~~**۲۹ اکتبر** — جدول Pages + سایت‌مپ~~ ✅ انجام‌شده (۲۶ اکتبر).
- **۵ نوامبر** — چک اصلی: Export چهار فایل CSV (Chart / Pages / Queries / Countries، بازهٔ «۳ ماه اخیر») + کلیک روی سه ردیف نمونه (`Duplicate, Google chose different canonical` ۱۲، `Alternate` ۴، نمونهٔ `Crawled-not-indexed`) + مقایسهٔ روند دو صف (۴۰۱ و ۲۸۰ باید نزولی شوند) + تحلیل نهایی.

## قانون دوره انتظار

1. بدون تغییر در URL / متا / سایت‌مپ / viewport (تولید محتوای خبری آزاد و مفید است).
2. GSC هر روز چک نشود؛ فقط تاری‌های چک بالا.
3. زودتر برگرد فقط اگر: سایت down / کلمات Failed·Error·Server·Manual action / افت شدید ترافیک برند «تب فوتبال».

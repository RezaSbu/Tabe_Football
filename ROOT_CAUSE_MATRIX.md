# ماتریس ریشه‌یابی مشکلات عملکرد

> هر ردیف: نشانه‌ی قابل‌مشاهده ← علت ریشه‌ای ← شاهد در کد/تولید ← اثر ← اصلاح ← وضعیت.
> مبنا: `main@5f7fd65` (تگ `v2.1.0`)، شاخه‌ی اصلاحات: `perf/audit-fixes`.

## ۱) ردیف‌های بحرانی (P0)

| ID | نشانه | علت ریشه‌ای | شاهد | اثر | اصلاح | وضعیت |
|---|---|---|---|---|---|---|
| RC-01 | `X-Cache-Status: MISS` روی **هر** درخواست `/api/data`، حتی چند درخواست یکسان پشت‌سرهم | اپ روی پاسخ `Cache-Control: no-cache` می‌گذارد و nginx پیش‌فرض این هدر upstream را جدی می‌گیرد؛ `proxy_cache_valid` هرگز اعمال نمی‌شد | سه `curl` متوالی: هر سه MISS؛ هدر `Cache-Control: no-cache` از `src/server/routes/system.ts:74`؛ بلوک `location = /api/data` در `nginx/prod.conf` | هر بازدید = serialize ~۲۸٫۷MB روی تنها ترد Node (۲۴۳ms در بنچمارک) + انتقال ۵٫۲MB gzip | `proxy_ignore_headers Cache-Control Expires` + `proxy_cache_background_update` + `proxy_cache_use_stale` | ✅ `202bbb0` (دیپلوی نشده) |
| RC-02 | `/assets/*.js` هم MISS بود، با اینکه اپ روی assetها هدر no-cache نمی‌گذارد | پوشه‌ی `proxy_cache_path /var/cache/nginx/tabe` برای کاربر worker (`nginx`) قابل نوشتن نبود؛ nginx بی‌صدا پاسخ را ذخیره نمی‌کرد | هر سه درخواست `index-CBC-khHf.js` → MISS؛ تعریف `proxy_cache_path` در ابتدای `nginx/prod.conf`؛ ایمیج رسمی nginx مسیر کش را با مالک root می‌سازد | هر asset (۸۷۴KB پنل، ۶۹۴KB اصلی) از Node سرو می‌شد | `command` در `docker-compose.prod.yml`: ساخت و `chown` مسیر کش پیش از اجرای nginx | ✅ `202bbb0` |
| RC-03 | ذخیره‌ی یک خبر باعث کندی کل سایت و صف‌شدن بقیه‌ی نوشتن‌ها می‌شد | `saveDB()` بی‌قید `recalculateAndSyncDatabase()` را صدا می‌زد و ۹ جدول مشتق را dirty می‌کرد — همه زیر یک `AsyncLock` سراسری | `src/server/services/database.ts` (بلاک `saveDB` حدود خط ۱۸۱۰)؛ `utils/concurrency.ts` تک‌قفل سراسری | هر ذخیره‌ی خبر/آگهی/رسانه استندینگ + آمار فصل + بازیکن/تیم/مسابقه را بازمحاسبه و بازنویسی می‌کرد | فهرست `RECALC_INPUT_TABLES` + `dirtyNeedsRecalc()` + استفاده از خروجی `changed` گذر زمانی مسابقات | ✅ `b49359e` |
| RC-04 | با رشد خبر، احتمال شکست کامل ذخیره‌ها | همه‌ی ردیف‌های یک جدول در یک `INSERT` با پارامترهای bind شده بودند؛ سقف PostgreSQL ۶۵٬۵۳۵ پارامتر است | `QueryBuilder.executeUpsert` در `src/server/db.ts`؛ اندازه‌گیری تولید: `news=5442×11=59,862` پارامتر | ~۳۰۰ خبر دیگر → `cannot insert more than 65535 parameters` روی **همه‌ی** ذخیره‌ها | chunkهای ≤۳۰٬۰۰۰ پارامتر داخل یک تراکنش (`BEGIN/COMMIT/ROLLBACK`) | ✅ `500568b` |
| RC-05 | پنل خبر هنگام باز شدن/تایپ کند و حافظه‌ی مرورگر بالا | کل `db.news` (۵٬۴۴۲ مقاله‌ی کامل) در یک grid رندر می‌شد و جستجو سمت کلاینت روی همان آرایه بود | `AdminPortalHub.tsx` قبلاً `news.map(...)`؛ بدون endpoint صفحه‌بندی برای خبر | ~۳۰هزار گره DOM، فیلتر مجدد در هر کلید، ویرایش فرم نیازمند کل آبجکت | `GET /api/admin/news` (صفحه/جستجو/سقف ۵۰) + `GET /api/admin/news/tags` + صفحه‌بندی UI | ✅ `ef63219` |
| RC-06 | بعد از هر ذخیره/حذف خبر، پنل مکث محسوس و ترافیک سنگین داشت | `onRefreshData()` کش کلاینت را invalidate و کل payload را دوباره دانلود می‌کرد | `handleSaveNews`/`handleDeleteNews` در `AdminPortalHub.tsx`؛ `adminRefreshData` در `src/hooks/useAppData.ts` | ~۲۸٫۷MB دانلود برای افزودن یک ردیف | پاسخ POST/PUT شامل `item`؛ `patchNews()` در state مشترک + refresh صفحه‌ی خبر؛ poller بعدی همگرا می‌کند | ✅ `ef63219` |

## ۲) ردیف‌های مهم (P1)

| ID | نشانه | علت ریشه‌ای | شاهد | اثر | اصلاح | وضعیت |
|---|---|---|---|---|---|---|
| RC-07 | آپلود چند تصویر، پنل و سایت را کند می‌کرد | base64 (+۳۳٪) داخل JSON، parse کامل با `express.json`، کپی دوباره به Buffer، سپس `fs.writeFileSync` | `src/server/routes/media.ts` (`fileData`)، `src/server/db.ts` (`writeFileSync`) | بدنه‌ی چند ده مگابایتی روی تنها ترد Node، بلاک کامل در طول نوشتن دیسک | `POST /api/media/upload-raw` و `replace-raw` با `express.raw` (سقف ۸MB) + `fs.promises.writeFile` + بازنویسی متوالی کلاینت | ✅ `79b1cc7` |
| RC-08 | باز کردن تب داشبورد ادمین چند ثانیه فریز می‌شد | `runSyncScanner()` داخل `useEffect` روی mount و هر تغییر داده در فاز commit اجرا می‌شد | `src/components/AdminDashboard.tsx` | اسکن کامل مسابقه×بازیکن×استندینگ قبل از paint | `requestIdleCallback` با fallback ۵۰ms؛ دکمه‌ی دستی حفظ شد | ✅ `71dc0a7` |
| RC-09 | هر بازدید HTML از Node و بدون اتصال پایدار | `location /` بدون کش، بدون `proxy_http_version 1.1` و بدون upstream keepalive؛ رندر SEO در هر درخواست | `nginx/prod.conf` (`location /`)، `src/server/index.ts` (`renderSeoPage`) | یک اتصال TCP + رندر HTML برای هر ناوبری | upstream `keepalive 32`، کش ۳۰ثانیه‌ای HTML با bypass کوکی، `Connection ""` | ✅ `933e319` |
| RC-10 | زمان‌های کندی در تولید قابل ردیابی نبود | `log_format` پیش‌فرض nginx زمان درخواست/upstream را ثبت نمی‌کرد | `nginx/prod.conf` | تشخیص کندی فقط با حدس | `log_format tabe_timed` با `$request_time`، `$upstream_connect_time/header/response` و `$upstream_cache_status` | ✅ `933e319` |
| RC-11 | هر درخواست `/api/data` کل بدنه را دوباره serialize می‌کرد حتی وقتی revision عوض نشده بود | `res.json` روی آبجکت زنده در هر درخواست | `src/server/routes/system.ts` | ۲۴۳ms CPU تکراری برای هر درخواست غیر-304 | `BulkPayloadMemo` با کلید `revision|shape` و TTL ۱۰s | ✅ `32b04fc` |
| RC-17 | حتی با کش سالم، هر **HIT** هم یک پاس gzip کامل روی ۲۸٫۷MB بود | فیلتر `gzip` در nginx روی هر پاسخِ ارسالی اجرا می‌شود، از جمله پاسخِ کش‌شده؛ کش بدنه‌ی **فشرده‌نشده** را ذخیره می‌کرد | `nginx/prod.conf` (`gzip on` سراسری)؛ بنچمارک محلی: `gzipSync` سطح ۶ = ۱٬۱۳۳ms برای همان payload؛ کانتینر nginx سقف ۰٫۵ vCPU دارد | HIT از نظر I/O ارزان بود ولی CPU لبه را به‌اندازه‌ی MISS می‌سوزاند؛ با ۰٫۵ vCPU یعنی چند ثانیه در هر درخواست | `/api/data` حالا در Node و روی threadpool یک‌بار per revision فشرده و memo می‌شود؛ nginx بایت‌های فشرده را کش می‌کند (HIT = کپی فایل)؛ `Accept-Encoding` نرمال‌سازی و variant در `proxy_cache_key` لحاظ شد | ✅ `4b12305` |

## ۳) موارد شناسایی‌شده ولی خارج از دامنه‌ی این اصلاح

| ID | موضوع | توضیح | توصیه |
|---|---|---|---|
| RC-12 | نبود APM/متریک سرور | `/api/diagnostics` وجود دارد اما فقط با توکن ادمین از داخل مرورگر قابل‌خواندن است؛ در این ممیزی دریافت نشد | یک‌بار از پنل ادمین بگیرید و در `PERFORMANCE_BENCHMARKS.md` ثبت کنید |
| RC-13 | فرض «نشتی حافظه» تأیید/رد نشد | بدون پروفایل ۲۴ساعته نمی‌توان گفت رشد RSS نشتی است یا فشار GC | اسکریپت `scripts/watch-memory.sh` اضافه شد (read-only)؛ روی VPS ۲۴ ساعت اجرا شود |
| RC-14 | سقف بادی JSON اپ ۳۰MB | با مهاجرت آپلودها به باینری، این سقف بزرگ دیگر لازم نیست و سطح حمله/حافظه را بالا می‌برد | بعد از پایدارشدن کلاینت‌ها به ۴–۸MB کاهش یابد |
| RC-15 | تست‌های منسوخ `api.test.ts` | `GET /api/standings` و `GET /api/stats` وجود ندارند؛ دو تست contact هم با rate-limit محلی 429 می‌گیرند | تست‌ها را با قرارداد فعلی هم‌راستا کنید تا رگرسیون واقعی پنهان نشود |
| RC-16 | ایندکس‌های PG | کامنت `db.ts` می‌گوید خواند‌ها از حافظه است و ایندکس اضافه عمداً ساخته نمی‌شود | دست نزنید؛ فقط اگر کوئری مستقیم جدیدی اضافه شد بازبینی شود |

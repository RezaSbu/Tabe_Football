# نقشه‌ی اجرای اصلاحات عملکرد

> شاخه: `perf/audit-fixes` (از `develop@80810fc`) · تگ آخرین نسخه‌ی سالم: `v2.1.0` روی `5f7fd65`
> قاعده: هر فاز → تغییر کوچک → `tsc --noEmit` → `vitest` → کامیت جدا. هیچ فایلی از کاربر حذف/بازنویسی نشد.
> وضعیت کلی: فازهای ۱ تا ۸ در کد **انجام شده‌اند**؛ استقرار روی تولید **انجام نشده** (بدون دسترسی SSH).

---

## فاز ۰ — Baseline سرور (مسدود)

**هدف:** ثبت CPU/RAM/ایونت‌لوپ/کوئری‌های PG و لاگ‌های Node/nginx قبل از تغییر.

**وضعیت:** ❌ انجام نشد. دلیل: این ماشین SSH/key ندارد و کاربر اجرای دستور را نپذیرفت.

**جایگزین انجام‌شده:**
- اندازه‌گیری خارجی HTTP (اندازه‌ی payload، TTFB، هدرهای کش) — در `PERFORMANCE_BENCHMARKS.md`.
- اسکریپت `scripts/watch-memory.sh` برای نمونه‌برداری ۲۴ساعته‌ی RSS/MemAvailable/swap/restart (read-only).
- `log_format tabe_timed` در nginx تا از این پس زمان هر endpoint از لبه قابل استخراج باشد.

**اقدام لازم روی سرور (یک‌بار):**
```bash
# خروجی را در PERFORMANCE_BENCHMARKS.md ثبت کنید
curl -s -H "Authorization: Bearer <ADMIN_TOKEN>" http://127.0.0.1:3000/api/diagnostics | head -c 4000
docker compose ps
free -m; uptime
```
هیچ مقدار حساسی (توکن/رمز/.env) را در گزارش نگذارید.

---

## فاز ۱ — کش لبه و serialize مکرر

| مورد | جزئیات |
|---|---|
| فایل‌ها | `nginx/prod.conf`، `docker-compose.prod.yml`، `src/server/services/bulkPayload.ts` (جدید)، `src/server/routes/system.ts`، تست `bulk-payload-memo.test.ts` |
| تغییر | `proxy_ignore_headers Cache-Control Expires` + `proxy_cache_background_update` + `proxy_cache_use_stale`؛ `chown` مسیر کش؛ memo بدنه‌ی `/api/data` بر اساس `revision|shape` |
| چرا امن است | ETag مبتنی بر revision و مسیر 304 دست‌نخورده ماند؛ هدر `Cache-Control: no-cache` همچنان به مرورگر می‌رسد؛ کش فقط در لبه و ۱۰ ثانیه است |
| تست | ۱۲ تست واحد memo (revision، lite/full، TTL، سقف حافظه، گزیپ) + `tsc` |
| کامیت | `32b04fc`، `202bbb0` |
| ریسک | اگر revision به‌درستی bump نشود، حداکثر ۱۰ ثانیه داده‌ی کهنه؛ شمارنده‌ی بازدید عمداً revision را bump نمی‌کند (مطابق طراحی فعلی) |

---

## فاز ۲ — بازمحاسبه‌ی هدفمند در `saveDB`

| مورد | جزئیات |
|---|---|
| فایل | `src/server/services/database.ts` |
| تغییر | `RECALC_INPUT_TABLES` + `dirtyNeedsRecalc()`؛ recalc فقط اگر جدول ورودی dirty باشد یا گذر زمانی مسابقات (`runDatabaseMigrationsAndTransitions().changed`) تغییر واقعی داده باشد |
| چرا امن است | recalc همان جدول‌های مشتق را dirty می‌کند؛ مسیر `skipRecalc` دست‌نخورده؛ گذر live/auto-finish پوشش داده شده |
| تست | کل `vitest` (سوئیت‌های recalc/standings)؛ ۴ شکست از قبل موجود، بدون افزایش |
| کامیت | `b49359e` |
| ریسک | اگر جدول ورودی جدیدی به فرمول آمار اضافه شود و به `RECALC_INPUT_TABLES` اضافه نشود، آمار کهنه می‌ماند → در کد کامنت هشدار گذاشته شد |

---

## فاز ۳ — حذف دانلود کامل بعد از نوشتن ادمین

| مورد | جزئیات |
|---|---|
| فایل‌ها | `src/hooks/useAppData.ts` (`patchNews`)، `src/App.tsx`، `src/components/AdminPanel.tsx`، `src/components/AdminPortalHub.tsx`، `src/server/routes/misc.ts` |
| تغییر | POST/PUT خبر ردیف ذخیره‌شده را برمی‌گرداند؛ کلاینت با `patchNews` state مشترک را وصله می‌کند؛ `onRefreshData` از مسیر ذخیره/حذف خبر حذف شد |
| چرا امن است | poller دوره‌ای (۱۰ ثانیه) و نسخه‌ی بعدی payload بقیه‌ی تفاوت‌ها را همگرا می‌کند؛ پاسخ اضافه‌ی `item` سازگار عقب‌رو است |
| تست | `tsc` + کل سوئیت؛ مسیر ۴۰۹ (conflict) هم `data.current` را وصله می‌کند |
| کامیت | بخشی از `ef63219` |
| ریسک | اگر تب دیگری از پنل به `news` وابسته باشد، تا ۱۰ ثانیه ممکن است نسخه‌ی قبل را ببیند (همان رفتار poller فعلی) |

---

## فاز ۴ — صفحه‌بندی خبر پنل

| مورد | جزئیات |
|---|---|
| فایل‌ها | `src/server/routes/adminLists.ts`، `src/components/AdminPortalHub.tsx`، تست `admin-news-list.test.ts` |
| تغییر | `GET /api/admin/news?page&limit&q&category` با مرتب‌سازی «جدیدترین اول»، جستجوی نرمال‌شده‌ی فارسی، سقف ۵۰؛ `GET /api/admin/news/tags`؛ UI جستجو + صفحه‌بندی + empty state |
| تست | ۷ تست واحد روی صفحه‌بندی/کلمپ/فیلتر دسته/نرمال‌سازی ی/ک/سقف/کورپوس خالی و جمع‌آوری برچسب‌ها |
| کامیت | `ef63219` |
| ریسک | ردیف‌ها هنوز کامل‌اند (content/read_more) تا فرم ویرایش سالم بماند؛ حجم هر صفحه ~۲۰ مقاله است |

---

## فاز ۵ — اسکن داشبورد خارج از مسیر بحرانی

| مورد | جزئیات |
|---|---|
| فایل | `src/components/AdminDashboard.tsx` |
| تغییر | `requestIdleCallback` با تایم‌اوت ۱٫۵s و fallback `setTimeout(50ms)`؛ cleanup با `cancelIdleCallback` |
| تست | `tsc` + کل سوئیت (تست UI برای این کامپوننت وجود ندارد) |
| کامیت | `71dc0a7` |
| ریسک | در مرورگرهای بدون `requestIdleCallback` (Safari قدیمی) بعد از ۵۰ms اجرا می‌شود؛ رفتار یکسان با قبل اما بدون فریز اولیه |

---

## فاز ۶ — آپلود تصویر

| مورد | جزئیات |
|---|---|
| فایل‌ها | `src/server/routes/media.ts`، `src/server/db.ts`، `src/components/AdminMediaFiles.tsx`، تست `media-raw-upload.test.ts` |
| تغییر | خط لوله‌ی مشترک validate→optimize→store برای JSON/باینری/بچ؛ `POST /api/media/upload-raw` و `replace-raw`؛ `fs.promises.writeFile/unlink/mkdir`؛ ارسال متوالی Fileها با پیش‌بررسی ۸MB و سقف ۲۰ فایل |
| چرا امن است | همان اعتبارسنجی magic-byte/پسوند، همان مسیر ذخیره و همان شکل پاسخ؛ مسیرهای JSON قدیمی برای سازگاری باقی ماندند |
| تست | ۵ تست واحد: ذخیره‌ی واقعی روی دیسک، مغایرت magic-byte، پسوند غیرمجاز، سقف ۸MB، پاک‌سازی مسیر دسته (`../../etc`) |
| کامیت | `79b1cc7` |
| ریسک | بدنه‌ی باینری باید توسط پروکسی‌های میانی دست‌نخورده عبور کند (nginx فقط proxy می‌کند)؛ `client_max_body_size 30m` موجود کافی است |

---

## فاز ۷ — لبه: keepalive، HTML، لاگ

| مورد | جزئیات |
|---|---|
| فایل | `nginx/prod.conf` |
| تغییر | `upstream app_upstream { keepalive 32 }` + `Connection ""`؛ کش ۳۰ثانیه‌ای `location /` با bypass کوکی/Authorization؛ `log_format tabe_timed` و `access_log` |
| چرا امن است | HTML لاگین‌شده با کوکی هرگز کش نمی‌شود؛ هدرهای امنیتی در location تکراری شده‌اند؛ `/api/`، `/uploads/`، `/assets/` و `/fonts/` مسیرهای جدا دارند |
| تست | `nginx -t` روی همان فایل در یک کانتینر موقت با گواهی خودامضا: *test is successful*؛ به‌علاوه یک هارنس کش (upstream ساختگی) که در آن `/api/data` و `/assets/` واقعاً `MISS → HIT` شدند |
| کامیت | `933e319` |
| ریسک | اگر کوکی ادمین در مرورگری حذف/مسدود شود، می‌تواند پاسخ عمومی کش‌شده ببیند (همان رفتار سایت عمومی)؛ کش ۳۰ثانیه‌ای کوتاه است |

---

## فاز ۸ — پایش ۲۴ ساعته‌ی حافظه

| مورد | جزئیات |
|---|---|
| فایل | `scripts/watch-memory.sh` (جدید، read-only) |
| تغییر | نمونه‌برداری هر ۶۰ ثانیه از `docker stats` (RSS)، `MemAvailable`، swap و `RestartCount`؛ خلاصه‌ی اول/آخر و دلتا در لاگ |
| اجرا | `chmod +x scripts/watch-memory.sh && nohup scripts/watch-memory.sh >/dev/null 2>&1 &` سپس `tail /var/log/tabe-memory-watch.log` |
| وضعیت | اسکریپت آماده است؛ **اجرا نشده** (نیازمند VPS) |
| تفسیر | شیب خطی RSS برای ۶+ ساعت = نشتی؛ دندانه‌اره‌ی ثابت حول baseline = GC/بار عادی؛ `RestartCount` صعودی = OOM kill |

---

## فاز ۹ (افزوده) — chunk کردن upsert

| مورد | جزئیات |
|---|---|
| فایل‌ها | `src/server/db.ts`، تست `upsert-chunking.test.ts` |
| تغییر | `upsertRowsPerChunk()` با سقف ۳۰٬۰۰۰ پارامتر؛ chunkها داخل یک تراکنش |
| تست | ۲ تست: شکل واقعی خبر (۵۴۴۲×۱۱) و جدول‌های بسیار عریض |
| کامیت | `500568b` |
| ریسک | تراکنش طولانی‌تر برای جدول‌های بزرگ؛ عملاً همان بار قبلی است اما چند statement |

---

## فاز ۱۰ (افزوده) — فشرده‌سازی یک‌باره‌ی `/api/data`

| مورد | جزئیات |
|---|---|
| فایل‌ها | `src/server/services/bulkPayload.ts`، `src/server/routes/system.ts`، `nginx/prod.conf`، تست `bulk-payload-memo.test.ts` |
| چرا | کش لبه بدنه‌ی **فشرده‌نشده** را ذخیره می‌کند و `gzip` nginx روی هر ارسال (حتی HIT) اجرا می‌شود؛ یعنی HIT هم ۲۸٫۷MB را روی کانتینر ۰٫۵ vCPU فشرده می‌کرد |
| تغییر | `getGzipped()` با `zlib.gzip` روی threadpool + dedupe درخواست‌های هم‌زمان؛ nginx فقط `Accept-Encoding: ""` یا `gzip` می‌فرستد و variant در `proxy_cache_key` است |
| چرا امن است | `Vary: Accept-Encoding` و ETag ضعیف دست‌نخورده؛ کلاینتی که gzip نمی‌خواهد مسیر identity می‌گیرد؛ کد `gzip;q=0` رعایت می‌شود |
| تست | ۶ تست واحد + ۵ تست HTTP روی مسیر واقعی (گزیپ/identity/`q=0`/lite/304) |
| کامیت | `4b12305` |
| ریسک | افزایش موقت حافظه (~۵MB بافر gzip برای full) در برابر کاهش شدید CPU لبه؛ سقف memo از ۴ به ۲ کاهش یافت تا خالص حافظه کمتر شود |

---

## چک‌لیست استقرار (بعد از تأیید)

```bash
cd /opt/tabe-football
bash scripts/backup.sh
git fetch origin
git checkout perf/audit-fixes && git pull --ff-only
# یا merge به main و استقرار معمول CD

docker compose -f docker-compose.yml -f docker-compose.prod.yml build app
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate app nginx
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T nginx nginx -t
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T nginx ls -ld /var/cache/nginx/tabe
```

**تأیید بعد از استقرار:**
```bash
# باید بعد از درخواست دوم HIT شود
curl -sI https://tabefotbal.ir/api/data?lite=1 | grep -i x-cache-status
curl -sI https://tabefotbal.ir/assets/<hash>.js | grep -i x-cache-status
# زمان‌ها در لاگ لبه
docker compose exec -T nginx tail -n 50 /var/log/nginx/access.log
```

**بازگشت (rollback):** `git revert` روی کامیت‌های همان فاز + `up -d --force-recreate app nginx`. تغییر داده‌ای در schema رخ نداده؛ نیازی به rollback دیتابیس نیست (بکاپ پیش از استقرار طبق روال).

---

## دروازه‌ی تصمیم ارتقای VPS

ارتقا **فقط** اگر پس از استقرار فازهای ۱–۳ یکی از این‌ها دیده شد:
- `p95` ذخیره‌ی خبر با یک ادمین > ۲ ثانیه
- `MemAvailable` < ۵۰۰MB همراه با swap thrash
- CPU steal > ۵٪
- رشد پیوسته و خطی RSS (نشتی)

در غیر این صورت، قدم‌های کم‌هزینه‌ی بعدی: سقف حافظه‌ی اپ ۵۱۲MB→۱GB و swap ۱۲۸MB→۲GB.

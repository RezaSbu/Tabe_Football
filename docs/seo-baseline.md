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

## تقویم پایش

- **۲۲ اکتبر** — URL Inspection چهار آدرس (خانه، pro-league، league-1، خبر).
- **۲۹ اکتبر** — جدول Pages + سایت‌مپ (Discovered چند هزار شده؟)
- **۵ نوامبر** — چک اصلی + Export چهار فایل CSV (Chart / Pages / Queries؛ تنظیم «۳ ماه اخیر» مثل بار قبل) + تحلیل نهایی.

## قانون دوره انتظار

1. بدون تغییر در URL / متا / سایت‌مپ / viewport (تولید محتوای خبری آزاد و مفید است).
2. GSC هر روز چک نشود؛ فقط تاری‌های چک بالا.
3. زودتر برگرد فقط اگر: سایت down / کلمات Failed·Error·Server·Manual action / افت شدید ترافیک برند «تب فوتبال».

# تب فوتبال — پورتال ورزشی فوتبال ایران

پورتال جامع فوتبال ایران با پنل مدیریت، نتایج زنده، آمار و ارقام، نقل و انتقالات، گالری تصاویر و جدول رده‌بندی لیگ‌های مختلف کشور.

## معماری

```
┌─────────────────────────────────┐
│   React + Vite (Frontend)       │  RTL, Tailwind CSS
├─────────────────────────────────┤
│   Express.js API (Backend)      │  TypeScript, 20+ route modules
├─────────────────────────────────┤
│   PostgreSQL 16 (Database)      │  Docker, 20+ tables
└─────────────────────────────────┘
```

- **فرانت‌اند:** React 19 + Vite + Tailwind CSS
- **بک‌اند:** Express.js + TypeScript
- **دیتابیس:** PostgreSQL 16
- **استقرار:** Docker Compose (App + PostgreSQL + Nginx)

## اجرای محلی

### پیش‌نیازها
- Node.js 20+
- Docker (برای PostgreSQL)

### مراحل

```bash
# 1. نصب وابستگی‌ها
npm install

# 2. ساخت فایل تنظیمات
cp .env.example .env
# مقادیر .env را ویرایش کنید

# 3. اجرای PostgreSQL
docker compose up -d postgres

# 4. اجرای سرور توسعه
npm run dev
```

سرور روی `http://localhost:3000` اجرا می‌شود.

## استقرار روی VPS

### پیش‌نیازها
- Docker و Docker Compose
- دامنه اختصاصی + DNS
- گواهی SSL (Let's Encrypt)

### مراحل

```bash
# 1. کپی پروژه به سرور
scp -r . user@your-server:/opt/tabe-football

# 2. ورود به سرور و تنظیم env
ssh user@your-server
cd /opt/tabe-football
cp .env.production .env
nano .env   # مقادیر واقعی را وارد کنید

# 3. اجرا
docker compose up -d --build

# 4. تنظیم SSL
# فایل nginx/default.conf را با گواهی SSL تنظیم کنید
# سپس:
docker compose restart nginx
```

### متغیرهای محیطی مهم در production

| متغیر | توضیح |
|--------|--------|
| `DB_PASSWORD` | رمز دیتابیس (حداقل ۱۲ کاراکتر) |
| `ADMIN_PASSWORD` | رمز پنل ادمین (حداقل ۸ کاراکتر) |
| `JWT_SECRET` | رمز توکن JWT (حداقل ۳۲ کاراکتر) |
| `CORS_ORIGIN` | دامنه سایت، مثلاً `https://your-domain.com` |

## پنل مدیریت

آدرس: `http://localhost:3000` → ورود به پنل ادمین

- **نام کاربری:** `admin`
- **رمز عبور:** از متغیر `ADMIN_PASSWORD` در فایل `.env`

### قابلیت‌ها
- مدیریت اخبار، تیم‌ها، بازیکنان، مربیان
- مدیریت مسابقات و نتایج زنده
- مدیریت نقل و انتقالات و لژیونرها
- جدول رده‌بندی و آمار گلزنان
- تیم منتخب هفته
- گالری تصاویر و رسانه‌ها
- مدیریت جام حذفی (Bracket)
- فرم تماس با ما
- لاگ سیستم و مانیتورینگ
- **۶ نوع تبلیغ:** بنر بالا، جایگاه‌های تبلیغاتی (feed/sidebar/campaign)، پاپ‌آپ، تبلیغ شناور، نوار پایین، اسلاید-این

## ساختار پروژه

```
├── src/
│   ├── server/               # بک‌اند Express
│   │   ├── index.ts          # نقطه ورود سرور
│   │   ├── db.ts             # اتصال PostgreSQL
│   │   ├── state.ts          # state مشترک حافظه
│   │   ├── middleware/       # امنیت، احراز هویت
│   │   ├── routes/           # مسیرهای API (20+ فایل)
│   │   ├── services/         # منطق تجاری، مهاجرت، آمار
│   │   └── utils/            # ابزارهای کمکی
│   ├── components/           # کامپوننت‌های React
│   ├── App.tsx               # مسیریابی اصلی
│   └── main.tsx              # نقطه ورود فرانت‌اند
├── sql/
│   └── init.sql              # مهاجرت اولیه دیتابیس
├── docker-compose.yml        # استقرار Docker
├── Dockerfile                # ساخت چند مرحله‌ای
└── nginx/                    # تنظیمات Nginx
```

## API

| مسیر | توضیح |
|------|-------|
| `GET /api/data` | دریافت تمام داده‌ها |
| `GET /api/health` | وضعیت سلامت سرور |
| `GET /api/config` | دریافت تنظیمات تبلیغات |
| `PUT /api/config` | ذخیره تنظیمات تبلیغات |
| `POST /api/auth/login` | ورود ادمین |
| `/api/teams/*` | CRUD تیم‌ها |
| `/api/players/*` | CRUD بازیکنان |
| `/api/matches/*` | CRUD مسابقات |
| `/api/news/*` | CRUD اخبار |
| `/api/transfers/*` | CRUD نقل و انتقالات |
| `/api/legionnaires/*` | CRUD لژیونرها |
| `/api/images/*` | CRUD تصاویر |
| `/api/hero-slides/*` | CRUD بنرهای اسلایدر |
| `/api/standings/*` | جدول رده‌بندی |
| `/api/stats/*` | آمار گلزنان و پاسورها |
| `/api/bracket` | جام حذفی |
| `/api/media/*` | مدیریت رسانه |
| `/api/archives/*` | بایگانی فصل‌ها |
| `/api/contact` | فرم تماس با ما |

## اجرای تست‌ها

```bash
# اجرای تست‌ها (سرور باید در حال اجرا باشد)
npm test

# اجرای تست‌ها در حالت watch
npm run test:watch
```

تست‌ها شامل: احراز هویت، CRUD کامل (تیم‌ها، بازیکنان، اخبار، نقل و انتقالات، لژیونرها، تصاویر)، پایداری تنظیمات تبلیغات، حفاظت امنیتی مسیرها و آمار است.

## فناوری‌ها

- **React 19** — رابط کاربری
- **Vite** — ساخت و توسعه
- **Tailwind CSS** — استایل‌دهی
- **Express.js** — سرور وب
- **TypeScript** — نوع‌دهی ایستا
- **PostgreSQL 16** — پایگاه داده
- **Docker** — استقرار
- **Nginx** — پروکسی معکوس و SSL
- **bcrypt + JWT** — امنیت احراز هویت
- **Helmet** — هدرهای امنیتی HTTP
- **express-rate-limit** — محدودیت درخواست

## لایسنس

خصوصی — تمامی حقوق محفوظ است.

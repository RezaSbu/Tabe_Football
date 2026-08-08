// ============================================
// شمارش بازدید صفحه (آمار بازدید کاربران)
// ============================================

const VISITOR_KEY = "tf_visitor_id";

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) || `v-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return `v-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

let lastTracked = { page: "", at: 0 };

export function trackPageView(page: string, referrer?: string): void {
  if (!page) return;

  // جلوگیری از شمارش دوباره در StrictMode (دوبار اجرا در حین توسعه)
  const now = Date.now();
  if (page === lastTracked.page && now - lastTracked.at < 3000) return;
  lastTracked = { page, at: now };

  const payload = JSON.stringify({
    visitorId: getVisitorId(),
    page,
    referrer: referrer || (typeof document !== "undefined" ? document.referrer : "") || ""
  });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/visit", new Blob([payload], { type: "application/json" }));
      return;
    }
  } catch {
    // fallback
  }
  fetch("/api/visit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true
  }).catch(() => {});
}

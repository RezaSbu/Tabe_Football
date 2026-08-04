import express, { Express, Request, Response } from "express";
import bcrypt from "bcrypt";
import { loadDB, snapshotDB, restoreDB } from "../state";
import { logMessage } from "../utils/logger";
import { saveDB } from "../services/database";
import {
  generateToken,
  verifyToken,
  JWT_EXPIRES_IN,
  findAdminUser,
  getRolePermissions,
  getRoleLabel,
  requirePermission
} from "../middleware/auth";

export function registerMiscRoutes(app: Express) {
  app.post("/api/contact", async (req, res) => {
    const { name, email, subject, message } = req.body;
    logMessage("info", "api", `دریافت پیام جدید تماس با ما از طرف: ${name}`);
    
    const currentDB = loadDB();
    const submission = {
      id: `sub-${Date.now()}`,
      name,
      email,
      subject,
      message,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    currentDB.submissions.push(submission);
    await saveDB();

    res.json({ success: true, message: "پیام شما با موفقیت دریافت و همگام‌سازی شد." });
  });

  app.delete("/api/submissions/:id", requirePermission("portal.submissions"), async (req, res) => {
    const { id } = req.params;
    logMessage("info", "api", `درخواست حذف پیام تماس به شناسه: ${id}`);
    const currentDB = loadDB();
    const originalLength = currentDB.submissions?.length || 0;
    currentDB.submissions = (currentDB.submissions || []).filter((s: any) => String(s.id) !== String(id));
    if (currentDB.submissions.length < originalLength) {
      await saveDB();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "پیام یافت نشد." });
    }
  });

  app.put("/api/submissions/:id/read", requirePermission("portal.submissions"), async (req, res) => {
    const { id } = req.params;
    const { isRead } = req.body;
    logMessage("info", "api", `تغییر وضعیت پیگیری پیام به خوانده شده: ${isRead}`);
    const currentDB = loadDB();
    const item = (currentDB.submissions || []).find((s: any) => String(s.id) === String(id));
    if (item) {
      item.isRead = isRead ?? true;
      await saveDB();
      res.json({ success: true, submission: item });
    } else {
      res.status(404).json({ error: "پیام یافت نشد." });
    }
  });

  app.post("/api/news/:id/view", async (req, res) => {
    const { id } = req.params;
    const currentDB = loadDB();

    if (id.startsWith("transfer-det-")) {
      const trId = id.replace("transfer-det-", "");
      const item = (currentDB.transfers || []).find((x: any) => String(x.id) === String(trId));
      if (item) {
        item.viewCount = (item.viewCount || 0) + 7;
        await saveDB();
        return res.json({ success: true, viewCount: item.viewCount });
      } else {
        return res.status(404).json({ error: "انتقال یافت نشد." });
      }
    } else if (id.startsWith("legionnaire-det-")) {
      const legId = id.replace("legionnaire-det-", "");
      const item = (currentDB.legionnaires || []).find((x: any) => String(x.id) === String(legId));
      if (item) {
        item.viewCount = (item.viewCount || 0) + 7;
        await saveDB();
        return res.json({ success: true, viewCount: item.viewCount });
      } else {
        return res.status(404).json({ error: "لژیونر یافت نشد." });
      }
    } else {
      const item = (currentDB.news || []).find((x: any) => String(x.id) === String(id));
      if (item) {
        item.viewCount = (item.viewCount || 0) + 7;
        await saveDB();
        return res.json({ success: true, viewCount: item.viewCount });
      } else {
        return res.status(404).json({ error: "گزارش خبری یافت نشد." });
      }
    }
  });

  app.post("/api/images/:id/view", async (req, res) => {
    const { id } = req.params;
    const currentDB = loadDB();
    const item = (currentDB.images || []).find((x: any) => String(x.id) === String(id));
    if (item) {
      item.viewCount = (item.viewCount || 0) + 7;
      await saveDB();
      return res.json({ success: true, viewCount: item.viewCount });
    } else {
      return res.status(404).json({ error: "تصویر یافت نشد." });
    }
  });

  app.post("/api/predictions/vote", async (req, res) => {
    const { matchId, prediction, score } = req.body;
    logMessage("info", "api", `دریافت رای پیش‌بینی برای مسابقه ${matchId}: ${prediction} (${score || 'بدون مشخص‌سازی تفاضل'})`);
    
    const currentDB = loadDB();
    const sports = ["football", "futsal"];
    const stages = ["Feature_Games", "Now_Games", "Finished_Games"];
    let matchFound: any = null;
    
    for (const sp of sports) {
      for (const st of stages) {
        const arrKey = `${sp}_${st}`;
        const m = (currentDB[arrKey] || []).find((x: any) => String(x.id) === String(matchId));
        if (m) {
          matchFound = m;
          break;
        }
      }
      if (matchFound) break;
    }
    
    if (matchFound) {
      const preds = matchFound.predictions || {
        totalVotes: 0,
        votesHome: 0,
        votesDraw: 0,
        votesAway: 0,
        scorePredictions: {}
      };
      preds.totalVotes = (preds.totalVotes || 0) + 1;
      if (prediction === "home") {
        preds.votesHome = (preds.votesHome || 0) + 1;
      } else if (prediction === "draw") {
        preds.votesDraw = (preds.votesDraw || 0) + 1;
      } else if (prediction === "away") {
        preds.votesAway = (preds.votesAway || 0) + 1;
      }
      if (score) {
        preds.scorePredictions = preds.scorePredictions || {};
        preds.scorePredictions[score] = (preds.scorePredictions[score] || 0) + 1;
      }
      matchFound.predictions = preds;
      await saveDB();
      
      const responsePredictions: Record<string, any> = {};
      for (const sp of sports) {
        for (const st of stages) {
          const arrKey = `${sp}_${st}`;
          (currentDB[arrKey] || []).forEach((m: any) => {
            if (m.predictions) {
              responsePredictions[m.id] = m.predictions;
            }
          });
        }
      }
      res.json({ success: true, predictions: responsePredictions });
    } else {
      res.status(404).json({ error: "مسابقه یافت نشد." });
    }
  });

  app.get("/api/ads", (req, res) => {
    const currentDB = loadDB();
    res.json(currentDB.ads || []);
  });

  app.post("/api/ads", requirePermission("portal.ads"), async (req, res) => {
    const currentDB = loadDB();
    if (!currentDB.ads) currentDB.ads = [];
    const item = {
      ...req.body,
      id: req.body.id || `ad-${Date.now()}`,
      type: req.body.type || "slot",
      name: req.body.name || "",
      placement: req.body.placement || "sidebar",
      title: req.body.title || "",
      promo: req.body.promo || "",
      description: req.body.description || "",
      linkUrl: req.body.linkUrl || "",
      imageUrl: req.body.imageUrl || "",
      btnText: req.body.btnText || "",
      width: req.body.width || 728,
      height: req.body.height || 90,
      priority: req.body.priority || 0,
      startDate: req.body.startDate || "",
      endDate: req.body.endDate || "",
      isActive: req.body.isActive !== false,
      settings: req.body.settings || {},
      viewCount: req.body.viewCount || 0,
      clickCount: req.body.clickCount || 0
    };
    currentDB.ads.push(item);
    await saveDB();
    res.json({ success: true, item });
  });

  app.put("/api/ads/:id", requirePermission("portal.ads"), async (req, res) => {
    const currentDB = loadDB();
    if (!currentDB.ads) currentDB.ads = [];
    const index = currentDB.ads.findIndex((a: any) => String(a.id) === String(req.params.id));
    if (index !== -1) {
      currentDB.ads[index] = { ...currentDB.ads[index], ...req.body, id: currentDB.ads[index].id };
      await saveDB();
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: "تبلیغ پیدا نشد." });
    }
  });

  app.delete("/api/ads/:id", requirePermission("portal.ads"), async (req, res) => {
    const currentDB = loadDB();
    if (!currentDB.ads) currentDB.ads = [];
    const originalLength = currentDB.ads.length;
    currentDB.ads = currentDB.ads.filter((a: any) => String(a.id) !== String(req.params.id));
    if (currentDB.ads.length < originalLength) {
      await saveDB();
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: "تبلیغ پیدا نشد." });
    }
  });

  app.post("/api/ads/:id/view", async (req, res) => {
    const currentDB = loadDB();
    const item = (currentDB.ads || []).find((a: any) => String(a.id) === String(req.params.id));
    if (!item) return res.status(404).json({ error: "تبلیغ یافت نشد." });
    item.viewCount = (item.viewCount || 0) + 1;
    await saveDB();
    res.json({ success: true, viewCount: item.viewCount });
  });

  app.post("/api/ads/:id/click", async (req, res) => {
    const currentDB = loadDB();
    const item = (currentDB.ads || []).find((a: any) => String(a.id) === String(req.params.id));
    if (!item) return res.status(404).json({ error: "تبلیغ یافت نشد." });
    item.clickCount = (item.clickCount || 0) + 1;
    await saveDB();
    res.json({ success: true, clickCount: item.clickCount });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "نام کاربری و رمز عبور الزامی است." });
    }
    const user = findAdminUser(username);
    if (!user) {
      return res.status(401).json({ success: false, message: "نام کاربری یا رمز عبور اشتباه است." });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, message: "نام کاربری یا رمز عبور اشتباه است." });
    }
    const token = generateToken({ username: user.username, role: user.role });
    res.cookie("token", token, {
      httpOnly: true,
      secure: req.protocol === "https",
      sameSite: "lax",
      maxAge: JWT_EXPIRES_IN * 1000,
      path: "/"
    });
    res.json({
      success: true,
      token,
      username: user.username,
      role: user.role,
      label: user.label,
      permissions: getRolePermissions(user.role)
    });
  });

  app.post("/api/auth/logout", async (_req, res) => {
    res.clearCookie("token", { path: "/" });
    res.json({ success: true, message: "خروج با موفقیت انجام شد." });
  });

  app.get("/api/auth/check", async (req, res) => {
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.json({ authenticated: false });
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.json({ authenticated: false });
    }
    const role = decoded.role as any;
    res.json({
      authenticated: true,
      username: decoded.username,
      role,
      label: getRoleLabel(role),
      permissions: getRolePermissions(role)
    });
  });

  app.post("/api/news", requirePermission("portal.news"), async (req, res) => {
    const currentDB = loadDB();
    const item = {
      ...req.body,
      id: `news-${Date.now()}`,
      viewCount: 0,
      createdAt: new Date().toISOString()
    };
    currentDB.news.unshift(item);
    await saveDB();
    res.json({ success: true });
  });

  app.put("/api/news/:id", requirePermission("portal.news"), async (req, res) => {
    const currentDB = loadDB();
    const index = currentDB.news.findIndex((n: any) => n.id === req.params.id);
    if (index !== -1) {
      currentDB.news[index] = { ...currentDB.news[index], ...req.body };
      await saveDB();
      res.json({ success: true });
    } else {
      res.status(404).send();
    }
  });

  app.delete("/api/news/:id", requirePermission("portal.news"), async (req, res) => {
    const currentDB = loadDB();
    currentDB.news = currentDB.news.filter((n: any) => n.id !== req.params.id);
    await saveDB();
    res.json({ success: true });
  });

  app.post("/api/transfers", requirePermission("portal.transfers"), async (req, res) => {
    const currentDB = loadDB();
    const item = {
      ...req.body,
      id: `transfer-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    currentDB.transfers.unshift(item);
    await saveDB();
    res.json({ success: true });
  });

  app.put("/api/transfers/:id", requirePermission("portal.transfers"), async (req, res) => {
    const currentDB = loadDB();
    const index = currentDB.transfers.findIndex((t: any) => t.id === req.params.id);
    if (index !== -1) {
      currentDB.transfers[index] = { ...currentDB.transfers[index], ...req.body };
      await saveDB();
      res.json({ success: true });
    } else {
      res.status(404).send();
    }
  });

  app.delete("/api/transfers/:id", requirePermission("portal.transfers"), async (req, res) => {
    const currentDB = loadDB();
    currentDB.transfers = currentDB.transfers.filter((t: any) => t.id !== req.params.id);
    await saveDB();
    res.json({ success: true });
  });

  app.post("/api/team-transfers", requirePermission("portal.teamTransfers"), async (req, res) => {
    const currentDB = loadDB();
    if (!currentDB.teamTransfersList) currentDB.teamTransfersList = [];
    const item = {
      incomings: [],
      outgoings: [],
      probables: [],
      league: "pro-league",
      ...req.body,
      id: `team-tr-${Date.now()}`
    };
    currentDB.teamTransfersList.unshift(item);
    await saveDB();
    res.json({ success: true });
  });

  app.put("/api/team-transfers/:id", requirePermission("portal.teamTransfers"), async (req, res) => {
    const currentDB = loadDB();
    if (!currentDB.teamTransfersList) currentDB.teamTransfersList = [];
    const index = currentDB.teamTransfersList.findIndex((t: any) => t.id === req.params.id);
    if (index !== -1) {
      currentDB.teamTransfersList[index] = { ...currentDB.teamTransfersList[index], ...req.body };
      await saveDB();
      res.json({ success: true });
    } else {
      res.status(404).send();
    }
  });

  app.delete("/api/team-transfers/:id", requirePermission("portal.teamTransfers"), async (req, res) => {
    const currentDB = loadDB();
    if (!currentDB.teamTransfersList) currentDB.teamTransfersList = [];
    currentDB.teamTransfersList = currentDB.teamTransfersList.filter((t: any) => t.id !== req.params.id);
    await saveDB();
    res.json({ success: true });
  });

  app.post("/api/images", requirePermission("portal.gallery"), async (req, res) => {
    const currentDB = loadDB();
    const item = {
      ...req.body,
      id: `image-${Date.now()}`
    };
    currentDB.images.unshift(item);
    await saveDB();
    res.json({ success: true });
  });

  app.put("/api/images/:id", requirePermission("portal.gallery"), async (req, res) => {
    const currentDB = loadDB();
    const index = currentDB.images.findIndex((i: any) => i.id === req.params.id);
    if (index !== -1) {
      currentDB.images[index] = { ...currentDB.images[index], ...req.body };
      await saveDB();
      res.json({ success: true });
    } else {
      res.status(404).send();
    }
  });

  app.delete("/api/images/:id", requirePermission("portal.gallery"), async (req, res) => {
    const currentDB = loadDB();
    currentDB.images = currentDB.images.filter((i: any) => i.id !== req.params.id);
    await saveDB();
    res.json({ success: true });
  });

  app.post("/api/legionnaires", requirePermission("portal.legionnaires"), async (req, res) => {
    const snapshot = snapshotDB();
    const currentDB = loadDB();
    const item = {
      ...req.body,
      id: `leg-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    currentDB.legionnaires.unshift(item);
    try {
      await saveDB();
      res.json({ success: true });
    } catch (err: any) {
      restoreDB(snapshot);
      res.status(500).json({ success: false, message: "خطا در ذخیره اطلاعات لژیونر." });
    }
  });

  app.put("/api/legionnaires/:id", requirePermission("portal.legionnaires"), async (req, res) => {
    const snapshot = snapshotDB();
    const currentDB = loadDB();
    const index = currentDB.legionnaires.findIndex((l: any) => l.id === req.params.id);
    if (index !== -1) {
      currentDB.legionnaires[index] = { ...currentDB.legionnaires[index], ...req.body };
      try {
        await saveDB();
        res.json({ success: true });
      } catch (err: any) {
        restoreDB(snapshot);
        res.status(500).json({ success: false, message: "خطا در بروزرسانی لژیونر." });
      }
    } else {
      res.status(404).send();
    }
  });

  app.delete("/api/legionnaires/:id", requirePermission("portal.legionnaires"), async (req, res) => {
    const currentDB = loadDB();
    currentDB.legionnaires = currentDB.legionnaires.filter((l: any) => l.id !== req.params.id);
    await saveDB();
    res.json({ success: true });
  });

  app.post("/api/selected-combinations", requirePermission("selectedCombos"), async (req, res) => {
    const currentDB = loadDB();
    if (!currentDB.selectedCombinations) {
      currentDB.selectedCombinations = [];
    }
    const item = {
      ...req.body,
      id: `sc-${Date.now()}`
    };
    currentDB.selectedCombinations.push(item);
    await saveDB();
    res.json({ success: true, item });
  });

  app.put("/api/selected-combinations/:id", requirePermission("selectedCombos"), async (req, res) => {
    const currentDB = loadDB();
    if (!currentDB.selectedCombinations) {
      currentDB.selectedCombinations = [];
    }
    const index = currentDB.selectedCombinations.findIndex((sc: any) => sc.id === req.params.id);
    if (index !== -1) {
      currentDB.selectedCombinations[index] = { ...currentDB.selectedCombinations[index], ...req.body };
      await saveDB();
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: "ترکیب منتخب پیدا نشد." });
    }
  });

  app.delete("/api/selected-combinations/:id", requirePermission("selectedCombos"), async (req, res) => {
    const currentDB = loadDB();
    if (!currentDB.selectedCombinations) {
      currentDB.selectedCombinations = [];
    }
    currentDB.selectedCombinations = currentDB.selectedCombinations.filter((sc: any) => sc.id !== req.params.id);
    await saveDB();
    res.json({ success: true });
  });

  app.get("/api/hero-slides", async (req, res) => {
    const currentDB = loadDB();
    res.json(currentDB.heroSlides || []);
  });

  app.post("/api/hero-slides", requirePermission("heroSlides"), async (req, res) => {
    const currentDB = loadDB();
    if (!currentDB.heroSlides) currentDB.heroSlides = [];
    const item = {
      ...req.body,
      id: req.body.id || `hs-${Date.now()}`
    };
    currentDB.heroSlides.push(item);
    await saveDB();
    res.json({ success: true, item });
  });

  app.put("/api/hero-slides/:id", requirePermission("heroSlides"), async (req, res) => {
    const currentDB = loadDB();
    if (!currentDB.heroSlides) currentDB.heroSlides = [];
    const index = currentDB.heroSlides.findIndex((s: any) => s.id === req.params.id);
    if (index !== -1) {
      currentDB.heroSlides[index] = { ...currentDB.heroSlides[index], ...req.body };
      await saveDB();
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: "اسلاید پیدا نشد." });
    }
  });

  app.delete("/api/hero-slides/:id", requirePermission("heroSlides"), async (req, res) => {
    const currentDB = loadDB();
    if (!currentDB.heroSlides) currentDB.heroSlides = [];
    currentDB.heroSlides = currentDB.heroSlides.filter((s: any) => s.id !== req.params.id);
    await saveDB();
    res.json({ success: true });
  });
}

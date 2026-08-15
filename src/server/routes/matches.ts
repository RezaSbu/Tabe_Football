import express, { Express, Request, Response } from "express";
import { db as pgDb } from "../db";
import { loadDB } from "../state";
import { logMessage } from "../utils/logger";
import { saveDB, updateMatchInDb } from "../services/database";
import { detectConflict } from "../utils/versioning";
import { requirePermission } from "../middleware/auth";

function findCurrentMatch(id: string): any | null {
  const currentDB = loadDB();
  for (const sp of ["football", "futsal"]) {
    for (const st of ["Feature_Games", "Now_Games", "Finished_Games"]) {
      const list = currentDB[`${sp}_${st}`] || [];
      const found = list.find((m: any) => String(m.id) === String(id));
      if (found) return found;
    }
  }
  return null;
}

export function registerMatchRoutes(app: Express) {
  app.put("/api/bracket", requirePermission("bracket"), async (req, res) => {
    const currentDB = loadDB();
    currentDB.bracket = req.body;
    await saveDB();
    res.json({ success: true });
  });

  app.post("/api/sports-game", requirePermission("matches"), async (req, res) => {
    const { sport, stage, matchData } = req.body;
    if (!sport || !stage || !matchData) {
      return res.status(400).json({ success: false, message: "اطلاعات ارسالی ناقص است." });
    }

    const currentDB = loadDB();
    
    const finalStatus = matchData.status || (stage === "Feature_Games" ? "not-started" : (stage === "Now_Games" ? "live" : "finished"));
    let finalStage: string;
    if (finalStatus === "finished") {
      finalStage = "Finished_Games";
    } else if (finalStatus === "live") {
      finalStage = "Now_Games";
    } else {
      finalStage = "Feature_Games";
    }

    const arrKey = `${sport}_${finalStage}`;
    if (!currentDB[arrKey]) {
      currentDB[arrKey] = [];
    }

    const item = {
      ...matchData,
      id: `match-${Date.now()}`,
      sport,
      stage: finalStage,
      status: finalStatus
    };

    currentDB[arrKey].unshift(item);
    
    if (finalStage !== "Feature_Games") {
      const featKey = `${sport}_Feature_Games`;
      if (currentDB[featKey]) {
        const alreadyInFeat = currentDB[featKey].some((m: any) => m.id === item.id);
        if (!alreadyInFeat) {
          currentDB[featKey].unshift({ ...item, stage: "Feature_Games" });
        }
      }
    }

    await saveDB();
    logMessage("info", "api", `بازی جدید ثبت شد: ${item.teamHome} - ${item.teamAway} در ${sport} (${finalStage})`);
    res.json({ success: true, match: item });
  });

  app.put("/api/sports-game/:id", requirePermission("matches"), async (req, res) => {
    const { id } = req.params;
    const baseVersion = req.body.updatedAt;
    const current = findCurrentMatch(id);
    if (!current) {
      return res.status(404).json({ success: false, message: "بازی یافت نشد." });
    }
    if (detectConflict(current, baseVersion)) {
      return res.status(409).json({ success: false, conflict: true, message: "این مسابقه پس از باز کردن فرم توسط شخص دیگری ویرایش شده است. لطفاً دوباره بارگذاری کنید.", current });
    }
    const { updatedAt, ...body } = req.body;
    const success = updateMatchInDb(id, { ...body, updatedAt: new Date().toISOString() });
    if (success) {
      await saveDB();
      logMessage("info", "api", `بروزرسانی بازی با شناسه ${id} انجام شد.`);
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: "بازی یافت نشد." });
    }
  });

  app.delete("/api/sports-game/:sport/:stage/:id", requirePermission("matches"), async (req, res) => {
    const { sport, stage, id } = req.params;
    const currentDB = loadDB();
    
    const allSportKeys = [
      "football_Feature_Games",
      "football_Now_Games",
      "football_Finished_Games",
      "futsal_Feature_Games",
      "futsal_Now_Games",
      "futsal_Finished_Games",
      "matches"
    ];

    allSportKeys.forEach(key => {
      if (currentDB[key] && Array.isArray(currentDB[key])) {
        currentDB[key] = currentDB[key].filter((m: any) => String(m.id) !== String(id));
      }
    });

    try {
      await pgDb.from('matches').delete().eq('id', id);
      logMessage("info", "api", `حذف مستقیم بازی با شناسه ${id} از PostgreSQL اجرا شد.`);
    } catch (e) {
      console.error("PostgreSQL direct delete failed for match id", id, e);
    }

    await saveDB();
    logMessage("info", "api", `حذف نهایی ورزشی: بازی با شناسه ${id} کلا پاکسازی گردید.`);
    res.json({ success: true });
  });

  app.post("/api/matches", requirePermission("matches"), async (req, res) => {
    const currentDB = loadDB();
    const isFutsal = req.body.league === "futsal" || req.body.sport === "futsal";
    const sport = isFutsal ? "futsal" : "football";
    const stage = req.body.status === "live" ? "Now_Games" : (req.body.status === "finished" ? "Finished_Games" : "Feature_Games");
    
    const item = {
      ...req.body,
      id: `match-${Date.now()}`,
      sport,
      stage
    };

    currentDB[`${sport}_${stage}`].unshift(item);
    await saveDB();
    res.json({ success: true });
  });

  app.put("/api/matches/:id", requirePermission("matches"), async (req, res) => {
    const { id } = req.params;
    const baseVersion = req.body.updatedAt;
    const current = findCurrentMatch(id);
    if (!current) {
      return res.status(404).json({ success: false, message: "بازی یافت نشد." });
    }
    if (detectConflict(current, baseVersion)) {
      return res.status(409).json({ success: false, conflict: true, message: "این مسابقه پس از باز کردن فرم توسط شخص دیگری ویرایش شده است. لطفاً دوباره بارگذاری کنید.", current });
    }
    const { updatedAt, ...body } = req.body;
    const success = updateMatchInDb(id, { ...body, updatedAt: new Date().toISOString() });
    if (success) {
      await saveDB();
      res.json({ success: true });
    } else {
      res.status(404).send();
    }
  });

  app.delete("/api/matches/:id", requirePermission("matches"), async (req, res) => {
    const { id } = req.params;
    const currentDB = loadDB();
    
    const sports = ["football", "futsal"];
    const stages = ["Feature_Games", "Now_Games", "Finished_Games"];
    let deleted = false;

    for (const sp of sports) {
      for (const st of stages) {
        const arrKey = `${sp}_${st}`;
        const originalLength = currentDB[arrKey]?.length || 0;
        currentDB[arrKey] = (currentDB[arrKey] || []).filter((m: any) => String(m.id) !== String(id));
        if (currentDB[arrKey]?.length < originalLength) {
          deleted = true;
        }
      }
    }

    if (deleted) {
      await saveDB();
      res.json({ success: true });
    } else {
      res.status(404).send();
    }
  });
}

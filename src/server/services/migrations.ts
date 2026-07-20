import { normalizePersianString } from "../utils/persian";
import { logMessage } from "../utils/logger";

export function isTrulyFutsalMatch(m: any): boolean {
  if (!m) return false;
  const hasFootballLeague = m.league === "pro-league" || m.league === "league-1" || m.league === "league-2" || m.league === "hazfi-cup";
  if (hasFootballLeague) return false;

  const home = (m.teamHome || "").toLowerCase();
  const away = (m.teamAway || "").toLowerCase();
  const homeId = (m.teamHomeId || "").toLowerCase();
  const awayId = (m.teamAwayId || "").toLowerCase();

  const isHomeFutsal = home.includes("فوتسال") || home.includes("گیتی") || home.includes("سونگون") || homeId.includes("futsal") || homeId.includes("giti") || homeId.includes("sungun");
  const isAwayFutsal = away.includes("فوتسال") || away.includes("گیتی") || away.includes("سونگون") || awayId.includes("futsal") || awayId.includes("giti") || awayId.includes("sungun");

  if (!isHomeFutsal && !isAwayFutsal) {
    return false;
  }
  return true;
}

export function runDatabaseMigrationsAndTransitions(parsed: any): { parsed: any; changed: boolean } {
  let changed = false;

  const sportKeys = [
    "football_Feature_Games",
    "football_Now_Games",
    "football_Finished_Games",
    "futsal_Feature_Games",
    "futsal_Now_Games",
    "futsal_Finished_Games"
  ];

  sportKeys.forEach(k => {
    if (parsed[k] === undefined) {
      parsed[k] = [];
      changed = true;
    }
  });

  if (parsed.matches && parsed.matches.length > 0 &&
      parsed.football_Feature_Games.length === 0 &&
      parsed.football_Now_Games.length === 0 &&
      parsed.football_Finished_Games.length === 0 &&
      parsed.futsal_Feature_Games.length === 0 &&
      parsed.futsal_Now_Games.length === 0 &&
      parsed.futsal_Finished_Games.length === 0) {

    parsed.matches.forEach((m: any) => {
      const isFutsal = m.league === "futsal" || m.sport === "futsal" || (m.league && m.league.includes("futsal"));
      const sportPrefix = isFutsal ? "futsal" : "football";
      const cloned = { ...m, sport: sportPrefix };

      if (m.status === "finished") {
        parsed[`${sportPrefix}_Finished_Games`].push(cloned);
      } else if (m.status === "live") {
        parsed[`${sportPrefix}_Now_Games`].push(cloned);
        parsed[`${sportPrefix}_Feature_Games`].push({ ...cloned, status: "live" });
      } else {
        parsed[`${sportPrefix}_Feature_Games`].push(cloned);
      }
    });

    logMessage("info", "database", "مهاجرت موفقیت‌آمیز مسابقات قدیمی به معماری جدید چند‌مرحله‌ای (مدل مستقل فوتبال و فوتسال) انجام شد.");
    changed = true;
  }

  const now = new Date();

  const parseMatchDateTime = (m: any): Date | null => {
    if (!m.date) return null;
    try {
      const parts = m.date.split("-");
      if (parts.length === 3) {
        const yr = parseInt(parts[0], 10);
        const mo = parseInt(parts[1], 10) - 1;
        const dy = parseInt(parts[2], 10);

        const timeClean = (m.time || "18:00")
          .replace(/[۰-۹]/g, (d: string) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
        const tParts = timeClean.split(":");
        const hr = parseInt(tParts[0], 10) || 18;
        const mn = parseInt(tParts[1], 10) || 0;

        return new Date(yr, mo, dy, hr, mn, 0, 0);
      }
    } catch (err) {
      console.error("Error parsing match date time", m.date, m.time, err);
    }
    return null;
  };

  const sports = ["football", "futsal"];

  sports.forEach(sp => {
    const featureKey = `${sp}_Feature_Games`;
    const nowKey = `${sp}_Now_Games`;
    const finishedKey = `${sp}_Finished_Games`;

    const featuresList = parsed[featureKey] || [];
    const nowList = parsed[nowKey] || [];
    const finishedList = parsed[finishedKey] || [];

    featuresList.forEach((m: any) => {
      if (m.status !== "finished") {
        const matchTime = parseMatchDateTime(m);
        if (matchTime) {
          const elapsedMs = now.getTime() - matchTime.getTime();

          if (elapsedMs >= 3 * 60 * 60 * 1000) {
            m.status = "finished";
            m.tag = "اعمال نشده";
            m.isAutoFinished = true;

            parsed[nowKey] = (parsed[nowKey] || []).filter((n: any) => n.id !== m.id);

            const alreadyFinished = (parsed[finishedKey] || []).some((f: any) => f.id === m.id);
            if (!alreadyFinished) {
              parsed[finishedKey].push({ ...m });
            }
            logMessage("info", "database", `پایان خودکار: بازی ${m.teamHome} - ${m.teamAway} به دلیل سپری شدن بیش از ۳ ساعت از زمان آغاز، با تگ "اعمال نشده" بایگانی شد.`);
            changed = true;
          } else if (elapsedMs >= 0) {
            if (m.status !== "live") {
              m.status = "live";
              m.minutes = Math.max(1, Math.floor(elapsedMs / (60 * 1000))).toString();
              changed = true;
            }

            const alreadyExists = (parsed[nowKey] || []).some((n: any) => n.id === m.id);
            if (!alreadyExists) {
              parsed[nowKey].push({ ...m });
              changed = true;
            }
          }
        }
      }
    });

    parsed[nowKey] = (parsed[nowKey] || []).filter((m: any) => {
      const matchTime = parseMatchDateTime(m);
      if (matchTime) {
        const elapsedMs = now.getTime() - matchTime.getTime();
        if (elapsedMs >= 3 * 60 * 60 * 1000) {
          m.status = "finished";
          m.tag = "اعمال نشده";
          m.isAutoFinished = true;

          const alreadyFinished = (parsed[finishedKey] || []).some((f: any) => f.id === m.id);
          if (!alreadyFinished) {
            parsed[finishedKey].push({ ...m });
          }

          const fMatch = featuresList.find((x: any) => x.id === m.id);
          if (fMatch) {
            fMatch.status = "finished";
            fMatch.tag = "اعمال نشده";
            fMatch.isAutoFinished = true;
          }

          logMessage("info", "database", `پایان خودکار (از جدول جریان): بازی ${m.teamHome} - ${m.teamAway} به دلیل سپری شدن بیش از ۳ ساعت، با تگ "اعمال نشده" خاتمه یافت.`);
          changed = true;
          return false;
        }
      }
      return true;
    });
  });

  const futsalKeys = ["futsal_Feature_Games", "futsal_Now_Games", "futsal_Finished_Games"];
  futsalKeys.forEach(fk => {
    if (!parsed[fk]) return;
    const remains: any[] = [];
    const stageSuffix = fk.replace("futsal_", "");

    parsed[fk].forEach((m: any) => {
      if (!isTrulyFutsalMatch(m)) {
        const correctFootballKey = `football_${stageSuffix}`;
        m.sport = "football";
        if (m.league === "futsal" || !m.league) {
          const isHazfi = (m.hotTopic && m.hotTopic.includes("حذفی")) || (m.league && m.league.includes("hazfi")) || (m.leagueName && m.leagueName.includes("حذفی"));
          m.league = isHazfi ? "hazfi-cup" : "pro-league";
        }

        if (!parsed[correctFootballKey]) {
          parsed[correctFootballKey] = [];
        }
        const duplicate = parsed[correctFootballKey].some((existing: any) => existing.id === m.id);
        if (!duplicate) {
          parsed[correctFootballKey].unshift(m);
        }
        changed = true;
      } else {
        remains.push(m);
      }
    });

    if (parsed[fk].length !== remains.length) {
      parsed[fk] = remains;
      changed = true;
    }
  });

  const synchedMatches: any[] = [];
  const registeredIds = new Set<string>();

  const prioritySportKeys = [
    "football_Finished_Games",
    "football_Now_Games",
    "football_Feature_Games",
    "futsal_Finished_Games",
    "futsal_Now_Games",
    "futsal_Feature_Games"
  ];

  prioritySportKeys.forEach(k => {
    const list = parsed[k] || [];
    list.forEach((m: any) => {
      if (m && m.date && m.date.includes("T")) {
        m.date = m.date.split("T")[0];
        changed = true;
      }
      if (!registeredIds.has(m.id)) {
        registeredIds.add(m.id);
        synchedMatches.push(m);
      }
    });
  });

  parsed.matches = synchedMatches;

  const allStages = [
    "football_Feature_Games", "football_Now_Games", "football_Finished_Games",
    "futsal_Feature_Games", "futsal_Now_Games", "futsal_Finished_Games"
  ];
  allStages.forEach(key => {
    if (parsed[key]) {
      parsed[key].forEach((m: any) => {
        if (m && m.date && m.date.includes("T")) {
          m.date = m.date.split("T")[0];
          changed = true;
        }
      });
    }
  });

  parsed.Feature_Games = [
    ...(parsed.football_Feature_Games || []),
    ...(parsed.futsal_Feature_Games || [])
  ];

  return { parsed, changed };
}

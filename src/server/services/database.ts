import { db as pgDb } from "../db";
import { loadDB, setDb, getInitialDatabase } from "../state";
import { logMessage } from "../utils/logger";
import { dbLock } from "../utils/concurrency";
import { runDatabaseMigrationsAndTransitions } from "./migrations";
import { recalculateAndSyncDatabase } from "./stats";
import { normalizePersianString, fixMojibake } from "../utils/persian";

let constraintsMigrated = false;

export async function migrateConstraints(): Promise<void> {
  if (constraintsMigrated) return;
  try {
    const { pool } = await import("../db");
    await pool.query(`
      ALTER TABLE news DROP CONSTRAINT IF EXISTS chk_news_category;
      ALTER TABLE news ADD CONSTRAINT chk_news_category CHECK (category IS NULL OR category IN ('pro-league', 'league-1', 'league-2', 'hazfi-cup', 'futsal', 'all', 'domestic', 'international', 'transfer', 'analysis', 'general', 'other', 'iranian-football', 'match-preview', 'national-team', 'highlights', 'tactical', 'transfer-news', 'injury', 'interview', 'transfers', 'news', 'featured', 'video', 'photo'));
    `);
    await pool.query(`
      ALTER TABLE transfers DROP CONSTRAINT IF EXISTS chk_transfers_type;
      ALTER TABLE transfers ADD CONSTRAINT chk_transfers_type CHECK (type IS NULL OR type IN ('دائمی', 'قرارداد قرضی', 'شایعه نقل و انتقال', 'permanent', 'loan', 'free', 'exchange', 'draft', 'other'));
    `);
    await pool.query(`
      ALTER TABLE players DROP CONSTRAINT IF EXISTS chk_players_position;
      ALTER TABLE players ADD CONSTRAINT chk_players_position CHECK (position IS NULL OR position IN (
        'GK', 'DF', 'MF', 'FW',
        'goalkeeper', 'defender', 'midfielder', 'forward',
        'دروازه‌بان', 'مدافع', 'هافبک', 'مهاجم',
        'هافبک دفاعی', 'هافبک تهاجمی', 'مدافع مرکزی', 'مدافع چپ', 'مدافع راست',
        'وینگر چپ', 'وینگر راست', 'مهاجم نوک', 'هافبک مرکزی'
      ));
    `);
    await pool.query(`ALTER TABLE legionnaires DROP CONSTRAINT IF EXISTS chk_legionnaires_league;`);
    await pool.query(`ALTER TABLE images ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0`);
    await pool.query(`ALTER TABLE legionnaires ADD COLUMN IF NOT EXISTS summary text`);
    await pool.query(`ALTER TABLE bracket_slots DROP CONSTRAINT IF EXISTS fk_bracket_slots_match`);
    constraintsMigrated = true;
    logMessage("info", "database", "مهاجرت محدودیت‌های CHECK و ستون view_count جدول images با موفقیت اعمال شد.");
  } catch (err: any) {
    logMessage("warn", "database", "خطا در مهاجرت محدودیت‌های CHECK:", err.message || err);
  }
}

export async function migrateSummaryColumn(): Promise<void> {
  try {
    const { pool } = await import("../db");
    await pool.query(`ALTER TABLE legionnaires ADD COLUMN IF NOT EXISTS summary text`);
    logMessage("info", "database", "مهاجرت ستون summary لژیونرها اعمال شد.");
  } catch (err: any) {
    logMessage("warn", "database", "خطا در مهاجرت ستون summary:", err.message || err);
  }
}

export async function migrateHeroSlidesColumns(): Promise<void> {
  try {
    const { pool } = await import("../db");
    await pool.query(`ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS source_type varchar(20) DEFAULT 'custom'`);
    await pool.query(`ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS source_id varchar(100) DEFAULT ''`);
    logMessage("info", "database", "مهاجرت ستون‌های source_type و source_id اسلایدر اعمال شد.");
  } catch (err: any) {
    logMessage("warn", "database", "خطا در مهاجرت ستون‌های اسلایدر:", err.message || err);
  }
}

export async function fetchAndPopulateMemoryDB(): Promise<void> {
  const seedData = getInitialDatabase();
  try {
    logMessage("info", "database", "در حال دریافت کلیه جداول از PostgreSQL...");

    const [
      { data: dbConfig, error: errConfig },
      { data: dbSystemInfo, error: errSys },
      { data: dbBracket, error: errBracket },
      { data: dbNews, error: errNews },
      { data: dbTeams, error: errTeams },
      { data: dbPlayers, error: errPlayers },
      { data: dbCoaches, error: errCoaches },
      { data: dbMatches, error: errMatches },
      { data: dbTransfers, error: errTransfers },
      { data: dbLegionnaires, error: errLegionnaires },
      { data: dbImages, error: errImages },
      { data: dbStandings, error: errStandings },
      { data: dbStats, error: errStats },
      { data: dbSubmissions, error: errSubmissions },
      { data: dbHeroSlides, error: errHero },
      { data: dbSelectedCombinations, error: errSC },
      dbTeamTransfersList,
      dbMediaFiles,
      dbArchives
    ] = await Promise.all([
      pgDb.from('config').select('*').eq('id', 'main').maybeSingle(),
      pgDb.from('system_info').select('*'),
      pgDb.from('bracket').select('*').eq('id', 'main').maybeSingle(),
      pgDb.from('news').select('*').order('created_at', { ascending: false }),
      pgDb.from('teams').select('*'),
      pgDb.from('players').select('*'),
      pgDb.from('coaches').select('*'),
      pgDb.from('matches').select('*'),
      pgDb.from('transfers').select('*'),
      pgDb.from('legionnaires').select('*'),
      pgDb.from('images').select('*'),
      pgDb.from('standings').select('*'),
      pgDb.from('stats').select('*'),
      pgDb.from('submissions').select('*'),
      pgDb.from('hero_slides').select('*'),
      pgDb.from('selected_combinations').select('*'),
      Promise.resolve(pgDb.from('team_transfers_list').select('*')).catch(err => ({ data: null, error: err })),
      Promise.resolve(pgDb.from('media_files').select('*')).catch(err => ({ data: null, error: err })),
      Promise.resolve(pgDb.from('archive').select('*').order('created_at', { ascending: false })).catch(err => ({ data: null, error: err }))
    ]);

    if (errNews) logMessage("warn", "database", "خطا در دریافت جدول اخبار", errNews);
    if (errTeams) logMessage("warn", "database", "خطا در دریافت جدول تیم‌ها", errTeams);
    if (errPlayers) logMessage("warn", "database", "خطا در دریافت جدول بازیکنان", errPlayers);
    if (errCoaches) logMessage("warn", "database", "خطا در دریافت جدول مربیان", errCoaches);
    if (errMatches) logMessage("warn", "database", "خطا در دریافت جدول مسابقات", errMatches);

    const parsed: any = { ...seedData };

    if (dbConfig) {
      parsed.config = {
        adTitle: dbConfig.ad_title || "",
        adPromo: dbConfig.ad_promo || "",
        adDesc: dbConfig.ad_desc || "",
        adLink: dbConfig.ad_link || "",
        adBtnText: dbConfig.ad_btn_text || "",
        customBannerUrl: dbConfig.custom_banner_url || "",
        adSlots: typeof dbConfig.ad_slots === "string" ? JSON.parse(dbConfig.ad_slots) : (dbConfig.ad_slots || []),
        bannerLabel: dbConfig.banner_label || "تخفیف هواداران تب فوتبال",
        bannerLabelVisible: dbConfig.banner_label_visible !== false,
        bannerTagText: dbConfig.banner_tag_text || "حمایت ویژه پورتال",
        bannerVisible: dbConfig.banner_visible !== false,
        popupAd: typeof dbConfig.popup_ad === "string" ? JSON.parse(dbConfig.popup_ad) : (dbConfig.popup_ad || { enabled: false }),
        floatingAd: typeof dbConfig.floating_ad === "string" ? JSON.parse(dbConfig.floating_ad) : (dbConfig.floating_ad || { enabled: false }),
        bottomBarAd: typeof dbConfig.bottom_bar_ad === "string" ? JSON.parse(dbConfig.bottom_bar_ad) : (dbConfig.bottom_bar_ad || { enabled: false }),
        slideInAd: typeof dbConfig.slide_in_ad === "string" ? JSON.parse(dbConfig.slide_in_ad) : (dbConfig.slide_in_ad || { enabled: false })
      };
    }

    if (dbSystemInfo) {
      const row = dbSystemInfo.find((r: any) => r.key === 'lastScraped');
      if (row) parsed.lastScraped = row.value || "";

      const rowSeason = dbSystemInfo.find((r: any) => r.key === 'currentSeason');
      if (rowSeason) parsed.currentSeason = rowSeason.value || "1404";
    }

    if (dbBracket && dbBracket.data) {
      parsed.bracket = dbBracket.data;
    }

    if (dbNews) {
      parsed.news = dbNews.map((n: any) => ({
        id: n.id,
        title: fixMojibake(n.title || ""),
        summary: fixMojibake(n.summary || ""),
        content: fixMojibake(n.content || ""),
        image: n.image,
        category: n.category,
        tags: Array.isArray(n.tags) ? n.tags.map((t: any) => fixMojibake(String(t))) : (typeof n.tags === 'string' ? n.tags.replace(/[{}]/g, '').split(',').map((x: any) => fixMojibake(x.trim())).filter(Boolean) : []),
        viewCount: n.view_count || 0,
        createdAt: n.created_at
      }));
    }

    if (dbTeams) {
      parsed.teams = dbTeams.map((t: any) => ({
        id: t.id,
        name: fixMojibake(t.name || ""),
        logo: t.logo,
        stats: t.stats,
        coach: fixMojibake(t.stats?.coach || t.coach || ""),
        city: fixMojibake(t.stats?.city || t.city || ""),
        stadium: fixMojibake(t.stats?.stadium || t.stadium || ""),
        stadiumCapacity: t.stats?.stadiumCapacity || t.stats?.stadium_capacity || t.stadiumCapacity || "",
        founded: t.stats?.founded || t.founded || "",
        basePlayed: t.base_played || 0,
        baseWon: t.base_won || 0,
        baseDrawn: t.base_drawn || 0,
        baseLost: t.base_lost || 0,
        basePoints: t.base_points || 0,
        baseGoalsFor: t.base_goals_for || 0,
        baseGoalsAgainst: t.base_goals_against || 0,
        recentForm: t.recent_form || [],
        recentMatches: t.recent_matches || [],
        divisionKey: t.division_key || null,
        isEliminated: t.is_eliminated || false
      }));
    }

    if (dbPlayers) {
      parsed.players = dbPlayers.map((p: any) => {
        const sStats = p.season_stats || {};
        return {
          id: p.id,
          name: fixMojibake(p.name || ""),
          teamId: p.team_id,
          teamName: fixMojibake(p.team_name || ""),
          position: p.position,
          rating: p.rating,
          averageRating: p.average_rating ? parseFloat(p.average_rating) : 0.0,
          image: p.image,
          seasonStats: sStats,
          leagueStats: sStats.leagueStats || { matches: p.base_matches || 0, goals: p.base_goals || 0, assists: p.base_assists || 0, cleanSheets: p.base_clean_sheets || 0, yellowCards: p.base_yellow_cards || 0, redCards: p.base_red_cards || 0 },
          cupStats: sStats.cupStats || { matches: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0 },
          careerHistory: sStats.careerHistory || p.career_history || [],
          baseMatches: p.base_matches || 0,
          baseGoals: p.base_goals || 0,
          baseAssists: p.base_assists || 0,
          baseCleanSheets: p.base_clean_sheets || 0,
          baseYellowCards: p.base_yellow_cards || 0,
          baseRedCards: p.base_red_cards || 0,
          ratingsHistory: p.ratings_history || [],
          age: p.age || null,
          nationality: p.nationality || null,
          foot: p.foot || null,
          height: p.height || null,
          number: p.shirt_number || null,
          shirt_number: p.shirt_number || null
        };
      });
    }

    if (dbCoaches) {
      parsed.coaches = dbCoaches.map((c: any) => {
        const sStats = c.season_stats || {};
        return {
          id: c.id,
          name: fixMojibake(c.name || ""),
          image: c.image,
          teamId: c.team_id,
          teamName: fixMojibake(c.team_name || ""),
          nationality: fixMojibake(c.nationality || ""),
          age: c.age || null,
          biography: c.biography || "",
          seasonStats: sStats,
          careerHistory: sStats.careerHistory || c.career_history || [],
          teamHistory: sStats.teamHistory || c.team_history || [],
          baseMatches: c.base_matches || 0,
          baseWins: c.base_wins || 0,
          baseDraws: c.base_draws || 0,
          baseLosses: c.base_losses || 0,
          titles: c.titles || [],
          coachingStyle: c.coaching_style || "",
          licenseLevel: c.license_level || "",
          experienceYears: c.experience_years || 0,
          recentForm: c.recent_form || []
        };
      });
    }

    if (dbMatches) {
      parsed.matches = [];
      parsed.football_Feature_Games = [];
      parsed.football_Now_Games = [];
      parsed.football_Finished_Games = [];
      parsed.futsal_Feature_Games = [];
      parsed.futsal_Now_Games = [];
      parsed.futsal_Finished_Games = [];

      dbMatches.forEach((m: any) => {
        const mappedMatch = {
          id: m.id,
          teamHome: m.team_home,
          teamAway: m.team_away,
          teamHomeId: m.team_home_id,
          teamAwayId: m.team_away_id,
          teamHomeLogo: m.team_home_logo,
          teamAwayLogo: m.team_away_logo,
          scoreHome: m.score_home || 0,
          scoreAway: m.score_away || 0,
          status: m.status || 'not-started',
          minutes: m.minutes,
          league: m.league,
          date: m.date,
          time: m.time,
          venue: m.venue,
          isPopular: m.is_popular || false,
          hotTopic: m.hot_topic,
          predictions: m.predictions,
          sport: m.sport || 'football',
          stage: m.stage || 'Feature_Games',
          tag: m.tag,
          isAutoFinished: m.is_auto_finished || false,
          lineups: m.lineups,
          events: m.events,
          scorersList: m.scorers_list,
          teamStats: m.team_stats,
          referee: m.referee
        };

        parsed.matches.push(mappedMatch);

        const sport = m.sport || 'football';
        const stage = m.stage || 'Feature_Games';
        const targetListKey = `${sport}_${stage}`;
        if (parsed[targetListKey]) {
          parsed[targetListKey].push(mappedMatch);
        }
      });
    }

    if (dbTransfers) {
      parsed.transfers = dbTransfers.map((t: any) => ({
        id: t.id,
        playerName: fixMojibake(t.player_name || ""),
        playerImage: t.player_image,
        fromTeam: fixMojibake(t.from_team || ""),
        fromTeamLogo: t.from_team_logo,
        toTeam: fixMojibake(t.to_team || ""),
        toTeamLogo: t.to_team_logo,
        type: t.type,
        fee: t.fee,
        date: t.date,
        details: fixMojibake(t.description || t.details || ""),
        description: fixMojibake(t.description || t.details || ""),
        viewCount: t.view_count || 0,
        createdAt: t.created_at || null,
        tags: Array.isArray(t.tags) ? t.tags.map((x: any) => fixMojibake(String(x))) : (typeof t.tags === 'string' ? t.tags.replace(/[{}]/g, '').split(',').map((x: any) => fixMojibake(x.trim())).filter(Boolean) : [])
      }));
    }



    if (dbLegionnaires) {
      parsed.legionnaires = dbLegionnaires.map((l: any) => ({
        id: l.id,
        name: fixMojibake(l.name || ""),
        image: l.image,
        league: fixMojibake(l.league || ""),
        team: fixMojibake(l.team || ""),
        teamLogo: l.team_logo,
        summary: fixMojibake(l.summary || ""),
        logo: l.logo,
        performance: fixMojibake(l.description || l.performance || ""),
        description: fixMojibake(l.description || l.performance || ""),
        viewCount: l.view_count || 0,
        createdAt: l.created_at || null,
        tags: Array.isArray(l.tags) ? l.tags.map((x: any) => fixMojibake(String(x))) : (typeof l.tags === 'string' ? l.tags.replace(/[{}]/g, '').split(',').map((x: any) => fixMojibake(x.trim())).filter(Boolean) : [])
      }));
    }

    if (dbImages) {
      parsed.images = dbImages.map((img: any) => {
        let parsedTags: string[] = [];
        if (img.tags) {
          if (Array.isArray(img.tags)) {
            parsedTags = img.tags.map((t: any) => String(t));
          } else if (typeof img.tags === 'string') {
            try {
              const res = JSON.parse(img.tags);
              if (Array.isArray(res)) {
                parsedTags = res.map((t: any) => String(t));
              } else {
                parsedTags = [res];
              }
            } catch (e) {
              parsedTags = img.tags.replace(/[{}]/g, '').split(',').map((t: any) => t.trim()).filter(Boolean);
            }
          }
        }
        return {
          id: img.id,
          url: img.url,
          title: fixMojibake(img.title || img.caption || ""),
          caption: fixMojibake(img.caption || img.title || ""),
          description: fixMojibake(img.description || ""),
          tags: parsedTags.map((t: string) => fixMojibake(t)),
          createdAt: img.created_at,
          viewCount: img.view_count || 0
        };
      });
    }

    if (!parsed.images) {
      parsed.images = [];
    }

    if (dbStandings) {
      dbStandings.forEach((league: any) => {
        parsed.standings[league.league_key] = Array.isArray(league.rows) ? league.rows : [];
      });
    }

    if (dbStats) {
      dbStats.forEach((league: any) => {
        parsed.stats[league.league_key] = league.data;
      });
    }

    if (dbSubmissions) {
      parsed.submissions = dbSubmissions.map((sub: any) => ({
        id: sub.id,
        name: sub.name,
        email: sub.email,
        subject: sub.subject,
        message: sub.message,
        isRead: sub.is_read || false,
        createdAt: sub.created_at
      }));
    }

    if (dbHeroSlides) {
      parsed.heroSlides = dbHeroSlides.map((slide: any) => ({
        id: slide.id,
        image: slide.image,
        title: slide.title,
        subtitle: slide.subtitle,
        link: slide.link,
        active: slide.active !== false,
        sort_order: slide.sort_order || 0,
        sourceType: slide.source_type || "custom",
        sourceId: slide.source_id || ""
      }));
    }

    if (dbSelectedCombinations) {
      parsed.selectedCombinations = dbSelectedCombinations.map((sc: any) => {
        let leagueKey = "pro-league";
        let week = 1;

        if (sc.id && sc.id.startsWith("sc-")) {
          const parts = sc.id.split("-");
          const wPart = parts.find((p: string) => p.startsWith("w") && !isNaN(parseInt(p.slice(1), 10)));
          if (wPart) {
            week = parseInt(wPart.slice(1), 10);
            if (parts.includes("pro") && parts.includes("league")) {
              leagueKey = "pro-league";
            } else if (parts.includes("1")) {
              leagueKey = "league-1";
            } else if (parts.includes("2")) {
              leagueKey = "league-2";
            } else if (parts.includes("futsal")) {
              leagueKey = "futsal";
            }
          }
        }

        let posObj = sc.positions;
        if (typeof posObj === "string" && posObj.trim() !== "") {
          try {
            posObj = JSON.parse(posObj);
          } catch (e) {
            posObj = {};
          }
        }
        if (posObj && typeof posObj === "object") {
          if (posObj.leagueKey) leagueKey = posObj.leagueKey;
          if (posObj.week) week = Number(posObj.week);
        }

        let playersObj = sc.players;
        if (typeof playersObj === "string" && playersObj.trim() !== "") {
          try {
            playersObj = JSON.parse(playersObj);
          } catch (e) {
            playersObj = {};
          }
        }

        return {
          id: sc.id,
          leagueKey: leagueKey,
          week: week,
          title: sc.title,
          description: sc.description,
          positions: posObj,
          players: playersObj,
          createdAt: sc.created_at
        };
      });
    }

    if (dbTeamTransfersList && dbTeamTransfersList.data && dbTeamTransfersList.data.length > 0) {
      parsed.teamTransfersList = dbTeamTransfersList.data.map((t: any) => ({
        id: t.id,
        teamName: t.team_name,
        teamLogo: t.team_logo,
        incomings: Array.isArray(t.incomings) ? t.incomings : [],
        outgoings: Array.isArray(t.outgoings) ? t.outgoings : [],
        probables: Array.isArray(t.probables) ? t.probables : []
      }));
    } else {
      parsed.teamTransfersList = [];
    }

    if (dbMediaFiles && dbMediaFiles.data) {
      parsed.media_files = dbMediaFiles.data.map((mf: any) => ({
        id: mf.id,
        title: mf.title,
        file_name: mf.file_name,
        file_path: mf.file_path,
        image_url: mf.image_url,
        file_size: mf.file_size,
        mime_type: mf.mime_type,
        category: mf.category,
        old_url: mf.old_url,
        created_at: mf.created_at,
        updated_at: mf.updated_at
      }));
    } else {
      parsed.media_files = [];
    }

    if (dbArchives && dbArchives.data) {
      parsed.archives = dbArchives.data.map((a: any) => ({
        id: a.id,
        season_tag: a.season_tag,
        type: a.type,
        data: a.data,
        createdAt: a.created_at
      }));
    } else {
      parsed.archives = [];
    }

    const migResult = runDatabaseMigrationsAndTransitions(parsed);
    recalculateAndSyncDatabase();

    if (migResult.changed) {
      logMessage("info", "database", "تشخیص تغییرات ساختاری در مهاجرت خودکار داده‌ها؛ ثبت تغییرات در پایگاه داده...");
      setDb(parsed);
      saveDB();
    }

    logMessage("info", "database", "کل داده‌ها با موفقیت از PostgreSQL دریافت و همگام گردید.");
    setDb(parsed);
  } catch (err: any) {
    logMessage("error", "database", "خطا در بارگذاری اولیه اطلاعات از PostgreSQL", err.message || err);
    setDb(seedData);
  }
}

export async function saveDB(): Promise<void> {
  return dbLock.acquire(async () => {
  const data = loadDB();
  try {
    const allStagedMatches: any[] = [];
    const sports = ["football", "futsal"];
    const stages = ["Feature_Games", "Now_Games", "Finished_Games"];
    
    sports.forEach(sport => {
      stages.forEach(stage => {
        const arrKey = `${sport}_${stage}`;
        const arr = data[arrKey] || [];
        arr.forEach((m: any) => {
          allStagedMatches.push({ ...m, sport, stage });
        });
      });
    });

    const matchIdMap = new Map<string, any>();
    allStagedMatches.forEach(m => {
      const existing = matchIdMap.get(m.id);
      if (!existing) {
        matchIdMap.set(m.id, m);
      } else {
        if (m.stage !== "Feature_Games") {
          matchIdMap.set(m.id, m);
        }
      }
    });
    data.matches = Array.from(matchIdMap.values());

    runDatabaseMigrationsAndTransitions(data);
    recalculateAndSyncDatabase();

    const promises: any[] = [];

    if (data.news && data.news.length > 0) {
      const formattedNews = data.news.map((n: any) => ({
        id: n.id,
        title: n.title,
        summary: n.summary,
        content: n.content,
        image: n.image,
        category: n.category,
        tags: n.tags || [],
        view_count: n.viewCount || 0,
        created_at: n.createdAt
      }));
      promises.push(pgDb.from('news').upsert(formattedNews));
      
      const newsIds = data.news.map((x: any) => x.id);
      promises.push(pgDb.from('news').delete().not('id', 'in', `(${newsIds.join(',')})`));
    } else if (data.news) {
      promises.push(pgDb.from('news').delete().neq('id', ''));
    }

    if (data.teams && data.teams.length > 0) {
      const formattedTeams = data.teams.map((t: any) => {
        const stats = {
          ...(t.stats || {}),
          coach: t.coach || (t.stats && t.stats.coach) || "",
          city: t.city || (t.stats && t.stats.city) || "",
          stadium: t.stadium || (t.stats && t.stats.stadium) || "",
          stadiumCapacity: t.stadiumCapacity || (t.stats && t.stats.stadiumCapacity) || "",
          founded: t.founded || (t.stats && t.stats.founded) || ""
        };
        return {
          id: t.id,
          name: t.name,
          logo: t.logo,
          stats: stats,
          base_played: t.basePlayed || 0,
          base_won: t.baseWon || 0,
          base_drawn: t.baseDrawn || 0,
          base_lost: t.baseLost || 0,
          base_points: t.basePoints || 0,
          base_goals_for: t.baseGoalsFor || 0,
          base_goals_against: t.baseGoalsAgainst || 0,
          recent_form: t.recentForm || [],
          recent_matches: t.recentMatches || [],
          division_key: t.divisionKey || null,
          is_eliminated: t.isEliminated || false
        };
      });
      promises.push(pgDb.from('teams').upsert(formattedTeams));

      const teamIds = data.teams.map((x: any) => x.id);
      promises.push(pgDb.from('teams').delete().not('id', 'in', `(${teamIds.join(',')})`));
    } else if (data.teams) {
      promises.push(pgDb.from('teams').delete().neq('id', ''));
    }

    if (data.players && data.players.length > 0) {
      const formattedPlayers = data.players.map((p: any) => ({
        id: p.id,
        name: p.name,
        team_id: p.teamId || null,
        team_name: p.teamName,
        position: p.position,
        rating: p.rating,
        average_rating: p.averageRating || 0.0,
        image: p.image,
        season_stats: {
          ...p.seasonStats,
          leagueStats: p.leagueStats,
          cupStats: p.cupStats,
          careerHistory: p.careerHistory || []
        },
        base_matches: p.baseMatches || 0,
        base_goals: p.baseGoals || 0,
        base_assists: p.baseAssists || 0,
        base_clean_sheets: p.baseCleanSheets || 0,
        base_yellow_cards: p.baseYellowCards || 0,
        base_red_cards: p.baseRedCards || 0,
        ratings_history: p.ratingsHistory || [],
        age: p.age || null,
        nationality: p.nationality || null,
        foot: p.foot || null,
        height: p.height || null,
        shirt_number: p.shirt_number ? parseInt(String(p.shirt_number)) || null : (p.number ? parseInt(String(p.number)) || null : null)
      }));
      promises.push(pgDb.from('players').upsert(formattedPlayers));

      const playerIds = data.players.map((x: any) => x.id);
      promises.push(pgDb.from('players').delete().not('id', 'in', `(${playerIds.join(',')})`));
    } else if (data.players) {
      promises.push(pgDb.from('players').delete().neq('id', ''));
    }

    if (data.coaches && data.coaches.length > 0) {
      const formattedCoaches = data.coaches.map((c: any) => ({
        id: c.id,
        name: c.name,
        image: c.image,
        team_id: c.teamId || null,
        team_name: c.teamName,
        nationality: c.nationality,
        age: c.age || null,
        biography: c.biography || "",
        season_stats: {
          ...(c.seasonStats || {}),
          careerHistory: c.careerHistory || [],
          teamHistory: c.teamHistory || []
        },
        base_matches: c.baseMatches || 0,
        base_wins: c.baseWins || 0,
        base_draws: c.baseDraws || 0,
        base_losses: c.baseLosses || 0,
        titles: c.titles || [],
        coaching_style: c.coachingStyle || "",
        license_level: c.licenseLevel || "",
        experience_years: c.experienceYears || 0,
        recent_form: c.recentForm || []
      }));
      promises.push(pgDb.from('coaches').upsert(formattedCoaches));

      const coachIds = data.coaches.map((x: any) => x.id);
      promises.push(pgDb.from('coaches').delete().not('id', 'in', `(${coachIds.join(',')})`));
    } else if (data.coaches) {
      promises.push(pgDb.from('coaches').delete().neq('id', ''));
    }

    if (data.matches && data.matches.length > 0) {
      const formattedMatches = data.matches.map((m: any) => {
        const isFutsal = m.league === "futsal" || m.sport === "futsal";
        const sport = m.sport || (isFutsal ? "futsal" : "football");
        const stage = m.stage || (m.status === "live" ? "Now_Games" : (m.status === "finished" ? "Finished_Games" : "Feature_Games"));
        return {
          id: m.id,
          team_home: m.teamHome,
          team_away: m.teamAway,
          team_home_id: m.teamHomeId,
          team_away_id: m.teamAwayId,
          team_home_logo: m.teamHomeLogo,
          team_away_logo: m.teamAwayLogo,
          score_home: m.scoreHome || 0,
          score_away: m.scoreAway || 0,
          status: m.status || 'not-started',
          minutes: m.minutes || null,
          league: m.league,
          date: m.date,
          time: m.time,
          venue: m.venue,
          is_popular: m.isPopular || false,
          hot_topic: m.hotTopic,
          predictions: m.predictions,
          sport: sport,
          stage: stage,
          tag: m.tag || null,
          is_auto_finished: m.isAutoFinished || false,
          lineups: m.lineups,
          events: m.events,
          scorers_list: m.scorersList,
          team_stats: m.teamStats,
          referee: m.referee || null
        };
      });
      promises.push(pgDb.from('matches').upsert(formattedMatches));

      const matchIds = data.matches.map((x: any) => x.id);
      promises.push(pgDb.from('matches').delete().not('id', 'in', `(${matchIds.join(',')})`));
    } else if (data.matches) {
      promises.push(pgDb.from('matches').delete().neq('id', ''));
    }

    if (data.transfers && data.transfers.length > 0) {
      const formattedTransfers = data.transfers.map((t: any) => ({
        id: t.id,
        player_name: t.playerName,
        player_image: t.playerImage,
        from_team: t.fromTeam,
        from_team_logo: t.fromTeamLogo,
        to_team: t.toTeam,
        to_team_logo: t.toTeamLogo,
        type: t.type,
        fee: t.fee,
        date: t.date,
        description: t.details || t.description || "",
        view_count: t.viewCount || 0,
        created_at: t.createdAt || t.created_at || new Date().toISOString(),
        tags: t.tags || []
      }));
      promises.push(pgDb.from('transfers').upsert(formattedTransfers));

      const transferIds = data.transfers.map((x: any) => x.id);
      promises.push(pgDb.from('transfers').delete().not('id', 'in', `(${transferIds.join(',')})`));
    } else if (data.transfers) {
      promises.push(pgDb.from('transfers').delete().neq('id', ''));
    }

    if (data.legionnaires && data.legionnaires.length > 0) {
      const formattedLegionnaires = data.legionnaires.map((l: any) => ({
        id: l.id,
        name: l.name,
        image: l.image,
        league: l.league,
        team: l.team,
        team_logo: l.teamLogo,
        summary: l.summary || "",
        logo: l.logo,
        description: l.performance || l.description || "",
        view_count: l.viewCount || 0,
        created_at: l.createdAt || l.created_at || new Date().toISOString(),
        tags: l.tags || []
      }));
      promises.push(pgDb.from('legionnaires').upsert(formattedLegionnaires));

      const legionId = data.legionnaires.map((x: any) => x.id);
      promises.push(pgDb.from('legionnaires').delete().not('id', 'in', `(${legionId.join(',')})`));
    } else if (data.legionnaires) {
      promises.push(pgDb.from('legionnaires').delete().neq('id', ''));
    }

    if (data.images && data.images.length > 0) {
      const formattedImages = data.images.map((img: any) => ({
        id: img.id,
        url: img.url,
        title: img.title || null,
        caption: img.caption || null,
        description: img.description || null,
        created_at: img.createdAt || img.created_at || new Date().toISOString(),
        tags: img.tags || [],
        view_count: img.viewCount || 0
      }));
      promises.push(pgDb.from('images').upsert(formattedImages));

      const imgIds = data.images.map((x: any) => x.id);
      promises.push(pgDb.from('images').delete().not('id', 'in', `(${imgIds.join(',')})`));
    } else if (data.images) {
      promises.push(pgDb.from('images').delete().neq('id', ''));
    }

    if (data.standings) {
      for (const [key, val] of Object.entries(data.standings)) {
        promises.push(pgDb.from('standings').upsert({ league_key: key, rows: val }));
      }
    }

    if (data.stats) {
      for (const [key, val] of Object.entries(data.stats)) {
        promises.push(pgDb.from('stats').upsert({ league_key: key, data: val }));
      }
    }

    if (data.teamTransfersList && data.teamTransfersList.length > 0) {
      const formattedTeamTransfers = data.teamTransfersList.map((t: any) => ({
        id: t.id,
        team_name: t.teamName,
        team_logo: t.teamLogo,
        incomings: t.incomings || [],
        outgoings: t.outgoings || [],
        probables: t.probables || []
      }));
      promises.push(
        pgDb.from('team_transfers_list')
          .upsert(formattedTeamTransfers)
          .then(res => {
            if (res.error) {
              logMessage("warn", "database", "جدول تیم_انتقالات در PostgreSQL یافت نشد یا خطا دارد مپ نهایی صورت پذیرفت اما کش محلی اولویت بالاتری دارد.");
            }
            return res;
          })
      );

      const ttIds = data.teamTransfersList.map((x: any) => x.id);
      promises.push(
        pgDb.from('team_transfers_list')
          .delete()
          .not('id', 'in', `(${ttIds.join(',')})`)
          .then(res => res)
      );
    } else if (data.teamTransfersList) {
      promises.push(
        pgDb.from('team_transfers_list')
          .delete()
          .neq('id', '')
          .then(res => res)
      );
    }

    if (data.config) {
      const cfg = data.config;
      promises.push(pgDb.from('config').upsert({
        id: 'main',
        ad_title: cfg.adTitle,
        ad_promo: cfg.adPromo,
        ad_desc: cfg.adDesc,
        ad_link: cfg.adLink,
        ad_btn_text: cfg.adBtnText,
        custom_banner_url: cfg.customBannerUrl,
        ad_slots: cfg.adSlots || [],
        banner_label: cfg.bannerLabel || "",
        banner_label_visible: cfg.bannerLabelVisible !== false,
        banner_tag_text: cfg.bannerTagText || "",
        banner_visible: cfg.bannerVisible !== false,
        popup_ad: cfg.popupAd || { enabled: false },
        floating_ad: cfg.floatingAd || { enabled: false },
        bottom_bar_ad: cfg.bottomBarAd || { enabled: false },
        slide_in_ad: cfg.slideInAd || { enabled: false }
      }));
    }

    if (data.bracket) {
      promises.push(pgDb.from('bracket').upsert({ id: 'main', data: data.bracket }));

      const slots: any[] = [];
      const b = data.bracket;

      if (Array.isArray(b.round16)) {
        b.round16.forEach((m: any, idx: number) => {
          const slotId = `r16-slot-${idx + 1}`;
          const nextSlotId = `qf-slot-${Math.floor(idx / 2) + 1}`;
          slots.push({
            id: slotId,
            stage: 'round-16',
            match_id: (m && m.id && !m.id.startsWith('placeholder-') && !m.id.startsWith('r16-placeholder-')) ? m.id : null,
            next_slot_id: nextSlotId
          });
        });
      }

      if (Array.isArray(b.quarterFinals)) {
        b.quarterFinals.forEach((m: any, idx: number) => {
          const slotId = `qf-slot-${idx + 1}`;
          const nextSlotId = `sf-slot-${Math.floor(idx / 2) + 1}`;
          slots.push({
            id: slotId,
            stage: 'quarter-finals',
            match_id: (m && m.id && !m.id.startsWith('placeholder-') && !m.id.startsWith('qf-placeholder-')) ? m.id : null,
            next_slot_id: nextSlotId
          });
        });
      }

      if (Array.isArray(b.semiFinals)) {
        b.semiFinals.forEach((m: any, idx: number) => {
          const slotId = `sf-slot-${idx + 1}`;
          const nextSlotId = `final-slot-1`;
          slots.push({
            id: slotId,
            stage: 'semi-finals',
            match_id: (m && m.id && !m.id.startsWith('placeholder-') && !m.id.startsWith('sf-placeholder-')) ? m.id : null,
            next_slot_id: nextSlotId
          });
        });
      }

      if (b.final) {
        const m = b.final;
        slots.push({
          id: 'final-slot-1',
          stage: 'final',
          match_id: (m && m.id && !m.id.startsWith('placeholder-') && !m.id.startsWith('final-placeholder')) ? m.id : null,
          next_slot_id: null
        });
      }

      (global as any).__pendingBracketSlots = slots;
    }

    if (data.heroSlides && data.heroSlides.length > 0) {
      const formattedSlides = data.heroSlides.map((slide: any) => ({
        id: slide.id,
        image: slide.image,
        title: slide.title,
        subtitle: slide.subtitle,
        link: slide.link,
        active: slide.active !== false,
        sort_order: slide.sort_order || 0,
        source_type: slide.sourceType || "custom",
        source_id: slide.sourceId || ""
      }));
      promises.push(pgDb.from('hero_slides').upsert(formattedSlides));

      const slideIds = data.heroSlides.map((x: any) => x.id);
      promises.push(pgDb.from('hero_slides').delete().not('id', 'in', `(${slideIds.join(',')})`));
    } else if (data.heroSlides) {
      promises.push(pgDb.from('hero_slides').delete().neq('id', ''));
    }

    if (data.selectedCombinations && data.selectedCombinations.length > 0) {
      const formattedSC = data.selectedCombinations.map((sc: any) => {
        let posObj = sc.positions || {};
        if (typeof posObj === "string" && posObj.trim() !== "") {
          try {
            posObj = JSON.parse(posObj);
          } catch (e) {
            posObj = {};
          }
        } else if (typeof posObj !== "object") {
          posObj = {};
        }

        posObj.leagueKey = sc.leagueKey;
        posObj.week = sc.week;

        let playersObj = sc.players || {};
        if (typeof playersObj === "string" && playersObj.trim() !== "") {
          try {
            playersObj = JSON.parse(playersObj);
          } catch (e) {
            playersObj = {};
          }
        } else if (typeof playersObj !== "object") {
          playersObj = {};
        }

        return {
          id: sc.id,
          title: sc.title,
          description: sc.description,
          positions: posObj,
          players: playersObj,
          created_at: sc.createdAt
        };
      });
      promises.push(pgDb.from('selected_combinations').upsert(formattedSC));

      const scIds = data.selectedCombinations.map((x: any) => x.id);
      promises.push(pgDb.from('selected_combinations').delete().not('id', 'in', `(${scIds.join(',')})`));
    } else if (data.selectedCombinations) {
      promises.push(pgDb.from('selected_combinations').delete().neq('id', ''));
    }

    if (data.lastScraped) {
      promises.push(pgDb.from('system_info').upsert({ key: 'lastScraped', value: data.lastScraped }));
    }

    if (data.currentSeason) {
      promises.push(pgDb.from('system_info').upsert({ key: 'currentSeason', value: data.currentSeason }));
    }

    if (data.submissions && data.submissions.length > 0) {
      const formattedSubs = data.submissions.map((sub: any) => ({
        id: sub.id,
        name: sub.name,
        email: sub.email,
        subject: sub.subject,
        message: sub.message,
        is_read: sub.isRead || false,
        created_at: sub.createdAt
      }));
      promises.push(pgDb.from('submissions').upsert(formattedSubs));

      const subIds = data.submissions.map((x: any) => x.id);
      promises.push(pgDb.from('submissions').delete().not('id', 'in', `(${subIds.join(',')})`));
    } else if (data.submissions) {
      promises.push(pgDb.from('submissions').delete().neq('id', ''));
    }

    if (data.media_files && data.media_files.length > 0) {
      const formattedMedia = data.media_files.map((mf: any) => ({
        id: mf.id,
        title: mf.title || null,
        file_name: mf.file_name,
        file_path: mf.file_path,
        image_url: mf.image_url,
        file_size: mf.file_size || null,
        mime_type: mf.mime_type || null,
        category: mf.category || null,
        old_url: mf.old_url || null,
        created_at: mf.created_at || new Date().toISOString(),
        updated_at: mf.updated_at || new Date().toISOString()
      }));
      promises.push(
        pgDb.from('media_files')
          .upsert(formattedMedia)
          .then(res => {
            if (res.error) {
              logMessage("warn", "database", "جدول رسانه‌ها در PostgreSQL یافت نشد یا خطا دارد مپ نهایی صورت پذیرفت اما کش محلی اولویت بالاتری دارد.");
            }
            return res;
          })
      );

      const mfIds = data.media_files.map((x: any) => x.id);
      promises.push(
        Promise.resolve(
          pgDb.from('media_files')
            .delete()
            .not('id', 'in', `(${mfIds.join(',')})`)
        ).catch(e => null)
      );
    } else if (data.media_files) {
      promises.push(
        Promise.resolve(
          pgDb.from('media_files')
            .delete()
            .neq('id', '')
        ).catch(e => null)
      );
    }

    if (data.archives && data.archives.length > 0) {
      const formattedArchives = data.archives.map((a: any) => ({
        id: a.id,
        season_tag: a.season_tag,
        type: a.type,
        data: a.data,
        created_at: a.createdAt || new Date().toISOString()
      }));
      promises.push(
        Promise.resolve(
          pgDb.from('archive')
            .upsert(formattedArchives)
        ).catch(e => ({ error: e }))
      );

      const archiveIds = data.archives.map((x: any) => x.id);
      promises.push(
        Promise.resolve(
          pgDb.from('archive')
            .delete()
            .not('id', 'in', `(${archiveIds.join(',')})`)
        ).catch(e => ({ error: e }))
      );
    } else if (data.archives) {
      promises.push(
        Promise.resolve(
          pgDb.from('archive')
            .delete()
            .neq('id', '')
        ).catch(e => ({ error: e }))
      );
    }

    const results = await Promise.all(promises);
    const errors = results.filter(r => r && r.error);
    if (errors.length > 0) {
      const errorDetails = errors.map(e => e.error?.message || e.error).join('; ');
      logMessage("warn", "database", "خطا در آپلود تغییرات به PostgreSQL", errors.map(e => e.error));
      throw new Error(`ذخیره‌سازی دیتابیس ناموفق بود: ${errorDetails}`);
    }

    const pendingSlots = (global as any).__pendingBracketSlots;
    if (pendingSlots && pendingSlots.length > 0) {
      try {
        await pgDb.from('bracket_slots').delete().neq('id', '');
        await pgDb.from('bracket_slots').upsert(pendingSlots);
      } catch (e: any) {
        logMessage("warn", "database", "خطا در آپلود bracket_slots", e.message || e);
      }
      delete (global as any).__pendingBracketSlots;
    }

    logMessage("info", "database", "همگام‌سازی PostgreSQL با موفقیت به پایان رسید.");
  } catch (err: any) {
    logMessage("error", "database", "خطای فاجعه‌بار در پس‌زمینه در حین آپلود به PostgreSQL:", err.message || err);
    throw err;
  }
  });
}

export function updateMatchInDb(matchId: string, updates: any): boolean {
  const dbObj = loadDB();
  const sports = ["football", "futsal"];
  const stages = ["Feature_Games", "Now_Games", "Finished_Games"];
  let foundSport = "";
  
  for (const sp of sports) {
    for (const st of stages) {
      if ((dbObj[`${sp}_${st}`] || []).some((m: any) => String(m.id) === String(matchId))) {
        foundSport = sp;
        break;
      }
    }
    if (foundSport) break;
  }
  
  if (!foundSport) {
    return false;
  }
  
  let baseMatchObj: any = null;
  for (const st of stages) {
    const list = dbObj[`${foundSport}_${st}`] || [];
    const item = list.find((m: any) => String(m.id) === String(matchId));
    if (item) {
      baseMatchObj = { ...item };
    }
  }
  
  if (!baseMatchObj) {
    return false;
  }
  
  const mergedMatch = { ...baseMatchObj, ...updates };
  
  if (updates.status === "finished" || updates.scoreHome !== undefined || updates.scoreAway !== undefined || updates.scorersList || updates.events || updates.lineups) {
    delete mergedMatch.tag;
    delete mergedMatch.isAutoFinished;
  }
  
  let targetStage = "Feature_Games";
  if (mergedMatch.status === "finished") {
    targetStage = "Finished_Games";
  } else if (mergedMatch.status === "live") {
    targetStage = "Now_Games";
  }
  
  mergedMatch.stage = targetStage;
  
  stages.forEach(st => {
    dbObj[`${foundSport}_${st}`] = (dbObj[`${foundSport}_${st}`] || []).filter((m: any) => String(m.id) !== String(matchId));
  });
  
  dbObj[`${foundSport}_${targetStage}`].push(mergedMatch);
  
  if (targetStage !== "Feature_Games") {
    const clonedForFeature = { ...mergedMatch, stage: "Feature_Games" };
    dbObj[`${foundSport}_Feature_Games`].push(clonedForFeature);
  }
  
  return true;
}

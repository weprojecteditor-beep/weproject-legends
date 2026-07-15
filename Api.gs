/**
 * WEPROJECT LEGENDS — API (Apps Script Web App) — World Boss model
 * =====================================================================
 * Second file in the same Apps Script project as Code.gs. Shares Code.gs's
 * top-level globals (HERO_CLASS_BY_ROLE, monthStartStr, monthEndStr, …) —
 * do not redeclare those here.
 *
 * DEPLOY
 *   Deploy → Manage deployments → Edit → New version (editing code alone
 *   does NOT update the live /exec URL — you must cut a new version).
 *   Execute as: Me · Who has access: Anyone with the link.
 *
 * ENDPOINTS (GET, ?action=)
 *   state                  → mobile battlefield state (World Boss + rankings)
 *   tv                     → World Boss broadcast state for the office TV
 *   player&id=P001&pin=... → one player's profile
 *   shop                   → shop items + live stock
 *   roster                 → { playerId, name, role, team } for every active
 *                             WeProject player — login hero-picker only,
 *                             no PIN/gold/EXP exposed
 *
 * ENDPOINTS (POST, ?action=, text/plain JSON body — see CORS NOTE)
 *   redeem        { playerId, pin, itemId }
 *   submitMission { playerId, pin, missionId }   — submitting again while
 *                                                  pending cancels it
 *   setHeroClass  { playerId, pin, heroClass, gender }
 *
 * CALCULATION RULES
 *   1. Only EXP_Log rows with approved=TRUE are counted anywhere.
 *   2. Gold = (all-time approved EXP × skin multiplier) − redemptions that
 *      aren't rejected (pending included, so Gold freezes instantly).
 *      Displayed clamp ≥0; if the real value is negative, `player` also
 *      returns goldPendingAdjustment + goldRealValue.
 *   3. Rank uses the season window (calendar month) EXP; Level uses ALL-TIME EXP.
 *   4. Daily cap is a reference value only — never enforced/rejected here.
 *   5. World Boss: one boss with boss_target HP (Config, default 1,000,000).
 *      Damage = approved amount_rm summed across WeProject over the active
 *      season window (Config season_start..season_end, set to "this month").
 *      Beaten when damage >= target. There is NO automatic month rollover —
 *      the GM starts a fresh month by running setSeasonToThisMonth. Rank uses
 *      the same window; each player's ranking "damage" is that window's RM.
 *   6. Pace/bounty eligibility is only FLAGGED (from join_date / month EXP)
 *      — the API never grants EXP or badges automatically.
 *   7. PIN failures are rate-limited via CacheService (Config
 *      pin_fail_limit / pin_fail_window_min); errors never reveal whether
 *      a player_id exists or another player's data.
 *
 * CORS NOTE
 *   ContentService can't set custom response headers or run doOptions
 *   preflight. GET is a plain simple request; POST bodies must be sent as
 *   Content-Type "text/plain" (a JSON string) to stay preflight-free.
 * =====================================================================
 */

var CACHE_SECONDS = 60;
var CLASS_FAMILY_BY_ROLE = { Marketer: 'Carry', LiveHost: 'Fighter', Editor: 'Support', Salesperson: 'Slayer' };

// v1.2 coin-only rewards/penalties (do NOT affect EXP / Rank / Level)
var GROUP_SALES_MISSION_IDS = ['M13', 'M14', 'M15'];  // per-role "update group by 6pm" (Marketer/LiveHost sales, Editor task report) → +5 coins per approved day
var GROUP_SALES_COINS = 5;
var LATE_PENALTY_FIRST = 10;         // 1st–3rd late in a month
var LATE_PENALTY_AFTER = 20;         // 4th+ late in the same month

/* ================================================================== */
/* Routing                                                             */
/* ================================================================== */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'state';
  try {
    if (action === 'state') {
      var team = normalizeTeam(e.parameter.team);
      return json(cached('state:' + team, function () { return getState(team); }));
    }
    if (action === 'tv') return json(cached('tv', getTv));
    if (action === 'shop') {
      var shopTeam = normalizeTeam(e.parameter.team);
      return json(cached('shop:' + shopTeam, function () { return getShop(shopTeam); }));
    }
    if (action === 'player') return json(getPlayer(e.parameter.id, e.parameter.pin));
    if (action === 'roster') return json(cached('roster', getRoster));
    return json({ error: 'Unknown action: ' + action });
  } catch (err) {
    return json({ error: String(err && err.message || err) });
  }
}

function doPost(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  try {
    var body = JSON.parse(e.postData.contents);
    if (action === 'redeem')        return json(redeem(body.playerId, body.pin, body.itemId));
    if (action === 'submitMission') return json(submitMission(body.playerId, body.pin, body.missionId));
    if (action === 'setHeroClass')  return json(setHeroClass(body.playerId, body.pin, body.heroClass, body.gender));
    return json({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  }
}

/* ================================================================== */
/* Endpoint: state (mobile)                                            */
/* ================================================================== */

function getState(team) {
  var cfg = getConfig();
  var players = getPlayers();
  var expApproved = getRows('EXP_Log').filter(isApproved);
  var levelTh = buildLevelThresholds(cfg);

  return {
    boss: getBossState(cfg, players, expApproved),
    damageRanking: getDamageRanking(players, expApproved, cfg, levelTh, 'weproject'),
    creativeRanking: getCreativeRanking(players, expApproved, 'weproject'),
    feed: getTeamFeed(players, 'weproject'),
    actionsTable: getActionsTable('weproject'),
    missionsConfig: getMissionsConfig('weproject'),
    updatedAt: dateTimeStr(new Date())
  };
}

/* ================================================================== */
/* Endpoint: tv (World Boss broadcast)                                 */
/* ================================================================== */

function getTv() {
  var cfg = getConfig();
  var players = getPlayers();
  var expApproved = getRows('EXP_Log').filter(isApproved);
  var levelTh = buildLevelThresholds(cfg);

  return {
    boss: getBossState(cfg, players, expApproved),
    topDamage: getDamageRanking(players, expApproved, cfg, levelTh, 'weproject')
                 .filter(function (p) { return p.damage > 0; }).slice(0, 6),
    feed: getTeamFeed(players, 'weproject'),
    updatedAt: dateTimeStr(new Date())
  };
}

/* ================================================================== */
/* World Boss — WeProject vs one boss (boss_target HP)                 */
/* Damage = approved amount_rm over the active season window           */
/* (Config season_start..season_end). No auto rollover; the GM resets  */
/* to a fresh month by running setSeasonToThisMonth (Code.gs).         */
/* ================================================================== */

/** { start, end, label } for the current calendar month (script tz). */
function monthBoundsNow() {
  var d = new Date();
  return {
    start: Utilities.formatDate(new Date(d.getFullYear(), d.getMonth(), 1), tz(), 'yyyy-MM-dd'),
    end:   Utilities.formatDate(new Date(d.getFullYear(), d.getMonth() + 1, 0), tz(), 'yyyy-MM-dd'),
    label: Utilities.formatDate(d, tz(), 'MMMM yyyy')
  };
}

/**
 * The active season window. Uses Config season_start/season_end (set to "this
 * month" by the GM) so there is NO automatic month rollover — the GM advances
 * it manually by running setSeasonToThisMonth. Falls back to the live calendar
 * month only if those Config cells are blank.
 */
function seasonWindow(cfg) {
  var start = dateStr(cfg.season_start), end = dateStr(cfg.season_end);
  if (!start || !end) { var mb = monthBoundsNow(); start = mb.start; end = mb.end; }
  return { start: start, end: end };
}

/** "July 2026" label from a yyyy-MM-dd string. */
function monthLabel(dateString) {
  var d = new Date(dateString);
  return isNaN(d.getTime()) ? '' : Utilities.formatDate(d, tz(), 'MMMM yyyy');
}

/** Cascade damage across ordered HP segments: fills seg 0, then 1, then 2. */
function segRemain(dealt, segs) {
  var d = dealt, out = [];
  for (var i = 0; i < segs.length; i++) { out.push(Math.max(0, segs[i] - d)); d = Math.max(0, d - segs[i]); }
  return out;
}

/**
 * The 3 stages of the monthly gauntlet: [Tower I, Tower II, Crystal].
 * Uses explicit Config base_tower1_hp/base_tower2_hp/base_crystal_hp if all set,
 * otherwise splits boss_target 30% / 40% / 30% (Tower II biggest).
 */
function bossSegments(cfg, target) {
  var t1 = cfgInt(cfg.base_tower1_hp, 0), t2 = cfgInt(cfg.base_tower2_hp, 0), cr = cfgInt(cfg.base_crystal_hp, 0);
  if (t1 > 0 && t2 > 0 && cr > 0) return [t1, t2, cr];
  // 30 / 40 / 30 — Tower II is the biggest wall (the big adrenaline break), Crystal a 30% finish
  var tower1 = Math.round(target * 0.3), crystal = Math.round(target * 0.3);
  return [tower1, target - tower1 - crystal, crystal];
}

function getBossState(cfg, players, expApproved) {
  var sw = seasonWindow(cfg);
  var target = cfgInt(cfg.boss_target, 1000000);
  var segs = bossSegments(cfg, target);
  var totalHp = segs[0] + segs[1] + segs[2];
  var dealt = sumTeamRevenueInRange(players, expApproved, 'weproject', sw.start, sw.end);
  var today = todayStr();
  var todayDamage = sumTeamRevenueInRange(players, expApproved, 'weproject', today, today);

  var rem = segRemain(Math.max(0, dealt), segs); // guard: negative net (returns > sales) never over-fills a stage
  var meta = [
    { name: 'TOWER I',  icon: '🗼' },
    { name: 'TOWER II', icon: '🗼' },
    { name: 'CRYSTAL',  icon: '💎' }
  ];
  var stageIndex = 3; // index of the stage currently under attack (3 = all cleared)
  var stages = segs.map(function (full, i) {
    var remaining = rem[i];
    var down = remaining <= 0;
    var active = !down && (i === 0 || rem[i - 1] <= 0);
    if (!down && stageIndex === 3) stageIndex = i;
    return {
      name: meta[i].name, icon: meta[i].icon, isCrystal: i === 2,
      full: full, remaining: remaining, pct: full > 0 ? remaining / full : 0,
      down: down, active: active
    };
  });
  var defeated = dealt >= totalHp;

  return {
    name: String(cfg.boss_name || 'CRYSTAL CITADEL'),
    month: monthLabel(sw.start),
    target: totalHp,
    dealt: dealt,
    hpRemaining: Math.max(0, totalHp - dealt),
    hpPct: totalHp > 0 ? Math.min(1, Math.max(0, (totalHp - dealt) / totalHp)) : 0,
    dealtPct: totalHp > 0 ? Math.min(1, Math.max(0, dealt / totalHp)) : 0,
    defeated: defeated,
    todayDamage: todayDamage,
    segs: segs,
    stages: stages,
    stageIndex: defeated ? 3 : stageIndex,
    seasonStart: sw.start,
    seasonEnd: sw.end
  };
}

/** Sum a team's approved amount_rm between two yyyy-MM-dd dates (inclusive). */
function sumTeamRevenueInRange(players, expApproved, team, startStr, endStr) {
  var teamIds = {};
  players.forEach(function (p) { if (p.team === team) teamIds[p.player_id] = true; });
  var sum = 0;
  expApproved.forEach(function (r) {
    if (!teamIds[r.player_id]) return;
    var d = dateStr(r.date);
    if (d >= startStr && d <= endStr) sum += num(r.amount_rm);
  });
  return sum;
}

/* ================================================================== */
/* Rankings + feed                                                     */
/* ================================================================== */

/**
 * Approved daily missions grant their configured EXP (Missions.exp) — so approving
 * a mission in Mission_Log actually pays the player, with no separate EXP_Log entry.
 * Coins-only missions (M13/M14/M15, exp 0) add nothing here; they pay via
 * groupSalesCoins instead, so there is no double count.
 * Returns { playerId: { all, season, today } } (EXP totals).
 */
function approvedMissionExp(seasonStart, seasonEnd, today) {
  var mexp = {};
  getRows('Missions').forEach(function (m) { mexp[String(m.mission_id)] = num(m.exp); });
  var out = {};
  getRows('Mission_Log').forEach(function (l) {
    if (String(l.status) !== 'approved') return;
    var e = mexp[String(l.mission_id)] || 0;
    if (!e) return;
    var d = dateStr(l.date), pid = l.player_id;
    var o = out[pid] || (out[pid] = { all: 0, season: 0, today: 0 });
    o.all += e;
    if (d >= seasonStart && d <= seasonEnd) o.season += e;
    if (d === today) o.today += e;
  });
  return out;
}

/** Players ranked by their season revenue (= damage dealt to the boss). */
function getDamageRanking(players, expApproved, cfg, levelTh, team) {
  var sw = seasonWindow(cfg);
  var seasonStart = sw.start, seasonEnd = sw.end; // boss/Rank window = configured season (this month)
  var dmg = {}, seasonExp = {}, allExp = {};
  expApproved.forEach(function (r) {
    var d = dateStr(r.date);
    if (d >= seasonStart && d <= seasonEnd) dmg[r.player_id] = (dmg[r.player_id] || 0) + num(r.amount_rm); // damage on this month's boss
    allExp[r.player_id] = (allExp[r.player_id] || 0) + num(r.exp);
    if (d >= seasonStart && d <= seasonEnd) seasonExp[r.player_id] = (seasonExp[r.player_id] || 0) + num(r.exp);
  });
  var mex = approvedMissionExp(seasonStart, seasonEnd, todayStr()); // approved daily missions add EXP
  Object.keys(mex).forEach(function (pid) {
    allExp[pid] = (allExp[pid] || 0) + mex[pid].all;
    seasonExp[pid] = (seasonExp[pid] || 0) + mex[pid].season;
  });
  return players.filter(function (p) { return p.active && p.team === team && !isCommander(p); }) // commanders excluded from the board
    .map(function (p) {
      return {
        playerId: p.player_id, name: p.name, role: p.role,
        heroClass: p.hero_class || '',
        gender: p.gender_pref || '',
        rank: rankInfo(seasonExp[p.player_id] || 0, cfg).rank,
        level: levelFromExp(allExp[p.player_id] || 0, levelTh).level,
        damage: dmg[p.player_id] || 0
      };
    })
    .sort(function (a, b) { return b.damage - a.damage; });
}

/** Players ranked by Winning Creative / High-CTR counts (from item text). */
function getCreativeRanking(players, expApproved, team) {
  var byPlayer = {};
  expApproved.forEach(function (r) {
    var p = playerById(players, r.player_id);
    if (!p || p.team !== team) return;
    if (!byPlayer[r.player_id]) byPlayer[r.player_id] = { winning: 0, highCtr: 0 };
    var item = String(r.item || '').toLowerCase();
    if (item.indexOf('winning') !== -1) byPlayer[r.player_id].winning += 1;
    if (item.indexOf('high ctr') !== -1 || item.indexOf('high-ctr') !== -1) byPlayer[r.player_id].highCtr += 1;
  });
  return players.filter(function (p) {
      var a = byPlayer[p.player_id];
      return p.team === team && !isCommander(p) && a && (a.winning > 0 || a.highCtr > 0); // only real winners, no commanders
    })
    .map(function (p) {
      var a = byPlayer[p.player_id];
      return { playerId: p.player_id, name: p.name, role: p.role, heroClass: p.hero_class || '', gender: p.gender_pref || '', winningCount: a.winning, highCtrCount: a.highCtr };
    })
    .sort(function (a, b) { return (b.winningCount - a.winningCount) || (b.highCtrCount - a.highCtrCount); });
}

/** Today's Achievements_Feed rows for a team, newest first. */
function getTeamFeed(players, team) {
  var today = todayStr();
  var teamIds = {};
  players.forEach(function (p) { if (p.team === team) teamIds[p.player_id] = true; });
  return getRows('Achievements_Feed')
    .filter(function (f) { return teamIds[f.player_id] && dateStr(f.timestamp) === today; })
    .sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); })
    .map(function (f) {
      var p = playerById(players, f.player_id);
      return { playerId: f.player_id, name: p ? p.name : f.player_id, tag: f.tag, icon: f.icon, description: f.description, exp: num(f.exp), timestamp: dateTimeStr(f.timestamp), commander: isCommander(p) };
    });
}

/* ================================================================== */
/* Guide-page data (Actions / Missions, filtered by team+role)         */
/* ================================================================== */

function getActionsTable(team) {
  return getRows('Actions').filter(function (a) { return bool(a.active) && a.team === team; })
    .map(function (a) {
      return { actionId: a.action_id, role: a.role, name: a.name_en, condition: a.condition_en, exp: num(a.exp), dailyCap: a.daily_cap === '' ? null : num(a.daily_cap), category: a.category };
    });
}

function getMissionsConfig(team) {
  return getRows('Missions').filter(function (m) { return bool(m.active) && m.team === team; })
    .sort(function (a, b) { return num(a.sort) - num(b.sort); })
    .map(function (m) { return { missionId: m.mission_id, role: m.role, text: m.text_en, exp: num(m.exp), sort: num(m.sort) }; });
}

/* ================================================================== */
/* Endpoint: player                                                    */
/* ================================================================== */

function getPlayer(id, pin) {
  var players = getPlayers();
  var p = playerById(players, id);
  if (!p) return { error: 'Player not found' };

  var pinErr = verifyPin(p, pin);
  if (pinErr) return pinErr;

  var cfg = getConfig();
  var levelTh = buildLevelThresholds(cfg);
  var sw = seasonWindow(cfg);
  var seasonStart = sw.start, seasonEnd = sw.end; // Rank window = configured season (this month)
  var today = todayStr();

  var mine = getRows('EXP_Log').filter(function (r) { return r.player_id === id && isApproved(r); });

  var allExp = 0, seasonExp = 0, todayExp = 0, badges = [];
  for (var i = 0; i < mine.length; i++) {
    var r = mine[i];
    allExp += num(r.exp);
    var d = dateStr(r.date);
    if (d >= seasonStart && d <= seasonEnd) seasonExp += num(r.exp);
    if (d === today) todayExp += num(r.exp);
    var cat = String(r.category || '').toLowerCase();
    if ((cat === 'milestone' || cat === 'achievement' || cat === 'mvp') && r.item) badges.push(String(r.item));
  }

  var mex = approvedMissionExp(seasonStart, seasonEnd, today)[id]; // approved daily missions add EXP/coins
  if (mex) { allExp += mex.all; seasonExp += mex.season; todayExp += mex.today; }

  var lvl = levelFromExp(allExp, levelTh);
  var rank = rankInfo(seasonExp, cfg);

  var gold = goldBalanceReal(id, Math.round(allExp * goldMultiplier(lvl.level))); // may be negative (lateness)

  var redemptionHistory = getRows('Redemptions')
    .filter(function (rd) { return rd.player_id === id; })
    .sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); })
    .map(function (rd) { return { timestamp: dateTimeStr(rd.timestamp), itemName: rd.item_name, goldCost: num(rd.gold_cost), status: String(rd.status || 'pending') }; });

  var recentLog = mine.slice()
    .sort(function (a, b) { return new Date(b.date) - new Date(a.date); })
    .slice(0, 20)
    .map(function (r) { return { date: dateStr(r.date), category: r.category, item: r.item, exp: num(r.exp), amountRm: r.amount_rm === '' ? null : num(r.amount_rm) }; });

  var out = {
    playerId: id,
    name: p.name,
    role: p.role,
    team: p.team,
    status: p.status,
    gender: p.gender_pref || '',
    avatar: p.avatar,
    heroClass: p.hero_class || '',
    classFamily: CLASS_FAMILY_BY_ROLE[p.role] || '',
    level: lvl.level,
    expInLevel: lvl.expInLevel,
    expToNextLevel: lvl.expToNextLevel,
    seasonExp: seasonExp,
    rank: rank.rank,
    nextRank: rank.nextRank,
    expToNextRank: rank.expToNextRank,
    gold: gold,
    todayExp: todayExp,
    badges: badges,
    missionsToday: getMissionsToday(p, today),
    redemptionHistory: redemptionHistory,
    paceEligible: computePaceEligibility(p, mine, cfg, players),
    recentLog: recentLog
  };
  return out;
}

function getMissionsToday(p, today) {
  var missions = getRows('Missions')
    .filter(function (m) { return bool(m.active) && m.team === p.team && (m.role === p.role || m.role === 'Any'); })
    .sort(function (a, b) { return num(a.sort) - num(b.sort); });

  var logRows = getRows('Mission_Log').filter(function (l) { return l.player_id === p.player_id && dateStr(l.date) === today; });
  function statusFor(missionId) {
    var row = logRows.filter(function (l) { return l.mission_id === missionId; })[0];
    return row ? String(row.status) : 'todo';
  }
  return missions.map(function (m) { return { missionId: m.mission_id, text: m.text_en, exp: num(m.exp), status: statusFor(m.mission_id) }; });
}

/** Pace badges (join_date → Lv10/Lv20 within X days) and the once-per-season Lv15 season-EXP bounty — flags only, GM grants. */
function computePaceEligibility(p, mine, cfg, players) {
  var out = [];
  if (!p.join_date) return out;
  var joinStr = dateStr(p.join_date);

  var sorted = mine.slice().sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
  function crossDate(thresholdExp) {
    var cum = 0;
    for (var i = 0; i < sorted.length; i++) {
      cum += num(sorted[i].exp);
      if (cum >= thresholdExp) return dateStr(sorted[i].date);
    }
    return null;
  }
  function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }

  var cross10 = crossDate(num(cfg.lv10));
  if (cross10 && daysBetween(joinStr, cross10) <= num(cfg.pace_lv10_days)) {
    out.push({ type: 'pace', label: 'Fast Climber — Lv10 within ' + num(cfg.pace_lv10_days) + ' days', bonus: num(cfg.pace_lv10_bonus) });
  }
  var cross20 = crossDate(num(cfg.lv20));
  if (cross20 && daysBetween(joinStr, cross20) <= num(cfg.pace_lv20_days)) {
    out.push({ type: 'pace', label: 'Fast Climber — Lv20 within ' + num(cfg.pace_lv20_days) + ' days', bonus: num(cfg.pace_lv20_bonus) });
  }

  var sw = seasonWindow(cfg);
  var earliest = findEarliestSeasonThresholdCrosser(players, num(cfg.lv15), sw.start, sw.end);
  if (earliest && earliest.playerId === p.player_id) {
    out.push({ type: 'bounty', label: 'First to Lv15 season EXP this season', bonus: num(cfg.bounty_lv15) });
  }

  return out;
}

/** Across ALL players, who first crossed thresholdExp in cumulative SEASON exp this season. */
function findEarliestSeasonThresholdCrosser(players, thresholdExp, seasonStart, seasonEnd) {
  var seasonRows = getRows('EXP_Log').filter(isApproved).filter(function (r) {
    var d = dateStr(r.date);
    return d >= seasonStart && d <= seasonEnd;
  });
  var byPlayer = {};
  seasonRows.forEach(function (r) {
    if (!byPlayer[r.player_id]) byPlayer[r.player_id] = [];
    byPlayer[r.player_id].push(r);
  });
  var best = null;
  Object.keys(byPlayer).forEach(function (pid) {
    var rows = byPlayer[pid].slice().sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
    var cum = 0;
    for (var i = 0; i < rows.length; i++) {
      cum += num(rows[i].exp);
      if (cum >= thresholdExp) {
        var d = dateStr(rows[i].date);
        if (!best || d < best.date) best = { playerId: pid, date: d };
        break;
      }
    }
  });
  return best;
}

/* ================================================================== */
/* Endpoint: roster (login hero-picker — name/role/team only)          */
/* ================================================================== */

function getRoster() {
  // Players + commanders both appear in login (commanders = view-all-data logins,
  // grouped separately by the app via `status`). Commanders are still excluded
  // from the leaderboards themselves (see getDamageRanking/getCreativeRanking).
  return getPlayers()
    .filter(function (p) { return p.active && p.team === 'weproject'; })
    .map(function (p) { return { playerId: p.player_id, name: p.name, role: p.role, team: p.team, status: p.status, gender: p.gender_pref || '', heroClass: p.hero_class || '' }; });
}

/* ================================================================== */
/* Endpoint: shop                                                      */
/* ================================================================== */

function getShop(team) {
  team = normalizeTeam(team);
  var redemptions = getRows('Redemptions');
  return getRows('Shop')
    .filter(function (s) { return bool(s.active) && s.team === team; })
    .map(function (s) {
      var stock = num(s.stock);
      var remaining = stock; // -1 = unlimited
      if (stock >= 0) {
        var used = redemptions.filter(function (rd) { return rd.item_id === s.item_id && String(rd.status) !== 'rejected'; }).length;
        remaining = Math.max(0, stock - used);
      }
      return { itemId: s.item_id, name: s.name, icon: s.icon, price: num(s.price), stock: stock, remaining: remaining };
    });
}

/* ================================================================== */
/* POST: redeem                                                        */
/* ================================================================== */

function redeem(playerId, pin, itemId) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var players = getPlayers();
    var p = playerById(players, playerId);
    if (!p) return { ok: false, error: 'Player not found' };
    var pinErr = verifyPin(p, pin);
    if (pinErr) return { ok: false, error: pinErr.error };

    var item = getRows('Shop').filter(function (s) { return s.item_id === itemId && bool(s.active) && s.team === p.team; })[0];
    if (!item) return { ok: false, error: 'Item unavailable' };

    var redemptions = getRows('Redemptions');

    // Same player + same item already pending blocks a resubmit; approved/fulfilled do NOT block (buying 2 coffees in a day is fine).
    var hasPending = redemptions.some(function (rd) { return rd.player_id === playerId && rd.item_id === itemId && String(rd.status) === 'pending'; });
    if (hasPending) return { ok: false, error: 'Already pending GM approval for this item' };

    var stock = num(item.stock);
    if (stock >= 0) {
      var used = redemptions.filter(function (rd) { return rd.item_id === itemId && String(rd.status) !== 'rejected'; }).length;
      if (used >= stock) return { ok: false, error: 'Out of stock' };
    }

    var allExp = 0;
    getRows('EXP_Log').forEach(function (r) { if (r.player_id === playerId && isApproved(r)) allExp += num(r.exp); });
    var mexR = approvedMissionExp('0000-01-01', '9999-12-31', todayStr())[playerId]; // approved daily missions add EXP
    if (mexR) allExp += mexR.all;
    var lvlR = levelFromExp(allExp, buildLevelThresholds(getConfig())).level;
    var goldReal = goldBalanceReal(playerId, Math.round(allExp * goldMultiplier(lvlR)));
    var price = num(item.price);
    if (goldReal < price) return { ok: false, error: 'Not enough Gold' };

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Redemptions');
    sheet.appendRow([new Date(), playerId, itemId, item.name, price, 'pending', p.name]); // player = readable name; id cols stay the key

    CacheService.getScriptCache().removeAll(['state:weproject', 'state:wellous', 'shop:weproject', 'shop:wellous']);

    return { ok: true, message: 'Redeemed! Pending GM approval', goldRemaining: goldReal - price };
  } finally {
    lock.releaseLock();
  }
}

/* ================================================================== */
/* POST: submitMission                                                 */
/* ================================================================== */

function submitMission(playerId, pin, missionId) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var players = getPlayers();
    var p = playerById(players, playerId);
    if (!p) return { ok: false, error: 'Player not found' };
    var pinErr = verifyPin(p, pin);
    if (pinErr) return { ok: false, error: pinErr.error };

    var mission = getRows('Missions').filter(function (m) { return m.mission_id === missionId && bool(m.active); })[0];
    if (!mission) return { ok: false, error: 'Mission unavailable' };

    var today = todayStr();
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Mission_Log');
    var values = sheet.getDataRange().getValues();
    for (var r = 1; r < values.length; r++) {
      if (dateStr(values[r][0]) === today && values[r][1] === playerId && values[r][2] === missionId) {
        if (String(values[r][3]) === 'pending') {
          sheet.deleteRow(r + 1);
          CacheService.getScriptCache().removeAll(['state:weproject', 'state:wellous']);
          return { ok: true, message: 'Submission cancelled', status: 'todo' };
        }
        return { ok: false, error: 'Already submitted today' };
      }
    }
    sheet.appendRow([new Date(), playerId, missionId, 'pending', p.name, mission.text_en]); // player/mission = readable, id cols stay the key
    CacheService.getScriptCache().removeAll(['state:weproject', 'state:wellous']);
    return { ok: true, message: 'Waiting GM approval', status: 'pending' };
  } finally {
    lock.releaseLock();
  }
}

/* ================================================================== */
/* POST: setHeroClass                                                  */
/* ================================================================== */

function setHeroClass(playerId, pin, heroClass, gender) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var players = getPlayers();
    var p = playerById(players, playerId);
    if (!p) return { ok: false, error: 'Player not found' };
    var pinErr = verifyPin(p, pin);
    if (pinErr) return { ok: false, error: pinErr.error };

    var allowed = HERO_CLASS_BY_ROLE[p.role] || [];
    if (allowed.indexOf(heroClass) === -1) {
      return { ok: false, error: 'That hero is not in your class (role: ' + p.role + ')' };
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Players');
    var values = sheet.getDataRange().getValues();
    var headers = values[0];
    var col = {};
    headers.forEach(function (h, i) { col[h] = i; });
    for (var r = 1; r < values.length; r++) {
      if (values[r][col['player_id']] === playerId) {
        sheet.getRange(r + 1, col['hero_class'] + 1).setValue(heroClass);
        if (gender) sheet.getRange(r + 1, col['gender_pref'] + 1).setValue(gender);
        break;
      }
    }
    CacheService.getScriptCache().removeAll(['state:weproject', 'state:wellous', 'tv']);
    return { ok: true, heroClass: heroClass };
  } finally {
    lock.releaseLock();
  }
}

/* ================================================================== */
/* Config write — used by Code.gs season-reset helpers                 */
/* ================================================================== */

function setConfigValue(key, value) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Config');
  if (!sheet) return;
  var values = sheet.getDataRange().getValues();
  for (var r = 1; r < values.length; r++) {
    if (values[r][0] === key) { sheet.getRange(r + 1, 2).setValue(value); return; }
  }
  sheet.appendRow([key, value]);
}

/* ================================================================== */
/* Domain helpers                                                      */
/* ================================================================== */

function normalizeTeam(t) { return (t === 'wellous') ? 'wellous' : 'weproject'; }

/**
 * Gold = earned Gold (EXP × skin multiplier) − redemptions that aren't rejected
 *        + coin-only adjustments (group-sales bonus − lateness penalty).
 * Coin adjustments never touch EXP / Rank / Level. Balance MAY go negative.
 */
function goldBalanceReal(playerId, earnedGold) {
  var spent = 0;
  getRows('Redemptions').forEach(function (rd) {
    if (rd.player_id === playerId && String(rd.status) !== 'rejected') spent += num(rd.gold_cost);
  });
  return earnedGold - spent + coinAdjustments(playerId);
}

/** Coin-only net for a player: + group-sales bonus, − lateness penalty. */
function coinAdjustments(playerId) {
  return groupSalesCoins(playerId) + latenessCoins(playerId);
}

/** +5 coins for each approved group-update mission (M13/M14/M15) log row. */
function groupSalesCoins(playerId) {
  var n = 0;
  getRows('Mission_Log').forEach(function (l) {
    if (l.player_id === playerId && GROUP_SALES_MISSION_IDS.indexOf(String(l.mission_id)) !== -1 && String(l.status) === 'approved') n++;
  });
  return n * GROUP_SALES_COINS;
}

/**
 * Lateness penalty (negative). Per calendar month: 1st–3rd late = −10 each,
 * 4th+ = −20 each; the tier resets on the 1st. Reads the Lateness tab
 * (date, player_id, …). Past months stay deducted (history), tier just resets.
 */
function latenessCoins(playerId) {
  var byMonth = {};
  getRows('Lateness').forEach(function (r) {
    if (r.player_id !== playerId) return;
    var d = dateStr(r.date);
    if (!d) return;
    var key = d.slice(0, 7); // yyyy-MM
    byMonth[key] = (byMonth[key] || 0) + 1;
  });
  var penalty = 0;
  Object.keys(byMonth).forEach(function (key) {
    var c = byMonth[key];
    penalty += Math.min(c, 3) * LATE_PENALTY_FIRST + Math.max(0, c - 3) * LATE_PENALTY_AFTER;
  });
  return -penalty;
}

/** Skin bonus: leveling up multiplies the Gold you earn from EXP. */
function goldMultiplier(level) {
  if (level >= 20) return 1.2;   // Legend skin
  if (level >= 10) return 1.1;   // Elite skin
  return 1.0;                    // General
}

/** Rank from season EXP → { rank, nextRank, expToNextRank }. */
function rankInfo(seasonExp, cfg) {
  var tiers = [
    ['Warrior', num(cfg.rank_warrior)],
    ['Elite',   num(cfg.rank_elite)],
    ['Master',  num(cfg.rank_master)],
    ['Epic',    num(cfg.rank_epic)],
    ['Legend',  num(cfg.rank_legend)],
    ['Mythic',  num(cfg.rank_mythic)]
  ];
  var idx = 0;
  for (var i = 0; i < tiers.length; i++) {
    if (seasonExp >= tiers[i][1]) idx = i;
  }
  var current = tiers[idx];
  var next = tiers[idx + 1] || null;
  return {
    rank: current[0],
    nextRank: next ? next[0] : null,
    expToNextRank: next ? Math.max(0, next[1] - seasonExp) : 0
  };
}

/** Build a level→EXP threshold table (levels 0..30) from Config anchors. */
function buildLevelThresholds(cfg) {
  var anchors = [
    [0, 0],
    [5, num(cfg.lv5)],
    [10, num(cfg.lv10)],
    [15, num(cfg.lv15)],
    [20, num(cfg.lv20)],
    [25, num(cfg.lv25)],
    [30, num(cfg.lv30)]
  ];
  var th = [];
  for (var a = 0; a < anchors.length - 1; a++) {
    var l0 = anchors[a][0], e0 = anchors[a][1];
    var l1 = anchors[a + 1][0], e1 = anchors[a + 1][1];
    for (var l = l0; l < l1; l++) {
      th[l] = e0 + (e1 - e0) * ((l - l0) / (l1 - l0));
    }
  }
  th[30] = anchors[anchors.length - 1][1];
  return th;
}

/** All-time EXP → { level, expInLevel, expToNextLevel }. */
function levelFromExp(exp, th) {
  var level = 0;
  for (var l = th.length - 1; l >= 0; l--) {
    if (th[l] !== undefined && exp >= th[l]) { level = l; break; }
  }
  if (level >= 30) return { level: 30, expInLevel: 0, expToNextLevel: 0 };
  var band = th[level + 1] - th[level];
  return { level: level, expInLevel: Math.round(exp - th[level]), expToNextLevel: Math.round(band) };
}

function pinMatches(player, pin) {
  var stored = String(player.pin == null ? '' : player.pin).trim();
  if (stored === '') return false;
  return stored === String(pin == null ? '' : pin).trim();
}

/** PIN check + rate limiting, in one place so every endpoint fails the same friendly way. */
function verifyPin(player, pin) {
  if (!checkPinRateLimit(player.player_id)) {
    return { error: 'Too many wrong PINs — try again in a few minutes' };
  }
  if (!pinMatches(player, pin)) {
    recordPinFailure(player.player_id);
    return { error: 'Wrong PIN, try again' };
  }
  clearPinFailures(player.player_id);
  return null;
}

function checkPinRateLimit(playerId) {
  var cfg = getConfig();
  var limit = num(cfg.pin_fail_limit) || 10;
  var count = Number(CacheService.getScriptCache().get('pinfail_' + playerId) || 0);
  return count < limit;
}

function recordPinFailure(playerId) {
  var cfg = getConfig();
  var windowSec = (num(cfg.pin_fail_window_min) || 10) * 60;
  var cache = CacheService.getScriptCache();
  var count = Number(cache.get('pinfail_' + playerId) || 0) + 1;
  cache.put('pinfail_' + playerId, String(count), windowSec);
}

function clearPinFailures(playerId) {
  CacheService.getScriptCache().remove('pinfail_' + playerId);
}

/* ================================================================== */
/* Sheet access + primitives                                           */
/* ================================================================== */

/** Read a tab as an array of row-objects keyed by header. */
function getRows(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (row.join('') === '') continue;
    var obj = {};
    for (var c = 0; c < headers.length; c++) obj[headers[c]] = row[c];
    out.push(obj);
  }
  return out;
}

function getPlayers() {
  return getRows('Players').map(function (p) {
    p.active = bool(p.active);
    p.status = String(p.status || 'player').trim().toLowerCase(); // 'player' | 'commander'
    return p;
  });
}

/** Commanders count toward boss damage but earn nothing and never appear on leaderboards. */
function isCommander(p) { return p && p.status === 'commander'; }

function getConfig() {
  var map = {};
  getRows('Config').forEach(function (row) {
    if (row.key !== '' && row.key != null) map[row.key] = row.value;
  });
  return map;
}

function playerById(players, id) {
  for (var i = 0; i < players.length; i++) {
    if (players[i].player_id === id) return players[i];
  }
  return null;
}

function isApproved(r) { return bool(r.approved); }

/* ---- caching ---- */
function cached(key, producerFn) {
  var cache = CacheService.getScriptCache();
  var hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  var data = producerFn();
  cache.put(key, JSON.stringify(data), CACHE_SECONDS);
  return data;
}

/* ---- output ---- */
function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---- coercion ---- */
function num(v) {
  if (v === '' || v == null) return 0;
  var n = Number(v);
  return isNaN(n) ? 0 : n;
}

/**
 * Config integer that may come back as a year-1900 Date — happens when the
 * value cell inherited a stale date format (Sheets renders the number 3 as
 * "Jan 2, 1900" and getValues returns a Date). Fall back to the default.
 */
function cfgInt(v, def) {
  if (v instanceof Date) return def;
  var n = num(v);
  return n > 0 ? n : def;
}

function bool(v) {
  if (v === true) return true;
  if (v === false || v == null) return false;
  var s = String(v).trim().toLowerCase();
  return s === 'true' || s === 'yes' || s === '1';
}

/* ---- dates (script timezone) ---- */
function tz() { return Session.getScriptTimeZone(); }

function dateStr(v) {
  if (v === '' || v == null) return '';
  var d = (v instanceof Date) ? v : new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return Utilities.formatDate(d, tz(), 'yyyy-MM-dd');
}

function dateTimeStr(v) {
  var d = (v instanceof Date) ? v : new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return Utilities.formatDate(d, tz(), 'yyyy-MM-dd HH:mm');
}

function todayStr() {
  return Utilities.formatDate(new Date(), tz(), 'yyyy-MM-dd');
}

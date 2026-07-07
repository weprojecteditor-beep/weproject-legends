/**
 * WEPROJECT LEGENDS — Phase 2: Apps Script API (Web App) — SPEC V5.1
 * =====================================================================
 * Second file in the same Apps Script project as Code.gs (Phase 1).
 * Shares Code.gs's top-level `var`/`function` globals: CATEGORIES, TEAMS,
 * ROLE_OPTIONS, HERO_CLASS_BY_ROLE, BUFF_TYPES, BUFF_STATUSES,
 * CRYSTAL_BROKEN_OPTIONS, LORD_SIDE_OPTIONS, monthStartStr/monthEndStr/
 * mondayOfThisWeekStr/currentMonthStr — do not redeclare those here.
 *
 * DEPLOY
 *   Deploy → Manage deployments → Edit → New version (editing code alone
 *   does NOT update the live /exec URL — you must cut a new version).
 *   Execute as: Me · Who has access: Anyone with the link.
 *
 * ENDPOINTS (GET, ?action=)
 *   state&team=weproject   → mobile battlefield state for that team
 *   tv                     → neutral dual-team state for the TV broadcast
 *   player&id=P001&pin=... → one player's profile
 *   shop&team=weproject    → that team's shop items + live stock
 *   roster                 → { playerId, name, role, team } for every active
 *                             player, both teams — login hero-picker only,
 *                             no PIN/gold/EXP/team-internal data exposed
 *
 * ENDPOINTS (POST, ?action=, text/plain JSON body — see CORS NOTE)
 *   redeem        { playerId, pin, itemId }
 *   submitMission { playerId, pin, missionId }   — submitting again while
 *                                                  pending cancels it
 *   setHeroClass  { playerId, pin, heroClass, gender }
 *   lockWeek      { adminPin, weekNo }            — GM weekly settlement
 *
 * CALCULATION RULES (SPEC §Phase 2 + §4.0, the authoritative Crystal War
 * model)
 *   1. Only EXP_Log rows with approved=TRUE are counted anywhere.
 *   2. Gold = cumulative approved EXP − redemptions that aren't rejected
 *      (pending included, so Gold freezes instantly). Displayed clamp ≥0;
 *      if the real value is negative, `player` also returns
 *      goldPendingAdjustment + goldRealValue.
 *   3. Rank uses SEASON (calendar month) EXP; Level uses ALL-TIME EXP.
 *   4. Daily cap is a reference value only — never enforced/rejected here.
 *   5. Crystal War: weekly rope (net RM this week, resets Monday) and
 *      personal Damage (RM summed all season, never resets) are two
 *      different views of the same amount_rm rows — see §4.0. Towers are a
 *      discrete weekly win counter, settled by lockWeek (GM, Sun 23:59).
 *      A settlement week with <4 business days folds into the prior week
 *      instead of awarding its own tower (protects against a 2-day fluke).
 *   6. Power Creep is auto-claimed (no GM judgment): first today's approved
 *      row whose item text contains "double kill". Lord is judged by the
 *      API (record-break hint) but the ×2 is applied and confirmed by the
 *      GM directly in the Crystal_War tab (lord_double_side/date) since
 *      the multiplier itself is folded into numbers by hand.
 *   7. Pace/bounty eligibility is only FLAGGED (from join_date / season
 *      EXP) — the API never grants EXP or badges automatically.
 *   8. PIN failures are rate-limited via CacheService (Config
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
    if (action === 'steal')         return json(steal(body.playerId, body.pin, body.targetId));
    if (action === 'lockWeek')      return json(lockWeek(body.adminPin, body.weekNo));
    return json({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  }
}

/* ================================================================== */
/* Endpoint: state (mobile, per-team)                                  */
/* ================================================================== */

function getState(team) {
  team = normalizeTeam(team);
  var cfg = getConfig();
  var players = getPlayers();
  var expApproved = getRows('EXP_Log').filter(isApproved);

  var cw = getCrystalWarState(cfg, players, expApproved, team);
  var levelTh = buildLevelThresholds(cfg);

  return {
    crystalWar: cw.forTeam,
    damageRanking: getDamageRanking(players, expApproved, cfg, levelTh, team),
    creativeRanking: getCreativeRanking(players, expApproved, team),
    buffs: getBuffsState(players, expApproved, cfg),
    feed: getTeamFeed(players, team),
    actionsTable: getActionsTable(team),
    missionsConfig: getMissionsConfig(team),
    updatedAt: dateTimeStr(new Date())
  };
}

/* ================================================================== */
/* Endpoint: tv (neutral, dual-team broadcast)                         */
/* ================================================================== */

function getTv() {
  var cfg = getConfig();
  var players = getPlayers();
  var expApproved = getRows('EXP_Log').filter(isApproved);

  var cw = getCrystalWarState(cfg, players, expApproved, 'weproject');

  return {
    crystalWar: cw.neutral,
    factions: {
      weproject: getFactionSummary(players, expApproved, 'weproject'),
      wellous:   getFactionSummary(players, expApproved, 'wellous')
    },
    mixedFeed: getMixedFeed(players),
    laneMatchups: computeLaneMatchupsNeutral(players, expApproved, cfg),
    updatedAt: dateTimeStr(new Date())
  };
}

/* ================================================================== */
/* Crystal War (§4.0 — rope is computed live, towers are read/settled) */
/* ================================================================== */

function getCrystalWarRow() {
  return getRows('Crystal_War')[0] || {};
}

/** { start, end } as 'yyyy-MM-dd' for the Mon–Sun week starting at weekStartStr. */
function weekBounds(weekStartStr) {
  var start = new Date(weekStartStr);
  var end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: dateStr(start), end: dateStr(end) };
}

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

function getCrystalWarState(cfg, players, expApproved, team) {
  var row = getCrystalWarRow();
  var wb = weekBounds(dateStr(row.week_start));
  var liveNetNeutral = sumTeamRevenueInRange(players, expApproved, 'weproject', wb.start, wb.end)
                      - sumTeamRevenueInRange(players, expApproved, 'wellous', wb.start, wb.end);

  var towersPerSide = cfgInt(cfg.towers_per_side, 3);
  var lockTime = cfgTime(cfg.lock_time, '23:59');
  var wpTowers = num(row.wp_towers);
  var wlTowers = num(row.wl_towers);
  var crystalBroken = String(row.crystal_broken || 'none');

  // Draining-HP model: each team's cumulative SEASON revenue is the damage it
  // deals to the enemy base — Tower I → Tower II → Crystal (segs = HP stages).
  var seasonStart = dateStr(cfg.season_start), seasonEnd = dateStr(cfg.season_end);
  var wpSeasonRev = sumTeamRevenueInRange(players, expApproved, 'weproject', seasonStart, seasonEnd);
  var wlSeasonRev = sumTeamRevenueInRange(players, expApproved, 'wellous', seasonStart, seasonEnd);
  var segs = [cfgInt(cfg.base_tower1_hp, 300000), cfgInt(cfg.base_tower2_hp, 300000), cfgInt(cfg.base_crystal_hp, 400000)];

  var today = todayStr();
  var wpToday = sumTeamRevenueInRange(players, expApproved, 'weproject', today, today);
  var wlToday = sumTeamRevenueInRange(players, expApproved, 'wellous', today, today);
  var lordSide = (String(row.lord_double_side || 'none') !== 'none' && dateStr(row.lord_double_date) === today)
    ? String(row.lord_double_side) : 'none';

  function forTeam(t) {
    var liveNet = t === 'weproject' ? liveNetNeutral : -liveNetNeutral;
    var ourTowers = t === 'weproject' ? wpTowers : wlTowers;
    var enemyTowers = t === 'weproject' ? wlTowers : wpTowers;
    var dealtByUs = t === 'weproject' ? wpSeasonRev : wlSeasonRev;
    var dealtByThem = t === 'weproject' ? wlSeasonRev : wpSeasonRev;
    var ourToday = t === 'weproject' ? wpToday : wlToday;
    return {
      weekNo: num(row.current_week_no),
      weekStart: wb.start,
      lockAt: wb.end + ' ' + lockTime,
      liveNet: liveNet,
      liveLeader: liveNet > 0 ? 'us' : (liveNet < 0 ? 'enemy' : 'even'),
      ourTowers: ourTowers,
      enemyTowers: enemyTowers,
      towersPerSide: towersPerSide,
      dealtByUs: dealtByUs,       // our damage on the ENEMY base
      dealtByThem: dealtByThem,   // enemy damage on OUR base
      segs: segs,                 // [tower1Hp, tower2Hp, crystalHp]
      ourToday: ourToday,         // revenue dealt today
      crystalBroken: crystalBroken === 'none' ? 'none' : (crystalBroken === t ? 'us' : 'enemy'),
      lord: { side: lordSide === 'none' ? 'none' : (lordSide === t ? 'us' : 'enemy'), date: row.lord_double_date ? dateStr(row.lord_double_date) : '' }
    };
  }

  var neutral = {
    weekNo: num(row.current_week_no),
    weekStart: wb.start,
    lockAt: wb.end + ' ' + lockTime,
    liveNet: liveNetNeutral, // positive = weproject ahead this week
    wpTowers: wpTowers,
    wlTowers: wlTowers,
    towersPerSide: towersPerSide,
    dealtByWp: wpSeasonRev,
    dealtByWl: wlSeasonRev,
    segs: segs,
    wpToday: wpToday,
    wlToday: wlToday,
    crystalBroken: crystalBroken,
    lord: { side: lordSide, date: row.lord_double_date ? dateStr(row.lord_double_date) : '' }
  };

  return { forTeam: forTeam(team), neutral: neutral };
}

/* ================================================================== */
/* Lane Matchups (cross-team KO board — name + damage ONLY)            */
/* ================================================================== */

function computeLaneMatchupsNeutral(players, expApproved, cfg) {
  var margin = cfgInt(cfg.ko_margin, 2);
  var damageByPlayer = {};
  expApproved.forEach(function (r) { damageByPlayer[r.player_id] = (damageByPlayer[r.player_id] || 0) + num(r.amount_rm); });

  function teamRanked(team) {
    return players.filter(function (p) { return p.active && p.team === team; })
      .map(function (p) { return { playerId: p.player_id, name: p.name, damage: damageByPlayer[p.player_id] || 0 }; })
      .sort(function (a, b) { return b.damage - a.damage; });
  }

  var wp = teamRanked('weproject');
  var wl = teamRanked('wellous');
  var slots = Math.min(wp.length, wl.length); // never reveal the larger team's headcount

  var out = [];
  for (var i = 0; i < slots; i++) {
    var a = wp[i], b = wl[i];
    var ko = null;
    if (b.damage === 0 && a.damage > 0) ko = 'weproject';
    else if (a.damage === 0 && b.damage > 0) ko = 'wellous';
    else if (a.damage >= b.damage * margin && a.damage > 0) ko = 'weproject';
    else if (b.damage >= a.damage * margin && b.damage > 0) ko = 'wellous';
    out.push({ slot: i + 1, weproject: { name: a.name, damage: a.damage }, wellous: { name: b.name, damage: b.damage }, ko: ko });
  }
  return out;
}

function laneMatchupsForTeam(neutralList, team) {
  var enemyTeam = team === 'weproject' ? 'wellous' : 'weproject';
  return neutralList.map(function (m) {
    return {
      slot: m.slot,
      us: m[team],
      enemy: m[enemyTeam],
      ko: m.ko === team ? 'us' : (m.ko === enemyTeam ? 'enemy' : null)
    };
  });
}

/* ================================================================== */
/* Creative ranking, feeds, faction summary                            */
/* ================================================================== */

/** This team's players ranked by season revenue (amount_rm) — the "attack" board. */
function getDamageRanking(players, expApproved, cfg, levelTh, team) {
  var seasonStart = dateStr(cfg.season_start), seasonEnd = dateStr(cfg.season_end);
  var dmg = {}, seasonExp = {}, allExp = {};
  expApproved.forEach(function (r) {
    var d = dateStr(r.date);
    dmg[r.player_id] = (dmg[r.player_id] || 0) + num(r.amount_rm);
    allExp[r.player_id] = (allExp[r.player_id] || 0) + num(r.exp);
    if (d >= seasonStart && d <= seasonEnd) seasonExp[r.player_id] = (seasonExp[r.player_id] || 0) + num(r.exp);
  });
  return players.filter(function (p) { return p.active && p.team === team; })
    .map(function (p) {
      return {
        playerId: p.player_id, name: p.name, role: p.role,
        heroClass: p.hero_class || '',
        rank: rankInfo(seasonExp[p.player_id] || 0, cfg).rank,
        level: levelFromExp(allExp[p.player_id] || 0, levelTh).level,
        damage: dmg[p.player_id] || 0
      };
    })
    .sort(function (a, b) { return b.damage - a.damage; });
}

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
      return p.team === team && a && (a.winning > 0 || a.highCtr > 0); // only real winners
    })
    .map(function (p) {
      var a = byPlayer[p.player_id];
      return { playerId: p.player_id, name: p.name, role: p.role, heroClass: p.hero_class || '', winningCount: a.winning, highCtrCount: a.highCtr };
    })
    .sort(function (a, b) { return (b.winningCount - a.winningCount) || (b.highCtrCount - a.highCtrCount); });
}

function getTeamFeed(players, team) {
  var today = todayStr();
  var teamIds = {};
  players.forEach(function (p) { if (p.team === team) teamIds[p.player_id] = true; });
  return getRows('Achievements_Feed')
    .filter(function (f) { return teamIds[f.player_id] && dateStr(f.timestamp) === today; })
    .sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); })
    .map(function (f) {
      var p = playerById(players, f.player_id);
      return { playerId: f.player_id, name: p ? p.name : f.player_id, tag: f.tag, icon: f.icon, description: f.description, exp: num(f.exp), timestamp: dateTimeStr(f.timestamp) };
    });
}

function getMixedFeed(players) {
  var today = todayStr();
  return getRows('Achievements_Feed')
    .filter(function (f) { return dateStr(f.timestamp) === today; })
    .sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); })
    .map(function (f) {
      var p = playerById(players, f.player_id);
      return { playerId: f.player_id, name: p ? p.name : f.player_id, team: p ? p.team : '', tag: f.tag, icon: f.icon, description: f.description, exp: num(f.exp), timestamp: dateTimeStr(f.timestamp) };
    });
}

function getFactionSummary(players, expApproved, team) {
  var damageByPlayer = {};
  expApproved.forEach(function (r) { damageByPlayer[r.player_id] = (damageByPlayer[r.player_id] || 0) + num(r.amount_rm); });
  var top3 = players.filter(function (p) { return p.active && p.team === team; })
    .map(function (p) { return { playerId: p.player_id, name: p.name, role: p.role, damage: damageByPlayer[p.player_id] || 0 }; })
    .sort(function (a, b) { return b.damage - a.damage; })
    .slice(0, 3);
  return { top3Damage: top3, feed: getTeamFeed(players, team) };
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
/* Neutral Buffs: Power Creep (auto-claimed) + Lord (record hint)      */
/* ================================================================== */

/** Today's revenue for a team + its top contributor (used for the neutral-objective race). */
function teamTodayRevenue(players, expApproved, team, today) {
  var teamIds = {};
  players.forEach(function (p) { if (p.team === team) teamIds[p.player_id] = true; });
  var byPlayer = {}, total = 0;
  expApproved.forEach(function (r) {
    if (!teamIds[r.player_id]) return;
    if (dateStr(r.date) !== today) return;
    var v = num(r.amount_rm);
    total += v;
    byPlayer[r.player_id] = (byPlayer[r.player_id] || 0) + v;
  });
  var topId = '', topV = 0;
  Object.keys(byPlayer).forEach(function (id) { if (byPlayer[id] > topV) { topV = byPlayer[id]; topId = id; } });
  var p = playerById(players, topId);
  return { total: total, topId: topId, topName: p ? p.name : '' };
}

// Neutral objectives are a REVENUE RACE: the first team to reach the daily
// target slays it and claims the buff. Slayer = that team's top earner today.
function getBuffsState(players, expApproved, cfg) {
  var today = todayStr();
  var wp = teamTodayRevenue(players, expApproved, 'weproject', today);
  var wl = teamTodayRevenue(players, expApproved, 'wellous', today);
  function objective(target) {
    var wpHit = target > 0 && wp.total >= target;
    var wlHit = target > 0 && wl.total >= target;
    var slainTeam = null;
    if (wpHit && wlHit) slainTeam = wp.total >= wl.total ? 'weproject' : 'wellous';
    else if (wpHit) slainTeam = 'weproject';
    else if (wlHit) slainTeam = 'wellous';
    var win = slainTeam === 'weproject' ? wp : (slainTeam === 'wellous' ? wl : null);
    return {
      status: slainTeam ? 'slain' : 'alive',
      slainTeam: slainTeam || 'none',
      slainBy: win ? win.topName : '',
      slainById: win ? win.topId : '',
      wpProgress: wp.total, wlProgress: wl.total, target: target
    };
  }
  return {
    powerCreep: objective(cfgInt(cfg.power_creep_target, 300000)),
    lord: objective(cfgInt(cfg.lord_target, 800000))
  };
}

/** First today's approved row mentioning "double kill" claims Power Creep — no GM judgment involved. */
function claimPowerCreepIfClaimed(expApproved, today) {
  var todays = expApproved.filter(function (r) { return dateStr(r.date) === today; });
  for (var i = 0; i < todays.length; i++) {
    var item = String(todays[i].item || '').toLowerCase();
    if (item.indexOf('double kill') !== -1) {
      updateBuffRow('power', today, 'slain', todays[i].player_id);
      return todays[i].player_id;
    }
  }
  return null;
}

/** Compares each team's today revenue to their own best day so far this season. */
function computeRecordBrokenToday(players, expApproved, cfg, today) {
  var seasonStart = dateStr(cfg.season_start), seasonEnd = dateStr(cfg.season_end);
  var out = { weproject: false, wellous: false };
  ['weproject', 'wellous'].forEach(function (team) {
    var teamIds = {};
    players.forEach(function (p) { if (p.team === team) teamIds[p.player_id] = true; });
    var byDate = {};
    expApproved.forEach(function (r) {
      if (!teamIds[r.player_id]) return;
      var d = dateStr(r.date);
      if (d < seasonStart || d > seasonEnd) return;
      byDate[d] = (byDate[d] || 0) + num(r.amount_rm);
    });
    var record = 0;
    Object.keys(byDate).forEach(function (d) { if (d !== today && byDate[d] > record) record = byDate[d]; });
    var todayTotal = byDate[today] || 0;
    if (todayTotal > 0 && todayTotal > record) out[team] = true;
  });
  return out;
}

function ensureTodayBuffRow(type) {
  var today = todayStr();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Buffs');
  if (!sheet) return;
  if (getRows('Buffs').some(function (b) { return dateStr(b.date) === today && b.buff_type === type; })) return;

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    var exists = getRows('Buffs').some(function (b) { return dateStr(b.date) === today && b.buff_type === type; });
    if (!exists) sheet.appendRow([new Date(), type, 'alive', '', '']);
  } finally {
    lock.releaseLock();
  }
}

function updateBuffRow(type, dateStrVal, status, slainBy) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Buffs');
  if (!sheet) return;
  var values = sheet.getDataRange().getValues();
  for (var r = 1; r < values.length; r++) {
    if (dateStr(values[r][0]) === dateStrVal && values[r][1] === type) {
      if (values[r][2] !== status || values[r][3] !== slainBy) {
        var lock = LockService.getScriptLock();
        if (lock.tryLock(5000)) {
          try {
            sheet.getRange(r + 1, 3).setValue(status);
            sheet.getRange(r + 1, 4).setValue(slainBy);
          } finally {
            lock.releaseLock();
          }
        }
      }
      return;
    }
  }
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
  var seasonStart = dateStr(cfg.season_start), seasonEnd = dateStr(cfg.season_end);
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

  var lvl = levelFromExp(allExp, levelTh);
  var rank = rankInfo(seasonExp, cfg);

  var goldReal = goldBalanceReal(id, Math.round(allExp * goldMultiplier(lvl.level)));
  var goldClamped = Math.max(0, goldReal);

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
    gold: goldClamped,
    todayExp: todayExp,
    badges: badges,
    missionsToday: getMissionsToday(p, today),
    redemptionHistory: redemptionHistory,
    paceEligible: computePaceEligibility(p, mine, cfg, players),
    recentLog: recentLog
  };
  if (goldReal < goldClamped) {
    out.goldPendingAdjustment = true;
    out.goldRealValue = goldReal;
  }
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

  var earliest = findEarliestSeasonThresholdCrosser(players, num(cfg.lv15), dateStr(cfg.season_start), dateStr(cfg.season_end));
  if (earliest && earliest.playerId === p.player_id) {
    out.push({ type: 'bounty', label: 'First to Lv15 season EXP this season', bonus: num(cfg.bounty_lv15) });
  }

  return out;
}

/** Across ALL players, who first crossed thresholdExp in cumulative SEASON exp this season — re-triggers every season. */
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
  return getPlayers()
    .filter(function (p) { return p.active; })
    .map(function (p) { return { playerId: p.player_id, name: p.name, role: p.role, team: p.team }; });
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
    var lvlR = levelFromExp(allExp, buildLevelThresholds(getConfig())).level;
    var goldReal = goldBalanceReal(playerId, Math.round(allExp * goldMultiplier(lvlR)));
    var price = num(item.price);
    if (Math.max(0, goldReal) < price) return { ok: false, error: 'Not enough Gold' };

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Redemptions');
    sheet.appendRow([new Date(), playerId, itemId, item.name, price, 'pending']);

    CacheService.getScriptCache().removeAll(['state:weproject', 'state:wellous', 'shop:weproject', 'shop:wellous']);

    return { ok: true, message: 'Redeemed! Pending GM approval', goldRemaining: Math.max(0, goldReal) - price };
  } finally {
    lock.releaseLock();
  }
}

/* ================================================================== */
/* POST: steal (Coin Snatcher — cross-team PvP Gold raid)              */
/* ================================================================== */

function steal(attackerId, pin, targetId) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var players = getPlayers();
    var a = playerById(players, attackerId);
    if (!a) return { ok: false, error: 'Player not found' };
    var pinErr = verifyPin(a, pin);
    if (pinErr) return { ok: false, error: pinErr.error };
    var t = playerById(players, targetId);
    if (!t || !t.active) return { ok: false, error: 'Target not found' };
    if (t.team === a.team) return { ok: false, error: 'You can only raid the enemy team' };

    var cfg = getConfig();
    var cost = cfgInt(cfg.steal_weapon_cost, 300);
    var amount = cfgInt(cfg.steal_amount, 500);
    var defReward = cfgInt(cfg.steal_defense_reward, 100);

    var today = todayStr();
    var already = getRows('Steals').some(function (s) { return s.attacker_id === attackerId && dateStr(s.timestamp) === today; });
    if (already) return { ok: false, error: 'You already raided today — cooldown until tomorrow' };

    if (goldOf(attackerId, cfg) < cost) return { ok: false, error: 'Not enough Gold for the raid (need ' + cost + ')' };

    var success = goldOf(targetId, cfg) >= amount;
    var stolen = success ? amount : 0;
    var defense = success ? 0 : defReward;

    ensureStealsSheet().appendRow([new Date(), attackerId, targetId, cost, stolen, success ? 'success' : 'backfire', defense]);
    CacheService.getScriptCache().removeAll(['state:weproject', 'state:wellous']);

    if (success) return { ok: true, result: 'success', message: '😈 Raid success! Stole ' + amount + ' Gold from ' + t.name };
    return { ok: true, result: 'backfire', message: '🛡 Backfired! ' + t.name + " didn't have enough Gold — you lost " + cost };
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
    sheet.appendRow([new Date(), playerId, missionId, 'pending']);
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
/* POST: lockWeek (GM weekly Crystal War settlement)                   */
/* ================================================================== */

function lockWeek(adminPin, weekNo) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var cfg = getConfig();
    var adminPinCfg = String(cfg.admin_pin == null ? '' : cfg.admin_pin).trim();
    if (adminPinCfg === '' || String(adminPin || '').trim() !== adminPinCfg) {
      return { ok: false, error: 'Wrong admin PIN' };
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Crystal_War');
    var values = sheet.getDataRange().getValues();
    var headers = values[0];
    var col = {};
    headers.forEach(function (h, i) { col[h] = i; });
    var row = values[1];
    if (!row) return { ok: false, error: 'Crystal_War tab has no data row' };

    var currentWeekNo = num(row[col['current_week_no']]);
    if (weekNo != null && Number(weekNo) !== currentWeekNo) {
      return { ok: false, error: 'Week already advanced (expected week ' + currentWeekNo + ')' };
    }

    var players = getPlayers();
    var expApproved = getRows('EXP_Log').filter(isApproved);

    var weekStartStr = dateStr(row[col['week_start']]);
    var wb = weekBounds(weekStartStr);
    var seasonStart = dateStr(cfg.season_start), seasonEnd = dateStr(cfg.season_end);

    var workDays = countWeekdaysInRange(wb.start, wb.end, seasonStart, seasonEnd);
    var net = sumTeamRevenueInRange(players, expApproved, 'weproject', wb.start, wb.end)
            - sumTeamRevenueInRange(players, expApproved, 'wellous', wb.start, wb.end);

    var towersPerSide = cfgInt(cfg.towers_per_side, 3);
    var wpTowers = num(row[col['wp_towers']]);
    var wlTowers = num(row[col['wl_towers']]);
    var crystalBroken = String(row[col['crystal_broken']] || 'none');
    var skipped = false;
    var winnerSide = null;

    if (workDays < 4) {
      // Residual month-end week — does not settle on its own (its revenue already
      // counted permanently toward personal Damage, so no team loses out).
      skipped = true;
    } else if (net > 0) {
      winnerSide = 'weproject';
    } else if (net < 0) {
      winnerSide = 'wellous';
    }

    if (winnerSide && crystalBroken === 'none') {
      var current = winnerSide === 'weproject' ? wpTowers : wlTowers;
      if (current >= towersPerSide) {
        crystalBroken = winnerSide; // already had all enemy towers down — winning again shatters the crystal
      } else {
        current += 1;
        if (winnerSide === 'weproject') wpTowers = current; else wlTowers = current;
      }
    }

    var nextWeekStart = new Date(wb.end);
    nextWeekStart.setDate(nextWeekStart.getDate() + 1);
    var nextWeekStartStr = dateStr(nextWeekStart);

    var newSeason = String(row[col['season']] || currentMonthStr());
    var newWeekNo = currentWeekNo + 1;
    var rolledSeason = false;
    var newLordSide = row[col['lord_double_side']];
    var newLordDate = row[col['lord_double_date']];

    if (monthStr(nextWeekStart) !== monthStr(new Date(weekStartStr))) {
      rolledSeason = true;
      newSeason = monthStr(nextWeekStart);
      newWeekNo = 1;
      wpTowers = 0; wlTowers = 0; crystalBroken = 'none';
      newLordSide = 'none'; newLordDate = '';
    }

    row[col['season']] = newSeason;
    row[col['current_week_no']] = newWeekNo;
    row[col['week_start']] = nextWeekStartStr;
    row[col['wp_towers']] = wpTowers;
    row[col['wl_towers']] = wlTowers;
    row[col['crystal_broken']] = crystalBroken;
    row[col['lord_double_side']] = newLordSide;
    row[col['lord_double_date']] = newLordDate;

    sheet.getRange(2, 1, 1, headers.length).setValues([headers.map(function (h) { return row[col[h]]; })]);

    if (rolledSeason) {
      setConfigValue('season_start', monthStartStrFromDate(nextWeekStart));
      setConfigValue('season_end', monthEndStrFromDate(nextWeekStart));
    }

    CacheService.getScriptCache().removeAll(['state:weproject', 'state:wellous', 'tv']);

    return {
      ok: true,
      settledWeek: currentWeekNo,
      weekRange: wb,
      workDays: workDays,
      skipped: skipped,
      net: net,
      winnerSide: winnerSide,
      towers: { weproject: wpTowers, wellous: wlTowers },
      crystalBroken: crystalBroken,
      rolledToNewSeason: rolledSeason,
      nextWeekNo: newWeekNo,
      nextWeekStart: nextWeekStartStr
    };
  } finally {
    lock.releaseLock();
  }
}

function countWeekdaysInRange(startStr, endStr, boundStartStr, boundEndStr) {
  var start = new Date(Math.max(new Date(startStr), new Date(boundStartStr)));
  var end = new Date(Math.min(new Date(endStr), new Date(boundEndStr)));
  var count = 0;
  for (var d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    var day = d.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

function setConfigValue(key, value) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Config');
  if (!sheet) return;
  var values = sheet.getDataRange().getValues();
  for (var r = 1; r < values.length; r++) {
    if (values[r][0] === key) { sheet.getRange(r + 1, 2).setValue(value); return; }
  }
  sheet.appendRow([key, value]);
}

function monthStartStrFromDate(d) {
  return Utilities.formatDate(new Date(d.getFullYear(), d.getMonth(), 1), tz(), 'yyyy-MM-dd');
}

function monthEndStrFromDate(d) {
  return Utilities.formatDate(new Date(d.getFullYear(), d.getMonth() + 1, 0), tz(), 'yyyy-MM-dd');
}

/* ================================================================== */
/* Domain helpers                                                      */
/* ================================================================== */

function normalizeTeam(t) { return (t === 'wellous') ? 'wellous' : 'weproject'; }

/** Gold = earned Gold (EXP × skin multiplier) − redemptions that aren't rejected + raid net. */
function goldBalanceReal(playerId, earnedGold) {
  var spent = 0;
  getRows('Redemptions').forEach(function (rd) {
    if (rd.player_id === playerId && String(rd.status) !== 'rejected') spent += num(rd.gold_cost);
  });
  return earnedGold - spent + stealNet(playerId);
}

/** Skin bonus: leveling up multiplies the Gold you earn from EXP. */
function goldMultiplier(level) {
  if (level >= 20) return 1.2;   // Legend skin
  if (level >= 10) return 1.1;   // Elite skin
  return 1.0;                    // General
}

/** Net Gold from PvP raids: attacker (+stolen − weapon cost), target (+defense reward − stolen). */
function stealNet(playerId) {
  var net = 0;
  getRows('Steals').forEach(function (s) {
    if (s.attacker_id === playerId) net += num(s.stolen_amount) - num(s.weapon_cost);
    if (s.target_id === playerId) net += num(s.defense_reward) - num(s.stolen_amount);
  });
  return net;
}

/** Full current Gold for any player (EXP × skin multiplier − spending + raid net), clamped ≥0. */
function goldOf(playerId, cfg) {
  var levelTh = buildLevelThresholds(cfg);
  var allExp = 0;
  getRows('EXP_Log').forEach(function (r) { if (r.player_id === playerId && isApproved(r)) allExp += num(r.exp); });
  var lvl = levelFromExp(allExp, levelTh).level;
  return Math.max(0, goldBalanceReal(playerId, Math.round(allExp * goldMultiplier(lvl))));
}

function ensureStealsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Steals');
  if (!sheet) {
    sheet = ss.insertSheet('Steals');
    sheet.getRange(1, 1, 1, 7).setValues([['timestamp', 'attacker_id', 'target_id', 'weapon_cost', 'stolen_amount', 'result', 'defense_reward']]);
    sheet.setFrozenRows(1);
  }
  return sheet;
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
    return p;
  });
}

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
 * value cell inherited a stale date format from an earlier Config layout
 * (Sheets renders the number 3 as "Jan 2, 1900" and getValues returns a
 * Date). Fall back to the default instead of a garbage timestamp.
 */
function cfgInt(v, def) {
  if (v instanceof Date) return def;
  var n = num(v);
  return n > 0 ? n : def;
}

/** lock_time may be a real Date (Sheets auto-converts "23:59") — normalize back to HH:mm. */
function cfgTime(v, def) {
  if (v instanceof Date) return Utilities.formatDate(v, tz(), 'HH:mm');
  var s = String(v == null ? '' : v).trim();
  return s || def;
}

function bool(v) {
  if (v === true) return true;
  if (v === false || v == null) return false;
  var s = String(v).trim().toLowerCase();
  return s === 'true' || s === 'yes' || s === '1';
}

function round1(n) { return Math.round(n * 10) / 10; }

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

/** A cell that Sheets may have auto-converted "2026-07" text into a real Date. */
function monthStr(v) {
  if (v === '' || v == null) return '';
  if (v instanceof Date) return Utilities.formatDate(v, tz(), 'yyyy-MM');
  return String(v);
}

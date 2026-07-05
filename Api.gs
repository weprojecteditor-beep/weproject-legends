/**
 * WEPROJECT LEGENDS — Phase 2: Apps Script API (Web App)
 * =====================================================================
 * This is a SECOND file in the same Apps Script project as the Phase 1
 * setup (Code.gs). Add it via  Apps Script → + → Script → name it "Api".
 *
 * DEPLOY
 *   Deploy → New deployment → Web app
 *     Execute as: Me
 *     Who has access: Anyone with the link
 *   Copy the /exec URL — that becomes VITE_API_URL for the React app.
 *
 * ENDPOINTS
 *   GET  ?action=state                     → global battlefield state
 *   GET  ?action=player&id=P001&pin=1234   → one player's profile
 *   GET  ?action=shop                      → shop items + live stock
 *   POST {playerId, pin, itemId}           → redeem an item (status=pending)
 *
 * CALCULATION RULES (per SPEC)
 *   1. Only EXP_Log rows with approved=TRUE are counted.
 *   2. Gold = cumulative approved EXP − redemptions that aren't rejected
 *      (pending redemptions are subtracted too, so Gold freezes instantly).
 *   3. Rank uses SEASON EXP (rows dated on/after season_start);
 *      Level uses ALL-TIME EXP.
 *   4. The daily cap is NOT enforced here (GM gate-keeps at entry). The API
 *      returns todayExp so the GM can reconcile.
 *   5. Responses are cached 60s (CacheService) to avoid Sheet read limits.
 *
 * CORS NOTE
 *   Apps Script ContentService cannot set custom response headers and does
 *   not run doOptions preflight. To stay preflight-free, the React client
 *   must POST with Content-Type "text/plain" (a JSON string body), and use
 *   plain GETs — both are "simple requests" the browser allows cross-origin.
 * =====================================================================
 */

var CACHE_SECONDS = 60;

/* ================================================================== */
/* Routing                                                            */
/* ================================================================== */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'state';
  try {
    if (action === 'state')  return json(cached('state', getState));
    if (action === 'shop')   return json(cached('shop', getShop));
    if (action === 'player') return json(getPlayer(e.parameter.id, e.parameter.pin));
    return json({ error: 'Unknown action: ' + action });
  } catch (err) {
    return json({ error: String(err && err.message || err) });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    return json(redeem(body.playerId, body.pin, body.itemId));
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  }
}

/* ================================================================== */
/* Endpoint: state                                                    */
/* ================================================================== */

function getState() {
  var cfg      = getConfig();
  var players  = getPlayers();
  var expRows  = getRows('EXP_Log').filter(isApproved);
  var boss     = getRows('Boss')[0] || {};
  var levelTh  = buildLevelThresholds(cfg);

  // --- Boss ---
  var totalDamage = 0;
  for (var i = 0; i < expRows.length; i++) {
    totalDamage += num(expRows[i].amount_rm);
  }
  totalDamage -= num(boss.refund_adjust);
  if (totalDamage < 0) totalDamage = 0;

  var hpMax = num(boss.hp_max) || 1;
  var pctLeft = Math.max(0, 100 - (totalDamage / hpMax) * 100);
  var phases = [75, 50, 25, 0].map(function (at) {
    return { at: at, unlocked: pctLeft <= at };
  });

  // --- Per-player aggregates ---
  var byPlayer = {}; // player_id -> { allExp, seasonExp, damage, winning, highCtr }
  var seasonStart = dateStr(cfg.season_start); // normalize (Sheets may store this as a Date)
  for (var j = 0; j < expRows.length; j++) {
    var r = expRows[j];
    var pid = r.player_id;
    if (!byPlayer[pid]) {
      byPlayer[pid] = { allExp: 0, seasonExp: 0, damage: 0, winning: 0, highCtr: 0 };
    }
    var agg = byPlayer[pid];
    agg.allExp += num(r.exp);
    agg.damage += num(r.amount_rm);
    if (dateStr(r.date) >= seasonStart) agg.seasonExp += num(r.exp);

    var item = String(r.item || '').toLowerCase();
    if (item.indexOf('winning') !== -1)  agg.winning += 1;
    if (item.indexOf('high ctr') !== -1 || item.indexOf('high-ctr') !== -1) agg.highCtr += 1;
  }

  // --- Damage ranking (all active players, by amount_rm) ---
  var damageRanking = players.filter(function (p) { return p.active; }).map(function (p) {
    var a = byPlayer[p.player_id] || { allExp: 0, seasonExp: 0, damage: 0 };
    return {
      playerId: p.player_id,
      name: p.name,
      role: p.role,
      rank: rankInfo(a.seasonExp, cfg).rank,
      level: levelFromExp(a.allExp, levelTh).level,
      damage: a.damage
    };
  }).sort(function (a, b) { return b.damage - a.damage; });

  // --- Creative ranking (players credited with winning / high-CTR creatives) ---
  var creativeRanking = players.filter(function (p) {
    var a = byPlayer[p.player_id];
    return a && (a.winning > 0 || a.highCtr > 0);
  }).map(function (p) {
    var a = byPlayer[p.player_id];
    return {
      playerId: p.player_id,
      name: p.name,
      role: p.role,
      winningCount: a.winning,
      highCtrCount: a.highCtr
    };
  }).sort(function (a, b) {
    return (b.winningCount - a.winningCount) || (b.highCtrCount - a.highCtrCount);
  });

  // --- Today's achievement feed (reverse-chronological) ---
  var today = todayStr();
  var feed = getRows('Achievements_Feed')
    .filter(function (f) { return dateStr(f.timestamp) === today; })
    .sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); })
    .map(function (f) {
      var p = playerById(players, f.player_id);
      return {
        playerId: f.player_id,
        name: p ? p.name : f.player_id,
        tag: f.tag,
        icon: f.icon,
        description: f.description,
        exp: num(f.exp),
        timestamp: dateTimeStr(f.timestamp)
      };
    });

  return {
    boss: {
      month: monthStr(boss.month),
      hpMax: hpMax,
      damage: totalDamage,
      pctLeft: round1(pctLeft),
      rage: bool(boss.rage_active),
      phases: phases
    },
    damageRanking: damageRanking,
    creativeRanking: creativeRanking,
    feed: feed,
    updatedAt: dateTimeStr(new Date())
  };
}

/* ================================================================== */
/* Endpoint: player                                                   */
/* ================================================================== */

function getPlayer(id, pin) {
  var players = getPlayers();
  var p = playerById(players, id);
  if (!p) return { error: 'Player not found' };
  if (!pinMatches(p, pin)) return { error: 'Wrong PIN, try again' };

  var cfg     = getConfig();
  var levelTh = buildLevelThresholds(cfg);
  var seasonStart = dateStr(cfg.season_start); // normalize (Sheets may store this as a Date)
  var today = todayStr();

  var mine = getRows('EXP_Log').filter(function (r) {
    return r.player_id === id && isApproved(r);
  });

  var allExp = 0, seasonExp = 0, todayExp = 0, badges = [];
  for (var i = 0; i < mine.length; i++) {
    var r = mine[i];
    allExp += num(r.exp);
    if (dateStr(r.date) >= seasonStart) seasonExp += num(r.exp);
    if (dateStr(r.date) === today) todayExp += num(r.exp);
    var cat = String(r.category || '').toLowerCase();
    if (cat === 'milestone' || cat === 'achievement' || cat === 'mvp') {
      if (r.item) badges.push(String(r.item));
    }
  }

  var lvl  = levelFromExp(allExp, levelTh);
  var rank = rankInfo(seasonExp, cfg);
  var gold = goldBalance(id, allExp);

  var recentLog = mine
    .slice()
    .sort(function (a, b) { return new Date(b.date) - new Date(a.date); })
    .slice(0, 20)
    .map(function (r) {
      return {
        date: dateStr(r.date),
        category: r.category,
        item: r.item,
        exp: num(r.exp),
        amountRm: r.amount_rm === '' ? null : num(r.amount_rm)
      };
    });

  return {
    playerId: id,
    name: p.name,
    role: p.role,
    avatar: p.avatar,
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
    recentLog: recentLog
  };
}

/* ================================================================== */
/* Endpoint: shop                                                     */
/* ================================================================== */

function getShop() {
  var redemptions = getRows('Redemptions');
  return getRows('Shop')
    .filter(function (s) { return bool(s.active); })
    .map(function (s) {
      var stock = num(s.stock);
      var remaining = stock; // -1 = unlimited
      if (stock >= 0) {
        var used = redemptions.filter(function (rd) {
          return rd.item_id === s.item_id && String(rd.status) !== 'rejected';
        }).length;
        remaining = Math.max(0, stock - used);
      }
      return {
        itemId: s.item_id,
        name: s.name,
        icon: s.icon,
        price: num(s.price),
        stock: stock,
        remaining: remaining
      };
    });
}

/* ================================================================== */
/* POST: redeem                                                       */
/* ================================================================== */

function redeem(playerId, pin, itemId) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var players = getPlayers();
    var p = playerById(players, playerId);
    if (!p) return { ok: false, error: 'Player not found' };
    if (!pinMatches(p, pin)) return { ok: false, error: 'Wrong PIN, try again' };

    var item = getRows('Shop').filter(function (s) {
      return s.item_id === itemId && bool(s.active);
    })[0];
    if (!item) return { ok: false, error: 'Item unavailable' };

    // Stock check
    var redemptions = getRows('Redemptions');
    var stock = num(item.stock);
    if (stock >= 0) {
      var used = redemptions.filter(function (rd) {
        return rd.item_id === itemId && String(rd.status) !== 'rejected';
      }).length;
      if (used >= stock) return { ok: false, error: 'Out of stock' };
    }

    // Gold check (pending redemptions already subtracted inside goldBalance)
    var allExp = 0;
    getRows('EXP_Log').forEach(function (r) {
      if (r.player_id === playerId && isApproved(r)) allExp += num(r.exp);
    });
    var gold = goldBalance(playerId, allExp);
    var price = num(item.price);
    if (gold < price) return { ok: false, error: 'Not enough Gold' };

    // Write pending redemption
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Redemptions');
    sheet.appendRow([new Date(), playerId, itemId, item.name, price, 'pending']);

    // Invalidate cached state so the next poll reflects frozen Gold
    CacheService.getScriptCache().removeAll(['state', 'shop']);

    return { ok: true, message: 'Redeemed! Pending GM approval', goldRemaining: gold - price };
  } finally {
    lock.releaseLock();
  }
}

/* ================================================================== */
/* Domain helpers                                                     */
/* ================================================================== */

/** Gold = cumulative approved EXP − redemptions that aren't rejected. */
function goldBalance(playerId, allApprovedExp) {
  var spent = 0;
  getRows('Redemptions').forEach(function (rd) {
    if (rd.player_id === playerId && String(rd.status) !== 'rejected') {
      spent += num(rd.gold_cost);
    }
  });
  return allApprovedExp - spent;
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
      th[l] = e0 + (e1 - e0) * ((l - l0) / (l1 - l0)); // linear interpolation
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
  if (level >= 30) {
    return { level: 30, expInLevel: 0, expToNextLevel: 0 };
  }
  var band = th[level + 1] - th[level];
  return {
    level: level,
    expInLevel: Math.round(exp - th[level]),
    expToNextLevel: Math.round(band)
  };
}

function pinMatches(player, pin) {
  var stored = String(player.pin == null ? '' : player.pin).trim();
  if (stored === '') return false; // PIN not assigned yet
  return stored === String(pin == null ? '' : pin).trim();
}

/* ================================================================== */
/* Sheet access + primitives                                          */
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
    if (row.join('') === '') continue; // skip blank rows
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

/** Boss "month" cell may be a real Date (Sheets auto-converts "2026-07") or text. */
function monthStr(v) {
  if (v === '' || v == null) return '';
  if (v instanceof Date) return Utilities.formatDate(v, tz(), 'yyyy-MM');
  return String(v);
}

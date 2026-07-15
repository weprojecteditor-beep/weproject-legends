/**
 * WEPROJECT LEGENDS — Google Sheets structure + GM helpers
 * =====================================================================
 * Phase-1 file: builds the database tabs and holds the GM run-buttons.
 * Api.gs (the web app) reads the tabs this file creates.
 *
 * TWO ENTRY POINTS — pick the right one:
 *
 *   • setupWeprojectLegends()        — FRESH sheet only. Builds all data
 *     tabs + Guide from scratch, seeded with the WeProject roster/shop/
 *     actions/missions. Re-running WIPES any data already in those tabs.
 *     Do NOT run this on the live sheet.
 *
 *   • migrateExistingSheetToV5_1()   — Upgrades the LIVE sheet in place.
 *     Non-destructive: reshapes Players/Shop/EXP_Log/Config by reading
 *     existing values first, and creates missing tabs only. Safe to re-run.
 *
 * WORLD BOSS MODEL: WeProject fights one monthly boss (boss_target HP).
 * The Crystal_War / Buffs tabs are legacy — still built for compatibility
 * but hidden by simplifySheet and unused by Api.gs. After pasting new code,
 * run applyWorldBossRules once, then Deploy → New version.
 *
 * NOTE: all GM buttons pop a confirmation via uiAlert_(), which silently
 * falls back to Logger when run from the editor (where getUi() has no UI).
 * =====================================================================
 */

var CATEGORIES = ['mission', 'action', 'milestone', 'achievement', 'assist', 'mvp', 'adjust'];
var REDEMPTION_STATUSES = ['pending', 'approved', 'fulfilled', 'rejected'];
var MISSION_LOG_STATUSES = ['pending', 'approved', 'rejected'];
var TEAMS = ['weproject', 'wellous'];
var ROLE_OPTIONS = ['Marketer', 'LiveHost', 'Editor', 'Salesperson', 'Any']; // 'Any' = applies to every role
var PLAYER_ROLES = ['Marketer', 'LiveHost', 'Editor', 'Salesperson']; // roles a person can hold (Players tab dropdown)
var BUFF_TYPES = ['power', 'lord'];
var BUFF_STATUSES = ['alive', 'slain'];
var CRYSTAL_BROKEN_OPTIONS = ['none', 'weproject', 'wellous'];
var LORD_SIDE_OPTIONS = ['none', 'weproject', 'wellous'];

// Hero Class is locked per role (role decides balance); players only pick
// which hero within their role's class family. Api.gs enforces this in setHeroClass.
var HERO_CLASS_BY_ROLE = {
  Marketer:    ['Marksman', 'Mage', 'Assassin'],   // Carry
  LiveHost:    ['Fighter', 'Tank', 'Berserker'],   // Fighter
  Editor:      ['Support', 'Bard', 'Summoner'],    // Support
  Salesperson: ['Marksman', 'Assassin', 'Berserker'] // Slayer (legacy)
};

var PLAYER_STATUSES = ['player', 'commander']; // commander = sales count toward boss, but no EXP/coins/rank and hidden from leaderboards

// Commanders (team leads + boss): [name, role, avatar]. Added as P017+ with status=commander.
// They log in to view all data, count toward the boss, but earn nothing and stay off leaderboards.
var COMMANDERS = [
  ['Jeanette', 'Marketer', '👑'],
  ['Haikal',   'Marketer', '👑'],
  ['Chloe',    'LiveHost', '👑'],
  ['Boss',     'Marketer', '👑']   // rename in the Players tab to the boss's name if you like
];

var GROW_ROWS = 2000; // apply validation this many rows down for sheets that grow
var SMALL_ROWS = 200;

/* ------------------------------------------------------------------ */
/* Fresh install (new sheet only — wipes named tabs on every run)      */
/* ------------------------------------------------------------------ */

function setupWeprojectLegends() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  buildPlayers(ss);
  buildExpLog(ss);
  buildRedemptions(ss);
  buildShop(ss);
  buildConfig(ss);
  buildAchievementsFeed(ss);
  buildActions(ss);
  buildMissions(ss);
  buildMissionLog(ss);
  buildCrystalWar(ss);
  buildBuffs(ss);
  buildLateness(ss);
  buildGuide(ss);

  ss.setActiveSheet(ss.getSheetByName('Guide'));
  ss.moveActiveSheet(1);

  removeDefaultSheet(ss);

  uiAlert_('WEPROJECT LEGENDS',
    'Setup complete — data tabs + a Guide tab created and seeded.\n\n' +
    'Next: assign PINs and join_dates in Players, then run applyWorldBossRules and Deploy the API.');
}

/* ------------------------------------------------------------------ */
/* Migration for the LIVE sheet (additive, preserves existing data)    */
/* ------------------------------------------------------------------ */

function migrateExistingSheetToV5_1() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var summary = [];

  summary.push(migratePlayersTab(ss)
    ? 'Players: added team / hero_class / gender_pref. Existing players set to team=weproject; hero_class left blank so they re-pick on next login.'
    : 'Players: already has team/hero_class — skipped.');

  summary.push(migrateShopTab(ss)
    ? 'Shop: added team column. Existing items set to team=weproject.'
    : 'Shop: already has team — skipped.');

  migrateExpLogCategories(ss);
  summary.push('EXP_Log: category dropdown updated; any existing boss rows were recategorized to "action" — amount_rm still counts the same way.');

  migrateConfigTab(ss);
  summary.push('Config: rebuilt with all keys; existing rank/level/season values you had were preserved.');

  summary.push(archiveBossTab(ss)
    ? 'Boss tab renamed to "Boss_ARCHIVED" — data kept, no longer read by the app.'
    : 'Boss tab: not found or already archived.');

  var created = [];
  if (!ss.getSheetByName('Actions'))     { buildActions(ss);     created.push('Actions'); }
  if (!ss.getSheetByName('Missions'))    { buildMissions(ss);    created.push('Missions'); }
  if (!ss.getSheetByName('Mission_Log')) { buildMissionLog(ss);  created.push('Mission_Log'); }
  if (!ss.getSheetByName('Crystal_War')) { buildCrystalWar(ss);  created.push('Crystal_War'); }
  if (!ss.getSheetByName('Buffs'))       { buildBuffs(ss);       created.push('Buffs'); }
  summary.push(created.length
    ? 'Created new tabs: ' + created.join(', ') + ' (seeded with starter WeProject rows — tune freely, GM owns these).'
    : 'Actions/Missions/Mission_Log/Crystal_War/Buffs already exist — left untouched.');

  buildGuide(ss);
  summary.push('Guide tab rewritten.');

  removeDefaultSheet(ss);

  uiAlert_('Migration complete',
    summary.join('\n\n') +
    '\n\nNext: run applyWorldBossRules, then Deploy → New version so the live API is up to date.');
}

function migratePlayersTab(ss) {
  var sheet = ss.getSheetByName('Players');
  if (!sheet) throw new Error('Players tab not found — run setupWeprojectLegends on a fresh sheet instead.');

  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  if (headers.indexOf('team') !== -1 && headers.indexOf('hero_class') !== -1) return false;

  var idx = {};
  headers.forEach(function (h, i) { idx[h] = i; });
  var lastRow = sheet.getLastRow();
  var data = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, lastCol).getValues() : [];

  var newRows = data.map(function (row) {
    return [
      row[idx['player_id']],
      'weproject',
      row[idx['name']],
      row[idx['role']],
      '',                          // hero_class — self-select on next login
      '',                          // gender_pref
      row[idx['pin']],
      row[idx['avatar']],
      row[idx['join_date']],
      row[idx['active']]
    ];
  });

  var newHeaders = ['player_id', 'team', 'name', 'role', 'hero_class', 'gender_pref', 'pin', 'avatar', 'join_date', 'active'];
  rewriteSheet(sheet, newHeaders, newRows);
  applyDropdown(sheet, 2, SMALL_ROWS, TEAMS);   // team
  applyDropdown(sheet, 4, SMALL_ROWS, PLAYER_ROLES); // role
  applyCheckbox(sheet, 10, SMALL_ROWS);         // active
  return true;
}

function migrateShopTab(ss) {
  var sheet = ss.getSheetByName('Shop');
  if (!sheet) return false;

  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  if (headers.indexOf('team') !== -1) return false;

  var lastRow = sheet.getLastRow();
  var data = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, lastCol).getValues() : [];

  // old order: item_id, name, icon, price, stock, active
  var newRows = data.map(function (row) {
    return [row[0], 'weproject', row[1], row[2], row[3], row[4], row[5]];
  });

  var newHeaders = ['item_id', 'team', 'name', 'icon', 'price', 'stock', 'active'];
  rewriteSheet(sheet, newHeaders, newRows);
  applyDropdown(sheet, 2, SMALL_ROWS, TEAMS); // team
  applyCheckbox(sheet, 7, SMALL_ROWS);        // active
  return true;
}

function migrateExpLogCategories(ss) {
  var sheet = ss.getSheetByName('EXP_Log');
  if (!sheet) return false;

  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var catRange = sheet.getRange(2, 4, lastRow - 1, 1);
    var cats = catRange.getValues();
    var changed = false;
    for (var i = 0; i < cats.length; i++) {
      if (cats[i][0] === 'boss') { cats[i][0] = 'action'; changed = true; }
    }
    if (changed) catRange.setValues(cats);
  }
  applyDropdown(sheet, 4, GROW_ROWS, CATEGORIES);
  return true;
}

function migrateConfigTab(ss) {
  var sheet = ss.getSheetByName('Config');
  var existing = {};
  if (sheet) {
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 2).getValues().forEach(function (r) {
        if (r[0]) existing[String(r[0])] = r[1];
      });
    }
  }
  var rows = configDefaultRows().map(function (pair) {
    return [pair[0], existing.hasOwnProperty(pair[0]) ? existing[pair[0]] : pair[1]];
  });
  makeSheet(ss, 'Config', ['key', 'value'], rows);
}

function archiveBossTab(ss) {
  var sheet = ss.getSheetByName('Boss');
  if (!sheet) return false;
  if (ss.getSheetByName('Boss_ARCHIVED')) return false; // already archived
  sheet.setName('Boss_ARCHIVED');
  sheet.setTabColor('#555555');
  return true;
}

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

/**
 * Create (or reset) a tab, write the header row, style + freeze it,
 * then write seed rows if any. Returns the sheet.
 */
function makeSheet(ss, name, headers, rows) {
  var sheet = ss.getSheetByName(name);
  if (sheet) {
    sheet.clear();
    sheet.getDataRange().clearDataValidations();
  } else {
    sheet = ss.insertSheet(name);
  }

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setFontColor('#F5C542')
    .setBackground('#0A0D1C')
    .setHorizontalAlignment('left');
  sheet.setFrozenRows(1);

  if (rows && rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  for (var c = 1; c <= headers.length; c++) sheet.autoResizeColumn(c);
  return sheet;
}

/** Clears an EXISTING sheet in place and rewrites headers + rows (used by migrations). */
function rewriteSheet(sheet, headers, rows) {
  sheet.clear();
  sheet.getDataRange().clearDataValidations();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setFontColor('#F5C542').setBackground('#0A0D1C');
  sheet.setFrozenRows(1);
  if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  for (var c = 1; c <= headers.length; c++) sheet.autoResizeColumn(c);
}

function applyDropdown(sheet, col, numRows, values) {
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, col, numRows, 1).setDataValidation(rule);
}

function applyCheckbox(sheet, col, numRows) {
  var rule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  sheet.getRange(2, col, numRows, 1).setDataValidation(rule);
}

function removeDefaultSheet(ss) {
  var def = ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def);
}

/**
 * Safe alert: shows a popup when a spreadsheet UI exists, otherwise logs.
 * Lets every GM button run from the script editor without throwing
 * "Cannot call SpreadsheetApp.getUi() from this context".
 * Call as uiAlert_(title, msg) or uiAlert_(msg).
 */
function uiAlert_(title, msg) {
  if (msg === undefined) { msg = String(title); title = 'WEPROJECT LEGENDS'; }
  try {
    var ui = SpreadsheetApp.getUi();
    ui.alert(title, msg, ui.ButtonSet.OK);
  } catch (e) {
    Logger.log(title + ' — ' + msg);
  }
}

/** 'YYYY-MM-DD' for the 1st of the current month, kept as a string default (avoid Sheets' auto Date-cast). */
function monthStartStr() {
  var d = new Date();
  return Utilities.formatDate(new Date(d.getFullYear(), d.getMonth(), 1), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function monthEndStr() {
  var d = new Date();
  return Utilities.formatDate(new Date(d.getFullYear(), d.getMonth() + 1, 0), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/** Monday of the current week, as 'YYYY-MM-DD'. */
function mondayOfThisWeekStr() {
  var d = new Date();
  var day = d.getDay(); // 0=Sun..6=Sat
  var diff = (day === 0 ? -6 : 1) - day; // shift to Monday
  var monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return Utilities.formatDate(monday, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function currentMonthStr() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM');
}

/* ------------------------------------------------------------------ */
/* Tab 1: Players                                                      */
/* ------------------------------------------------------------------ */

function buildPlayers(ss) {
  var headers = ['player_id', 'team', 'name', 'role', 'hero_class', 'gender_pref', 'pin', 'avatar', 'join_date', 'active', 'status'];

  // hero_class/pin/join_date left blank — GM assigns PINs, players self-select class.
  var roster = [
    ['Izz',      'Marketer', '🏹'],
    ['Nina',     'Marketer', '🔥'],
    ['Azim',     'Marketer', '⚡'],
    ['Wing Nam', 'Marketer', '🌊'],
    ['Wen Pei',  'Marketer', '🌸'],
    ['Nizam',    'Marketer', '🗡️'],
    ['Intan',    'Marketer', '💎'],
    ['Ain',      'Marketer', '🌙'],
    ['Qistina',  'LiveHost', '🎤'],
    ['Dayah',    'LiveHost', '⭐'],
    ['Syaza',    'LiveHost', '🦋'],
    ['Alia',     'LiveHost', '🌟'],
    ['Connie',   'LiveHost', '🎀'],
    ['Justin',   'Editor',   '🎬'],
    ['Syafie',   'Editor',   '✂️'],
    ['Safiah',   'Editor',   '🎨']
  ];

  var rows = roster.map(function (r, i) {
    var id = 'P' + ('00' + (i + 1)).slice(-3); // P001..P016
    return [id, 'weproject', r[0], r[1], '', '', '', r[2], '', true, 'player'];
  });
  // Commanders P017+ (status=commander)
  COMMANDERS.forEach(function (c, j) {
    var id = 'P' + ('00' + (roster.length + j + 1)).slice(-3);
    rows.push([id, 'weproject', c[0], c[1], '', '', '', c[2], '', true, 'commander']);
  });

  var sheet = makeSheet(ss, 'Players', headers, rows);
  applyDropdown(sheet, 2, SMALL_ROWS, TEAMS);
  applyDropdown(sheet, 4, SMALL_ROWS, PLAYER_ROLES);
  applyCheckbox(sheet, 10, SMALL_ROWS);        // active
  applyDropdown(sheet, 11, SMALL_ROWS, PLAYER_STATUSES); // status
}

/* ------------------------------------------------------------------ */
/* Tab 2: EXP_Log  (core ledger — GM records here daily)               */
/* ------------------------------------------------------------------ */

function buildExpLog(ss) {
  var headers = [
    'log_id',     // reference only — the API does not read this
    'date',       // date the event happened
    'player_id',  // P001..P016
    'category',   // dropdown: mission/action/milestone/achievement/assist/mvp/adjust
    'item',       // free text, e.g. "Winning Creative #A114"
    'exp',        // number (can be negative for Refund clawback)
    'amount_rm',  // RM amount for Revenue rows — damage on the citadel + Damage board, else blank
    'approved',   // checkbox — only takes effect once ticked
    'note'        // remarks
  ];
  var sheet = makeSheet(ss, 'EXP_Log', headers, []);
  applyDropdown(sheet, 4, GROW_ROWS, CATEGORIES);
  applyCheckbox(sheet, 8, GROW_ROWS);
}

/* ------------------------------------------------------------------ */
/* Tab 3: Redemptions                                                  */
/* ------------------------------------------------------------------ */

function buildRedemptions(ss) {
  var headers = ['timestamp', 'player_id', 'item_id', 'item_name', 'gold_cost', 'status'];
  var sheet = makeSheet(ss, 'Redemptions', headers, []); // rows written by the API
  applyDropdown(sheet, 6, GROW_ROWS, REDEMPTION_STATUSES);
}

/* ------------------------------------------------------------------ */
/* Tab 4: Shop                                                         */
/* ------------------------------------------------------------------ */

function buildShop(ss) {
  var headers = ['item_id', 'team', 'name', 'icon', 'price', 'stock', 'active']; // stock -1 = unlimited

  var items = [
    ['S01', 'weproject', 'TNG eWallet RM5',                    '💳',  300,  -1, true],
    ['S02', 'weproject', 'Coffee / Bubble Tea Voucher',        '☕',  400,  -1, true],
    ['S03', 'weproject', 'Mystery Box',                        '🎁',  500,  -1, true],
    ['S04', 'weproject', 'Lunch Voucher RM20',                 '🍱',  800,  -1, true],
    ['S05', 'weproject', 'Lunch Recharge Pass (Extra 30 mins)', '🍚', 2000, -1, true],
    ['S06', 'weproject', 'Early Escape Pass (1 Hour Early Leave)', '🏃', 3000, -1, true],
    ['S07', 'weproject', 'Team Tea Time — Your Pick',          '🧃',  4000, -1, true],
    ['S08', 'weproject', 'Limited Drop: Earbuds',              '🎧',  5000,  1, true]
  ];

  var sheet = makeSheet(ss, 'Shop', headers, items);
  applyDropdown(sheet, 2, SMALL_ROWS, TEAMS);
  applyCheckbox(sheet, 7, SMALL_ROWS);
}

/* ------------------------------------------------------------------ */
/* Tab 5: Config  (all game numbers — code reads these, none hardcoded)*/
/* ------------------------------------------------------------------ */

function configDefaultRows() {
  return [
    ['rank_warrior', 0],
    ['rank_elite',   800],
    ['rank_master',  2000],
    ['rank_epic',    3600],
    ['rank_legend',  5500],
    ['rank_mythic',  7500],

    ['lv5',  1000],
    ['lv10', 3000],
    ['lv15', 6000],
    ['lv20', 10000],
    ['lv25', 15000],
    ['lv30', 21000],

    ['daily_cap', 200], // reference only — API never rejects a row for exceeding this
    ['cap_exempt_categories', 'milestone,achievement,mvp'],

    ['season_start', monthStartStr()],
    ['season_end',   monthEndStr()],

    // Monthly Gauntlet — team clears Tower I -> Tower II -> Crystal (boss_target = total HP)
    ['boss_name',   'Crystal Citadel'],
    ['boss_target', 1000000],
    // Optional: size each stage yourself. Leave blank to auto-split boss_target 30/40/30.
    ['base_tower1_hp', ''],
    ['base_tower2_hp', ''],
    ['base_crystal_hp', ''],

    // Legacy (unused by the World Boss model, kept for reference)
    ['towers_per_side', 3],
    ['week_reset_day',  'monday'],
    ['lock_time',        '23:59'],
    ['lord_multiplier',  2],
    ['ko_margin', 2],

    // Pace badges / bounty — judged from join_date (pace) or season EXP (bounty)
    ['pace_lv10_days',  30],
    ['pace_lv10_bonus', 500],
    ['pace_lv20_days',  75],
    ['pace_lv20_bonus', 1000],
    ['bounty_lv15',     1000], // first-to-Lv15-season-EXP bounty, re-triggers each season

    // PIN security
    ['pin_fail_limit', 10],
    ['pin_fail_window_min', 10],

    // GM-only admin PIN (legacy). CHANGE THIS before go-live.
    ['admin_pin', '1001']
  ];
}

function buildConfig(ss) {
  makeSheet(ss, 'Config', ['key', 'value'], configDefaultRows());
}

/* ------------------------------------------------------------------ */
/* Tab 6: Achievements_Feed  (source for the TV feed / bullets)        */
/* ------------------------------------------------------------------ */

function buildAchievementsFeed(ss) {
  // team is derived from player_id at read time, not stored here.
  var headers = ['timestamp', 'player_id', 'tag', 'icon', 'description', 'exp'];
  makeSheet(ss, 'Achievements_Feed', headers, []); // GM populates
}

/* ------------------------------------------------------------------ */
/* Tab 7: Actions  (EXP rules table)                                   */
/* ------------------------------------------------------------------ */

function buildActions(ss) {
  var headers = ['action_id', 'team', 'role', 'name_en', 'condition_en', 'exp', 'daily_cap', 'category', 'active'];

  // role='Any' = applies to every role. Numbers here are starter values —
  // GM tunes freely; the Guide page reads straight from this table.
  var rows = [
    // Marketer
    ['A01', 'weproject', 'Marketer', 'Winning Creative',        '>5 purchases with ROAS > 3',                                  80, '', 'achievement', true],
    ['A03', 'weproject', 'Marketer', 'First Blood',             'First approved order of the day',                              10, '', 'achievement', true],
    ['A04', 'weproject', 'Marketer', 'Double Kill',             '10 approved purchases in a single day',                        20, '', 'action', true],

    // LiveHost / CS
    ['A05', 'weproject', 'LiveHost', 'RM3k per Live Session',   'Achieve RM3,000 sales in one live session',                    25, 200, 'action', true],
    ['A06', 'weproject', 'LiveHost', 'Low Returns',            'Keep monthly returned orders within 5 orders',                 15, '', 'action', true],
    ['A07', 'weproject', 'LiveHost', 'Double Kill',             '10 approved purchases in a single day',                        20, '', 'action', true],
    ['A08', 'weproject', 'LiveHost', 'First Blood',             'First approved order of the day',                              10, '', 'achievement', true],

    // Editor
    ['A09', 'weproject', 'Editor',   'Winning Creative Production', 'A video you produced gets >5 purchases with ROAS > 3',      80, '', 'achievement', true],
    ['A10', 'weproject', 'Editor',   'All Video Purchase',      '30 purchases in a week across your videos',                     30, '', 'action', true],

    // Everyone
    ['A11', 'weproject', 'Any',      'All Daily Missions Complete', 'Completed every daily mission for your role',               30, '', 'action', true],

    // Daily Sales Bonus ladder — Marketer & LiveHost/CS, highest tier only
    ['A12', 'weproject', 'Marketer', 'Daily Sales RM3k',        'Personal sales reach RM3,000 in a day (highest tier only)',    50, '', 'milestone', true],
    ['A13', 'weproject', 'Marketer', 'Daily Sales RM5k',        'Personal sales reach RM5,000 in a day (highest tier only)',    80, '', 'milestone', true],
    ['A14', 'weproject', 'Marketer', 'Daily Sales RM10k',       'Personal sales reach RM10,000 in a day (highest tier only)',  200, '', 'milestone', true],
    ['A15', 'weproject', 'LiveHost', 'Daily Sales RM3k',        'Personal sales reach RM3,000 in a day (highest tier only)',    50, '', 'milestone', true],
    ['A16', 'weproject', 'LiveHost', 'Daily Sales RM5k',        'Personal sales reach RM5,000 in a day (highest tier only)',    80, '', 'milestone', true],
    ['A17', 'weproject', 'LiveHost', 'Daily Sales RM10k',       'Personal sales reach RM10,000 in a day (highest tier only)',  200, '', 'milestone', true]
  ];

  var sheet = makeSheet(ss, 'Actions', headers, rows);
  applyDropdown(sheet, 2, SMALL_ROWS, TEAMS);
  applyDropdown(sheet, 3, SMALL_ROWS, ROLE_OPTIONS);
  applyDropdown(sheet, 8, SMALL_ROWS, CATEGORIES);
  applyCheckbox(sheet, 9, SMALL_ROWS);
}

/* ------------------------------------------------------------------ */
/* Tab 8: Missions  (daily task configuration)                         */
/* ------------------------------------------------------------------ */

function buildMissions(ss) {
  var headers = ['mission_id', 'team', 'role', 'text_en', 'exp', 'sort', 'active'];

  // LiveHost / CS share the "LiveHost" role in the system (assign CS staff role = LiveHost in Players).
  var rows = [
    ['M01', 'weproject', 'Marketer', 'Publish at least 4 ads',                              10, 1, true],
    ['M02', 'weproject', 'Marketer', 'Submit report before 10:30am',                        5,  2, true],
    ['M03', 'weproject', 'Marketer', 'Blast 1 audience pool',                               10, 3, true],
    ['M04', 'weproject', 'Marketer', 'FB / IG daily posting',                               5,  4, true],

    ['M05', 'weproject', 'LiveHost', 'Submit daily report before 10:30am',                  5,  1, true],
    ['M06', 'weproject', 'LiveHost', 'Submit daily sales report before 5:50pm',             5,  2, true],
    ['M07', 'weproject', 'LiveHost', 'Upload 2 TikTok content pieces per day',              5,  3, true],
    ['M08', 'weproject', 'LiveHost', 'Share 2 customer testimonials in the WhatsApp group', 10, 4, true],
    ['M09', 'weproject', 'LiveHost', 'Conduct live sessions at least 3 hours per day',      5,  5, true],

    ['M10', 'weproject', 'Editor',   'Deliver at least 1 edited video (with Dropbox link)', 10, 1, true],
    ['M11', 'weproject', 'Editor',   'Submit 1 script for Shanghai Content',                5,  2, true],
    ['M12', 'weproject', 'Editor',   'Shoot 1 content per day',                             5,  3, true],

    // Group-update COIN reward (+5 coins/day), per role — NOT EXP. Credited automatically
    // when the GM approves it in Mission_Log; does NOT count toward "All Daily Missions
    // Complete". exp = 0 so it never adds EXP. Editors report tasks (they have no sales).
    ['M13', 'weproject', 'Marketer', 'Update Sales in Group by 6pm (+5 coins/day)',          0, 9, true],
    ['M14', 'weproject', 'LiveHost', 'Update Sales in Group by 6pm (+5 coins/day)',          0, 9, true],
    ['M15', 'weproject', 'Editor',   'Update task report in group by 6pm (+5 coins/day)',    0, 9, true]
  ];

  var sheet = makeSheet(ss, 'Missions', headers, rows);
  applyDropdown(sheet, 2, SMALL_ROWS, TEAMS);
  applyDropdown(sheet, 3, SMALL_ROWS, ROLE_OPTIONS);
  applyCheckbox(sheet, 7, SMALL_ROWS);
}

/* ------------------------------------------------------------------ */
/* Tab 9: Mission_Log  (daily submission + GM approval)                */
/* ------------------------------------------------------------------ */

function buildMissionLog(ss) {
  var headers = ['date', 'player_id', 'mission_id', 'status'];
  var sheet = makeSheet(ss, 'Mission_Log', headers, []); // written by the API
  applyDropdown(sheet, 4, GROW_ROWS, MISSION_LOG_STATUSES);
}

/* ------------------------------------------------------------------ */
/* Tab 10: Crystal_War  (LEGACY — unused by the World Boss API)        */
/* ------------------------------------------------------------------ */

function buildCrystalWar(ss) {
  var headers = ['season', 'current_week_no', 'week_start', 'wp_towers', 'wl_towers', 'crystal_broken', 'lord_double_side', 'lord_double_date'];
  var rows = [[currentMonthStr(), 1, mondayOfThisWeekStr(), 0, 0, 'none', 'none', '']];

  var sheet = makeSheet(ss, 'Crystal_War', headers, rows);
  applyDropdown(sheet, 6, SMALL_ROWS, CRYSTAL_BROKEN_OPTIONS);
  applyDropdown(sheet, 7, SMALL_ROWS, LORD_SIDE_OPTIONS);
}

/* ------------------------------------------------------------------ */
/* Tab 11: Buffs  (LEGACY — unused by the World Boss API)              */
/* ------------------------------------------------------------------ */

function buildBuffs(ss) {
  var headers = ['date', 'buff_type', 'status', 'slain_by', 'effect_until'];

  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var rows = [
    [today, 'power', 'alive', '', ''],
    [today, 'lord',  'alive', '', '']
  ];

  var sheet = makeSheet(ss, 'Buffs', headers, rows);
  applyDropdown(sheet, 2, GROW_ROWS, BUFF_TYPES);
  applyDropdown(sheet, 3, GROW_ROWS, BUFF_STATUSES);
}

/* ------------------------------------------------------------------ */
/* Tab: Lateness  (GM logs 1 row per late arrival — coins-only penalty) */
/* ------------------------------------------------------------------ */

function buildLateness(ss) {
  // The API auto-deducts coins: −10 for the 1st–3rd late each month, −20 for
  // the 4th+ (tier resets on the 1st). Coins only — never EXP/Rank/Level.
  var headers = ['date', 'player_id', 'note'];
  makeSheet(ss, 'Lateness', headers, []); // GM adds a row each time someone is late
}

/* ------------------------------------------------------------------ */
/* Guide tab: HR/GM entry reference                                    */
/* ------------------------------------------------------------------ */

/**
 * Rebuilds the Guide tab — one clean, plain-English reference for players,
 * team leads and the boss. It is GENERATED FROM the live data (Missions /
 * Actions / Shop / Config), so it always matches them. To change a mission,
 * reward or EXP value: edit those tabs, then run refreshGuide (menu button).
 */
function buildGuide(ss) {
  var sheet = ss.getSheetByName('Guide');
  if (sheet) { sheet.clear(); } else { sheet = ss.insertSheet('Guide'); }
  try { sheet.getRange(1, 1, sheet.getMaxRows(), 4).breakApart(); } catch (e) {} // clear old merges

  var COLS = 4;
  var missions = getRows('Missions').filter(function (m) { return bool(m.active) && m.team === 'weproject'; });
  var actions  = getRows('Actions').filter(function (a) { return bool(a.active) && a.team === 'weproject'; });
  var shop     = getRows('Shop').filter(function (s) { return bool(s.active) && s.team === 'weproject'; });
  var cfg = getConfig();
  var roles = [['Marketer', 'MARKETER · Ads / Media Buyer'], ['LiveHost', 'LIVE HOST / CS'], ['Editor', 'EDITOR · Content']];

  function grp(n) { return Math.round(num(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function dueOf(text) { var m = String(text).match(/\b(?:before|by)\s+[0-9][0-9:.]*\s*(?:am|pm)/i); return m ? m[0] : 'Anytime today'; }

  var content = [];
  function P(t, a, b, c, d) { content.push({ t: t, r: [a || '', b || '', c || '', d || ''] }); }

  P('title', 'WEPROJECT LEGENDS — TEAM GUIDE');
  P('subtitle', 'For players, team leads & boss. This page is built from the Missions / Actions / Shop tabs. To change anything, edit those tabs, then use the menu:  ⚔ WEPROJECT LEGENDS  ▸  Refresh Guide.');
  P('blank');

  P('section', '🏰  THE GOAL — BEAT THE MONTHLY BOSS');
  P('note', '• The whole team shares ONE boss each month: the ' + (cfg.boss_name || 'Crystal Citadel') + '. Break Tower I → Tower II → shatter the Crystal before month-end.');
  P('note', '• Every RM 1 of real sales = 1 damage on the boss. Total boss HP this month = RM ' + grp(cfg.boss_target || 1000000) + '.');
  P('note', '• Your sales also rank you personally on the Damage board. Editors help by producing winning content.');
  P('blank');

  P('section', '🎮  HOW YOU PLAY (every player)');
  P('kv', '1 · Log in', 'Open the app, tap your name, enter your 4-digit PIN. First time: pick your hero look (class + male / female).');
  P('kv', '2 · Daily missions', 'Do the tasks in your list below. Each shows a due time.');
  P('kv', '3 · Submit', 'Tap a mission in the app → it turns ⏳ Pending → your lead / GM approves → you get the EXP or coins.');
  P('kv', '4 · Earn more', 'Hit the EXP bonuses & achievements below. Big personal sales days earn bonus coins.');
  P('kv', '5 · Spend', 'Trade your coins for rewards in the app’s Shop.');
  P('blank');

  P('section', '✅  DAILY MISSIONS — WHAT TO DO EACH DAY');
  P('note', 'These reset every day. The reward is granted after GM approval. A 🪙 reward gives coins (not EXP).');
  roles.forEach(function (rl) {
    P('subhead', rl[1]);
    P('mhead', 'MISSION', '', 'REWARD', 'WHEN');
    var list = missions.filter(function (m) { return m.role === rl[0]; }).sort(function (a, b) { return num(a.sort) - num(b.sort); });
    if (!list.length) P('note', 'None configured yet.');
    list.forEach(function (m) {
      P('mission', m.text_en, '', (num(m.exp) > 0 ? '+' + num(m.exp) + ' EXP' : '🪙 +5 coins'), dueOf(m.text_en));
    });
    P('blank');
  });

  P('section', '⭐  HOW TO EARN EXTRA EXP & ACHIEVEMENTS');
  P('note', 'Beyond daily missions — one-off wins your GM logs in EXP_Log. Editors: put "Winning" or "High CTR" in the item name so it counts on the Creative board.');
  roles.forEach(function (rl) {
    P('subhead', rl[1]);
    P('head', 'WHAT', 'HOW TO GET IT', 'EXP', 'TYPE');
    var list = actions.filter(function (a) { return a.role === rl[0] || a.role === 'Any'; });
    if (!list.length) P('note', 'None configured yet.');
    list.forEach(function (a) { P('act', a.name_en, a.condition_en, '+' + num(a.exp), a.category); });
    P('blank');
  });

  P('section', '💰  DAILY SALES BONUS (coins) — Marketer & Live Host / CS');
  P('note', 'On top of EXP. Highest tier only — a RM 10k day earns 200 coins (not 50+80+200). GM logs one milestone row.');
  P('mhead', 'YOUR PERSONAL SALES IN ONE DAY', '', 'COINS', '');
  P('mission', 'RM 3,000 in a day', '', '🪙 +50', '');
  P('mission', 'RM 5,000 in a day', '', '🪙 +80', '');
  P('mission', 'RM 10,000 in a day', '', '🪙 +200', '');
  P('blank');

  P('section', '🪙  OTHER COINS');
  P('kv', 'Update group by 6pm', '+5 coins/day — Marketer & Live Host update sales; Editors update their task report. Credited when the GM approves it in Mission_Log.');
  P('kv', 'Coming in late', '−10 coins for the 1st–3rd late in a month, −20 after. GM logs it in the Lateness tab. Resets on the 1st. Coins can go negative.');
  P('blank');

  P('section', '🛒  REWARDS — SPEND YOUR COINS');
  P('mhead', 'REWARD', '', 'COST', 'STOCK');
  shop.sort(function (a, b) { return num(a.price) - num(b.price); }).forEach(function (s) {
    P('shop', (s.icon ? s.icon + '  ' : '') + s.name, '', grp(s.price) + ' 🪙', (num(s.stock) < 0 ? 'Unlimited' : num(s.stock) + ' left'));
  });
  P('blank');

  P('section', '📈  LEVELS, RANKS & GOLD');
  P('note', '• EXP makes you LEVEL up (all-time). A higher level = a better skin that earns coins faster: Lv10 Elite +10%, Lv20 Legend +20%.');
  P('note', '• RANK is your standing THIS month (season EXP) and resets every month. Spending coins never lowers your Rank or Level.');
  P('subhead', 'RANK LADDER — reach this SEASON EXP');
  P('head', 'RANK', 'SEASON EXP NEEDED', '', '');
  [['🥉 Warrior', 'rank_warrior'], ['🥈 Elite', 'rank_elite'], ['🥇 Master', 'rank_master'], ['💠 Epic', 'rank_epic'], ['👑 Legend', 'rank_legend'], ['🔥 Mythic', 'rank_mythic']].forEach(function (t) {
    P('rank', t[0], grp(cfg[t[1]] || 0) + ' EXP');
  });
  P('blank');

  P('section', '⏰  DUE TIMES — QUICK LIST');
  var dues = [];
  missions.forEach(function (m) { var d = dueOf(m.text_en); if (d !== 'Anytime today') dues.push([d, m.role, m.text_en]); });
  P('head', 'BY', 'WHO / WHAT', '', '');
  if (!dues.length) P('note', 'No fixed deadlines — submit anytime during the day.');
  dues.forEach(function (x) { P('rank', x[0], x[1] + ' — ' + x[2]); });
  P('blank');

  P('section', '🛠  FOR THE GM (about 5 minutes a day)');
  P('kv', 'Approve', 'In Mission_Log & Redemptions, set anything "pending" → approved (or rejected).');
  P('kv', 'Log sales & wins', 'In EXP_Log: pick person + category + item, then tick approved. For a real sale, put the RM in amount_rm.');
  P('kv', 'Late / bonus', 'Lateness tab for late arrivals. For a RM 3k/5k/10k sales day, log one milestone row.');
  P('tip', '✔ The player app, boss bar and leaderboards all refresh by themselves within about 1 minute.');
  P('blank');

  P('section', '👑  FOR TEAM LEAD / BOSS');
  P('note', '• Log in with your PIN to see everyone’s live stats, the boss progress and the feed (Overview + Guide).');
  P('note', '• To change a mission, reward or EXP: edit the Missions / Actions / Shop tab, then run  ⚔ WEPROJECT LEGENDS ▸ Refresh Guide.  The player app reflects your edits within a minute automatically.');
  P('blank');

  P('subtitle', 'Last refreshed: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'));

  // ---- write values, then style row-by-row ----
  var grid = content.map(function (x) { return x.r; });
  sheet.getRange(1, 1, grid.length, COLS).setValues(grid);
  sheet.getRange(1, 1, grid.length, COLS).setVerticalAlignment('top').setWrap(true).setFontSize(11);

  for (var i = 0; i < content.length; i++) {
    var row = i + 1, t = content[i].t, full = sheet.getRange(row, 1, 1, COLS);
    if (t === 'title')         { full.merge().setBackground('#0A0D1C').setFontColor('#F5C542').setFontWeight('bold').setFontSize(16); sheet.setRowHeight(row, 44); }
    else if (t === 'subtitle') { full.merge().setFontColor('#7C86B0').setFontStyle('italic').setFontSize(10); }
    else if (t === 'section')  { full.merge().setBackground('#12172B').setFontColor('#F5C542').setFontWeight('bold').setFontSize(12); sheet.setRowHeight(row, 30); }
    else if (t === 'subhead')  { full.merge().setBackground('#0E1630').setFontColor('#3EE0F0').setFontWeight('bold'); }
    else if (t === 'note')     { full.merge().setFontColor('#2B3350'); }
    else if (t === 'tip')      { full.merge().setFontColor('#1F9D55').setFontWeight('bold'); }
    else if (t === 'head')     { sheet.getRange(row, 1, 1, COLS).setBackground('#1A2038').setFontColor('#E8ECFF').setFontWeight('bold').setFontSize(10); }
    else if (t === 'mhead')    { sheet.getRange(row, 1, 1, 2).merge(); sheet.getRange(row, 1, 1, COLS).setBackground('#1A2038').setFontColor('#E8ECFF').setFontWeight('bold').setFontSize(10); }
    else if (t === 'mission')  { sheet.getRange(row, 1, 1, 2).merge(); sheet.getRange(row, 3).setFontWeight('bold').setFontColor('#B8860B'); sheet.getRange(row, 4).setFontColor('#8A93B8').setFontSize(10); }
    else if (t === 'act')      { sheet.getRange(row, 2).setFontColor('#4A5578'); sheet.getRange(row, 3).setFontWeight('bold').setFontColor('#0E7C8C'); sheet.getRange(row, 4).setFontColor('#8A6D00').setFontSize(10); }
    else if (t === 'shop')     { sheet.getRange(row, 1, 1, 2).merge(); sheet.getRange(row, 3).setFontWeight('bold').setFontColor('#B8860B'); sheet.getRange(row, 4).setFontColor('#8A93B8').setFontSize(10); }
    else if (t === 'rank')     { sheet.getRange(row, 1).setFontWeight('bold'); sheet.getRange(row, 2, 1, 3).merge().setFontColor('#2B3350'); }
    else if (t === 'kv')       { sheet.getRange(row, 1).setFontWeight('bold').setFontColor('#8A5A00'); sheet.getRange(row, 2, 1, 3).merge().setFontColor('#2B3350'); }
  }

  sheet.setColumnWidth(1, 250);
  sheet.setColumnWidth(2, 440);
  sheet.setColumnWidth(3, 150);
  sheet.setColumnWidth(4, 170);
  try { sheet.setHiddenGridlines(true); } catch (e) {}
  sheet.setFrozenRows(1);
}

/* ------------------------------------------------------------------ */
/* GM menu — a one-click toolbar in the sheet (appears on open)        */
/* ------------------------------------------------------------------ */

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('⚔ WEPROJECT LEGENDS')
      .addItem('🔄 Refresh Guide', 'refreshGuide')
      .addSeparator()
      .addItem('⚙ Apply rule changes (Missions / Actions / Shop)', 'applySalesChallengeConfig')
      .addItem('▶ Start a NEW month (reset gauntlet + ranks)', 'setSeasonToThisMonth')
      .addSeparator()
      .addItem('🧹 Simplify sheet (hide setup tabs)', 'simplifySheet')
      .addToUi();
  } catch (e) {}
}

/** One-click: rebuild the Guide tab from the current Missions / Actions / Shop tabs. */
function refreshGuide() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  buildGuide(ss);
  try { CacheService.getScriptCache().removeAll(['state:weproject', 'state:wellous', 'tv']); } catch (e) {}
  uiAlert_('Guide refreshed', 'The Guide tab now matches the current Missions, Actions and Shop tabs.');
}

/* ================================================================== */
/* OPTIONAL HELPERS — run these individually, NOT setupWeprojectLegends */
/* ================================================================== */

/**
 * Non-destructive: reorders + color-codes the tabs into workflow groups.
 * Does NOT rename tabs (the API reads them by name) and does NOT touch data.
 * Run THIS function on its own.
 */
function organizeSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var plan = [
    ['Guide',             '#34A853'], // reference (green)
    ['Presets',           '#34A853'], // reference (green) — created by enableSmartLogging
    ['EXP_Log',           '#F5C542'], // daily entry (gold)
    ['Achievements_Feed', '#F5C542'], // daily entry (gold)
    ['Redemptions',       '#EA4335'], // approve/reject (red)
    ['Mission_Log',       '#EA4335'], // approve/reject (red)
    ['Players',           '#9AA0A6'], // setup (grey)
    ['Shop',              '#9AA0A6'],
    ['Actions',           '#9AA0A6'],
    ['Missions',          '#9AA0A6'],
    ['Crystal_War',       '#9AA0A6'],
    ['Buffs',             '#9AA0A6'],
    ['Config',            '#9AA0A6']
  ];
  var pos = 1;
  for (var i = 0; i < plan.length; i++) {
    var sh = ss.getSheetByName(plan[i][0]);
    if (!sh) continue;
    ss.setActiveSheet(sh);
    ss.moveActiveSheet(pos++);
    sh.setTabColor(plan[i][1]);
  }
  uiAlert_('Tabs organized',
    'Grouped + color-coded:\n\n' +
    'GREEN  Guide / Presets — reference\n' +
    'GOLD   EXP_Log + Achievements_Feed — fill in daily\n' +
    'RED    Redemptions + Mission_Log — approve / reject\n' +
    'GREY   Players / Shop / Actions / Missions / Crystal_War / Buffs / Config — setup\n\n' +
    'No data changed, no tabs renamed.');
}

/**
 * Adds a Presets tab + a task dropdown on EXP_Log.item.
 * Picking a task auto-fills category, exp, and date. Run this ONCE.
 */
function enableSmartLogging() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var p = ss.getSheetByName('Presets');
  if (p) { p.clear(); } else { p = ss.insertSheet('Presets'); }

  p.getRange(1, 1, 1, 3).setValues([['task', 'category', 'exp']])
    .setFontWeight('bold').setFontColor('#F5C542').setBackground('#0A0D1C');

  var presets = [
    ['Daily sales RM3,000', 'milestone', 50],
    ['Daily sales RM5,000', 'milestone', 80],
    ['Daily sales RM10,000', 'milestone', 200],
    ['Winning Creative (>5 purchases, ROAS>3)', 'achievement', 80],
    ['First order of the day (First Blood)', 'achievement', 10],
    ['10 purchases in a day (Double Kill)', 'action', 20],
    ['RM3k per live session', 'action', 25],
    ['Low returns (<=5 this month)', 'action', 15],
    ['All daily missions complete', 'action', 30],
    ['Editor: Winning Creative Production', 'achievement', 80],
    ['Editor: All Video Purchase (30/week)', 'action', 30]
  ];
  p.getRange(2, 1, presets.length, 3).setValues(presets);
  p.setFrozenRows(1);
  p.setColumnWidth(1, 320);
  p.setTabColor('#34A853');

  var exp = ss.getSheetByName('EXP_Log');
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(p.getRange('A2:A200'), true)
    .setAllowInvalid(true)
    .build();
  exp.getRange(2, 5, 2000, 1).setDataValidation(rule);

  uiAlert_('Smart logging is ON',
    'In EXP_Log, pick a task from the "item" dropdown — category, exp and date fill in automatically. You can still type custom text for one-off items.');
}

/**
 * Auto-fills category/exp/date when a preset task is chosen in EXP_Log.item.
 * This is a simple trigger — it runs automatically, no setup needed.
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    var sh = e.range.getSheet();
    if (sh.getName() !== 'EXP_Log') return;
    if (e.range.getColumn() !== 5 || e.range.getRow() < 2) return;
    var task = e.value;
    if (!task) return;
    var p = e.source.getSheetByName('Presets');
    if (!p || p.getLastRow() < 2) return;
    var rows = p.getRange(2, 1, p.getLastRow() - 1, 3).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][0]) === String(task)) {
        var r = e.range.getRow();
        sh.getRange(r, 4).setValue(rows[i][1]); // category
        sh.getRange(r, 6).setValue(rows[i][2]); // exp
        var dc = sh.getRange(r, 2);
        if (dc.getValue() === '') dc.setValue(new Date()); // date if empty
        break;
      }
    }
  } catch (err) {}
}

/**
 * Loads a demo dataset (WeProject only) that showcases the gauntlet + rankings.
 * REPLACES the contents of EXP_Log + Achievements_Feed (keeps everything else).
 * Delete the rows afterwards to go back to a clean sheet.
 */
function loadDemoData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var exp = ss.getSheetByName('EXP_Log');
  var feed = ss.getSheetByName('Achievements_Feed');
  if (!exp || !feed) { uiAlert_('Setup needed', 'Run setupWeprojectLegends or migrateExistingSheetToV5_1 first.'); return; }

  var d = new Date();
  function at(h, m) { var x = new Date(); x.setHours(h, m, 0, 0); return x; }

  if (exp.getLastRow() > 1) exp.getRange(2, 1, exp.getLastRow() - 1, 9).clearContent();
  if (feed.getLastRow() > 1) feed.getRange(2, 1, feed.getLastRow() - 1, 6).clearContent();

  // log_id, date, player_id, category, item, exp, amount_rm, approved, note
  var expRows = [
    ['', d, 'P002', 'action', 'Closed RM 212,300 in ad revenue', 4200, 212300, true, ''],
    ['', d, 'P009', 'action', 'Live session drove RM 154,200', 3700, 154200, true, ''],
    ['', d, 'P003', 'action', 'Closed RM 128,800 campaign', 5600, 128800, true, ''],
    ['', d, 'P004', 'action', 'RM 88,700 in sales', 2100, 88700, true, ''],
    ['', d, 'P010', 'action', 'Live RM 64,200', 1200, 64200, true, ''],
    ['', d, 'P007', 'action', 'RM 41,200 in sales', 900, 41200, true, ''],
    ['', d, 'P006', 'action', 'RM 50,000 campaign', 1500, 50000, true, ''],
    ['', d, 'P008', 'action', 'RM 40,000 sales', 700, 40000, true, ''],
    ['', d, 'P014', 'achievement', 'Winning Creative #A-114', 80, '', true, ''],
    ['', d, 'P014', 'achievement', 'Winning Creative #A-120', 80, '', true, ''],
    ['', d, 'P014', 'action', 'High CTR Creative #B-2', 40, '', true, ''],
    ['', d, 'P016', 'achievement', 'Winning Creative #C-31', 80, '', true, ''],
    ['', d, 'P016', 'action', 'High CTR Creative #C-9', 40, '', true, ''],
    ['', d, 'P015', 'action', 'High CTR Creative #D-5', 40, '', true, ''],
    ['', d, 'P002', 'achievement', 'First order of the day (First Blood)', 10, '', true, ''],
    ['', d, 'P002', 'mvp', 'Daily MVP', 50, '', true, ''],
    ['', d, 'P002', 'mission', 'Publish ≥1 ad', 10, '', true, '']
  ];
  exp.getRange(2, 1, expRows.length, 9).setValues(expRows);

  // timestamp, player_id, tag, icon, description, exp
  var feedRows = [
    [at(9, 12),  'P009', 'FIRST BLOOD', '⚔️', 'First order of the day', 10],
    [at(11, 47), 'P014', 'WINNING CREATIVE', '🎯', 'Creative #A-114 hit 10 purchases', 80],
    [at(14, 3),  'P002', 'DOUBLE KILL', '⚔️⚔️', '10 purchases in a single day', 20],
    [at(15, 26), 'P015', 'ASSIST', '🤝', 'Helped Azim re-cut a live ad', 15],
    [at(17, 51), 'P002', 'SAVAGE', '💀', '3-day ROAS target streak', 60]
  ];
  feed.getRange(2, 1, feedRows.length, 6).setValues(feedRows);

  try { CacheService.getScriptCache().removeAll(['state:weproject', 'state:wellous', 'tv', 'shop:weproject', 'shop:wellous']); } catch (e) {}

  uiAlert_('Demo data loaded!',
    'EXP_Log + Achievements_Feed populated. Within ~60s the gauntlet stages and Damage ranking will reflect it.');
}

/**
 * Applies the ruleset to a LIVE sheet (non-destructive):
 *   • Refreshes the Guide tab.
 *   • Adds Config rows boss_name / boss_target / base_tower*_hp if missing.
 *   • Pins the season window (season_start/season_end) to THIS month.
 * Run THIS function once after pasting the updated Api.gs + Code.gs.
 */
function applyWorldBossRules() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureConfigRow_(ss, 'boss_name', 'Crystal Citadel');
  ensureConfigRow_(ss, 'boss_target', 1000000);
  ensureConfigRow_(ss, 'base_tower1_hp', '');
  ensureConfigRow_(ss, 'base_tower2_hp', '');
  ensureConfigRow_(ss, 'base_crystal_hp', '');
  setConfigValue('season_start', monthStartStr()); // pin the gauntlet + Rank window to THIS month
  setConfigValue('season_end', monthEndStr());
  buildGuide(ss);
  try { CacheService.getScriptCache().removeAll(['state:weproject', 'state:wellous', 'tv']); } catch (e) {}
  uiAlert_('Ruleset applied',
    'Guide tab refreshed for the monthly gauntlet (Tower I → Tower II → Crystal).\n\n' +
    'Config now has boss_name + boss_target (default 1,000,000) and the season is set to THIS month (' +
    monthStartStr() + ' → ' + monthEndStr() + '). Total HP auto-splits 30/40/30 across the two towers + crystal; ' +
    'set base_tower1_hp / base_tower2_hp / base_crystal_hp to size each stage yourself.\n\n' +
    'There is NO auto month rollover — run setSeasonToThisMonth whenever you want to start a fresh gauntlet.\n\n' +
    'Remember to Deploy → New version so the live API picks up the new Api.gs.');
}

/**
 * Manually start a fresh month: sets season_start/season_end to the current
 * month, which resets the gauntlet and everyone's Rank to count only this
 * month's rows. Run THIS on the 1st of any month you want to reset (there is
 * no automatic rollover, by design).
 */
function setSeasonToThisMonth() {
  setConfigValue('season_start', monthStartStr());
  setConfigValue('season_end', monthEndStr());
  try { CacheService.getScriptCache().removeAll(['state:weproject', 'state:wellous', 'tv']); } catch (e) {}
  uiAlert_('Season set to this month',
    'season_start = ' + monthStartStr() + '\nseason_end = ' + monthEndStr() + '\n\n' +
    "The gauntlet and everyone's Rank now count THIS month's revenue/EXP only.");
}

/** Append a Config key/value only if the key isn't already there (preserves GM edits). */
function ensureConfigRow_(ss, key, value) {
  var sheet = ss.getSheetByName('Config');
  if (!sheet) return;
  var values = sheet.getDataRange().getValues();
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][0]) === key) return;
  }
  sheet.appendRow([key, value]);
}

/**
 * Rebuilds the Missions / Actions / Shop tabs with the finalized Sales Challenge
 * content, plus the daily sales bonus ladder, and refreshes the Guide (feed-tag
 * dictionary + sales bonus). These are CONFIG tabs — safe to rebuild; it does
 * NOT touch Players / EXP_Log / Redemptions / Mission_Log data.
 * Run THIS once after pasting the new Code.gs. (CS staff = set role "LiveHost".)
 */
function applySalesChallengeConfig() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  buildMissions(ss);
  buildActions(ss);
  buildShop(ss);
  buildGuide(ss);
  try { CacheService.getScriptCache().removeAll(['state:weproject', 'state:wellous', 'tv', 'shop:weproject', 'shop:wellous']); } catch (e) {}
  uiAlert_('Sales Challenge config applied',
    'Updated tabs: Missions, Actions (incl. daily sales bonus RM3k/5k/10k = 50/80/200 for Marketer & LiveHost/CS), Shop (renamed rewards), and the Guide (feed-tag dictionary).\n\n' +
    'Reminder: assign CS staff the role "LiveHost" in the Players tab, then Deploy → New version.');
}

/**
 * v1.1 (2026-07): applies rule changes + the Commander role to a LIVE sheet.
 *   • Rebuilds Missions / Actions / Shop / Guide (new "Update Sales in Group"
 *     mission, testimonials 10 EXP, Revenue Milestone removed, shop wording).
 *   • Adds a 'status' column to Players (default 'player') if missing.
 *   • Adds commanders Jeanette / Haikal / Chloe as P017+ with status=commander.
 * Run THIS once, then run seedJulyDamage, then Deploy → New version.
 */
function applyV11() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  buildMissions(ss);
  buildActions(ss);
  buildShop(ss);
  buildGuide(ss);
  var addedCol = migratePlayersStatus_(ss);
  var newCmd = ensureCommanders_(ss);
  try { CacheService.getScriptCache().removeAll(['state:weproject', 'state:wellous', 'tv', 'shop:weproject', 'shop:wellous', 'roster']); } catch (e) {}
  uiAlert_('v1.1 applied',
    'Rules updated: new "Update Sales in Group by 6pm" mission for all roles; testimonials now 10 EXP; Revenue Milestone removed; shop wording.\n\n' +
    (addedCol ? 'Added a "status" column to Players (existing rows = player).\n' : 'Players already had a status column.\n') +
    (newCmd.length ? 'Added commanders: ' + newCmd.join(', ') + '.\n' : 'Commanders already present.\n') +
    '\nNext: run seedJulyDamage, then Deploy → New version.');
}

/** Add a 'status' column to Players (default 'player') if it isn't there yet. Returns true if added. */
function migratePlayersStatus_(ss) {
  var sheet = ss.getSheetByName('Players');
  if (!sheet) return false;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var idx = headers.indexOf('status');
  if (idx !== -1) { applyDropdown(sheet, idx + 1, SMALL_ROWS, PLAYER_STATUSES); return false; }
  var col = sheet.getLastColumn() + 1;
  sheet.getRange(1, col).setValue('status').setFontWeight('bold').setFontColor('#F5C542').setBackground('#0A0D1C');
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var vals = [];
    for (var i = 0; i < lastRow - 1; i++) vals.push(['player']);
    sheet.getRange(2, col, lastRow - 1, 1).setValues(vals);
  }
  applyDropdown(sheet, col, SMALL_ROWS, PLAYER_STATUSES);
  return true;
}

/** Append commanders (by name) if not already in Players. Returns names added. */
function ensureCommanders_(ss) {
  var sheet = ss.getSheetByName('Players');
  if (!sheet) return [];
  var pHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var col = {};
  pHeaders.forEach(function (h, i) { col[h] = i; });
  var haveName = {}, maxNum = 0;
  getRows('Players').forEach(function (p) {
    haveName[String(p.name).trim().toLowerCase()] = true;
    var m = String(p.player_id).match(/(\d+)/);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  });
  var added = [];
  COMMANDERS.forEach(function (c) {
    if (haveName[c[0].toLowerCase()]) return;
    var id = 'P' + ('00' + (++maxNum)).slice(-3);
    var row = [];
    for (var i = 0; i < pHeaders.length; i++) row.push('');
    row[col['player_id']] = id;
    row[col['team']] = 'weproject';
    row[col['name']] = c[0];
    row[col['role']] = c[1];
    if (col['avatar'] != null) row[col['avatar']] = c[2];
    row[col['active']] = true;
    if (col['status'] != null) row[col['status']] = 'commander';
    sheet.appendRow(row);
    added.push(c[0]);
  });
  return added;
}

/** thousands separator for the seed feed text */
function commas_(n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

/**
 * Seeds July month-to-date boss damage (completed + COD combined), as of 14 Jul 2026.
 * REPLACES EXP_Log + Achievements_Feed. Damage rows carry amount_rm only (no EXP).
 * Total = RM 443,262.42 → Tower I broken, Tower II ~36%. Run applyV11 FIRST.
 */
function seedJulyDamage() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var exp = ss.getSheetByName('EXP_Log');
  var feed = ss.getSheetByName('Achievements_Feed');
  if (!exp || !feed) { uiAlert_('Setup needed', 'Run setupWeprojectLegends or migrateExistingSheetToV5_1 first.'); return; }

  var idByName = {};
  getRows('Players').forEach(function (p) { idByName[String(p.name).trim().toLowerCase()] = p.player_id; });

  // [name, month-to-date damage (completed + COD)]
  var seed = [
    ['Jeanette', 97550.06], ['Haikal', 52726.00], ['Chloe', 19303.00],   // commanders (boss damage only)
    ['Izz', 23147.13], ['Nina', 46413.55], ['Alia', 8542.00], ['Azim', 18459.00],
    ['Wing Nam', 51544.00], ['Wen Pei', 458.00], ['Nizam', 53215.00], ['Intan', 12016.00],
    ['Ain', 18728.00], ['Connie', 2882.00], ['Qistina', 15358.55], ['Dayah', 12804.50], ['Syaza', 10115.63]
  ];
  var when = new Date(2026, 6, 1, 9, 0, 0); // 1 Jul 2026, inside the season window

  if (exp.getLastRow() > 1) exp.getRange(2, 1, exp.getLastRow() - 1, 9).clearContent();
  var rows = [], total = 0, missing = [];
  seed.forEach(function (s) {
    var id = idByName[s[0].toLowerCase()];
    if (!id) { missing.push(s[0]); return; }
    total += s[1];
    // log_id, date, player_id, category, item, exp, amount_rm, approved, note
    rows.push(['', when, id, 'action', 'July sales MTD (completed + COD)', '', s[1], true, '']);
  });
  if (rows.length) exp.getRange(2, 1, rows.length, 9).setValues(rows);

  // Commander sales on the feed (status auto-flags them as COMMANDER)
  if (feed.getLastRow() > 1) feed.getRange(2, 1, feed.getLastRow() - 1, 6).clearContent();
  var fwhen = new Date(2026, 6, 14, 10, 0, 0);
  var frows = [];
  [['Jeanette', 97550.06], ['Haikal', 52726.00], ['Chloe', 19303.00]].forEach(function (c) {
    var id = idByName[c[0].toLowerCase()];
    if (id) frows.push([fwhen, id, 'COMMANDER', '⚔️', 'dealt RM ' + commas_(c[1]) + ' damage', '']);
  });
  if (frows.length) feed.getRange(2, 1, frows.length, 6).setValues(frows);

  try { CacheService.getScriptCache().removeAll(['state:weproject', 'state:wellous', 'tv', 'shop:weproject', 'shop:wellous']); } catch (e) {}

  uiAlert_('July damage seeded',
    'Total boss damage = RM ' + commas_(total) + ' (' + rows.length + ' people).\n' +
    (missing.length ? 'MISSING (run applyV11 first?): ' + missing.join(', ') + '\n' : '') +
    'Tower I (300k) destroyed; Tower II at ' + commas_(Math.max(0, total - 300000)) + ' / 400,000.\n' +
    'Commanders count toward the boss but are hidden from the leaderboard.');
}

/**
 * v1.2 (2026-07): coin-only rule changes on a LIVE sheet (non-destructive).
 *   • "Update Sales in Group" mission → +5 COINS/day (exp set to 0; coins are
 *     auto-credited when the GM approves that mission in Mission_Log).
 *   • Creates a Lateness tab — GM logs date + player_id per late arrival; the API
 *     auto-deducts coins (−10 for 1st–3rd/month, −20 for 4th+; resets on the 1st).
 *   • Refreshes the Guide. Config / EXP_Log / Players are untouched.
 * Run THIS once after pasting the new code, then Deploy → New version.
 */
function applyV12() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  buildMissions(ss);
  var madeTab = !ss.getSheetByName('Lateness');
  if (madeTab) buildLateness(ss);
  buildGuide(ss);
  try { CacheService.getScriptCache().removeAll(['state:weproject', 'state:wellous', 'tv']); } catch (e) {}
  uiAlert_('v1.2 applied',
    '"Update Sales in Group by 6pm" is now +5 COINS/day (coins only, no EXP) — credited when you APPROVE that mission in Mission_Log.\n\n' +
    (madeTab ? 'Created the "Lateness" tab. ' : 'Lateness tab already exists. ') +
    'Add a row (date + player_id) each time someone is late — coins auto-deduct −10 (1st–3rd/month) or −20 (4th+), resets on the 1st. Coins only, balance may go negative. Commanders: do NOT log them.\n\n' +
    'Deploy → New version to push the API.');
}

/**
 * SIMPLIFY THE SHEET for the GM. Builds a plain-English HOME tab, orders +
 * colors the tabs used day-to-day, and HIDES the setup tabs (not deleted —
 * unhide anytime via the ☰ "All Sheets" icon or View → Hidden sheets).
 * Safe + reversible. Run THIS function.
 */
function simplifySheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  buildHomeTab(ss);

  var visible = [
    ['HOME',              '#34A853'],
    ['EXP_Log',           '#F5C542'],
    ['Achievements_Feed', '#F5C542'],
    ['Redemptions',       '#EA4335'],
    ['Mission_Log',       '#EA4335'],
    ['Lateness',          '#EA4335'],
    ['Players',           '#9AA0A6'],
    ['Guide',             '#34A853']
  ];
  var hidden = ['Shop', 'Actions', 'Missions', 'Config', 'Crystal_War', 'Buffs', 'Presets', 'Steals', 'Boss_ARCHIVED'];

  var pos = 1;
  visible.forEach(function (v) {
    var sh = ss.getSheetByName(v[0]);
    if (!sh) return;
    sh.showSheet();
    ss.setActiveSheet(sh);
    ss.moveActiveSheet(pos++);
    sh.setTabColor(v[1]);
  });

  ss.setActiveSheet(ss.getSheetByName('HOME')); // can't hide the active sheet
  hidden.forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (sh) { sh.setTabColor('#555555'); sh.hideSheet(); }
  });

  uiAlert_('Sheet simplified',
    'The GM now sees only the day-to-day tabs:\n\n' +
    'HOME — start here\n' +
    'EXP_Log — record points & sales\n' +
    'Achievements_Feed — TV highlights\n' +
    'Redemptions — approve shop redeems\n' +
    'Mission_Log — approve missions\n' +
    'Lateness — log late arrivals\n' +
    'Players — people & PINs\n' +
    'Guide — full rules reference\n\n' +
    'Setup tabs (Shop, Actions, Missions, Config, Crystal_War, Buffs, Presets) are HIDDEN, not deleted. ' +
    'Unhide them anytime: bottom-left ☰ "All Sheets" icon, or View menu → Hidden sheets.');
}

/** Plain-English one-page instructions shown as the first tab. */
function buildHomeTab(ss) {
  var sheet = ss.getSheetByName('HOME');
  if (sheet) { sheet.clear(); } else { sheet = ss.insertSheet('HOME'); }

  var content = [
    { t: 'title',   a: 'WEPROJECT LEGENDS — GM START HERE', b: '' },
    { t: 'blank',   a: '', b: '' },
    { t: 'section', a: '⭐ EVERY DAY — 3 THINGS', b: '' },
    { t: 'step', a: '1.  Approve — in Mission_Log & Redemptions, set anything "pending" → approved (or rejected).', b: '' },
    { t: 'step', a: '2.  Log sales & wins — in EXP_Log: pick person + category + item, tick "approved". For a real sale, put the RM in amount_rm.', b: '' },
    { t: 'step', a: '3.  (Optional) Highlights — add standout moments to Achievements_Feed for the office TV.', b: '' },
    { t: 'blank',   a: '', b: '' },
    { t: 'section', a: '🕹 ONE-CLICK MENU (top bar: “⚔ WEPROJECT LEGENDS”)', b: '' },
    { t: 'kv', a: '🔄 Refresh Guide', b: 'Rebuild the Guide tab after you change any mission / EXP / reward.' },
    { t: 'kv', a: '⚙ Apply rule changes', b: 'Push edits from Missions / Actions / Shop into the game + Guide.' },
    { t: 'kv', a: '▶ Start a NEW month', b: 'Reset the boss gauntlet + everyone’s Rank to the current month.' },
    { t: 'step', a: 'Don’t see the menu? Reload the sheet once (it appears next to Help).', b: '' },
    { t: 'blank',   a: '', b: '' },
    { t: 'section', a: '📖 WHERE THINGS ARE', b: '' },
    { t: 'kv', a: 'EXP_Log', b: 'The daily scoreboard — every point & sale. The tab you use most.' },
    { t: 'kv', a: 'Redemptions', b: 'Shop redeems waiting for your approval.' },
    { t: 'kv', a: 'Mission_Log', b: 'Missions players submitted, waiting for approval.' },
    { t: 'kv', a: 'Lateness', b: 'Add a row when someone is late — coins auto-deduct.' },
    { t: 'kv', a: 'Achievements_Feed', b: 'Highlights for the TV screen.' },
    { t: 'kv', a: 'Players', b: 'Everyone on the team + their 4-digit PINs.' },
    { t: 'kv', a: 'Guide', b: 'The full rules for players, leads & boss (auto-built — read-only).' },
    { t: 'blank',   a: '', b: '' },
    { t: 'section', a: '✏️ TO CHANGE A MISSION, REWARD OR EXP', b: '' },
    { t: 'step', a: 'Edit the Missions / Actions / Shop tab (unhide via the ☰ "All Sheets" icon, bottom-left). The player app reflects it within a minute; then click ⚔ menu → Refresh Guide to update the Guide tab.', b: '' },
    { t: 'blank',   a: '', b: '' },
    { t: 'section', a: '🤖 AUTOMATIC — NO ACTION NEEDED', b: '' },
    { t: 'step', a: 'The boss gauntlet (Tower I → Tower II → Crystal), the Damage ranking and everyone’s coins all update by themselves from the rows you approve — nothing to hand-edit.', b: '' },
    { t: 'blank',   a: '', b: '' },
    { t: 'section', a: '✅ GOLDEN RULES', b: '' },
    { t: 'step', a: '• Nothing counts until you tick "approved".', b: '' },
    { t: 'step', a: '• amount_rm is ONLY for real sales (RM) — it is the damage dealt to the boss + the Damage board.', b: '' },
    { t: 'step', a: '• To fix a mistake: add a new row with a NEGATIVE number. Never delete history.', b: '' }
  ];

  var values = content.map(function (x) { return [x.a, x.b]; });
  sheet.getRange(1, 1, values.length, 2).setValues(values);

  for (var i = 0; i < content.length; i++) {
    var row = i + 1, t = content[i].t;
    if (t === 'title') {
      sheet.getRange(row, 1, 1, 2).merge().setFontSize(15).setFontWeight('bold').setFontColor('#F5C542').setBackground('#0A0D1C');
      sheet.setRowHeight(row, 36);
    } else if (t === 'section') {
      sheet.getRange(row, 1, 1, 2).merge().setFontWeight('bold').setFontColor('#F5C542').setBackground('#12172B');
    } else if (t === 'step') {
      sheet.getRange(row, 1, 1, 2).merge().setWrap(true).setFontColor('#2B3350');
    } else if (t === 'kv') {
      sheet.getRange(row, 1).setFontWeight('bold').setFontColor('#8A5A00');
      sheet.getRange(row, 2).setWrap(true).setFontColor('#2B3350');
    }
  }

  sheet.setColumnWidth(1, 230);
  sheet.setColumnWidth(2, 640);
  sheet.setFrozenRows(1);
  try { sheet.setHiddenGridlines(true); } catch (e) {}
  sheet.getRange(1, 1, values.length, 2).setVerticalAlignment('middle');
}

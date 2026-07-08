/**
 * WEPROJECT LEGENDS — Phase 1: Google Sheets structure (SPEC V5.1)
 * =====================================================================
 * V5.1 replaces World Boss with Crystal War, adds Hero Class, and adds
 * team (weproject/wellous) across the board. See SPEC.md for the full
 * authoritative spec — this file only builds the database structure.
 *
 * TWO ENTRY POINTS — pick the right one:
 *
 *   • setupWeprojectLegends()        — FRESH sheet only. Builds all 11
 *     data tabs + Guide from scratch, seeded with WeProject roster/shop/
 *     actions/missions. Re-running WIPES any data already in those tabs
 *     (same behavior as before). Do NOT run this on the live sheet.
 *
 *   • migrateExistingSheetToV5_1()   — Upgrades the LIVE sheet in place.
 *     Non-destructive: reshapes Players/Shop/EXP_Log/Config by reading
 *     existing values first, archives (renames, does not delete) the old
 *     Boss tab, and creates the 5 new tabs only if they don't exist yet.
 *     Safe to re-run — already-migrated tabs are skipped.
 *
 * ⚠️ Running the migration changes the sheet structure that Api.gs reads.
 * The live app (mobile + TV) will look broken (missing Boss, no Crystal
 * War) until Api.gs is rewritten for V5.1 — that's a separate Phase 2
 * step. Expect a gap between running this and shipping the new API.
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
// which hero within their role's class family. Kept here for reference —
// Api.gs (Phase 2) enforces this mapping in setHeroClass.
var HERO_CLASS_BY_ROLE = {
  Marketer:    ['Marksman', 'Mage', 'Assassin'],   // Carry
  LiveHost:    ['Fighter', 'Tank', 'Berserker'],   // Fighter
  Editor:      ['Support', 'Bard', 'Summoner'],    // Support
  Salesperson: ['Marksman', 'Assassin', 'Berserker'] // Slayer (Wellous sales)
};

// Real Wellous roster (P101–P108): [player_id, name, role, avatar].
// Salespeople earn revenue; Editors / the Marketer don't contribute to sales.
var WELLOUS_ROSTER = [
  ['P101', 'Yodaa',    'Salesperson', '🦂'],
  ['P102', 'Vicky',    'Salesperson', '🐉'],
  ['P103', 'Lilian',   'Salesperson', '🦅'],
  ['P104', 'Janice',   'Salesperson', '🔱'],
  ['P105', 'Fish',     'Salesperson', '🐟'],
  ['P106', 'Sin Huey', 'Editor',      '🖌️'],
  ['P107', 'Wei Hao',  'Editor',      '🎥'],
  ['P108', 'Billy',    'Marketer',    '📣']
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
  buildGuide(ss);

  ss.setActiveSheet(ss.getSheetByName('Guide'));
  ss.moveActiveSheet(1);

  removeDefaultSheet(ss);

  SpreadsheetApp.getUi().alert(
    'WEPROJECT LEGENDS — V5.1',
    'Phase 1 complete — 11 data tabs + a Guide tab created and seeded ' +
    '(WeProject roster only; add Wellous rows with team=wellous when ready).\n\n' +
    'Next: assign PINs and join_dates in Players, then Phase 2 (Api.gs) for Crystal War.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
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
    ? 'Shop: added team column. Existing items set to team=weproject — add Wellous items separately.'
    : 'Shop: already has team — skipped.');

  migrateExpLogCategories(ss);
  summary.push('EXP_Log: category dropdown updated (no more "boss"); any existing boss rows were recategorized to "action" — amount_rm still counts the same way toward Crystal War / Damage.');

  migrateConfigTab(ss);
  summary.push('Config: rebuilt with Crystal War / KO / Pace / Security keys. rage_cap and rage_multiplier removed (no rage mechanic in Crystal War). Existing rank/level/season values you had were preserved.');

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
  summary.push('Guide tab rewritten for V5.1 rules.');

  removeDefaultSheet(ss);

  SpreadsheetApp.getUi().alert(
    'Migrated to V5.1',
    summary.join('\n\n') +
    '\n\n⚠️ The live mobile/TV app will look broken (no Boss, no Crystal War yet) until Api.gs is rewritten for this structure — that is Phase 2, a separate step.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
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

/** 'YYYY-MM-DD' for the 1st of the current month, kept as a string default (avoid Sheets' auto Date-cast — see SPEC §Api gotchas). */
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
  var headers = ['player_id', 'team', 'name', 'role', 'hero_class', 'gender_pref', 'pin', 'avatar', 'join_date', 'active'];

  // Order matters: P001–P016 exactly as listed in SPEC. hero_class/pin/
  // join_date left blank — GM assigns PINs, players self-select class.
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
    return [id, 'weproject', r[0], r[1], '', '', '', r[2], '', true];
  });

  var sheet = makeSheet(ss, 'Players', headers, rows);
  applyDropdown(sheet, 2, SMALL_ROWS, TEAMS);
  applyDropdown(sheet, 4, SMALL_ROWS, PLAYER_ROLES);
  applyCheckbox(sheet, 10, SMALL_ROWS); // active
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
    'amount_rm',  // RM amount for Revenue rows — drives both personal Damage AND Crystal War, else blank
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
    ['S01', 'weproject', 'Coffee Voucher',            '☕',  300,  -1, true],
    ['S02', 'weproject', 'Bubble Tea',                '🧋',  400,  -1, true],
    ['S03', 'weproject', 'Mystery Box',                '🎁',  500,  -1, true],
    ['S04', 'weproject', 'Lunch Voucher RM20',         '🍱',  800,  -1, true],
    ['S05', 'weproject', 'Late Pass (1×)',             '🎟️', 2000, -1, true],
    ['S06', 'weproject', 'Leave 1hr Early',            '🕐',  3000, -1, true],
    ['S07', 'weproject', 'Team Tea Time — Your Pick',  '🧃',  4000, -1, true],
    ['S08', 'weproject', 'Limited Drop: Earbuds',      '🎧',  5000,  1, true]
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

    // Crystal War
    ['towers_per_side', 3],
    ['week_reset_day',  'monday'],
    ['lock_time',        '23:59'],
    ['lord_multiplier',  2],

    // Lane Matchup KO board
    ['ko_margin', 2],

    // Pace badges / bounty — judged from join_date (pace) or season EXP (bounty)
    ['pace_lv10_days',  30],
    ['pace_lv10_bonus', 500],
    ['pace_lv20_days',  75],
    ['pace_lv20_bonus', 1000],
    ['bounty_lv15',     1000], // first-to-Lv15-EQUIVALENT-season-EXP bounty, re-triggers each season

    // PIN security
    ['pin_fail_limit', 10],
    ['pin_fail_window_min', 10],

    // GM-only actions (lockWeek). CHANGE THIS before go-live.
    ['admin_pin', '1001']
  ];
}

function buildConfig(ss) {
  makeSheet(ss, 'Config', ['key', 'value'], configDefaultRows());
}

/* ------------------------------------------------------------------ */
/* Tab 6: Achievements_Feed  (source for the TV kill-feed / bullets)   */
/* ------------------------------------------------------------------ */

function buildAchievementsFeed(ss) {
  // team is derived from player_id at read time, not stored here.
  var headers = ['timestamp', 'player_id', 'tag', 'icon', 'description', 'exp'];
  makeSheet(ss, 'Achievements_Feed', headers, []); // GM populates
}

/* ------------------------------------------------------------------ */
/* Tab 7: Actions  (EXP rules table = the Hero Class bonus carrier)    */
/* ------------------------------------------------------------------ */

function buildActions(ss) {
  var headers = ['action_id', 'team', 'role', 'name_en', 'condition_en', 'exp', 'daily_cap', 'category', 'active'];

  // role='Any' = applies to every role. Numbers here are starter values —
  // GM tunes freely; Guide page reads straight from this table.
  var rows = [
    ['A01', 'weproject', 'Marketer', 'Winning Creative',        'Ad marked as a winning creative (hits conversion threshold)', 80, '', 'achievement', true],
    ['A02', 'weproject', 'Marketer', 'High CTR Creative',       'Ad reaches the high-CTR threshold',                            40, 200, 'action', true],
    ['A03', 'weproject', 'Marketer', 'Revenue Milestone',       'Hit a set RM revenue milestone',                               100, '', 'milestone', true],
    ['A04', 'weproject', 'Marketer', 'First Blood',             'First approved order of the day',                              10, '', 'achievement', true],
    ['A05', 'weproject', 'Marketer', 'Double Kill',             '10 approved purchases in a single day (also claims Power Creep buff for the team)', 20, '', 'action', true],

    ['A06', 'weproject', 'LiveHost', 'Live Closed Sale',        'Sale closed during a live session',                            50, 200, 'action', true],
    ['A07', 'weproject', 'LiveHost', 'Clutch Close',            'Converted a hesitant buyer during a live session',             15, 200, 'action', true],
    ['A08', 'weproject', 'LiveHost', 'Live MVP',                'Best live performance of the day',                             50, '', 'mvp', true],

    ['A09', 'weproject', 'Editor',   'Assist — Winning Creative', 'An ad you edited becomes a Winning Creative',                40, '', 'assist', true],
    ['A10', 'weproject', 'Editor',   'Assist — High CTR',       'An ad you edited becomes High CTR',                            20, '', 'assist', true],

    ['A11', 'weproject', 'Any',      'All Missions Complete',   'Completed every daily mission for your role',                  30, '', 'action', true]
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

  var rows = [
    ['M01', 'weproject', 'Marketer', 'Publish at least 1 ad',            10, 1, true],
    ['M02', 'weproject', 'Marketer', 'Submit report before 10:30am',     5,  2, true],
    ['M03', 'weproject', 'Marketer', 'Blast 1 audience pool',            10, 3, true],
    ['M04', 'weproject', 'LiveHost', 'Go live at least 2 hours',         10, 1, true],
    ['M05', 'weproject', 'LiveHost', 'Submit live report',               5,  2, true],
    ['M06', 'weproject', 'Editor',   'Deliver at least 1 edited ad',     10, 1, true],
    ['M07', 'weproject', 'Editor',   'Submit edit report',               5,  2, true]
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
/* Tab 10: Crystal_War  (tower state; weekly net is computed, not stored)*/
/* ------------------------------------------------------------------ */

function buildCrystalWar(ss) {
  var headers = ['season', 'current_week_no', 'week_start', 'wp_towers', 'wl_towers', 'crystal_broken', 'lord_double_side', 'lord_double_date'];

  // Live weekly net (the "rope" position) is NOT stored — the API computes
  // it on the fly from EXP_Log. This row only tracks the discrete, already-
  // settled tower state. GM advances current_week_no via lockWeek (Phase 2).
  var rows = [[currentMonthStr(), 1, mondayOfThisWeekStr(), 0, 0, 'none', 'none', '']];

  var sheet = makeSheet(ss, 'Crystal_War', headers, rows);
  applyDropdown(sheet, 6, SMALL_ROWS, CRYSTAL_BROKEN_OPTIONS);
  applyDropdown(sheet, 7, SMALL_ROWS, LORD_SIDE_OPTIONS);
}

/* ------------------------------------------------------------------ */
/* Tab 11: Buffs  (neutral monsters — Power Creep / Lord)               */
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
/* Guide tab: HR/GM entry reference                                    */
/* ------------------------------------------------------------------ */

function buildGuide(ss) {
  var name = 'Guide';
  var sheet = ss.getSheetByName(name);
  if (sheet) { sheet.clear(); } else { sheet = ss.insertSheet(name); }

  var blank = ['', '', '', '', ''];
  var content = [
    { r: ['WEPROJECT LEGENDS — GM / HR DAILY ENTRY GUIDE (V5.1 — Crystal War)', '', '', '', ''], t: 'title' },
    { r: blank, t: 'note' },

    { r: ['WHAT EACH EXP_LOG COLUMN MEANS', '', '', '', ''], t: 'section' },
    { r: ['column', 'what to put', '', '', ''], t: 'head' },
    { r: ['date', 'The day it happened. Used for the "today" feed.', '', '', ''], t: 'note' },
    { r: ['player_id', 'P001–P016. See the Players tab for who is who and their team.', '', '', ''], t: 'note' },
    { r: ['category', 'Pick from the dropdown (7 options). See Actions/Missions tabs for the exact EXP each item is worth.', '', '', ''], t: 'note' },
    { r: ['item', 'Free-text description. For Editors, include "Winning" or "High CTR" so it counts on the Creative board.', '', '', ''], t: 'note' },
    { r: ['exp', 'Points the player earns. Can be NEGATIVE for refunds / corrections. Power Creep ×1.2 and Lord ×2 are already multiplied in by you before typing the number.', '', '', ''], t: 'note' },
    { r: ['amount_rm', 'ONLY for real revenue (a sale). Drives BOTH the personal Damage ranking (monthly total) AND this week\'s Crystal War rope (weekly, resets Monday) — same number, two different views. Negative = refund, rolls back both.', '', '', ''], t: 'note' },
    { r: ['approved', 'Tick the checkbox to make the row count. Un-ticked rows are ignored by the app.', '', '', ''], t: 'note' },
    { r: blank, t: 'note' },

    { r: ['CRYSTAL WAR — HOW IT WORKS', '', '', '', ''], t: 'section' },
    { r: ['• Weekly rope: this week\'s (our approved RM) − (their approved RM). Resets to center every Monday. Purely visual, not a stored HP pool.', '', '', '', ''], t: 'note' },
    { r: ['• Towers: 3 per side, a discrete weekly win counter. Every Sunday 23:59, whichever side\'s rope net is positive that week knocks down 1 enemy tower. A tie knocks down nothing.', '', '', '', ''], t: 'note' },
    { r: ['• After all 3 enemy towers fall, the NEXT week won = the Crystal shatters = that team wins the season outright.', '', '', '', ''], t: 'note' },
    { r: ['• A month-end week with fewer than 4 working days does not get its own tower — its net folds into the previous full week.', '', '', '', ''], t: 'note' },
    { r: ['• Personal Damage ranking = each player\'s approved amount_rm summed for the WHOLE MONTH (never resets weekly) — a separate view from the weekly rope.', '', '', '', ''], t: 'note' },
    { r: ['• Season win order: shatter the crystal first > else most enemy towers destroyed by month end > else higher total season revenue.', '', '', '', ''], t: 'note' },
    { r: blank, t: 'note' },

    { r: ['HERO CLASS (locked by role, cosmetic choice within it)', '', '', '', ''], t: 'section' },
    { r: ['role', 'class family', 'heroes to choose from', '', ''], t: 'head' },
    { r: ['Marketer', 'Carry',   'Marksman / Mage / Assassin', '', ''], t: 'note' },
    { r: ['LiveHost', 'Fighter', 'Fighter / Tank / Berserker', '', ''], t: 'note' },
    { r: ['Editor',   'Support', 'Support / Bard / Summoner', '', ''], t: 'note' },
    { r: ['All heroes within a role share the same EXP numbers (see Actions tab) — only appearance differs, so matches stay balanced.', '', '', '', ''], t: 'note' },
    { r: blank, t: 'note' },

    { r: ['CATEGORY REFERENCE', '', '', '', ''], t: 'section' },
    { r: ['category', 'use it for', 'counts to daily 200 cap? (reference only)', 'becomes a badge?', ''], t: 'head' },
    { r: ['mission', 'Daily routine tasks (Missions tab)', 'YES', 'no', ''], t: 'note' },
    { r: ['action', 'One-off wins / good behaviour (Actions tab)', 'YES', 'no', ''], t: 'note' },
    { r: ['assist', 'Helping a teammate', 'YES', 'no', ''], t: 'note' },
    { r: ['achievement', 'Named feats (First Blood, Winning Creative…)', 'No (exempt)', 'YES', ''], t: 'note' },
    { r: ['milestone', 'Revenue / sales milestones', 'No (exempt)', 'YES', ''], t: 'note' },
    { r: ['mvp', 'Daily / weekly MVP bonus', 'No (exempt)', 'YES', ''], t: 'note' },
    { r: ['adjust', 'Corrections & refunds (negative exp / amount_rm)', '—', 'no', ''], t: 'note' },
    { r: blank, t: 'note' },

    { r: ['NEUTRAL BUFFS', '', '', '', ''], t: 'section' },
    { r: ['• Power Creep: refreshes daily. Claimed by whoever hits Double Kill (10 approved purchases) first that day → whole team\'s EXP ×1.2 for the day (you fold the ×1.2 into the numbers you type).', '', '', '', ''], t: 'note' },
    { r: ['• Lord: broken when a team beats the season\'s single-day revenue record → next day that team\'s Crystal War damage ×2 (again, you fold the ×2 into amount_rm/exp). ⚠️ Because this is manual, check the Buffs/Crystal_War tabs each morning for a pending Lord day so you don\'t forget to double it.', '', '', '', ''], t: 'note' },
    { r: blank, t: 'note' },

    { r: ['GOLDEN RULES', '', '', '', ''], t: 'section' },
    { r: ['• Gold = total approved EXP − shop spending. Spending Gold never lowers a Rank.', '', '', '', ''], t: 'note' },
    { r: ['• Rank uses SEASON (this calendar month) EXP. Level uses ALL-TIME EXP.', '', '', '', ''], t: 'note' },
    { r: ['• Daily cap (200) is a reference value only — the app never rejects a row; use judgment when approving.', '', '', '', ''], t: 'note' },
    { r: ['• To refund: add an "adjust" row with NEGATIVE exp (and negative amount_rm if it was revenue) — this is the ONLY way to refund.', '', '', '', ''], t: 'note' },
    { r: ['• Nothing counts until you tick the "approved" checkbox.', '', '', '', ''], t: 'note' },
    { r: ['• Pace badges / first-to-Lv15-season-EXP bounty are only FLAGGED by the app (from join_date / season EXP) — you still hand them out manually.', '', '', '', ''], t: 'note' }
  ];

  var values = content.map(function (x) { return x.r; });
  sheet.getRange(1, 1, values.length, 5).setValues(values);

  for (var i = 0; i < content.length; i++) {
    var row = i + 1;
    var range = sheet.getRange(row, 1, 1, 5);
    if (content[i].t === 'title') {
      range.merge().setFontSize(14).setFontWeight('bold')
        .setFontColor('#F5C542').setBackground('#0A0D1C');
      sheet.setRowHeight(row, 34);
    } else if (content[i].t === 'section') {
      range.merge().setFontWeight('bold')
        .setFontColor('#F5C542').setBackground('#12172B');
    } else if (content[i].t === 'head') {
      sheet.getRange(row, 1, 1, 5).setFontWeight('bold').setBackground('#1A2038').setFontColor('#E8ECFF');
    }
  }

  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 460);
  sheet.setColumnWidth(3, 160);
  sheet.setColumnWidth(4, 120);
  sheet.setColumnWidth(5, 160);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, values.length, 5).setVerticalAlignment('middle');
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
  SpreadsheetApp.getUi().alert(
    'Tabs organized',
    'Grouped + color-coded:\n\n' +
    'GREEN  Guide / Presets — reference\n' +
    'GOLD   EXP_Log + Achievements_Feed — fill in daily\n' +
    'RED    Redemptions + Mission_Log — approve / reject\n' +
    'GREY   Players / Shop / Actions / Missions / Crystal_War / Buffs / Config — setup\n\n' +
    'No data changed, no tabs renamed.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
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
    ['Publish ≥1 ad', 'mission', 10],
    ['Submit report before 10:30am', 'mission', 5],
    ['Blast 1 audience pool', 'mission', 10],
    ['Completed all daily missions', 'action', 30],
    ['10 purchases in a single day (Double Kill)', 'action', 20],
    ['Helped a teammate (Assist)', 'assist', 15],
    ['First order of the day (First Blood)', 'achievement', 10],
    ['Winning Creative', 'achievement', 80],
    ['High CTR Creative', 'action', 40],
    ['Daily MVP', 'mvp', 50]
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

  SpreadsheetApp.getUi().alert('Smart logging is ON',
    'In EXP_Log, pick a task from the "item" dropdown — category, exp and date fill in automatically. You can still type custom text for one-off items.',
    SpreadsheetApp.getUi().ButtonSet.OK);
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
 * Loads a demo dataset that showcases every feature.
 * REPLACES the contents of EXP_Log + Achievements_Feed (keeps everything else).
 * Run THIS function. Delete the rows afterwards to go back to a clean sheet.
 */
function loadDemoData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var exp = ss.getSheetByName('EXP_Log');
  var feed = ss.getSheetByName('Achievements_Feed');
  if (!exp || !feed) { SpreadsheetApp.getUi().alert('Run setupWeprojectLegends or migrateExistingSheetToV5_1 first.'); return; }

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

  SpreadsheetApp.getUi().alert('Demo data loaded!',
    'EXP_Log + Achievements_Feed populated. Personal Damage and this week\'s Crystal War rope will reflect it once Api.gs (Phase 2) reads the new amount_rm/category shape.',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * FULL CRYSTAL WAR DEMO — seeds a Wellous enemy team + both sides' revenue so
 * the Crystal War, Lane Matchups and TV broadcast all light up with a real fight.
 *
 * What it does (run THIS function):
 *   • Appends 8 Wellous players (P101–P108, team=wellous) if not already there.
 *   • REPLACES EXP_Log + Achievements_Feed with a dated-today dataset for BOTH teams.
 *   • Result this week: WeProject ~779k vs Wellous ~620k → rope leans WeProject,
 *     with one KO on the board (Nizam 2× Bella). Delete the rows to reset.
 *
 * Does NOT touch your real WeProject players / PINs / Config.
 */
function loadDemoWar() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var playersSheet = ss.getSheetByName('Players');
  var exp = ss.getSheetByName('EXP_Log');
  var feed = ss.getSheetByName('Achievements_Feed');
  if (!playersSheet || !exp || !feed) {
    SpreadsheetApp.getUi().alert('Run setupWeprojectLegends or migrateExistingSheetToV5_1 first.');
    return;
  }

  var d = new Date();
  function at(h, m) { var x = new Date(); x.setHours(h, m, 0, 0); return x; }

  // 1. Ensure the Wellous roster exists (idempotent, header-mapped so column order can't drift)
  var pHeaders = playersSheet.getRange(1, 1, 1, playersSheet.getLastColumn()).getValues()[0];
  var col = {};
  pHeaders.forEach(function (h, i) { col[h] = i; });
  var existingIds = {};
  getRows('Players').forEach(function (p) { existingIds[p.player_id] = true; });

  var wellous = WELLOUS_ROSTER;
  var toAppend = [];
  wellous.forEach(function (w) {
    if (existingIds[w[0]]) return;
    var row = [];
    for (var i = 0; i < pHeaders.length; i++) row.push('');
    row[col['player_id']] = w[0];
    row[col['team']]      = 'wellous';
    row[col['name']]      = w[1];
    row[col['role']]      = w[2];
    if (col['avatar'] != null) row[col['avatar']] = w[3];
    row[col['active']]    = true;
    toAppend.push(row);
  });
  if (toAppend.length) {
    playersSheet.getRange(playersSheet.getLastRow() + 1, 1, toAppend.length, pHeaders.length).setValues(toAppend);
  }

  // 2. Rewrite EXP_Log with both teams' revenue (dated today = inside this week)
  if (exp.getLastRow() > 1) exp.getRange(2, 1, exp.getLastRow() - 1, 9).clearContent();
  // log_id, date, player_id, category, item, exp, amount_rm, approved, note
  var expRows = [
    // --- WeProject (~779,400) ---
    ['', d, 'P002', 'action', 'Closed RM 212,300 in ad revenue', 4200, 212300, true, ''],
    ['', d, 'P009', 'action', 'Live session drove RM 154,200', 3700, 154200, true, ''],
    ['', d, 'P003', 'action', 'Closed RM 128,800 campaign', 5600, 128800, true, ''],
    ['', d, 'P004', 'action', 'RM 88,700 in sales', 2100, 88700, true, ''],
    ['', d, 'P010', 'action', 'Live RM 64,200', 1200, 64200, true, ''],
    ['', d, 'P006', 'action', 'RM 50,000 campaign', 1500, 50000, true, ''],
    ['', d, 'P007', 'action', 'RM 41,200 in sales', 900, 41200, true, ''],
    ['', d, 'P008', 'action', 'RM 40,000 sales', 700, 40000, true, ''],
    ['', d, 'P014', 'achievement', 'Winning Creative #A-114', 80, '', true, ''],
    ['', d, 'P014', 'achievement', 'Winning Creative #A-120', 80, '', true, ''],
    ['', d, 'P014', 'action', 'High CTR Creative #B-2', 40, '', true, ''],
    ['', d, 'P016', 'achievement', 'Winning Creative #C-31', 80, '', true, ''],
    ['', d, 'P016', 'action', 'High CTR Creative #C-9', 40, '', true, ''],
    ['', d, 'P015', 'action', 'High CTR Creative #D-5', 40, '', true, ''],
    ['', d, 'P002', 'achievement', 'First order of the day (First Blood)', 10, '', true, ''],
    ['', d, 'P002', 'mvp', 'Daily MVP', 50, '', true, ''],
    ['', d, 'P002', 'mission', 'Publish ≥1 ad', 10, '', true, ''],
    // --- Wellous sales (~620,000; only Salespeople earn revenue) ---
    ['', d, 'P101', 'action', 'Closed RM 180,000 in sales', 3600, 180000, true, ''],
    ['', d, 'P102', 'action', 'RM 150,000 in sales', 3000, 150000, true, ''],
    ['', d, 'P103', 'action', 'RM 120,000 in sales', 2400, 120000, true, ''],
    ['', d, 'P104', 'action', 'RM 100,000 in sales', 2000, 100000, true, ''],
    ['', d, 'P105', 'action', 'RM 70,000 in sales', 1400, 70000, true, '']
  ];
  exp.getRange(2, 1, expRows.length, 9).setValues(expRows);

  // 3. Rewrite Achievements_Feed — both teams (TV mixed feed carries team badges)
  if (feed.getLastRow() > 1) feed.getRange(2, 1, feed.getLastRow() - 1, 6).clearContent();
  // timestamp, player_id, tag, icon, description, exp
  var feedRows = [
    [at(9, 12),  'P009', 'FIRST BLOOD', '⚔️', 'First order of the day', 10],
    [at(10, 30), 'P101', 'FIRST BLOOD', '⚔️', 'Enemy draws first blood', 10],
    [at(11, 47), 'P014', 'WINNING CREATIVE', '🎯', 'Creative #A-114 hit 10 purchases', 80],
    [at(14, 3),  'P002', 'DOUBLE KILL', '⚔️⚔️', '10 purchases in a single day', 20],
    [at(15, 26), 'P015', 'ASSIST', '🤝', 'Helped Azim re-cut a live ad', 15],
    [at(16, 15), 'P105', 'SAVAGE', '💀', 'Enemy live-closing streak', 60],
    [at(17, 51), 'P002', 'SAVAGE', '💀', '3-day ROAS target streak', 60]
  ];
  feed.getRange(2, 1, feedRows.length, 6).setValues(feedRows);

  try { CacheService.getScriptCache().removeAll(['state:weproject', 'state:wellous', 'tv', 'shop:weproject', 'shop:wellous']); } catch (e) {}

  SpreadsheetApp.getUi().alert('Crystal War demo loaded!',
    'Wellous team + both sides\' revenue seeded. Within ~60s:\n' +
    '• Crystal War rope leans WeProject (~779k vs ~620k)\n' +
    '• Lane Matchups fill in, with one KO (Nizam 2× Bella)\n' +
    '• TV mixed feed shows both teams\n\n' +
    'Open the app and /tv to see it. Delete the added rows to reset.',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Writes the real Wellous team into the Players tab (P101–P108).
 * Updates rows that already exist (e.g. the demo names) instead of duplicating,
 * and makes sure the role dropdown allows "Salesperson". Run THIS function.
 * Their PINs and daily missions are set up separately (Players tab / Missions tab).
 */
function setWellousRoster() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var playersSheet = ss.getSheetByName('Players');
  if (!playersSheet) { SpreadsheetApp.getUi().alert('Players tab not found.'); return; }

  var pHeaders = playersSheet.getRange(1, 1, 1, playersSheet.getLastColumn()).getValues()[0];
  var col = {};
  pHeaders.forEach(function (h, i) { col[h] = i; });

  applyDropdown(playersSheet, col['role'] + 1, SMALL_ROWS, PLAYER_ROLES); // allow Salesperson

  var lastRow = playersSheet.getLastRow();
  var data = lastRow > 1 ? playersSheet.getRange(2, 1, lastRow - 1, pHeaders.length).getValues() : [];
  var rowIndexById = {};
  for (var i = 0; i < data.length; i++) rowIndexById[data[i][col['player_id']]] = i + 2;

  var added = [];
  WELLOUS_ROSTER.forEach(function (w) {
    var existingRow = rowIndexById[w[0]];
    var rowVals;
    if (existingRow) {
      rowVals = data[existingRow - 2];
    } else {
      rowVals = [];
      for (var k = 0; k < pHeaders.length; k++) rowVals.push('');
    }
    rowVals[col['player_id']] = w[0];
    rowVals[col['team']] = 'wellous';
    rowVals[col['name']] = w[1];
    rowVals[col['role']] = w[2];
    if (col['avatar'] != null) rowVals[col['avatar']] = w[3];
    rowVals[col['active']] = true;
    if (existingRow) {
      playersSheet.getRange(existingRow, 1, 1, pHeaders.length).setValues([rowVals]);
    } else {
      playersSheet.appendRow(rowVals);
      added.push(w[1]);
    }
  });

  try { CacheService.getScriptCache().removeAll(['state:weproject', 'state:wellous', 'tv', 'roster']); } catch (e) {}

  SpreadsheetApp.getUi().alert('Wellous roster set',
    'Written to the Players tab (P101–P108):\n\n' +
    'Salesperson: Yodaa, Vicky, Lilian, Janice, Fish\n' +
    'Editor: Sin Huey, Wei Hao\n' +
    'Marketer: Billy\n\n' +
    'Next: give each a 4-digit PIN in the Players tab, and add their daily missions in the Missions tab (role = Salesperson / Editor / Marketer, team = wellous).',
    SpreadsheetApp.getUi().ButtonSet.OK);
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

  SpreadsheetApp.getUi().alert('Sheet simplified',
    'The GM now sees only the day-to-day tabs:\n\n' +
    'HOME — start here\n' +
    'EXP_Log — record points & sales\n' +
    'Achievements_Feed — TV highlights\n' +
    'Redemptions — approve shop redeems\n' +
    'Mission_Log — approve missions\n' +
    'Players — people & PINs\n' +
    'Guide — full rules reference\n\n' +
    'Setup tabs (Shop, Actions, Missions, Config, Crystal_War, Buffs, Presets) are HIDDEN, not deleted. ' +
    'Unhide them anytime: bottom-left ☰ "All Sheets" icon, or View menu → Hidden sheets.',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

/** Plain-English one-page instructions shown as the first tab. */
function buildHomeTab(ss) {
  var sheet = ss.getSheetByName('HOME');
  if (sheet) { sheet.clear(); } else { sheet = ss.insertSheet('HOME'); }

  var content = [
    { t: 'title',   a: 'WEPROJECT LEGENDS — START HERE', b: '' },
    { t: 'blank',   a: '', b: '' },
    { t: 'section', a: '⭐ EVERY DAY — 3 THINGS', b: '' },
    { t: 'step', a: '1.  In EXP_Log: pick the person, pick the task, tick "approved". For a real sale, also type the RM value in amount_rm.', b: '' },
    { t: 'step', a: '2.  (Optional) Add standout moments to Achievements_Feed — the highlights shown on the office TV.', b: '' },
    { t: 'step', a: '3.  In Redemptions & Mission_Log: set anything "pending" to approved or rejected.', b: '' },
    { t: 'blank',   a: '', b: '' },
    { t: 'section', a: '📖 WHERE THINGS ARE', b: '' },
    { t: 'kv', a: 'EXP_Log', b: 'The daily scoreboard — every point & sale. The tab you use most.' },
    { t: 'kv', a: 'Achievements_Feed', b: 'Highlights for the TV screen.' },
    { t: 'kv', a: 'Redemptions', b: 'Shop redeems waiting for your approval.' },
    { t: 'kv', a: 'Mission_Log', b: 'Missions players submitted, waiting for approval.' },
    { t: 'kv', a: 'Players', b: 'Everyone on both teams + their 4-digit PINs.' },
    { t: 'kv', a: 'Guide', b: 'Full rules: what each task is worth, how Crystal War works.' },
    { t: 'blank',   a: '', b: '' },
    { t: 'section', a: '🤖 AUTOMATIC — NO ACTION NEEDED', b: '' },
    { t: 'step', a: 'Crystal War, Neutral Objectives (the revenue race), and Coin Snatcher raids all run by themselves from the sales you approve in EXP_Log. Never hand-edit the Crystal_War / Buffs / Steals tabs.', b: '' },
    { t: 'blank',   a: '', b: '' },
    { t: 'section', a: '⚙️ SETUP TABS ARE HIDDEN', b: '' },
    { t: 'step', a: 'Shop / Actions / Missions / Config / Presets are hidden to keep things clean. To change prices, point values, missions, or the season, show them via the ☰ "All Sheets" icon (bottom-left) or View → Hidden sheets.', b: '' },
    { t: 'blank',   a: '', b: '' },
    { t: 'section', a: '✅ GOLDEN RULES', b: '' },
    { t: 'step', a: '• Nothing counts until you tick "approved".', b: '' },
    { t: 'step', a: '• amount_rm is ONLY for real sales (RM) — it drives the Crystal War + Damage board.', b: '' },
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
      sheet.getRange(row, 1, 1, 2).merge().setWrap(true);
    } else if (t === 'kv') {
      sheet.getRange(row, 1).setFontWeight('bold');
      sheet.getRange(row, 2).setWrap(true);
    }
  }

  sheet.setColumnWidth(1, 230);
  sheet.setColumnWidth(2, 640);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, values.length, 2).setVerticalAlignment('middle');
}

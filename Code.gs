/**
 * WEPROJECT LEGENDS — Phase 1: Google Sheets initializer
 * =====================================================================
 * HOW TO USE
 *   1. Create a new Google Sheet.
 *   2. Extensions → Apps Script.
 *   3. Delete any boilerplate, paste this whole file, Save.
 *   4. Run  setupWeprojectLegends  once (authorize when prompted).
 *   5. Return to the Sheet — 7 data tabs + a Guide tab are built & seeded.
 *
 * Re-running is safe: each tab is rebuilt from scratch (existing tabs of
 * the same name are cleared and recreated). It will NOT touch tabs whose
 * names aren't in the list below, so any live EXP_Log data you've added
 * WILL be wiped on re-run — only run this on a fresh sheet or when you
 * intentionally want to reset the structure.
 *
 * This script also sets up, so HR/GM data entry is foolproof:
 *   • A "Guide" tab with the scoring reference.
 *   • A dropdown on EXP_Log.category (can't misspell the 8 categories).
 *   • A dropdown on Redemptions.status (pending/approved/fulfilled/rejected).
 *   • Checkboxes on the TRUE/FALSE columns (approved, active, rage_active).
 *
 * Phase 1 only builds the database structure + seed data.
 * The Apps Script API (doGet/doPost) is Phase 2 — see Api.gs.
 * =====================================================================
 */

var CATEGORIES = ['mission', 'action', 'assist', 'achievement', 'milestone', 'boss', 'mvp', 'adjust'];
var REDEMPTION_STATUSES = ['pending', 'approved', 'fulfilled', 'rejected'];
var GROW_ROWS = 2000; // apply validation this many rows down for sheets that grow
var SMALL_ROWS = 200;

function setupWeprojectLegends() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  buildPlayers(ss);
  buildExpLog(ss);
  buildRedemptions(ss);
  buildShop(ss);
  buildBoss(ss);
  buildConfig(ss);
  buildAchievementsFeed(ss);
  buildGuide(ss);

  // Put the Guide first so HR sees it on open, then the data tabs.
  ss.setActiveSheet(ss.getSheetByName('Guide'));
  ss.moveActiveSheet(1);

  removeDefaultSheet(ss);

  SpreadsheetApp.getUi().alert(
    'WEPROJECT LEGENDS',
    'Phase 1 complete — 7 data tabs + a Guide tab created and seeded.\n\n' +
    'Data-entry helpers added: category dropdown, status dropdown, and ' +
    'checkboxes for approved / active / rage_active.\n\n' +
    'Next: assign PINs and join_dates in the Players tab, then confirm ' +
    'before we start Phase 2 (the Apps Script API).',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
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

/* ------------------------------------------------------------------ */
/* Tab 1: Players                                                     */
/* ------------------------------------------------------------------ */

function buildPlayers(ss) {
  var headers = ['player_id', 'name', 'role', 'pin', 'avatar', 'join_date', 'active'];

  // Order matters: P001–P016 exactly as listed in the SPEC.
  // role uses SPEC values: Marketer / LiveHost / Editor
  // pin left blank on purpose — GM assigns 4-digit PINs before go-live.
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
    return [id, r[0], r[1], '', r[2], '', true];
  });

  var sheet = makeSheet(ss, 'Players', headers, rows);
  applyCheckbox(sheet, 7, SMALL_ROWS); // active
}

/* ------------------------------------------------------------------ */
/* Tab 2: EXP_Log  (core ledger — GM records here daily)              */
/* ------------------------------------------------------------------ */

function buildExpLog(ss) {
  var headers = [
    'log_id',     // reference only — the API does not read this
    'date',       // date the event happened
    'player_id',  // P001..P016
    'category',   // dropdown: mission/action/assist/achievement/milestone/boss/mvp/adjust
    'item',       // free text, e.g. "Winning Creative #A114"
    'exp',        // number (can be negative for Refund clawback)
    'amount_rm',  // RM amount for Revenue rows (used for Boss Damage), else blank
    'approved',   // checkbox — only takes effect once ticked
    'note'        // remarks
  ];
  var sheet = makeSheet(ss, 'EXP_Log', headers, []);
  applyDropdown(sheet, 4, GROW_ROWS, CATEGORIES); // category
  applyCheckbox(sheet, 8, GROW_ROWS);             // approved
}

/* ------------------------------------------------------------------ */
/* Tab 3: Redemptions  (shop redemption records)                      */
/* ------------------------------------------------------------------ */

function buildRedemptions(ss) {
  var headers = ['timestamp', 'player_id', 'item_id', 'item_name', 'gold_cost', 'status'];
  var sheet = makeSheet(ss, 'Redemptions', headers, []); // rows written by the API
  applyDropdown(sheet, 6, GROW_ROWS, REDEMPTION_STATUSES); // status
}

/* ------------------------------------------------------------------ */
/* Tab 4: Shop                                                        */
/* ------------------------------------------------------------------ */

function buildShop(ss) {
  var headers = ['item_id', 'name', 'icon', 'price', 'stock', 'active']; // stock -1 = unlimited

  var items = [
    ['S01', 'Coffee Voucher',            '☕',  300,  -1, true],
    ['S02', 'Bubble Tea',                '🧋',  400,  -1, true],
    ['S03', 'Mystery Box',               '🎁',  500,  -1, true],
    ['S04', 'Lunch Voucher RM20',        '🍱',  800,  -1, true],
    ['S05', 'Late Pass (1×)',            '🎟️', 2000, -1, true],
    ['S06', 'Leave 1hr Early',           '🕐',  3000, -1, true],
    ['S07', 'Team Tea Time — Your Pick', '🧃',  4000, -1, true],
    ['S08', 'Limited Drop: Earbuds',     '🎧',  5000,  1, true]  // stock = 1
  ];

  var sheet = makeSheet(ss, 'Shop', headers, items);
  applyCheckbox(sheet, 6, SMALL_ROWS); // active
}

/* ------------------------------------------------------------------ */
/* Tab 5: Boss                                                        */
/* ------------------------------------------------------------------ */

function buildBoss(ss) {
  var headers = ['month', 'hp_max', 'refund_adjust', 'rage_active', 'defeated_streak'];

  // Current Boss damage is computed by the API:
  //   SUM(EXP_Log.amount_rm where approved=TRUE) − refund_adjust
  // Do NOT enter damage here manually.
  var rows = [['2026-07', 1000000, 0, false, 0]];

  var sheet = makeSheet(ss, 'Boss', headers, rows);
  applyCheckbox(sheet, 4, SMALL_ROWS); // rage_active
}

/* ------------------------------------------------------------------ */
/* Tab 6: Config  (all game numbers — code reads these, none hardcoded)*/
/* ------------------------------------------------------------------ */

function buildConfig(ss) {
  var headers = ['key', 'value'];

  var rows = [
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

    ['daily_cap',       200],
    ['rage_cap',        300],
    ['rage_multiplier', 1.5],

    ['season_start', '2026-07-01'],
    ['season_end',   '2026-07-31'],

    ['cap_exempt_categories', 'milestone,achievement,boss,mvp']
  ];

  makeSheet(ss, 'Config', headers, rows);
}

/* ------------------------------------------------------------------ */
/* Tab 7: Achievements_Feed  (source for the TV kill-feed / bullets)  */
/* ------------------------------------------------------------------ */

function buildAchievementsFeed(ss) {
  var headers = ['timestamp', 'player_id', 'tag', 'icon', 'description', 'exp'];
  makeSheet(ss, 'Achievements_Feed', headers, []); // GM populates
}

/* ------------------------------------------------------------------ */
/* Guide tab: HR/GM entry reference                                   */
/* ------------------------------------------------------------------ */

function buildGuide(ss) {
  var name = 'Guide';
  var sheet = ss.getSheetByName(name);
  if (sheet) { sheet.clear(); } else { sheet = ss.insertSheet(name); }

  // Each entry: [text..], type: title | section | head | note
  var blank = ['', '', '', '', ''];
  var content = [
    { r: ['WEPROJECT LEGENDS — GM / HR DAILY ENTRY GUIDE', '', '', '', ''], t: 'title' },
    { r: blank, t: 'note' },

    { r: ['WHAT EACH EXP_LOG COLUMN MEANS', '', '', '', ''], t: 'section' },
    { r: ['column', 'what to put', '', '', ''], t: 'head' },
    { r: ['date', 'The day it happened. Used for the "today" feed and daily cap.', '', '', ''], t: 'note' },
    { r: ['player_id', 'P001–P016. See the Players tab for who is who.', '', '', ''], t: 'note' },
    { r: ['category', 'Pick from the dropdown (8 options). Controls the daily cap and badges.', '', '', ''], t: 'note' },
    { r: ['item', 'Free-text description. For Editors, include "Winning" or "High CTR" so it counts on the Creative board.', '', '', ''], t: 'note' },
    { r: ['exp', 'Points the player earns. Can be NEGATIVE for refunds / corrections.', '', '', ''], t: 'note' },
    { r: ['amount_rm', 'ONLY for real revenue (a sale). This is what damages the Boss. Negative = refund. Leave blank otherwise.', '', '', ''], t: 'note' },
    { r: ['approved', 'Tick the checkbox to make the row count. Un-ticked rows are ignored by the app.', '', '', ''], t: 'note' },
    { r: blank, t: 'note' },

    { r: ['CATEGORY REFERENCE', '', '', '', ''], t: 'section' },
    { r: ['category', 'use it for', 'counts to daily 200 cap?', 'becomes a badge?', ''], t: 'head' },
    { r: ['mission', 'Daily routine tasks', 'YES', 'no', ''], t: 'note' },
    { r: ['action', 'One-off wins / good behaviour', 'YES', 'no', ''], t: 'note' },
    { r: ['assist', 'Helping a teammate', 'YES', 'no', ''], t: 'note' },
    { r: ['achievement', 'Named feats (First Blood, Winning Creative…)', 'No (exempt)', 'YES', ''], t: 'note' },
    { r: ['milestone', 'Revenue / sales milestones', 'No (exempt)', 'YES', ''], t: 'note' },
    { r: ['boss', 'Revenue that hits the Boss', 'No (exempt)', 'no', ''], t: 'note' },
    { r: ['mvp', 'Daily / weekly MVP bonus', 'No (exempt)', 'YES', ''], t: 'note' },
    { r: ['adjust', 'Corrections & refunds (negative exp)', '—', 'no', ''], t: 'note' },
    { r: blank, t: 'note' },

    { r: ['SCORING EXAMPLES  (adjust the numbers to your own rules)', '', '', '', ''], t: 'section' },
    { r: ['category', 'example item', 'exp', 'amount_rm', 'notes'], t: 'head' },
    { r: ['mission', 'Publish ≥1 ad', 10, '', 'daily task'], t: 'note' },
    { r: ['mission', 'Submit report before 10:30am', 5, '', ''], t: 'note' },
    { r: ['mission', 'Blast 1 audience pool', 10, '', ''], t: 'note' },
    { r: ['action', 'Completed all daily missions', 30, '', 'bonus'], t: 'note' },
    { r: ['action', '10 purchases in a single day (Double Kill)', 20, '', ''], t: 'note' },
    { r: ['assist', 'Helped Azim re-cut a live ad', 15, '', ''], t: 'note' },
    { r: ['achievement', 'First order of the day (First Blood)', 10, '', 'cap-exempt + badge'], t: 'note' },
    { r: ['achievement', 'Winning Creative #A-114', 80, '', 'keyword → Creative board'], t: 'note' },
    { r: ['action', 'High CTR Creative #B-210', 40, '', 'keyword → Creative board'], t: 'note' },
    { r: ['boss', 'Closed order RM 5,000', 50, 5000, 'RM hits the Boss'], t: 'note' },
    { r: ['milestone', 'Hit monthly RM 50k target', 100, 50000, 'cap-exempt + badge'], t: 'note' },
    { r: ['mvp', 'Daily MVP', 50, '', 'cap-exempt + badge'], t: 'note' },
    { r: ['adjust', 'Refund — order #1234 cancelled', -50, -5000, 'removes damage + adds Boss HP'], t: 'note' },
    { r: blank, t: 'note' },

    { r: ['GOLDEN RULES', '', '', '', ''], t: 'section' },
    { r: ['• Gold = total approved EXP − shop spending. Spending Gold never lowers a Rank.', '', '', '', ''], t: 'note' },
    { r: ['• Rank uses SEASON EXP (this season only). Level uses ALL-TIME EXP.', '', '', '', ''], t: 'note' },
    { r: ['• Daily cap is 200 EXP per person — but milestone / achievement / boss / mvp do NOT count toward it.', '', '', '', ''], t: 'note' },
    { r: ['• To refund: add an "adjust" row with NEGATIVE exp (and negative amount_rm if it was revenue).', '', '', '', ''], t: 'note' },
    { r: ['• Nothing counts until you tick the "approved" checkbox.', '', '', '', ''], t: 'note' }
  ];

  var values = content.map(function (x) { return x.r; });
  sheet.getRange(1, 1, values.length, 5).setValues(values);

  // Styling
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
  sheet.setColumnWidth(2, 430);
  sheet.setColumnWidth(3, 90);
  sheet.setColumnWidth(4, 120);
  sheet.setColumnWidth(5, 230);
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
    ['Players',           '#9AA0A6'], // setup (grey)
    ['Shop',              '#9AA0A6'],
    ['Boss',              '#9AA0A6'],
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
    'RED    Redemptions — approve / reject\n' +
    'GREY   Players / Shop / Boss / Config — setup\n\n' +
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

  // Dropdown on EXP_Log.item (col 5) — free text still allowed for custom items
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
  if (!exp || !feed) { SpreadsheetApp.getUi().alert('Run setupWeprojectLegends first.'); return; }

  var d = new Date();
  function at(h, m) { var x = new Date(); x.setHours(h, m, 0, 0); return x; }

  if (exp.getLastRow() > 1) exp.getRange(2, 1, exp.getLastRow() - 1, 9).clearContent();
  if (feed.getLastRow() > 1) feed.getRange(2, 1, feed.getLastRow() - 1, 6).clearContent();

  // log_id, date, player_id, category, item, exp, amount_rm, approved, note
  var expRows = [
    ['', d, 'P002', 'boss', 'Closed RM 212,300 in ad revenue', 4200, 212300, true, ''],
    ['', d, 'P009', 'boss', 'Live session drove RM 154,200', 3700, 154200, true, ''],
    ['', d, 'P003', 'boss', 'Closed RM 128,800 campaign', 5600, 128800, true, ''],
    ['', d, 'P004', 'boss', 'RM 88,700 in sales', 2100, 88700, true, ''],
    ['', d, 'P010', 'boss', 'Live RM 64,200', 1200, 64200, true, ''],
    ['', d, 'P007', 'boss', 'RM 41,200 in sales', 900, 41200, true, ''],
    ['', d, 'P006', 'boss', 'RM 50,000 campaign', 1500, 50000, true, ''],
    ['', d, 'P008', 'boss', 'RM 40,000 sales', 700, 40000, true, ''],
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

  try { CacheService.getScriptCache().removeAll(['state', 'shop']); } catch (e) {}

  SpreadsheetApp.getUi().alert('Demo data loaded!',
    'Open the app and /tv — within ~60s the Boss drops to ~22%, rankings fill, and the achievement feed goes live.',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

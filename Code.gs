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

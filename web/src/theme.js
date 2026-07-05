// ---------- Design tokens (from weproject-legends-dashboard.jsx) ----------
export const C = {
  bg: "#0A0D1C",
  panel: "#12172B",
  panelSoft: "#1A2038",
  line: "#232B4A",
  gold: "#F5C542",
  goldDeep: "#C89A1F",
  hp: "#FF3B5C",
  hpDeep: "#8E1230",
  exp: "#3EE0F0",
  purple: "#9B6DFF",
  green: "#4ADE80",
  text: "#E8ECFF",
  dim: "#8A93B8",
};

export const RANK_COLORS = {
  Warrior: "#9CA3AF",
  Elite: "#CD7F32",
  Master: "#C0C0C0",
  Epic: "#9B6DFF",
  Legend: "#F5C542",
  Mythic: "#FF3B5C",
  "Mythical Glory": "#3EE0F0",
};

// Boss phase reward metadata — API only returns { at, unlocked }.
export const PHASE_META = {
  75: { label: "Snack Day", icon: "🍪" },
  50: { label: "Coffee Day", icon: "☕" },
  25: { label: "Pizza Day", icon: "🍕" },
  0: { label: "Leave 1hr Early", icon: "🏆" },
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// "2026-07" -> "JULY"
export function monthName(monthStr) {
  if (!monthStr) return "";
  const parts = String(monthStr).split("-");
  const m = parseInt(parts[1], 10);
  return m >= 1 && m <= 12 ? MONTHS[m - 1].toUpperCase() : String(monthStr);
}

export const fmt = (n) => Number(n || 0).toLocaleString("en-US");

// Days left in the boss's month, e.g. "2026-07" -> days until 31 Jul.
// Returns null if we're not currently inside that month.
export function daysLeftInMonth(monthStr) {
  if (!monthStr) return null;
  const parts = String(monthStr).split("-");
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (!y || !m) return null;
  const now = new Date();
  if (now.getFullYear() !== y || now.getMonth() + 1 !== m) return null;
  const lastDay = new Date(y, m, 0).getDate();
  return Math.max(0, lastDay - now.getDate());
}

// 🥇🥈🥉 for the top three, plain number after that.
export const medal = (i) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : String(i + 1));

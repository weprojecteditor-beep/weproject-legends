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
};

// WeProject = cyan, Wellous = red (per SPEC §项目概述).
export const TEAM_COLORS = { weproject: C.exp, wellous: C.hp };
export const TEAM_LABELS = { weproject: "WEPROJECT", wellous: "WELLOUS" };

// Hero Class is locked by role (balance); these are cosmetic choices within
// the role's class family. Mirrors Code.gs HERO_CLASS_BY_ROLE — keep in sync.
export const CLASS_FAMILY_BY_ROLE = { Marketer: "Carry", LiveHost: "Fighter", Editor: "Support", Salesperson: "Slayer" };
export const HERO_CLASS_BY_ROLE = {
  Marketer: ["Marksman", "Mage", "Assassin"],
  LiveHost: ["Fighter", "Tank", "Berserker"],
  Editor: ["Support", "Bard", "Summoner"],
  Salesperson: ["Marksman", "Assassin", "Berserker"],
};
export const HERO_ICONS = {
  Marksman: "🏹", Mage: "🔮", Assassin: "🗡️",
  Fighter: "⚔️", Tank: "🛡️", Berserker: "🪓",
  Support: "🤝", Bard: "🎵", Summoner: "✨",
};

export const fmt = (n) => Number(n || 0).toLocaleString("en-US");

// 🥇🥈🥉 for the top three, plain number after that.
export const medal = (i) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : String(i + 1));

// Rope position (0-100) for the Live Tug bar. `scale` is the RM net that
// pins the bar fully to one side — purely a visual reference, tune freely.
export function ropePercent(liveNet, scale = 10000) {
  const clamped = Math.max(-scale, Math.min(scale, liveNet || 0));
  return 50 + (clamped / scale) * 45; // keep 5-95 so it never fully vanishes
}

// Server returns "yyyy-MM-dd HH:mm" — human "2d 5h" / "6h 12m" / "Locking…" countdown.
export function timeUntil(target) {
  if (!target) return "";
  const t = new Date(String(target).replace(" ", "T"));
  if (isNaN(t.getTime())) return "";
  const ms = t.getTime() - Date.now();
  if (ms <= 0) return "Locking…";
  const hrs = Math.floor(ms / 3600000);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ${hrs % 24}h`;
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hrs}h ${mins}m`;
}

export function shortTime(s) {
  if (!s) return "";
  const parts = String(s).split(" ");
  return parts.length > 1 ? parts[1] : s;
}

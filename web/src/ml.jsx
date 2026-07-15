// Shared "Mobile Legends" design kit — ported from weproject-legends-dashboard.jsx.
import { C } from "./theme.js";

export { C };
export const GOLD_GRAD = "linear-gradient(135deg,#FFE79A 0%,#F5C542 30%,#9A7418 55%,#F5C542 80%,#FFE79A 100%)";
export const CLIP = "polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)";
export const CLIP_SM = "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)";
export const HEX = "polygon(50% 0, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)";

export const RANKS = {
  Warrior: "#9CA3AF", Elite: "#CD7F32", Master: "#C8CDD8",
  Epic: "#A86BFF", Legend: "#F5C542", Mythic: "#FF3B5C",
};
export const ROLES = {
  Marketer: { color: "#3EE0F0", tag: "MARKETER" },
  LiveHost: { color: "#FF6B9D", tag: "LIVE HOST" },
  Editor: { color: "#A86BFF", tag: "EDITOR" },
  Salesperson: { color: "#FFB800", tag: "SALESPERSON" },
};
export const ROLE_COLOR = { Marketer: "#3EE0F0", LiveHost: "#FF6B9D", Editor: "#A86BFF", Salesperson: "#FFB800" };

// 9 classes → the 3 portraits we have, each with ML-style metadata.
export const CLASSES = {
  Marksman: { label: "MARKSMAN", icon: "🏹", color: "#FFB800", img: "/avatars/marksman.png", desc: "Precision carry" },
  Mage: { label: "MAGE", icon: "🔮", color: "#A86BFF", img: "/avatars/assassin.png", desc: "Burst caster" },
  Assassin: { label: "ASSASSIN", icon: "🗡️", color: "#B368FF", img: "/avatars/assassin.png", desc: "Burst, solo carry" },
  Fighter: { label: "FIGHTER", icon: "⚔️", color: "#FF5544", img: "/avatars/fighter.png", desc: "Frontline damage" },
  Tank: { label: "TANK", icon: "🛡️", color: "#4488FF", img: "/avatars/fighter.png", desc: "Protect the team" },
  Berserker: { label: "BERSERKER", icon: "🪓", color: "#FF7A2A", img: "/avatars/fighter.png", desc: "Relentless" },
  Support: { label: "SUPPORT", icon: "🤝", color: "#4ADE80", img: "/avatars/assassin.png", desc: "Enable others" },
  Bard: { label: "BARD", icon: "🎵", color: "#4ADE80", img: "/avatars/assassin.png", desc: "Buff & tempo" },
  Summoner: { label: "SUMMONER", icon: "✨", color: "#4ADE80", img: "/avatars/assassin.png", desc: "Command minions" },
};
export const HERO_IMG = Object.keys(CLASSES).reduce((m, k) => { m[k] = CLASSES[k].img; return m; }, {});
export const CLASS_COLOR = Object.keys(CLASSES).reduce((m, k) => { m[k] = CLASSES[k].color; return m; }, {});
export const ROLE_DEFAULT_CLASS = { Marketer: "Marksman", LiveHost: "Fighter", Editor: "Support", Salesperson: "Marksman" };

// Each of the 9 hero classes maps to one of the 5 portrait art sets we have
// (marksman/assassin/fighter/tank/support), each rendered in male|female ×
// general|elite|legend under /avatars/{base}_{gender}_{tier}.png.
export const CLASS_ART = {
  Marksman: "marksman", Mage: "assassin", Assassin: "assassin",
  Fighter: "fighter", Tank: "tank", Berserker: "fighter",
  Support: "support", Bard: "support", Summoner: "support",
};

export const fmt = (n) => Number(n || 0).toLocaleString("en-US");

// Coins-only missions (exp = 0) carry their reward in the text, e.g.
// "… (+5 coins/day)". Pull that number so the badge can show 🪙 +5.
export const coinReward = (text) => {
  const m = /\+?\s*(\d+)\s*coin/i.exec(text || "");
  return m ? Number(m[1]) : null;
};
export const heroClassOf = (heroClass, role) => heroClass || ROLE_DEFAULT_CLASS[role] || "Fighter";
export const classOf = (heroClass, role) => CLASSES[heroClassOf(heroClass, role)] || CLASSES.Fighter;

// Level → skin tier (matches the Gold multiplier tiers: Lv10 Elite, Lv20 Legend).
export const tierFromLevel = (level) => (level >= 20 ? "legend" : level >= 10 ? "elite" : "general");

/**
 * Resolve a player's portrait from class + gender + tier.
 * `tier` accepts a tier string ("general"/"elite"/"legend") or a numeric level.
 * Falls back to female art when gender is unknown (API gender_pref not set yet).
 */
export const heroImg = (heroClass, role, gender, tier) => {
  const base = CLASS_ART[heroClassOf(heroClass, role)] || "fighter";
  const g = String(gender).toLowerCase() === "male" ? "male" : "female";
  const t = typeof tier === "number" ? tierFromLevel(tier)
    : ["general", "elite", "legend"].indexOf(String(tier).toLowerCase()) !== -1 ? String(tier).toLowerCase()
    : "general";
  return `/avatars/${base}_${g}_${t}.png`;
};

export function Frame({ children, glow, pad = 14, style }) {
  return (
    <div style={{ background: GOLD_GRAD, backgroundSize: "220% 100%", animation: "goldShift 7s ease-in-out infinite",
      clipPath: CLIP, padding: 1.5, filter: glow ? `drop-shadow(0 0 18px ${glow}77)` : "drop-shadow(0 4px 12px rgba(0,0,0,0.5))", ...style }}>
      <div style={{ background: `linear-gradient(160deg, ${C.panel} 0%, #0D1538 100%)`, clipPath: CLIP, padding: pad, position: "relative", overflow: "hidden" }}>
        {glow && <div style={{ position: "absolute", top: -40, left: -40, width: 120, height: 120, borderRadius: "50%", background: `radial-gradient(circle, ${glow}22, transparent 70%)`, pointerEvents: "none" }} />}
        {children}
      </div>
    </div>
  );
}

export function Eyebrow({ children, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <span style={{ color: C.gold, fontSize: 10, fontWeight: 800, letterSpacing: "0.25em", fontFamily: "'Chakra Petch',sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 5, height: 5, background: C.gold, transform: "rotate(45deg)" }} />{children}
      </span>
      {right && <span style={{ color: C.dim, fontSize: 10 }}>{right}</span>}
    </div>
  );
}

export function RoleTag({ role, small }) {
  const r = ROLES[role];
  if (!r) return null;
  return (
    <span style={{ fontSize: small ? 8 : 9, fontWeight: 800, letterSpacing: "0.12em", color: r.color,
      background: `${r.color}18`, border: `1px solid ${r.color}55`, borderRadius: 3, padding: small ? "1px 5px" : "2px 7px",
      fontFamily: "'Chakra Petch',sans-serif", whiteSpace: "nowrap" }}>{r.tag}</span>
  );
}

export function RankChip({ rank, small }) {
  if (!rank) return null;
  const col = RANKS[rank] || C.dim;
  return (
    <span style={{ fontSize: small ? 9 : 11, fontWeight: 800, letterSpacing: "0.08em", color: col,
      background: `${col}1C`, border: `1px solid ${col}66`, clipPath: CLIP_SM, padding: small ? "2px 8px" : "3px 11px",
      fontFamily: "'Chakra Petch',sans-serif", whiteSpace: "nowrap", textShadow: `0 0 8px ${col}88` }}>
      {rank.toUpperCase()}
    </span>
  );
}

// p: { heroClass, role, rank }
export function Avatar({ p, size = 52 }) {
  const cls = classOf(p.heroClass, p.role);
  const ring = RANKS[p.rank] || C.dim;
  const img = heroImg(p.heroClass, p.role, p.gender, p.level);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{ position: "absolute", inset: -2, background: `conic-gradient(from 200deg, ${ring}, ${ring}00 40%, ${ring} 65%, ${ring})`, clipPath: HEX }} />
      <div style={{ position: "absolute", inset: 1, background: `radial-gradient(circle at 50% 30%, ${cls.color}30 0%, #060A1E 75%)`, clipPath: HEX, overflow: "hidden" }}>
        {img
          ? <img src={img} alt="" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = cls.img; }} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 12%" }} />
          : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: size * 0.42 }}>{cls.icon}</div>}
      </div>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", boxShadow: `0 0 16px ${ring}66`, clipPath: HEX }} />
    </div>
  );
}

// Reference signature: skewed HP/EXP bar with an optional label row.
export function WarBar({ pct, grad, glowCol, label, right, h = 20 }) {
  return (
    <div>
      {(label || right) && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, marginBottom: 3 }}>
          <span style={{ color: glowCol }}>{label}</span>
          <span style={{ color: C.dim }}>{right}</span>
        </div>
      )}
      <div style={{ transform: "skewX(-14deg)", height: h, background: "#02040D", border: `1px solid ${glowCol}44`, overflow: "hidden", borderRadius: 3 }}>
        <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, pct))}%`, background: grad, boxShadow: `0 0 14px ${glowCol}`, transition: "width 1.2s cubic-bezier(.2,.8,.3,1)" }} />
      </div>
    </div>
  );
}

// Map a badge label → a distinct icon + colour tier (so badges aren't all identical).
export function badgeMeta(label) {
  const s = String(label || "").toLowerCase();
  if (s.includes("winning")) return { icon: "🎯", tier: "purple" };
  if (s.includes("high ctr") || s.includes("high-ctr")) return { icon: "📈", tier: "cyan" };
  if (s.includes("double kill")) return { icon: "⚔️", tier: "purple" };
  if (s.includes("first blood") || s.includes("first order")) return { icon: "🩸", tier: "red" };
  if (s.includes("mvp")) return { icon: "👑", tier: "gold" };
  if (s.includes("savage")) return { icon: "💀", tier: "red" };
  if (s.includes("maniac")) return { icon: "🔥", tier: "red" };
  if (s.includes("assist")) return { icon: "🤝", tier: "green" };
  if (s.includes("milestone")) return { icon: "💎", tier: "cyan" };
  if (s.includes("streak") || s.includes("roas")) return { icon: "🔥", tier: "gold" };
  if (s.includes("tower")) return { icon: "🗼", tier: "cyan" };
  if (s.includes("lord")) return { icon: "🐉", tier: "red" };
  return { icon: "🏅", tier: "gold" };
}

// Hexagon badge (ref).
export function Badge({ icon, label, tier }) {
  const cols = {
    gold: { a: "#FFE79A", b: "#8A6510", glow: C.gold },
    purple: { a: "#D0A8FF", b: "#4A1F8C", glow: C.purple },
    cyan: { a: "#9FF3FF", b: "#0E5C6C", glow: C.cyan },
    red: { a: "#FF9FB0", b: "#7A0E28", glow: C.hp },
    green: { a: "#A8FFC6", b: "#0E5C31", glow: C.green },
    orange: { a: "#FFD5A8", b: "#7A3E0E", glow: C.orange },
  }[tier] || { a: "#FFE79A", b: "#8A6510", glow: C.gold };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, width: 72 }}>
      <div style={{ position: "relative", width: 58, height: 64 }}>
        <div style={{ position: "absolute", inset: 0, clipPath: HEX, background: `linear-gradient(160deg, ${cols.a} 0%, ${cols.b} 100%)`, filter: `drop-shadow(0 0 10px ${cols.glow}66)` }} />
        <div style={{ position: "absolute", inset: 3, clipPath: HEX, background: "radial-gradient(circle at 50% 28%, #1B2450 0%, #070B22 80%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 24, filter: `drop-shadow(0 0 8px ${cols.glow})` }}>{icon}</span>
        </div>
      </div>
      <span style={{ fontSize: 9, fontWeight: 700, color: C.dim, textAlign: "center", lineHeight: 1.3 }}>{label}</span>
    </div>
  );
}

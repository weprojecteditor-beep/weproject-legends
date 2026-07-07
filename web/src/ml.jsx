// Shared "Mobile Legends" design kit — used by Hero / Shop / Login / TV / shell.
// Battlefield.jsx keeps its own copy of these (same values) so it stays isolated.
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
export const ROLE_COLOR = { Marketer: "#3EE0F0", LiveHost: "#FF6B9D", Editor: "#A86BFF", Salesperson: "#FFB800" };

// 9 classes → the 3 portraits we have (chosen: reuse the 3).
export const HERO_IMG = {
  Marksman: "/avatars/marksman.png", Mage: "/avatars/assassin.png", Assassin: "/avatars/assassin.png",
  Fighter: "/avatars/fighter.png", Tank: "/avatars/fighter.png", Berserker: "/avatars/fighter.png",
  Support: "/avatars/assassin.png", Bard: "/avatars/assassin.png", Summoner: "/avatars/assassin.png",
};
export const CLASS_COLOR = {
  Marksman: "#FFB800", Mage: "#A86BFF", Assassin: "#B368FF",
  Fighter: "#FF5544", Tank: "#4488FF", Berserker: "#FF7A2A",
  Support: "#4ADE80", Bard: "#4ADE80", Summoner: "#4ADE80",
};
export const ROLE_DEFAULT_CLASS = { Marketer: "Marksman", LiveHost: "Fighter", Editor: "Assassin", Salesperson: "Marksman" };

export const fmt = (n) => Number(n || 0).toLocaleString("en-US");
export const heroClassOf = (heroClass, role) => heroClass || ROLE_DEFAULT_CLASS[role] || "Fighter";

// ── Gold clip-path panel with a metallic border ──────────────
export function Frame({ children, glow, pad = 14, style }) {
  return (
    <div style={{ background: GOLD_GRAD, clipPath: CLIP, padding: 1.5,
      filter: glow ? `drop-shadow(0 0 14px ${glow}55)` : "drop-shadow(0 4px 12px rgba(0,0,0,0.5))", ...style }}>
      <div style={{ background: `linear-gradient(160deg, ${C.panel} 0%, #0D1538 100%)`, clipPath: CLIP, padding: pad, position: "relative", overflow: "hidden" }}>
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
  const cls = heroClassOf(p.heroClass, p.role);
  const col = CLASS_COLOR[cls] || C.gold;
  const ring = RANKS[p.rank] || C.dim;
  const img = HERO_IMG[cls];
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{ position: "absolute", inset: -2, background: `conic-gradient(from 200deg, ${ring}, ${ring}00 40%, ${ring} 65%, ${ring})`, clipPath: HEX }} />
      <div style={{ position: "absolute", inset: 1, background: `radial-gradient(circle at 50% 30%, ${col}30 0%, #060A1E 75%)`, clipPath: HEX, overflow: "hidden" }}>
        {img
          ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 12%" }} />
          : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: size * 0.42 }}>🦸</div>}
      </div>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", boxShadow: `0 0 16px ${ring}66`, clipPath: HEX }} />
    </div>
  );
}

// Skewed, glowing HP/EXP bar.
export function WarBar({ pct, col, h = 14 }) {
  return (
    <div style={{ transform: "skewX(-12deg)", height: h, background: "#02040D", border: `1px solid ${col}44`, borderRadius: 3, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, pct))}%`,
        background: `linear-gradient(90deg, ${col}88, ${col})`, boxShadow: `0 0 12px ${col}`, transition: "width 1s cubic-bezier(.2,.8,.3,1)" }} />
    </div>
  );
}

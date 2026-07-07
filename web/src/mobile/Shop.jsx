import { useState, useEffect } from "react";
import { C, Frame, Eyebrow, Avatar, GOLD_GRAD, CLIP, CLIP_SM, fmt } from "../ml.jsx";
import { getRoster } from "../api.js";

const STATUS = {
  fulfilled: { label: "CLAIMED", col: "#4ADE80" },
  approved: { label: "APPROVED", col: "#3EE0F0" },
  pending: { label: "⏳ PENDING", col: "#FFA940" },
  rejected: { label: "REJECTED", col: "#FF3B5C" },
};

const RAID_COST = 300;
const RAID_STEAL = 500;

export default function Shop({ items, gold, onRedeem, redemptions = [], onSteal, team }) {
  const [busyId, setBusyId] = useState(null);
  const [raidOpen, setRaidOpen] = useState(false);
  const [enemies, setEnemies] = useState([]);
  const [raiding, setRaiding] = useState(null);

  useEffect(() => {
    getRoster().then((list) => setEnemies(list.filter((p) => p.team !== team))).catch(() => setEnemies([]));
  }, [team]);

  const handle = async (item) => { setBusyId(item.itemId); await onRedeem(item); setBusyId(null); };
  const raid = async (targetId) => {
    setRaiding(targetId);
    const r = await onSteal(targetId);
    setRaiding(null);
    if (r && r.ok) setRaidOpen(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Frame glow={C.gold} pad={14}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Eyebrow>MY GOLD</Eyebrow>
            <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: 34, background: GOLD_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: `drop-shadow(0 0 20px ${C.gold}88)`, lineHeight: 1 }}>🪙 {fmt(gold)}</div>
          </div>
          <div style={{ fontSize: 10, textAlign: "right", color: C.dim, maxWidth: 150, lineHeight: 1.6 }}>
            Gold is earned with EXP.<br />Spending never affects Rank.
          </div>
        </div>
      </Frame>

      {/* ── PvP: Coin Snatcher ── */}
      <Frame glow={C.hp} pad={12}>
        <Eyebrow right="once per day">⚔ RAID THE ENEMY</Eyebrow>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 40, filter: `drop-shadow(0 0 14px ${C.hp})` }}>🗡️</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 800, fontSize: 14, color: C.hp }}>COIN SNATCHER</div>
            <div style={{ fontSize: 9.5, color: C.dim, lineHeight: 1.5 }}>
              Pay <b style={{ color: C.gold }}>🪙 {RAID_COST}</b> → steal <b style={{ color: C.green }}>🪙 {RAID_STEAL}</b> from an enemy.
              If they can't pay, it <b style={{ color: C.hp }}>backfires</b> — you lose your {RAID_COST}. 😈
            </div>
          </div>
          <button type="button" onClick={() => setRaidOpen(true)} disabled={gold < RAID_COST}
            style={{ clipPath: CLIP_SM, padding: "9px 16px", fontSize: 12, fontWeight: 900, fontFamily: "'Chakra Petch',sans-serif", letterSpacing: "0.06em",
              background: gold >= RAID_COST ? `linear-gradient(180deg,${C.hp},${C.hpDeep})` : C.panelSoft, color: gold >= RAID_COST ? "#fff" : C.dim,
              border: gold >= RAID_COST ? "none" : `1px solid ${C.line}`, cursor: gold >= RAID_COST ? "pointer" : "not-allowed", boxShadow: gold >= RAID_COST ? `0 0 16px ${C.hp}66` : "none" }}>
            RAID
          </button>
        </div>
      </Frame>

      {/* Item grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {items.map((s) => {
          const soldOut = s.stock >= 0 && s.remaining <= 0;
          const can = gold >= s.price && !soldOut && busyId !== s.itemId;
          const label = busyId === s.itemId ? "…" : soldOut ? "SOLD OUT" : gold >= s.price ? "REDEEM" : "NOT ENOUGH";
          return (
            <Frame key={s.itemId} pad={12} style={{ opacity: can || busyId === s.itemId ? 1 : 0.65 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                <div style={{ fontSize: 30, marginBottom: 4, filter: can ? `drop-shadow(0 0 12px ${C.gold}66)` : "grayscale(0.6)" }}>{s.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, minHeight: 34, display: "flex", alignItems: "center" }}>{s.name}</div>
                {s.stock >= 0 && <div style={{ fontSize: 9, color: soldOut ? C.hp : C.dimmer, marginBottom: 2 }}>{soldOut ? "out of stock" : `${s.remaining} left`}</div>}
                <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: 14, color: C.gold, margin: "4px 0 10px" }}>🪙 {fmt(s.price)}</div>
                <button type="button" onClick={() => can && handle(s)} style={{
                  width: "100%", clipPath: CLIP_SM, padding: "8px 0", fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", fontFamily: "'Chakra Petch',sans-serif",
                  background: can ? GOLD_GRAD : C.panelSoft, color: can ? "#0A0F28" : C.dimmer, border: "none", cursor: can ? "pointer" : "not-allowed" }}>
                  {label}
                </button>
              </div>
            </Frame>
          );
        })}
      </div>

      <Frame pad={14}>
        <Eyebrow right="GM approves in Google Sheet">REDEMPTION HISTORY</Eyebrow>
        {redemptions.length === 0 ? (
          <div style={{ fontSize: 12, textAlign: "center", color: C.dim, padding: "8px 0" }}>No redemptions yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {redemptions.map((h, i) => {
              const meta = STATUS[h.status] || { label: String(h.status || "").toUpperCase(), col: C.dim };
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: C.panelSoft, border: `1px solid ${C.line}`, clipPath: CLIP_SM, padding: "9px 12px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{h.itemName}</div>
                    <div style={{ fontSize: 9, color: C.dimmer }}>{h.timestamp} · 🪙 {fmt(h.goldCost)}</div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", padding: "3px 9px", clipPath: CLIP_SM, fontFamily: "'Chakra Petch',sans-serif", background: `${meta.col}1C`, color: meta.col, border: `1px solid ${meta.col}55` }}>
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Frame>

      {/* ── Raid target picker ── */}
      {raidOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40, background: "#02040FEE", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", padding: "20px 16px", overflowY: "auto" }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: 18, color: C.hp, textShadow: `0 0 16px ${C.hp}` }}>🗡️ CHOOSE YOUR TARGET</div>
            <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>Steal 🪙 {RAID_STEAL} — but if they can't pay, you lose 🪙 {RAID_COST}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, maxWidth: 480, margin: "0 auto", width: "100%" }}>
            {enemies.length === 0 && <div style={{ color: C.dim, fontSize: 12, gridColumn: "1 / -1", textAlign: "center" }}>No enemy players yet.</div>}
            {enemies.map((p) => (
              <button key={p.playerId} type="button" onClick={() => raiding == null && raid(p.playerId)}
                style={{ display: "flex", alignItems: "center", gap: 10, clipPath: CLIP_SM, background: C.panelSoft, border: `1px solid ${raiding === p.playerId ? C.hp : C.line}`, padding: "9px 11px", color: C.text, textAlign: "left", cursor: "pointer" }}>
                <Avatar p={p} size={40} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{p.name}</div>
                  <div style={{ fontSize: 9, color: C.enemy, fontWeight: 800, fontFamily: "'Chakra Petch',sans-serif" }}>{raiding === p.playerId ? "RAIDING…" : "WELLOUS"}</div>
                </div>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => raiding == null && setRaidOpen(false)}
            style={{ margin: "16px auto 0", clipPath: CLIP_SM, padding: "10px 40px", background: C.panelSoft, border: `1px solid ${C.line}`, color: C.dim, fontFamily: "'Chakra Petch',sans-serif", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>
            CANCEL
          </button>
        </div>
      )}
    </div>
  );
}

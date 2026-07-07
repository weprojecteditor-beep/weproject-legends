import { useState } from "react";
import { C, Frame, Eyebrow, GOLD_GRAD, CLIP_SM, fmt } from "../ml.jsx";

const STATUS = {
  fulfilled: { label: "CLAIMED", col: "#4ADE80" },
  approved: { label: "APPROVED", col: "#3EE0F0" },
  pending: { label: "⏳ PENDING", col: "#FFA940" },
  rejected: { label: "REJECTED", col: "#FF3B5C" },
};

export default function Shop({ items, gold, onRedeem, redemptions = [] }) {
  const [busyId, setBusyId] = useState(null);
  const handle = async (item) => { setBusyId(item.itemId); await onRedeem(item); setBusyId(null); };

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
    </div>
  );
}

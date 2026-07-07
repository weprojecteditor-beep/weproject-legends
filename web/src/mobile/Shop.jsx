import { useState } from "react";
import { C, Frame, Eyebrow, GOLD_GRAD, CLIP_SM, fmt } from "../ml.jsx";

const STATUS_META = {
  pending: { label: "PENDING", color: C.gold },
  approved: { label: "APPROVED", color: C.cyan },
  fulfilled: { label: "CLAIMED", color: C.green },
  rejected: { label: "REJECTED", color: C.hp },
};

export default function Shop({ items, gold, onRedeem, redemptions = [] }) {
  const [busyId, setBusyId] = useState(null);

  const handle = async (item) => {
    setBusyId(item.itemId);
    await onRedeem(item);
    setBusyId(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Gold header */}
      <Frame glow={C.gold} pad={0}>
        <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
          background: `radial-gradient(ellipse 60% 120% at 12% 40%, ${C.gold}12 0%, transparent 60%)` }}>
          <div>
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.25em", fontFamily: "'Chakra Petch',sans-serif" }}>MY GOLD</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: C.gold, fontFamily: "'Chakra Petch',sans-serif", textShadow: `0 0 16px ${C.gold}66` }}>🪙 {fmt(gold)}</div>
          </div>
          <div style={{ fontSize: 9, color: C.dim, textAlign: "right", maxWidth: 150 }}>
            Gold is earned with EXP.<br />Spending never affects your Rank.
          </div>
        </div>
      </Frame>

      {/* Item grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {items.map((s) => {
          const soldOut = s.stock >= 0 && s.remaining <= 0;
          const can = gold >= s.price && !soldOut && busyId !== s.itemId;
          const label = busyId === s.itemId ? "Redeeming…" : soldOut ? "Sold out" : gold >= s.price ? "REDEEM" : "Not enough";
          return (
            <Frame key={s.itemId} pad={12}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 4 }}>
                <div style={{ fontSize: 30, filter: "drop-shadow(0 0 8px rgba(255,255,255,0.15))" }}>{s.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, minHeight: 32, lineHeight: 1.2 }}>{s.name}</div>
                {s.stock >= 0 && (
                  <div style={{ fontSize: 9, color: soldOut ? C.hp : C.dim }}>{soldOut ? "Out of stock" : `${s.remaining} left`}</div>
                )}
                <div style={{ fontSize: 14, fontWeight: 800, color: C.gold, fontFamily: "'Chakra Petch',sans-serif" }}>🪙 {fmt(s.price)}</div>
                <button
                  onClick={() => can && handle(s)}
                  disabled={!can}
                  style={{
                    width: "100%", marginTop: 4, padding: "7px 0", fontSize: 12, fontWeight: 800, clipPath: CLIP_SM,
                    fontFamily: "'Chakra Petch',sans-serif", letterSpacing: "0.05em",
                    background: can ? GOLD_GRAD : C.panelSoft, color: can ? "#0A0D1C" : C.dim,
                    border: can ? "none" : `1px solid ${C.line}`, cursor: can ? "pointer" : "not-allowed",
                  }}
                >
                  {label}
                </button>
              </div>
            </Frame>
          );
        })}
      </div>

      {/* Redemption history */}
      <Frame pad={12}>
        <Eyebrow>MY REDEMPTIONS</Eyebrow>
        {redemptions.length === 0 ? (
          <div style={{ fontSize: 12, textAlign: "center", color: C.dim, padding: "8px 0" }}>No redemptions yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {redemptions.map((r, i) => {
              const meta = STATUS_META[r.status] || { label: String(r.status || "").toUpperCase(), color: C.dim };
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, clipPath: CLIP_SM,
                  background: C.panelSoft, border: `1px solid ${C.line}`, padding: "7px 10px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.itemName}</div>
                    <div style={{ fontSize: 9, color: C.dim }}>{r.timestamp} · 🪙 {fmt(r.goldCost)}</div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 800, color: meta.color, background: `${meta.color}1C`, border: `1px solid ${meta.color}66`,
                    clipPath: CLIP_SM, padding: "2px 8px", fontFamily: "'Chakra Petch',sans-serif" }}>{meta.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </Frame>
    </div>
  );
}

import { useState } from "react";
import { C, fmt } from "../theme.js";
import { Panel, SectionTitle } from "../ui.jsx";

// Sheet status -> friendly label + color
const STATUS_META = {
  pending: { label: "Pending", color: C.gold },
  approved: { label: "Approved", color: C.exp },
  fulfilled: { label: "Claimed", color: C.green },
  rejected: { label: "Rejected", color: C.hp },
};

export default function Shop({ items, gold, onRedeem, redemptions = [] }) {
  const [busyId, setBusyId] = useState(null);

  const handle = async (item) => {
    setBusyId(item.itemId);
    await onRedeem(item);
    setBusyId(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <Panel style={{ background: `linear-gradient(160deg, ${C.panel} 60%, ${C.gold}14 140%)` }}>
        <div className="flex items-center justify-between">
          <div>
            <div
              className="text-xs"
              style={{ color: C.dim, letterSpacing: "0.2em", fontFamily: "'Chakra Petch', sans-serif" }}
            >
              MY GOLD
            </div>
            <div className="text-3xl font-bold" style={{ color: C.gold, fontFamily: "'Chakra Petch', sans-serif" }}>
              🪙 {fmt(gold)}
            </div>
          </div>
          <div className="text-xs text-right" style={{ color: C.dim }}>
            Gold is earned with EXP.
            <br />
            Spending never affects your Rank.
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3">
        {items.map((s) => {
          const soldOut = s.stock >= 0 && s.remaining <= 0;
          const can = gold >= s.price && !soldOut && busyId !== s.itemId;
          const label = busyId === s.itemId
            ? "Redeeming…"
            : soldOut
            ? "Sold out"
            : gold >= s.price
            ? "Redeem"
            : "Not enough Gold";
          return (
            <div
              key={s.itemId}
              className="rounded-2xl p-3 flex flex-col items-center text-center"
              style={{ background: C.panel, border: `1px solid ${C.line}` }}
            >
              <div className="text-3xl mb-1">{s.icon}</div>
              <div className="text-sm font-semibold mb-1" style={{ minHeight: 36 }}>
                {s.name}
              </div>
              {s.stock >= 0 && (
                <div className="text-xs mb-1" style={{ color: soldOut ? C.hp : C.dim }}>
                  {soldOut ? "Out of stock" : `${s.remaining} left`}
                </div>
              )}
              <div className="text-sm font-bold mb-2" style={{ color: C.gold, fontFamily: "'Chakra Petch', sans-serif" }}>
                🪙 {fmt(s.price)}
              </div>
              <button
                onClick={() => can && handle(s)}
                disabled={!can}
                className="w-full rounded-lg py-1.5 text-sm font-bold"
                style={{
                  background: can ? `linear-gradient(90deg, ${C.goldDeep}, ${C.gold})` : C.panelSoft,
                  color: can ? "#0A0D1C" : C.dim,
                  border: can ? "none" : `1px solid ${C.line}`,
                  cursor: can ? "pointer" : "not-allowed",
                }}
              >
                {label}
              </button>
            </div>
          );
        })}
      </div>

      <Panel>
        <SectionTitle>MY REDEMPTIONS</SectionTitle>
        {redemptions.length === 0 ? (
          <div className="text-sm text-center py-3" style={{ color: C.dim }}>
            No redemptions yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {redemptions.map((r, i) => {
              const meta = STATUS_META[r.status] || { label: r.status, color: C.dim };
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl px-3 py-2"
                  style={{ background: C.panelSoft, border: `1px solid ${C.line}` }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate font-semibold">{r.itemName}</div>
                    <div className="text-xs" style={{ color: C.dim }}>
                      {r.timestamp} · 🪙 {fmt(r.goldCost)}
                    </div>
                  </div>
                  <span
                    className="text-xs font-semibold rounded-full px-2 py-0.5"
                    style={{
                      color: meta.color,
                      border: `1px solid ${meta.color}66`,
                      background: `${meta.color}1A`,
                    }}
                  >
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

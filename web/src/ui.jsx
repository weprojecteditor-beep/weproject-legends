import { C, RANK_COLORS } from "./theme.js";

export function RankChip({ rank, small }) {
  if (!rank) return null;
  const col = RANK_COLORS[rank] || C.dim;
  return (
    <span
      className={
        "inline-flex items-center rounded-full font-semibold " +
        (small ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1")
      }
      style={{
        color: col,
        border: `1px solid ${col}66`,
        background: `${col}1A`,
        fontFamily: "'Chakra Petch', sans-serif",
        letterSpacing: "0.05em",
      }}
    >
      {rank.toUpperCase()}
    </span>
  );
}

export function Panel({ children, style, className }) {
  return (
    <div
      className={"rounded-2xl p-4 " + (className || "")}
      style={{ background: C.panel, border: `1px solid ${C.line}`, ...style }}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, right }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div
        className="text-xs font-bold"
        style={{
          color: C.dim,
          letterSpacing: "0.2em",
          fontFamily: "'Chakra Petch', sans-serif",
        }}
      >
        {children}
      </div>
      {right}
    </div>
  );
}

export function Loading({ label = "Summoning heroes…" }) {
  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center gap-4"
      style={{ background: C.bg, color: C.text }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          border: `4px solid ${C.line}`,
          borderTopColor: C.gold,
          animation: "spin 0.9s linear infinite",
        }}
      />
      <div
        className="text-sm"
        style={{ color: C.dim, fontFamily: "'Chakra Petch', sans-serif", letterSpacing: "0.1em" }}
      >
        {label}
      </div>
    </div>
  );
}

export function SyncBadge({ updatedAt, error }) {
  return (
    <div className="text-xs" style={{ color: error ? C.hp : C.dim }}>
      {error ? "⚠ Data sync failed" : updatedAt ? `Last updated ${shortTime(updatedAt)}` : ""}
    </div>
  );
}

export function shortTime(s) {
  if (!s) return "";
  // Server returns "yyyy-MM-dd HH:mm"
  const parts = String(s).split(" ");
  return parts.length > 1 ? parts[1] : s;
}

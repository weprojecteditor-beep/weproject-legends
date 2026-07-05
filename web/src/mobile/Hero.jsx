import { C, RANK_COLORS, fmt } from "../theme.js";
import { Panel, SectionTitle, RankChip } from "../ui.jsx";

export default function Hero({ player }) {
  const rankCol = RANK_COLORS[player.rank] || C.dim;
  const nextCol = RANK_COLORS[player.nextRank] || C.gold;
  const lvlPct = player.expToNextLevel
    ? Math.min(100, (player.expInLevel / player.expToNextLevel) * 100)
    : 100;
  const rankTarget = player.seasonExp + (player.expToNextRank || 0);
  const rankPct = rankTarget ? Math.min(100, (player.seasonExp / rankTarget) * 100) : 100;

  return (
    <div className="flex flex-col gap-3">
      <Panel style={{ background: `linear-gradient(160deg, ${C.panel} 55%, ${rankCol}22 130%)` }}>
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center" style={{ width: 76, height: 76 }}>
            <div
              className="absolute inset-0 rounded-full"
              style={{ border: `3px solid ${rankCol}`, boxShadow: `0 0 16px ${rankCol}77` }}
            />
            <div className="text-4xl">{player.avatar || "🦸"}</div>
            <div
              className="absolute rounded-full px-2 text-xs font-bold"
              style={{ bottom: -6, background: rankCol, color: "#0A0D1C", fontFamily: "'Chakra Petch', sans-serif" }}
            >
              Lv{player.level}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xl font-bold" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>
              {player.name}
            </div>
            <div className="text-xs mb-1" style={{ color: C.dim }}>
              {player.role} · Season 1
            </div>
            <RankChip rank={player.rank} small />
          </div>
          <div className="text-right">
            <div className="text-xl font-bold" style={{ color: C.gold, fontFamily: "'Chakra Petch', sans-serif" }}>
              🪙 {fmt(player.gold)}
            </div>
            <div className="text-xs" style={{ color: C.dim }}>
              Gold Balance
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: C.dim }}>
              Lv{player.level} → Lv{player.level + 1}
            </span>
            <span style={{ color: C.exp }}>
              {player.expInLevel}/{player.expToNextLevel} EXP
            </span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: "#070A16" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${lvlPct}%`, background: `linear-gradient(90deg, #1899AC, ${C.exp})`, boxShadow: `0 0 8px ${C.exp}88` }}
            />
          </div>

          {player.nextRank ? (
            <>
              <div className="flex justify-between text-xs mb-1 mt-3">
                <span style={{ color: C.dim }}>Road to {player.nextRank}</span>
                <span style={{ color: nextCol }}>
                  {fmt(player.seasonExp)}/{fmt(rankTarget)} Season EXP
                </span>
              </div>
              <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: "#070A16" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${rankPct}%`, background: `linear-gradient(90deg, ${C.purple}, ${nextCol})` }}
                />
              </div>
            </>
          ) : (
            <div className="text-xs mt-3" style={{ color: C.gold }}>
              ★ Max rank reached — {fmt(player.seasonExp)} Season EXP
            </div>
          )}
        </div>
      </Panel>

      <Panel>
        <SectionTitle right={<span className="text-xs" style={{ color: C.exp }}>+{player.todayExp} today</span>}>
          RECENT ACTIVITY
        </SectionTitle>
        {(!player.recentLog || player.recentLog.length === 0) ? (
          <div className="text-sm text-center py-4" style={{ color: C.dim }}>
            No EXP logged yet. Your journey begins soon!
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {player.recentLog.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl px-3 py-2"
                style={{ background: C.panelSoft, border: `1px solid ${C.line}` }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{r.item || r.category}</div>
                  <div className="text-xs" style={{ color: C.dim }}>
                    {r.date} · {r.category}
                    {r.amountRm ? ` · RM ${fmt(r.amountRm)}` : ""}
                  </div>
                </div>
                <div
                  className="text-sm font-bold"
                  style={{ color: r.exp < 0 ? C.hp : C.exp }}
                >
                  {r.exp < 0 ? "" : "+"}
                  {r.exp}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel>
        <SectionTitle>BADGES</SectionTitle>
        {(!player.badges || player.badges.length === 0) ? (
          <div className="text-sm" style={{ color: C.dim }}>
            No badges yet — earn milestones & achievements to collect them.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {player.badges.map((b, i) => (
              <span
                key={i}
                className="text-xs rounded-full px-3 py-1"
                style={{ background: `${C.gold}14`, color: C.gold, border: `1px solid ${C.gold}44` }}
              >
                🏅 {b}
              </span>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

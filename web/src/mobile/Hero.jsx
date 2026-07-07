import { C, RANK_COLORS, HERO_ICONS, fmt } from "../theme.js";
import { Panel, SectionTitle, RankChip } from "../ui.jsx";

const MISSION_META = {
  todo: { label: "Submit", color: C.dim, clickable: true },
  pending: { label: "⏳ Waiting GM approval", color: C.gold, clickable: true },
  approved: { label: "✓ EXP granted", color: C.green, clickable: false },
  rejected: { label: "Rejected", color: C.hp, clickable: false },
};

function MissionRow({ m, onMission }) {
  const meta = MISSION_META[m.status] || MISSION_META.todo;
  return (
    <button
      onClick={() => meta.clickable && onMission(m)}
      disabled={!meta.clickable}
      className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-left"
      style={{ background: C.panelSoft, border: `1px solid ${C.line}`, cursor: meta.clickable ? "pointer" : "default" }}
    >
      <div>
        <div className="text-sm">{m.text}</div>
        <div className="text-xs" style={{ color: C.dim }}>+{m.exp} EXP</div>
      </div>
      <span className="text-xs font-bold" style={{ color: meta.color }}>{meta.label}</span>
    </button>
  );
}

export default function Hero({ player, onMission }) {
  const rankCol = RANK_COLORS[player.rank] || C.dim;
  const nextCol = RANK_COLORS[player.nextRank] || C.gold;
  const lvlPct = player.expToNextLevel ? Math.min(100, (player.expInLevel / player.expToNextLevel) * 100) : 100;
  const rankTarget = player.seasonExp + (player.expToNextRank || 0);
  const rankPct = rankTarget ? Math.min(100, (player.seasonExp / rankTarget) * 100) : 100;

  return (
    <div className="flex flex-col gap-3">
      <Panel style={{ background: `linear-gradient(160deg, ${C.panel} 55%, ${rankCol}22 130%)` }}>
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center" style={{ width: 76, height: 76 }}>
            <div className="absolute inset-0 rounded-full" style={{ border: `3px solid ${rankCol}`, boxShadow: `0 0 16px ${rankCol}77` }} />
            <div className="text-4xl">{player.avatar || HERO_ICONS[player.heroClass] || "🦸"}</div>
            <div
              className="absolute rounded-full px-2 text-xs font-bold"
              style={{ bottom: -6, background: rankCol, color: "#0A0D1C", fontFamily: "'Chakra Petch', sans-serif" }}
            >
              Lv{player.level}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xl font-bold" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>{player.name}</div>
            <div className="text-xs mb-1" style={{ color: C.dim }}>
              {player.heroClass ? `${player.heroClass} · ${player.classFamily}` : player.role}
            </div>
            <RankChip rank={player.rank} small />
          </div>
          <div className="text-right">
            <div className="text-xl font-bold" style={{ color: C.gold, fontFamily: "'Chakra Petch', sans-serif" }}>
              🪙 {fmt(player.gold)}
            </div>
            <div className="text-xs" style={{ color: C.dim }}>Gold Balance</div>
            {player.goldPendingAdjustment && (
              <div className="text-xs" style={{ color: C.hp }}>⚠️ pending adjustment</div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: C.dim }}>Lv{player.level} → Lv{player.level + 1}</span>
            <span style={{ color: C.exp }}>{player.expInLevel}/{player.expToNextLevel} EXP</span>
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
                <span style={{ color: nextCol }}>{fmt(player.seasonExp)}/{fmt(rankTarget)} Season EXP</span>
              </div>
              <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: "#070A16" }}>
                <div className="h-full rounded-full" style={{ width: `${rankPct}%`, background: `linear-gradient(90deg, ${C.purple}, ${nextCol})` }} />
              </div>
            </>
          ) : (
            <div className="text-xs mt-3" style={{ color: C.gold }}>★ Max rank reached — {fmt(player.seasonExp)} Season EXP</div>
          )}
        </div>
      </Panel>

      <Panel>
        <SectionTitle right={<span className="text-xs" style={{ color: C.dim }}>+{player.todayExp} today</span>}>
          DAILY MISSIONS
        </SectionTitle>
        {(!player.missionsToday || player.missionsToday.length === 0) ? (
          <div className="text-sm text-center py-3" style={{ color: C.dim }}>No missions configured for your role yet.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {player.missionsToday.map((m) => (
              <MissionRow key={m.missionId} m={m} onMission={onMission} />
            ))}
          </div>
        )}
      </Panel>

      {player.paceEligible && player.paceEligible.length > 0 && (
        <Panel style={{ border: `1px solid ${C.gold}66`, background: `${C.gold}0D` }}>
          <SectionTitle>FAST CLIMBER</SectionTitle>
          <div className="flex flex-col gap-2">
            {player.paceEligible.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>🏅 {p.label}</span>
                <span className="font-bold" style={{ color: C.gold }}>+{fmt(p.bonus)} bonus</span>
              </div>
            ))}
          </div>
          <div className="text-xs mt-2" style={{ color: C.dim }}>Ask your GM to confirm & grant this bonus.</div>
        </Panel>
      )}

      <Panel>
        <SectionTitle>BADGES</SectionTitle>
        {(!player.badges || player.badges.length === 0) ? (
          <div className="text-sm" style={{ color: C.dim }}>No badges yet — earn milestones & achievements to collect them.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {player.badges.map((b, i) => (
              <span key={i} className="text-xs rounded-full px-3 py-1" style={{ background: `${C.gold}14`, color: C.gold, border: `1px solid ${C.gold}44` }}>
                🏅 {b}
              </span>
            ))}
          </div>
        )}
      </Panel>

      <Panel>
        <SectionTitle>RECENT ACTIVITY</SectionTitle>
        {(!player.recentLog || player.recentLog.length === 0) ? (
          <div className="text-sm text-center py-4" style={{ color: C.dim }}>No EXP logged yet. Your journey begins soon!</div>
        ) : (
          <div className="flex flex-col gap-2">
            {player.recentLog.map((r, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: C.panelSoft, border: `1px solid ${C.line}` }}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{r.item || r.category}</div>
                  <div className="text-xs" style={{ color: C.dim }}>
                    {r.date} · {r.category}
                    {r.amountRm ? ` · RM ${fmt(r.amountRm)}` : ""}
                  </div>
                </div>
                <div className="text-sm font-bold" style={{ color: r.exp < 0 ? C.hp : C.exp }}>
                  {r.exp < 0 ? "" : "+"}{r.exp}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

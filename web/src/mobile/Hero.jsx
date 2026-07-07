import { C, Frame, Eyebrow, RankChip, Avatar, WarBar, fmt, heroClassOf, CLASS_COLOR } from "../ml.jsx";

const LEVEL_REWARDS = [
  { lv: 5, icon: "💰", label: "+100 Gold" },
  { lv: 10, icon: "🎭", label: "Elite Skin" },
  { lv: 15, icon: "💰", label: "+300 Gold" },
  { lv: 20, icon: "🎭", label: "Legend Skin" },
  { lv: 25, icon: "💰", label: "+500 Gold" },
  { lv: 30, icon: "🏛️", label: "Hall of Fame" },
];

const MISSION_META = {
  todo: { label: "SUBMIT", color: C.gold, clickable: true },
  pending: { label: "⏳ WAITING GM", color: C.orange, clickable: true },
  approved: { label: "✓ EXP GRANTED", color: C.green, clickable: false },
  rejected: { label: "REJECTED", color: C.hp, clickable: false },
};

function MissionRow({ m, onMission }) {
  const meta = MISSION_META[m.status] || MISSION_META.todo;
  return (
    <button
      onClick={() => meta.clickable && onMission(m)}
      disabled={!meta.clickable}
      style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        clipPath: "polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)",
        background: C.panelSoft, border: `1px solid ${C.line}`, padding: "9px 12px", textAlign: "left",
        cursor: meta.clickable ? "pointer" : "default", color: C.text,
      }}
    >
      <div>
        <div style={{ fontSize: 13 }}>{m.text}</div>
        <div style={{ fontSize: 10, color: C.dim }}>+{m.exp} EXP</div>
      </div>
      <span style={{ fontSize: 10, fontWeight: 800, color: meta.color, fontFamily: "'Chakra Petch',sans-serif" }}>{meta.label}</span>
    </button>
  );
}

export default function Hero({ player, onMission }) {
  const cls = heroClassOf(player.heroClass, player.role);
  const clsCol = CLASS_COLOR[cls] || C.gold;
  const lvlPct = player.expToNextLevel ? (player.expInLevel / player.expToNextLevel) * 100 : 100;
  const rankTarget = player.seasonExp + (player.expToNextRank || 0);
  const rankPct = rankTarget ? (player.seasonExp / rankTarget) * 100 : 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Hero card */}
      <Frame glow={clsCol}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ position: "relative" }}>
            <Avatar p={player} size={78} />
            <div style={{ position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)",
              background: C.gold, color: "#0A0D1C", fontSize: 11, fontWeight: 800, padding: "1px 8px",
              clipPath: "polygon(6px 0,100% 0,100% 100%,0 100%)", fontFamily: "'Chakra Petch',sans-serif", boxShadow: `0 0 10px ${C.gold}88` }}>
              Lv{player.level}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 800, fontSize: 20 }}>{player.name}</div>
            <div style={{ fontSize: 11, color: clsCol, fontWeight: 700, marginBottom: 4, fontFamily: "'Chakra Petch',sans-serif" }}>
              {cls.toUpperCase()} · {player.classFamily || player.role}
            </div>
            <RankChip rank={player.rank} small />
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 800, fontSize: 18, color: C.gold }}>🪙 {fmt(player.gold)}</div>
            <div style={{ fontSize: 9, color: C.dim }}>GOLD</div>
            {player.goldPendingAdjustment && <div style={{ fontSize: 9, color: C.hp }}>⚠ pending adj.</div>}
          </div>
        </div>

        {/* Level bar */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 3 }}>
            <span style={{ color: C.dim }}>Lv{player.level} → Lv{player.level + 1}</span>
            <span style={{ color: C.cyan }}>{player.expInLevel}/{player.expToNextLevel} EXP</span>
          </div>
          <WarBar pct={lvlPct} col={C.cyan} h={10} />

          {player.nextRank ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, margin: "10px 0 3px" }}>
                <span style={{ color: C.dim }}>Road to {player.nextRank}</span>
                <span style={{ color: C.gold }}>{fmt(player.seasonExp)}/{fmt(rankTarget)} Season EXP</span>
              </div>
              <WarBar pct={rankPct} col={C.purple} h={10} />
            </>
          ) : (
            <div style={{ fontSize: 11, color: C.gold, marginTop: 10, fontFamily: "'Chakra Petch',sans-serif" }}>★ MAX RANK — {fmt(player.seasonExp)} Season EXP</div>
          )}
        </div>
      </Frame>

      {/* Level rewards track */}
      <Frame pad={12}>
        <Eyebrow right={`+${player.todayExp} today`}>LEVEL REWARDS</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
          {LEVEL_REWARDS.map((r) => {
            const got = player.level >= r.lv;
            return (
              <div key={r.lv} style={{ textAlign: "center", clipPath: "polygon(5px 0,100% 0,100% 100%,0 100%,0 5px)",
                background: got ? `${C.gold}18` : C.panelSoft, border: `1px solid ${got ? C.gold + "66" : C.line}`, padding: "6px 2px", opacity: got ? 1 : 0.55 }}>
                <div style={{ fontSize: 16, filter: got ? `drop-shadow(0 0 6px ${C.gold})` : "grayscale(1)" }}>{got ? r.icon : "🔒"}</div>
                <div style={{ fontSize: 8, fontWeight: 800, color: got ? C.gold : C.dim, fontFamily: "'Chakra Petch',sans-serif" }}>Lv{r.lv}</div>
                <div style={{ fontSize: 7.5, color: got ? C.text : C.dim, lineHeight: 1.2 }}>{r.label}</div>
              </div>
            );
          })}
        </div>
      </Frame>

      {/* Fast climber (pace) bonus */}
      {player.paceEligible && player.paceEligible.length > 0 && (
        <Frame glow={C.gold} pad={12}>
          <Eyebrow>⚡ FAST CLIMBER — EXTRA BOUNTY</Eyebrow>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {player.paceEligible.map((p, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span>🏅 {p.label}</span>
                <span style={{ fontWeight: 800, color: C.gold, fontFamily: "'Chakra Petch',sans-serif" }}>+{fmt(p.bonus)}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: C.dim, marginTop: 8 }}>Leveled up fast — your GM confirms & grants this bonus.</div>
        </Frame>
      )}

      {/* Daily missions */}
      <Frame pad={12}>
        <Eyebrow right="tap to submit">DAILY MISSIONS</Eyebrow>
        {(!player.missionsToday || player.missionsToday.length === 0) ? (
          <div style={{ fontSize: 12, textAlign: "center", color: C.dim, padding: "8px 0" }}>No missions configured for your role yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {player.missionsToday.map((m) => <MissionRow key={m.missionId} m={m} onMission={onMission} />)}
          </div>
        )}
      </Frame>

      {/* Badges */}
      <Frame pad={12}>
        <Eyebrow>BADGES</Eyebrow>
        {(!player.badges || player.badges.length === 0) ? (
          <div style={{ fontSize: 12, color: C.dim }}>No badges yet — earn milestones & achievements to collect them.</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {player.badges.map((b, i) => (
              <span key={i} style={{ fontSize: 11, clipPath: "polygon(5px 0,100% 0,100% 100%,0 100%,0 5px)",
                background: `${C.gold}14`, color: C.gold, border: `1px solid ${C.gold}44`, padding: "3px 10px" }}>🏅 {b}</span>
            ))}
          </div>
        )}
      </Frame>

      {/* Recent activity */}
      <Frame pad={12}>
        <Eyebrow>RECENT ACTIVITY</Eyebrow>
        {(!player.recentLog || player.recentLog.length === 0) ? (
          <div style={{ fontSize: 12, textAlign: "center", color: C.dim, padding: "8px 0" }}>No EXP logged yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {player.recentLog.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, clipPath: "polygon(6px 0,100% 0,100% 100%,0 100%,0 6px)",
                background: C.panelSoft, border: `1px solid ${C.line}`, padding: "7px 10px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.item || r.category}</div>
                  <div style={{ fontSize: 9, color: C.dim }}>{r.date} · {r.category}{r.amountRm ? ` · RM ${fmt(r.amountRm)}` : ""}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: r.exp < 0 ? C.hp : C.cyan, fontFamily: "'Chakra Petch',sans-serif" }}>
                  {r.exp < 0 ? "" : "+"}{r.exp}
                </div>
              </div>
            ))}
          </div>
        )}
      </Frame>
    </div>
  );
}

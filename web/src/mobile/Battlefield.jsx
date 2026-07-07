import { C, fmt, medal, ropePercent, timeUntil } from "../theme.js";
import { Panel, SectionTitle } from "../ui.jsx";

function Crystal({ dangerPct, label, mine }) {
  // dangerPct: 0 = full health (bright glow), 100 = about to shatter (cracked/flicker).
  const glowCol = dangerPct >= 100 ? C.hp : mine ? C.exp : C.hp;
  const intensity = 0.35 + (dangerPct / 100) * 0.65;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="crystal-glow flex items-center justify-center"
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          transform: "rotate(45deg)",
          background: `linear-gradient(160deg, ${glowCol}33, ${glowCol}88)`,
          border: `2px solid ${glowCol}`,
          boxShadow: `0 0 ${14 + intensity * 20}px ${glowCol}${dangerPct >= 66 ? "CC" : "77"}`,
          animation: dangerPct >= 66 ? "crystalPulse 1s ease-in-out infinite" : "none",
        }}
      >
        <span style={{ transform: "rotate(-45deg)", fontSize: 20 }}>💎</span>
      </div>
      <div className="text-xs font-bold" style={{ color: glowCol, fontFamily: "'Chakra Petch', sans-serif" }}>
        {label}
      </div>
    </div>
  );
}

function Towers({ destroyed, total, color }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} style={{ fontSize: 18, opacity: i < destroyed ? 0.25 : 1 }}>
          {i < destroyed ? "💥" : "🗼"}
        </span>
      ))}
      <span className="text-xs ml-1" style={{ color, alignSelf: "center" }}>
        {total - destroyed}/{total}
      </span>
    </div>
  );
}

function CrystalWarCard({ cw, buffs }) {
  const rope = ropePercent(cw.liveNet);
  const ourDanger = (cw.enemyTowers / cw.towersPerSide) * 100; // enemy towers destroyed OF OURS = danger to our crystal
  const enemyDanger = (cw.ourTowers / cw.towersPerSide) * 100;
  const victory = cw.crystalBroken === "us" || cw.crystalBroken === "enemy";

  return (
    <Panel
      style={{
        background: `linear-gradient(160deg, ${C.panel} 55%, ${cw.liveLeader === "us" ? C.exp : cw.liveLeader === "enemy" ? C.hp : C.purple}18 140%)`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <SectionTitle right={<span className="text-xs" style={{ color: C.dim }}>Week {cw.weekNo} · banks {timeUntil(cw.lockAt)}</span>}>
        CRYSTAL WAR · ONE FIGHT, TWO FRONTS
      </SectionTitle>

      {victory && (
        <div
          className="rounded-lg text-center text-sm font-bold mb-3 py-2"
          style={{ background: `${C.gold}22`, color: C.gold, border: `1px solid ${C.gold}66`, fontFamily: "'Chakra Petch', sans-serif" }}
        >
          {cw.crystalBroken === "us" ? "🏆 CRYSTAL SHATTERED — YOUR TEAM WINS" : "💔 CRYSTAL SHATTERED — ENEMY WINS"}
        </div>
      )}

      <div className="flex items-center justify-between px-2 mb-3">
        <Crystal dangerPct={ourDanger} label="YOUR BASE" mine />
        <div className="text-xl font-bold" style={{ color: C.gold, fontFamily: "'Chakra Petch', sans-serif" }}>VS</div>
        <Crystal dangerPct={enemyDanger} label="ENEMY BASE" mine={false} />
      </div>

      <div className="flex items-center justify-between px-1 mb-2">
        <Towers destroyed={cw.enemyTowers} total={cw.towersPerSide} color={C.exp} />
        <Towers destroyed={cw.ourTowers} total={cw.towersPerSide} color={C.hp} />
      </div>

      <div className="text-xs text-center mb-1" style={{ color: C.dim }}>This week · net lead</div>
      <div className="relative w-full rounded-full overflow-hidden" style={{ height: 16, background: "#070A16", border: `1px solid ${C.line}` }}>
        <div className="absolute top-0 h-full" style={{ left: "50%", width: 2, background: C.line }} />
        <div
          className="absolute top-0 h-full rounded-full"
          style={{
            width: 10,
            left: `calc(${rope}% - 5px)`,
            background: cw.liveLeader === "us" ? C.exp : cw.liveLeader === "enemy" ? C.hp : C.dim,
            boxShadow: `0 0 10px ${cw.liveLeader === "us" ? C.exp : C.hp}AA`,
            transition: "left 1s ease",
          }}
        />
      </div>
      <div className="flex justify-between text-xs mt-1">
        <span style={{ color: C.exp }}>You +{fmt(Math.max(0, cw.liveNet))}</span>
        <span style={{ color: C.hp }}>Enemy +{fmt(Math.max(0, -cw.liveNet))}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <div
          className="rounded-lg text-center text-xs font-bold py-1.5"
          style={{
            background: buffs?.powerCreep?.status === "slain" ? `${C.gold}1A` : C.panelSoft,
            border: `1px solid ${buffs?.powerCreep?.status === "slain" ? C.gold + "66" : C.line}`,
            color: buffs?.powerCreep?.status === "slain" ? C.gold : C.dim,
          }}
        >
          {buffs?.powerCreep?.status === "slain" ? "⚡ POWER CREEP CLAIMED" : "⚡ Power Creep Alive"}
        </div>
        <div
          className="rounded-lg text-center text-xs font-bold py-1.5"
          style={{
            background: cw.lord?.side === "us" ? `${C.exp}1A` : cw.lord?.side === "enemy" ? `${C.hp}1A` : C.panelSoft,
            border: `1px solid ${cw.lord?.side !== "none" ? (cw.lord?.side === "us" ? C.exp : C.hp) + "66" : C.line}`,
            color: cw.lord?.side === "us" ? C.exp : cw.lord?.side === "enemy" ? C.hp : C.dim,
          }}
        >
          {cw.lord?.side === "us" ? "👑 LORD — YOUR DMG ×2" : cw.lord?.side === "enemy" ? "👑 LORD — ENEMY DMG ×2" : "👑 Lord Alive"}
        </div>
      </div>
      {(buffs?.lord?.recordBrokenToday?.weproject || buffs?.lord?.recordBrokenToday?.wellous) && (
        <div className="text-xs text-center mt-2" style={{ color: C.gold }}>
          ⚠️ A daily revenue record was just broken — Lord ×2 pending GM confirmation
        </div>
      )}
    </Panel>
  );
}

function LaneMatchups({ rows, meId }) {
  return (
    <Panel>
      <SectionTitle right={<span className="text-xs" style={{ color: C.dim }}>#1 vs #1…</span>}>
        LANE MATCHUPS
      </SectionTitle>
      {rows.length === 0 ? (
        <div className="text-sm text-center py-4" style={{ color: C.dim }}>No matchups yet — deal some damage!</div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((m) => {
            const isMe = m.us.name && meId; // us side always local team; highlight not player-specific here
            return (
              <div
                key={m.slot}
                className="rounded-xl px-3 py-2 flex items-center gap-2"
                style={{
                  background: C.panelSoft,
                  border: `1px solid ${m.ko === "us" ? C.exp + "88" : m.ko === "enemy" ? C.hp + "88" : C.line}`,
                }}
              >
                <div className="flex-1 min-w-0 text-right">
                  <div className="text-sm font-semibold truncate">{m.us.name}</div>
                  <div className="text-xs" style={{ color: C.exp }}>{fmt(m.us.damage)}</div>
                </div>
                <div className="text-center px-2">
                  {m.ko === "us" && <span className="text-xs font-bold" style={{ color: C.exp }}>KO ⚔</span>}
                  {m.ko === "enemy" && <span className="text-xs font-bold" style={{ color: C.hp }}>⚔ KO</span>}
                  {!m.ko && <span className="text-xs" style={{ color: C.dim }}>vs</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{m.enemy.name}</div>
                  <div className="text-xs" style={{ color: C.hp }}>{fmt(m.enemy.damage)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function CreativeBoard({ rows, meId }) {
  return (
    <Panel>
      <SectionTitle right={<span className="text-xs" style={{ color: C.dim }}>Winning / High-CTR</span>}>
        CREATIVE RANKING
      </SectionTitle>
      {rows.length === 0 ? (
        <div className="text-sm text-center py-4" style={{ color: C.dim }}>No winning creatives yet.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((p, i) => {
            const isMe = p.playerId === meId;
            return (
              <div
                key={p.playerId}
                className="rounded-xl px-3 py-2 flex items-center gap-3"
                style={{ background: C.panelSoft, border: `1px solid ${isMe ? C.exp + "AA" : i === 0 ? C.purple + "77" : C.line}` }}
              >
                <div
                  className="w-6 text-center font-bold"
                  style={{ fontSize: i < 3 ? 18 : 14, color: i === 0 ? C.purple : i < 3 ? C.text : C.dim, fontFamily: "'Chakra Petch', sans-serif" }}
                >
                  {medal(i)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{p.name}</span>
                    {isMe && <YouChip />}
                  </div>
                  <div className="text-xs" style={{ color: C.dim }}>{p.role}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold" style={{ color: C.purple, fontFamily: "'Chakra Petch', sans-serif" }}>
                    🎯 {p.winningCount}
                  </div>
                  <div className="text-xs" style={{ color: C.dim }}>CTR ×{p.highCtrCount}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function YouChip() {
  return (
    <span
      className="text-xs font-bold rounded-full px-2 py-0.5"
      style={{ color: C.exp, background: `${C.exp}22`, border: `1px solid ${C.exp}66`, fontFamily: "'Chakra Petch', sans-serif", letterSpacing: "0.06em" }}
    >
      YOU
    </span>
  );
}

function KillFeed({ feed, meId }) {
  return (
    <Panel>
      <SectionTitle right={<span className="text-xs" style={{ color: C.green }}>● LIVE</span>}>
        TODAY'S ACHIEVEMENTS
      </SectionTitle>
      {feed.length === 0 ? (
        <div className="text-sm text-center py-4" style={{ color: C.dim }}>No achievements yet today. Go get First Blood! ⚔️</div>
      ) : (
        <div className="flex flex-col gap-2">
          {feed.map((f, i) => {
            const isMe = f.playerId === meId;
            return (
              <div
                key={i}
                className="feed-item flex items-center gap-3 rounded-xl px-3 py-2"
                style={{ background: isMe ? `${C.exp}12` : C.panelSoft, border: `1px solid ${isMe ? C.exp + "66" : C.line}`, animationDelay: `${i * 0.08}s` }}
              >
                <div className="text-xl">{f.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold" style={{ color: C.gold, letterSpacing: "0.12em", fontFamily: "'Chakra Petch', sans-serif" }}>
                    {f.tag}
                  </div>
                  <div className="text-sm truncate">
                    <span className="font-semibold">{f.name}</span>
                    <span style={{ color: C.dim }}> · {f.description}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold" style={{ color: C.exp }}>+{f.exp}</div>
                  <div className="text-xs" style={{ color: C.dim }}>{f.timestamp ? f.timestamp.split(" ")[1] || "" : ""}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

export default function Battlefield({ state, meId }) {
  return (
    <>
      <CrystalWarCard cw={state.crystalWar} buffs={state.buffs} />
      <LaneMatchups rows={state.laneMatchups || []} meId={meId} />
      <CreativeBoard rows={state.creativeRanking || []} meId={meId} />
      <KillFeed feed={state.feed || []} meId={meId} />
    </>
  );
}

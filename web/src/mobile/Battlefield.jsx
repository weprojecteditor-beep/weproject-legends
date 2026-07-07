import { C, Frame, Eyebrow, RoleTag, RankChip, Avatar, GOLD_GRAD, CLIP_SM, fmt } from "../ml.jsx";

// Cumulative damage cascades: Tower I → Tower II → Crystal.
const segRemain = (dealt, segs) => {
  let d = dealt;
  const out = [];
  for (const s of segs) { out.push(Math.max(0, s - d)); d = Math.max(0, d - s); }
  return out;
};

const FEED_COL = {
  "FIRST BLOOD": "#FF5544", "WINNING CREATIVE": "#A86BFF", "DOUBLE KILL": "#F5C542",
  "TOWER DESTROYED": "#3EE0F0", "ASSIST": "#4ADE80", "SAVAGE": "#FF3B5C", "MANIAC": "#FF3B5C", "MVP": "#F5C542",
};

/* ── Crystal War (draining HP bases) ── */
function BaseLane({ title, attackerLabel, dealt, segs, col }) {
  const rem = segRemain(dealt, segs);
  const names = ["TOWER I", "TOWER II", "CRYSTAL"];
  const icons = ["🗼", "🗼", "💎"];
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 800, marginBottom: 6 }}>
        <span style={{ color: col, fontFamily: "'Chakra Petch',sans-serif", letterSpacing: "0.08em" }}>{title}</span>
        <span style={{ color: C.dimmer }}>{attackerLabel}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr", gap: 6 }}>
        {segs.map((full, i) => {
          const left = rem[i];
          const down = left === 0;
          const pct = full > 0 ? (left / full) * 100 : 0;
          const active = !down && (i === 0 || rem[i - 1] === 0);
          const isCrystal = i === 2;
          return (
            <div key={i} style={{ clipPath: CLIP_SM, padding: "8px 6px 8px", textAlign: "center",
              background: down ? "#0A0D22" : active ? `${col}14` : C.panelSoft,
              border: `1px solid ${down ? C.line : active ? col + "88" : C.line}`, opacity: down ? 0.5 : 1 }}>
              <div className={isCrystal && !down ? "crystalPulse" : ""} style={{ fontSize: isCrystal ? 24 : 18, color: col,
                filter: down ? "grayscale(1)" : (active || isCrystal) ? `drop-shadow(0 0 12px ${col})` : "none" }}>{down ? "💥" : icons[i]}</div>
              <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.06em", marginTop: 3, color: down ? C.dimmer : col,
                fontFamily: "'Chakra Petch',sans-serif", textDecoration: down ? "line-through" : "none" }}>{names[i]}</div>
              <div style={{ marginTop: 4, transform: "skewX(-12deg)", height: 6, background: "#02040D", border: `1px solid ${col}44`, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: down ? "transparent" : `linear-gradient(90deg, ${col}88, ${col})`, boxShadow: down ? "none" : `0 0 8px ${col}`, transition: "width 1.1s cubic-bezier(.2,.8,.3,1)" }} />
              </div>
              <div style={{ fontSize: 7.5, marginTop: 3, color: down ? C.dimmer : C.dim }}>{down ? "DESTROYED" : fmt(left) + " HP"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CrystalWar({ cw }) {
  const segs = cw.segs && cw.segs.length ? cw.segs : [300000, 300000, 400000];
  const dealtByUs = cw.dealtByUs || 0;
  const dealtByThem = cw.dealtByThem || 0;
  const enemyRem = segRemain(dealtByUs, segs).reduce((a, b) => a + b, 0);
  const ourRem = segRemain(dealtByThem, segs).reduce((a, b) => a + b, 0);
  const enemyDown = segRemain(dealtByUs, segs)[2] === 0;
  const ourDown = segRemain(dealtByThem, segs)[2] === 0;
  const winning = enemyRem < ourRem;
  const even = enemyRem === ourRem;
  return (
    <Frame glow={C.cyan} pad={0}>
      <div style={{ padding: "16px 14px 12px", background: `radial-gradient(ellipse 70% 90% at 12% 25%, ${C.cyan}16 0%, transparent 55%), radial-gradient(ellipse 70% 90% at 88% 25%, ${C.enemy}14 0%, transparent 55%)` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 14 }}>
          <span style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 800, fontSize: 13, color: C.cyan, textShadow: `0 0 10px ${C.cyan}66` }}>WE PROJECT</span>
          <div style={{ width: 40, height: 40, flexShrink: 0, transform: "rotate(45deg)", background: GOLD_GRAD, padding: 1.5, boxShadow: `0 0 26px ${C.gold}99` }}>
            <div style={{ width: "100%", height: "100%", background: "#0A0F28", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ transform: "rotate(-45deg)", fontFamily: "'Chakra Petch',sans-serif", fontWeight: 800, fontSize: 14, color: C.goldHi, textShadow: `0 0 12px ${C.gold}` }}>VS</span>
            </div>
          </div>
          <span style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 800, fontSize: 13, color: "#FF7777", textShadow: "0 0 10px #FF444466" }}>WELLOUS</span>
        </div>
        {(enemyDown || ourDown) && (
          <div style={{ textAlign: "center", marginBottom: 12, padding: "6px", clipPath: CLIP_SM, background: `${C.gold}22`, border: `1px solid ${C.gold}66`,
            fontFamily: "'Chakra Petch',sans-serif", fontWeight: 800, fontSize: 12, color: C.gold, textShadow: `0 0 10px ${C.gold}` }}>
            {enemyDown ? "🏆 CRYSTAL SHATTERED — WE PROJECT WINS" : "💔 OUR CRYSTAL FELL — WELLOUS WINS"}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <BaseLane title="⚔ ENEMY BASE" attackerLabel="WE ATTACK →" dealt={dealtByUs} segs={segs} col={C.enemy} />
          <BaseLane title="🛡 OUR BASE" attackerLabel="← WELLOUS ATTACKS" dealt={dealtByThem} segs={segs} col={C.cyan} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
          <span style={{ fontSize: 10, color: C.dim }}>Today: <b style={{ color: C.gold }}>{fmt(cw.ourToday || 0)} DMG</b> dealt</span>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", fontFamily: "'Chakra Petch',sans-serif",
            color: even ? C.dim : winning ? C.cyan : "#FF7777", textShadow: `0 0 10px ${winning ? C.cyan : C.enemy}` }}>
            {even ? "— EVEN —" : winning ? "▲ LEADING" : "▼ BEHIND"}
          </span>
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${C.line}`, padding: "7px 14px", background: "#070C24", textAlign: "center", fontSize: 9.5, color: C.dim }}>
        ⚡ <b style={{ color: C.goldHi }}>CRYSTAL WAR</b> — every RM1 of revenue drains the enemy base
      </div>
    </Frame>
  );
}

/* ── Neutral objectives ── */
function ProgressRow({ label, col, val, target }) {
  const pct = target > 0 ? Math.min(100, (val / target) * 100) : 0;
  const hit = target > 0 && val >= target;
  return (
    <div style={{ marginBottom: 5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, fontWeight: 800, marginBottom: 2 }}>
        <span style={{ color: col, fontFamily: "'Chakra Petch',sans-serif" }}>{label}{hit ? " ✓" : ""}</span>
        <span style={{ color: C.dimmer }}>{fmt(val)}/{fmt(target)}</span>
      </div>
      <div style={{ transform: "skewX(-12deg)", height: 6, background: "#02040D", border: `1px solid ${col}44`, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${col}88, ${col})`, boxShadow: `0 0 8px ${col}`, transition: "width 1s ease" }} />
      </div>
    </div>
  );
}

function Slayer({ id, name, team, note, pmap }) {
  const p = pmap[id] || { name };
  const tcol = team === "wellous" ? C.enemy : C.cyan;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, clipPath: CLIP_SM, background: `${C.gold}12`, border: `1px solid ${C.gold}55`, padding: "6px 8px" }}>
      <Avatar p={p} size={34} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 8, color: C.dimmer, letterSpacing: "0.12em", fontFamily: "'Chakra Petch',sans-serif" }}>⚔ SLAIN BY <span style={{ color: tcol }}>{team === "wellous" ? "WELLOUS" : "WEPROJECT"}</span></div>
        <div style={{ fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name || name}</div>
        {note && <div style={{ fontSize: 8, color: C.green, fontWeight: 800 }}>{note}</div>}
      </div>
    </div>
  );
}

function ObjectiveCard({ glow, icon, name, buff, obj, pmap }) {
  const slain = obj.status === "slain";
  const target = obj.target || 0;
  return (
    <Frame glow={glow} pad={12}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="floaty" style={{ fontSize: 28, filter: `drop-shadow(0 0 12px ${glow})` }}>{icon}</div>
        <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.1em", padding: "2px 6px", clipPath: CLIP_SM, fontFamily: "'Chakra Petch',sans-serif",
          background: slain ? `${C.green}20` : `${glow}20`, color: slain ? C.green : glow, border: `1px solid ${(slain ? C.green : glow)}55` }}>
          {slain ? "SLAIN" : "CONTESTED"}
        </span>
      </div>
      <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 800, fontSize: 11, letterSpacing: "0.1em", color: glow, margin: "4px 0 2px" }}>{name}</div>
      <div style={{ fontSize: 9, color: C.dim, lineHeight: 1.5, marginBottom: 6 }}>First team to <b style={{ color: C.gold }}>RM {fmt(target)}</b> today wins <b style={{ color: C.green }}>{buff}</b></div>
      <ProgressRow label="WEPROJECT" col={C.cyan} val={obj.wpProgress || 0} target={target} />
      <ProgressRow label="WELLOUS" col={C.enemy} val={obj.wlProgress || 0} target={target} />
      {slain && (obj.slainBy || obj.slainById) && <Slayer id={obj.slainById} name={obj.slainBy} team={obj.slainTeam} note={buff} pmap={pmap} />}
    </Frame>
  );
}

function NeutralObjectives({ buffs, pmap }) {
  const power = buffs?.powerCreep || { status: "alive" };
  const lord = buffs?.lord || { status: "alive" };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "2px 2px 8px" }}>
        <span style={{ color: C.gold, fontSize: 10, fontWeight: 800, letterSpacing: "0.25em", fontFamily: "'Chakra Petch',sans-serif" }}>◆ NEUTRAL OBJECTIVES</span>
        <span style={{ fontSize: 9, color: C.dimmer }}>race with revenue to claim it</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <ObjectiveCard glow={C.purple} icon="🔮" name="POWER CREEP" buff="TEAM EXP ×1.2" obj={power} pmap={pmap} />
        <ObjectiveCard glow={C.hp} icon="💀" name="LORD" buff="BASE DMG ×2" obj={lord} pmap={pmap} />
      </div>
    </div>
  );
}

/* ── Rankings (reference RankRow: diamond badge + avatar) ── */
function RankRow({ idx, p, valueEl, subEl, topCol }) {
  const top1 = idx === 0;
  return (
    <div style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 11,
      background: top1 ? `linear-gradient(90deg, ${topCol}1A 0%, ${C.panelSoft} 55%)` : C.panelSoft,
      border: `1px solid ${top1 ? topCol + "88" : C.line}`, clipPath: CLIP_SM, padding: "9px 12px" }}>
      {top1 && <div className="shine" style={{ position: "absolute", top: 0, bottom: 0, width: 60, background: `linear-gradient(100deg, transparent, ${topCol}30, transparent)` }} />}
      <div style={{ position: "relative", width: 26, height: 26, flexShrink: 0, transform: "rotate(45deg)",
        background: top1 ? GOLD_GRAD : idx < 3 ? C.panel : "transparent", border: top1 ? "none" : `1px solid ${idx < 3 ? C.line : "transparent"}`,
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ transform: "rotate(-45deg)", fontSize: 12, fontWeight: 900, color: top1 ? "#0A0F28" : idx < 3 ? C.text : C.dimmer, fontFamily: "'Chakra Petch',sans-serif" }}>{idx + 1}</span>
      </div>
      <Avatar p={p} size={48} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 800, fontSize: 14 }}>{p.name}</span>
          <RoleTag role={p.role} small />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
          <RankChip rank={p.rank} small />{subEl}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>{valueEl}</div>
    </div>
  );
}

function DamageBoard({ rows, meId }) {
  const sorted = (rows || []).filter((p) => p.damage > 0);
  const myIdx = sorted.findIndex((p) => p.playerId === meId);
  return (
    <Frame pad={14}>
      <Eyebrow right="THIS SEASON">⚔ ATTACK RANKING</Eyebrow>
      <div style={{ fontSize: 10, textAlign: "center", marginBottom: 8, fontFamily: "'Chakra Petch',sans-serif", color: myIdx >= 0 ? C.cyan : C.dimmer }}>
        {myIdx >= 0 ? `YOU'RE #${myIdx + 1} · ${fmt(sorted[myIdx].damage)} DMG ON THE ENEMY` : "Land a sale to strike the enemy base"}
      </div>
      {sorted.length === 0 ? (
        <div style={{ fontSize: 12, textAlign: "center", color: C.dim, padding: "10px 0" }}>No damage dealt yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sorted.map((p, i) => (
            <RankRow key={p.playerId} idx={i} p={p} topCol={C.gold}
              subEl={<span style={{ fontSize: 9, color: C.dimmer }}>Lv{p.level}</span>}
              valueEl={<div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: 15, color: i === 0 ? C.gold : C.text, textShadow: i === 0 ? `0 0 14px ${C.gold}` : "none" }}>{fmt(p.damage)}</div>} />
          ))}
        </div>
      )}
    </Frame>
  );
}

function CreativeBoard({ rows }) {
  const list = rows || [];
  if (list.length === 0) return null;
  return (
    <Frame pad={14}>
      <Eyebrow right="WINNING / HIGH-CTR">🎬 CREATIVE RANKING</Eyebrow>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map((p, i) => (
          <RankRow key={p.playerId} idx={i} p={p} topCol={C.purple}
            valueEl={<div>
              <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: 15, color: i === 0 ? C.purple : C.text, textShadow: i === 0 ? `0 0 14px ${C.purple}` : "none" }}>🎯 {p.winningCount}</div>
              <div style={{ fontSize: 9, color: C.dimmer }}>CTR ×{p.highCtrCount}</div>
            </div>} />
        ))}
      </div>
    </Frame>
  );
}

function KillFeed({ feed, pmap }) {
  const rows = feed || [];
  return (
    <Frame pad={14}>
      <Eyebrow right={<span style={{ color: C.green }}>● LIVE</span>}>TODAY'S ACHIEVEMENTS</Eyebrow>
      {rows.length === 0 ? (
        <div style={{ fontSize: 12, textAlign: "center", color: C.dim, padding: "10px 0" }}>No achievements yet today. Go get First Blood! ⚔️</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {rows.map((f, i) => {
            const col = FEED_COL[f.tag] || C.gold;
            const p = pmap[f.playerId];
            return (
              <div key={i} className="feedItem" style={{ display: "flex", alignItems: "center", gap: 11,
                background: `linear-gradient(90deg, ${col}10 0%, ${C.panelSoft} 40%)`, borderLeft: `3px solid ${col}`, clipPath: CLIP_SM, padding: "8px 11px", animationDelay: `${i * 0.08}s` }}>
                {p ? <Avatar p={p} size={46} /> : <div style={{ fontSize: 22, width: 40, textAlign: "center" }}>{f.icon}</div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", color: col, fontFamily: "'Chakra Petch',sans-serif", textShadow: `0 0 10px ${col}88` }}>{f.tag}</div>
                  <div style={{ fontSize: 13, marginTop: 1 }}><b>{f.name}</b></div>
                  <div style={{ fontSize: 11, color: C.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.description}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {f.exp > 0 && <div style={{ fontSize: 15, fontWeight: 900, color: C.cyan, fontFamily: "'Chakra Petch',sans-serif", textShadow: `0 0 12px ${C.cyan}88` }}>+{f.exp}</div>}
                  <div style={{ fontSize: 9, color: C.dimmer }}>{f.timestamp ? (f.timestamp.split(" ")[1] || "") : ""}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Frame>
  );
}

export default function Battlefield({ state, meId }) {
  const pmap = {};
  [...(state.damageRanking || []), ...(state.creativeRanking || [])].forEach((p) => {
    if (!pmap[p.playerId]) pmap[p.playerId] = { heroClass: p.heroClass, role: p.role, rank: p.rank, name: p.name };
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <style>{`
        @keyframes crystalPulse {0%,100%{transform:scale(1);filter:drop-shadow(0 0 8px currentColor);}50%{transform:scale(1.12);filter:drop-shadow(0 0 18px currentColor);}}
        .crystalPulse{animation:crystalPulse 1.6s ease-in-out infinite;}
        @keyframes feedIn{from{opacity:0;transform:translateX(16px);}to{opacity:1;transform:none;}}
        .feedItem{animation:feedIn .5s ease both;}
        @media (prefers-reduced-motion: reduce){.crystalPulse,.feedItem{animation:none!important;}}
      `}</style>
      <CrystalWar cw={state.crystalWar || {}} />
      <NeutralObjectives buffs={state.buffs} pmap={pmap} />
      <DamageBoard rows={state.damageRanking} meId={meId} />
      <CreativeBoard rows={state.creativeRanking} />
      <KillFeed feed={state.feed} pmap={pmap} />
    </div>
  );
}

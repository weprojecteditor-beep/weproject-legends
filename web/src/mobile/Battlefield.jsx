import { C, Frame, Eyebrow, RoleTag, RankChip, Avatar, GOLD_GRAD, CLIP_SM, fmt } from "../ml.jsx";

const FEED_COL = {
  "FIRST BLOOD": "#FF5544", "WINNING CREATIVE": "#A86BFF", "DOUBLE KILL": "#F5C542",
  "BOSS DAMAGE": "#3EE0F0", "ASSIST": "#4ADE80", "SAVAGE": "#FF3B5C", "MANIAC": "#FF3B5C", "MVP": "#F5C542",
};

/* ── World Boss (single boss, draining HP toward the monthly target) ── */
function WorldBoss({ boss }) {
  const target = boss.target || 1000000;
  const dealt = boss.dealt || 0;
  const hpPct = boss.hpPct != null ? boss.hpPct : Math.max(0, (target - dealt) / target);
  const dealtPct = boss.dealtPct != null ? boss.dealtPct : Math.min(1, dealt / target);
  const defeated = boss.defeated || dealt >= target;
  const col = defeated ? C.green : C.hp;

  return (
    <Frame glow={col} pad={0}>
      <div style={{ padding: "18px 16px 14px", background: `radial-gradient(ellipse 90% 80% at 50% 0%, ${col}1E 0%, transparent 60%)` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.22em", color: C.gold, fontFamily: "'Chakra Petch',sans-serif" }}>◆ WORLD BOSS · {boss.month || "THIS MONTH"}</div>
            <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: 20, color: col, textShadow: `0 0 16px ${col}88`, letterSpacing: "0.04em", textTransform: "uppercase" }}>{boss.name || "Revenue Overlord"}</div>
          </div>
          <div className={defeated ? "" : "bossFloat"} style={{ fontSize: 52, filter: `drop-shadow(0 0 18px ${col})`, lineHeight: 1 }}>{defeated ? "💀" : "🐲"}</div>
        </div>

        {defeated && (
          <div style={{ textAlign: "center", margin: "0 0 12px", padding: "7px", clipPath: CLIP_SM, background: `${C.gold}22`, border: `1px solid ${C.gold}66`,
            fontFamily: "'Chakra Petch',sans-serif", fontWeight: 800, fontSize: 13, color: C.gold, textShadow: `0 0 12px ${C.gold}` }}>
            🏆 BOSS DEFEATED — WEPROJECT WINS {boss.month || ""}!
          </div>
        )}

        {/* HP bar */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 800, marginBottom: 5, fontFamily: "'Chakra Petch',sans-serif" }}>
          <span style={{ color: col }}>BOSS HP</span>
          <span style={{ color: C.dim }}>{fmt(boss.hpRemaining != null ? boss.hpRemaining : Math.max(0, target - dealt))} / {fmt(target)} left</span>
        </div>
        <div style={{ position: "relative", transform: "skewX(-10deg)", height: 20, background: "#02040D", border: `1px solid ${col}55`, borderRadius: 3, overflow: "hidden", boxShadow: `inset 0 0 12px #000` }}>
          <div style={{ height: "100%", width: `${Math.max(0, hpPct * 100)}%`, background: `linear-gradient(90deg, ${col}, ${defeated ? C.green : "#FF6B7F"})`, boxShadow: `0 0 14px ${col}`, transition: "width 1.1s cubic-bezier(.2,.8,.3,1)" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", transform: "skewX(10deg)",
            fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: 11, color: "#fff", textShadow: "0 1px 3px #000" }}>{Math.round(hpPct * 100)}%</div>
        </div>

        {/* Damage dealt toward target */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
          <div>
            <div style={{ fontSize: 9, color: C.dimmer, letterSpacing: "0.1em" }}>DAMAGE DEALT</div>
            <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: 18, color: C.gold, textShadow: `0 0 12px ${C.gold}66` }}>RM {fmt(dealt)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: C.dimmer, letterSpacing: "0.1em" }}>TODAY</div>
            <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: 18, color: C.cyan, textShadow: `0 0 12px ${C.cyan}66` }}>+{fmt(boss.todayDamage || 0)}</div>
          </div>
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${C.line}`, padding: "7px 14px", background: "#070C24", textAlign: "center", fontSize: 9.5, color: C.dim }}>
        ⚡ <b style={{ color: C.goldHi }}>Every RM1 of revenue</b> chips the boss down — beat it before the month ends to win
      </div>
    </Frame>
  );
}

/* ── Rankings (diamond badge + avatar) ── */
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
      <Eyebrow right="THIS MONTH">⚔ DAMAGE ON THE BOSS</Eyebrow>
      <div style={{ fontSize: 10, textAlign: "center", marginBottom: 8, fontFamily: "'Chakra Petch',sans-serif", color: myIdx >= 0 ? C.cyan : C.dimmer }}>
        {myIdx >= 0 ? `YOU'RE #${myIdx + 1} · ${fmt(sorted[myIdx].damage)} DMG ON THE BOSS` : "Land a sale to strike the boss"}
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
        @keyframes bossFloat {0%,100%{transform:translateY(0) scale(1);}50%{transform:translateY(-5px) scale(1.06);}}
        .bossFloat{animation:bossFloat 2.4s ease-in-out infinite;}
        @keyframes feedIn{from{opacity:0;transform:translateX(16px);}to{opacity:1;transform:none;}}
        .feedItem{animation:feedIn .5s ease both;}
        @media (prefers-reduced-motion: reduce){.bossFloat,.feedItem{animation:none!important;}}
      `}</style>
      <WorldBoss boss={state.boss || {}} />
      <DamageBoard rows={state.damageRanking} meId={meId} />
      <CreativeBoard rows={state.creativeRanking} />
      <KillFeed feed={state.feed} pmap={pmap} />
    </div>
  );
}

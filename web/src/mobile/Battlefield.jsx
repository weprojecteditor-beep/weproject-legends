import { C, Frame, Eyebrow, RoleTag, RankChip, Avatar, GOLD_GRAD, CLIP_SM, fmt } from "../ml.jsx";

const FEED_COL = {
  "FIRST BLOOD": "#FF5544", "WINNING CREATIVE": "#A86BFF", "DOUBLE KILL": "#F5C542",
  "BOSS DAMAGE": "#3EE0F0", "ASSIST": "#4ADE80", "SAVAGE": "#FF3B5C", "MANIAC": "#FF3B5C", "MVP": "#F5C542",
};

/* ── Monthly Gauntlet: Tower I → Tower II → Crystal (draining HP stages) ── */
function StageCard({ s }) {
  const cleared = s.down;
  const active = s.active;
  const accent = s.isCrystal ? C.cyan : C.gold;
  const col = cleared ? C.green : active ? accent : C.dimmer;
  return (
    <div style={{ clipPath: CLIP_SM, padding: "9px 5px 8px", textAlign: "center",
      background: cleared ? "#08160F" : active ? `${accent}14` : C.panelSoft,
      border: `1px solid ${cleared ? C.green + "66" : active ? accent + "99" : C.line}`, opacity: cleared ? 0.9 : active ? 1 : 0.55 }}>
      <div className={s.isCrystal && !cleared ? "crystalPulse" : ""} style={{ fontSize: s.isCrystal ? 30 : 22, color: col,
        filter: cleared ? "grayscale(1)" : (active || s.isCrystal) ? `drop-shadow(0 0 12px ${col})` : "none" }}>{cleared ? "💥" : s.icon}</div>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.05em", marginTop: 4, color: col,
        fontFamily: "'Chakra Petch',sans-serif", textDecoration: cleared ? "line-through" : "none" }}>{s.name}</div>
      <div style={{ marginTop: 6, transform: "skewX(-12deg)", height: 8, background: "#02040D", border: `1px solid ${col}44`, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.max(0, (s.pct || 0) * 100)}%`, background: cleared ? "transparent" : `linear-gradient(90deg, ${col}88, ${col})`, boxShadow: cleared ? "none" : `0 0 8px ${col}`, transition: "width 1.1s cubic-bezier(.2,.8,.3,1)" }} />
      </div>
      <div style={{ fontSize: 9, marginTop: 4, color: cleared ? C.green : C.dim, fontWeight: cleared ? 800 : 400 }}>{cleared ? "CLEARED" : fmt(s.remaining) + " HP"}</div>
    </div>
  );
}

function WorldBoss({ boss }) {
  const stages = boss.stages || [];
  const dealt = boss.dealt || 0;
  const target = boss.target || 1000000;
  const defeated = boss.defeated;
  const stageNo = Math.min((boss.stageIndex ?? 0) + 1, 3);
  const glow = defeated ? C.green : C.cyan;

  return (
    <Frame glow={glow} pad={0}>
      <div style={{ position: "relative", overflow: "hidden", padding: "16px 14px 12px", background: `radial-gradient(ellipse 80% 90% at 50% 0%, ${C.cyan}18 0%, transparent 60%)` }}>
        {[[10, 14], [34, 9], [62, 16], [86, 11], [50, 58]].map((s, i) => (
          <span key={i} className="tw" style={{ position: "absolute", left: `${s[0]}%`, top: `${s[1]}%`, fontSize: 10, color: C.goldHi, filter: `drop-shadow(0 0 4px ${C.gold})`, animationDelay: `${i * 0.5}s`, pointerEvents: "none" }}>✦</span>
        ))}
        <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", color: C.gold, fontFamily: "'Chakra Petch',sans-serif" }}>◆ MONTHLY GAUNTLET · {boss.month || "THIS MONTH"}</div>
            <div className="shineText" style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: 23, letterSpacing: "0.04em", textTransform: "uppercase", filter: `drop-shadow(0 0 10px ${glow}88)` }}>{boss.name || "Crystal Citadel"}</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 8, color: C.dimmer, letterSpacing: "0.14em" }}>STAGE</div>
            <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: 26, color: defeated ? C.green : C.cyan, textShadow: `0 0 12px ${(defeated ? C.green : C.cyan)}66` }}>{defeated ? 3 : stageNo}<span style={{ fontSize: 13, color: C.dimmer }}>/3</span></div>
          </div>
        </div>

        {defeated && (
          <div style={{ textAlign: "center", margin: "0 0 12px", padding: "7px", clipPath: CLIP_SM, background: `${C.gold}22`, border: `1px solid ${C.gold}66`,
            fontFamily: "'Chakra Petch',sans-serif", fontWeight: 800, fontSize: 13, color: C.gold, textShadow: `0 0 12px ${C.gold}` }}>
            🏆 CRYSTAL SHATTERED — WEPROJECT CLEARS {boss.month || ""}!
          </div>
        )}

        {/* 3 stages */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.3fr", gap: 6 }}>
          {stages.map((s, i) => <StageCard key={i} s={s} />)}
        </div>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
          <div>
            <div style={{ fontSize: 9, color: C.dimmer, letterSpacing: "0.1em" }}>TOTAL DAMAGE</div>
            <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: 20, color: C.gold, textShadow: `0 0 14px ${C.gold}88` }}>RM {fmt(dealt)} <span style={{ fontSize: 11, color: C.dimmer }}>/ {fmt(target)}</span></div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: C.dimmer, letterSpacing: "0.1em" }}>TODAY</div>
            <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: 20, color: C.cyan, textShadow: `0 0 14px ${C.cyan}88` }}>+{fmt(boss.todayDamage || 0)}</div>
          </div>
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${C.line}`, padding: "7px 14px", background: "#070C24", textAlign: "center", fontSize: 9.5, color: C.dim }}>
        ⚡ Every RM1 of revenue breaks <b style={{ color: C.goldHi }}>Tower I → Tower II → the Crystal</b> — clear all 3 to win the month
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
              valueEl={<div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: 17, color: i === 0 ? C.gold : C.text, textShadow: i === 0 ? `0 0 14px ${C.gold}` : "none" }}>{fmt(p.damage)}</div>} />
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
        @keyframes crystalPulse {0%,100%{transform:scale(1);filter:drop-shadow(0 0 8px currentColor);}50%{transform:scale(1.14);filter:drop-shadow(0 0 18px currentColor);}}
        .crystalPulse{animation:crystalPulse 1.6s ease-in-out infinite;}
        @keyframes feedIn{from{opacity:0;transform:translateX(16px);}to{opacity:1;transform:none;}}
        .feedItem{animation:feedIn .5s ease both;}
        @keyframes twinkle{0%,100%{opacity:.2;transform:scale(.7);}50%{opacity:1;transform:scale(1.2);}}
        .tw{animation:twinkle 2.6s ease-in-out infinite;}
        @keyframes mshim{to{background-position:200% center;}}
        .shineText{background:linear-gradient(100deg,#FFE79A 0%,#F5C542 25%,#FFFDF0 45%,#F5C542 65%,#FFE79A 100%);background-size:200% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;animation:mshim 3.2s linear infinite;}
        @media (prefers-reduced-motion: reduce){.crystalPulse,.feedItem,.tw,.shineText{animation:none!important;}}
      `}</style>
      <WorldBoss boss={state.boss || {}} />
      <DamageBoard rows={state.damageRanking} meId={meId} />
      <CreativeBoard rows={state.creativeRanking} />
      <KillFeed feed={state.feed} pmap={pmap} />
    </div>
  );
}

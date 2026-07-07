// Battle tab — ported to the reference "Mobile Legends" design (glowing Crystal
// War, hexagon hero avatars, attack ranking). Styling is self-contained here so
// the rest of the app keeps building while the other tabs are upgraded.

const fmt = (n) => Number(n || 0).toLocaleString("en-US");

const C = {
  bg: "#040820", panel: "#0A1130", panelSoft: "#111A3E", line: "#1D2A55",
  gold: "#F5C542", goldHi: "#FFE79A", hp: "#FF3B5C", hpDeep: "#7A0E28",
  cyan: "#3EE0F0", purple: "#A86BFF", green: "#4ADE80", enemy: "#FF4444",
  text: "#EDF1FF", dim: "#8C96C4", dimmer: "#525C8A",
};
const GOLD_GRAD = "linear-gradient(135deg,#FFE79A 0%,#F5C542 30%,#9A7418 55%,#F5C542 80%,#FFE79A 100%)";
const RANKS = {
  Warrior: "#9CA3AF", Elite: "#CD7F32", Master: "#C8CDD8",
  Epic: "#A86BFF", Legend: "#F5C542", Mythic: "#FF3B5C",
};
const CLIP = "polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)";
const CLIP_SM = "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)";
const HEX = "polygon(50% 0, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)";

// 9 classes → 3 available portraits (chosen: reuse the 3 we have)
const HERO_IMG = {
  Marksman: "/avatars/marksman.png", Mage: "/avatars/assassin.png", Assassin: "/avatars/assassin.png",
  Fighter: "/avatars/fighter.png", Tank: "/avatars/fighter.png", Berserker: "/avatars/fighter.png",
  Support: "/avatars/assassin.png", Bard: "/avatars/assassin.png", Summoner: "/avatars/assassin.png",
};
const CLASS_COLOR = {
  Marksman: "#FFB800", Mage: "#A86BFF", Assassin: "#B368FF",
  Fighter: "#FF5544", Tank: "#4488FF", Berserker: "#FF7A2A",
  Support: "#4ADE80", Bard: "#4ADE80", Summoner: "#4ADE80",
};
const ROLE_DEFAULT_CLASS = { Marketer: "Marksman", LiveHost: "Fighter", Editor: "Assassin", Salesperson: "Marksman" };
const ROLE_COLOR = { Marketer: "#3EE0F0", LiveHost: "#FF6B9D", Editor: "#A86BFF", Salesperson: "#FFB800" };

function heroClassOf(p) { return p.heroClass || ROLE_DEFAULT_CLASS[p.role] || "Fighter"; }

// ── Shared bits ──────────────────────────────────────────────
function Frame({ children, glow, pad = 14, style }) {
  return (
    <div style={{ background: GOLD_GRAD, clipPath: CLIP, padding: 1.5,
      filter: glow ? `drop-shadow(0 0 14px ${glow}55)` : "drop-shadow(0 4px 12px rgba(0,0,0,0.5))", ...style }}>
      <div style={{ background: `linear-gradient(160deg, ${C.panel} 0%, #0D1538 100%)`,
        clipPath: CLIP, padding: pad, position: "relative", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}
function Eyebrow({ children, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <span style={{ color: C.gold, fontSize: 10, fontWeight: 800, letterSpacing: "0.25em",
        fontFamily: "'Chakra Petch',sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 5, height: 5, background: C.gold, transform: "rotate(45deg)" }} />{children}
      </span>
      {right && <span style={{ color: C.dim, fontSize: 10 }}>{right}</span>}
    </div>
  );
}
function RankChip({ rank, small }) {
  if (!rank) return null;
  const col = RANKS[rank] || C.dim;
  return (
    <span style={{ fontSize: small ? 9 : 11, fontWeight: 800, letterSpacing: "0.08em", color: col,
      background: `${col}1C`, border: `1px solid ${col}66`, clipPath: CLIP_SM, padding: small ? "2px 8px" : "3px 11px",
      fontFamily: "'Chakra Petch',sans-serif", whiteSpace: "nowrap", textShadow: `0 0 8px ${col}88` }}>
      {rank.toUpperCase()}
    </span>
  );
}
function Avatar({ p, size = 46 }) {
  const cls = heroClassOf(p);
  const col = CLASS_COLOR[cls] || C.gold;
  const ring = RANKS[p.rank] || C.dim;
  const img = HERO_IMG[cls];
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{ position: "absolute", inset: -2, background: `conic-gradient(from 200deg, ${ring}, ${ring}00 40%, ${ring} 65%, ${ring})`, clipPath: HEX }} />
      <div style={{ position: "absolute", inset: 1, background: `radial-gradient(circle at 50% 30%, ${col}30 0%, #060A1E 75%)`, clipPath: HEX, overflow: "hidden" }}>
        {img
          ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 12%" }} />
          : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: size * 0.42 }}>🦸</div>}
      </div>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", boxShadow: `0 0 16px ${ring}66`, clipPath: HEX }} />
    </div>
  );
}

// ── Crystal War (draining-HP bases, ML style) ────────────────
// Cumulative damage cascades: Tower I → Tower II → Crystal.
const segRemain = (dealt, segs) => {
  let d = dealt;
  const out = [];
  for (const s of segs) { out.push(Math.max(0, s - d)); d = Math.max(0, d - s); }
  return out;
};

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
          const active = !down && (i === 0 || rem[i - 1] === 0); // currently under attack
          const isCrystal = i === 2;
          return (
            <div key={i} style={{
              clipPath: CLIP_SM, padding: "8px 6px 8px", textAlign: "center",
              background: down ? "#0A0D22" : active ? `${col}14` : C.panelSoft,
              border: `1px solid ${down ? C.line : active ? col + "88" : C.line}`, opacity: down ? 0.5 : 1 }}>
              <div className={isCrystal && !down ? "crystalPulse" : ""} style={{ fontSize: isCrystal ? 24 : 18, color: col,
                filter: down ? "grayscale(1)" : (active || isCrystal) ? `drop-shadow(0 0 12px ${col})` : "none" }}>
                {down ? "💥" : icons[i]}
              </div>
              <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.06em", marginTop: 3,
                color: down ? C.dimmer : col, fontFamily: "'Chakra Petch',sans-serif",
                textDecoration: down ? "line-through" : "none" }}>{names[i]}</div>
              {/* skewed draining HP bar */}
              <div style={{ marginTop: 4, transform: "skewX(-12deg)", height: 6, background: "#02040D",
                border: `1px solid ${col}44`, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`,
                  background: down ? "transparent" : `linear-gradient(90deg, ${col}88, ${col})`,
                  boxShadow: down ? "none" : `0 0 8px ${col}`, transition: "width 1.1s cubic-bezier(.2,.8,.3,1)" }} />
              </div>
              <div style={{ fontSize: 7.5, marginTop: 3, color: down ? C.dimmer : C.dim }}>
                {down ? "DESTROYED" : fmt(left) + " HP"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CrystalWar({ cw }) {
  const segs = cw.segs && cw.segs.length ? cw.segs : [300000, 300000, 400000];
  const dealtByUs = cw.dealtByUs || 0;     // our damage on the ENEMY base
  const dealtByThem = cw.dealtByThem || 0; // enemy damage on OUR base
  const enemyRem = segRemain(dealtByUs, segs).reduce((a, b) => a + b, 0);
  const ourRem = segRemain(dealtByThem, segs).reduce((a, b) => a + b, 0);
  const enemyDown = segRemain(dealtByUs, segs)[2] === 0;
  const ourDown = segRemain(dealtByThem, segs)[2] === 0;
  const winning = enemyRem < ourRem;
  const even = enemyRem === ourRem;
  return (
    <Frame glow={C.cyan} pad={0}>
      <div style={{ padding: "16px 14px 12px",
        background: `radial-gradient(ellipse 70% 90% at 12% 25%, ${C.cyan}16 0%, transparent 55%),
                     radial-gradient(ellipse 70% 90% at 88% 25%, ${C.enemy}14 0%, transparent 55%)` }}>
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
          <div style={{ textAlign: "center", marginBottom: 12, padding: "6px", clipPath: CLIP_SM,
            background: `${C.gold}22`, border: `1px solid ${C.gold}66`, fontFamily: "'Chakra Petch',sans-serif",
            fontWeight: 800, fontSize: 12, color: C.gold, textShadow: `0 0 10px ${C.gold}` }}>
            {enemyDown ? "🏆 CRYSTAL SHATTERED — WE PROJECT WINS" : "💔 OUR CRYSTAL FELL — WELLOUS WINS"}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <BaseLane title="⚔ ENEMY BASE" attackerLabel="WE ATTACK →" dealt={dealtByUs} segs={segs} col={C.enemy} />
          <BaseLane title="🛡 OUR BASE" attackerLabel="← WELLOUS ATTACKS" dealt={dealtByThem} segs={segs} col={C.cyan} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
          <span style={{ fontSize: 10, color: C.dim }}>
            Today: <b style={{ color: C.gold }}>{fmt(cw.ourToday || 0)} DMG</b> dealt
          </span>
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

// ── Neutral objectives (Power Creep / Lord) ──────────────────
function NeutralObjectives({ buffs }) {
  const power = buffs?.powerCreep || { status: "alive" };
  const lord = buffs?.lord || { status: "alive" };
  const box = (glow, icon, title, status, body) => (
    <Frame glow={glow} pad={12}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 26, filter: `drop-shadow(0 0 10px ${glow})` }}>{icon}</div>
        <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.1em", padding: "2px 6px", clipPath: CLIP_SM,
          fontFamily: "'Chakra Petch',sans-serif", background: status === "slain" ? `${C.green}20` : `${glow}20`,
          color: status === "slain" ? C.green : glow, border: `1px solid ${(status === "slain" ? C.green : glow)}55` }}>
          {status === "slain" ? "SLAIN" : "ALIVE"}
        </span>
      </div>
      {body}
    </Frame>
  );
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "2px 2px 8px" }}>
        <span style={{ color: C.gold, fontSize: 10, fontWeight: 800, letterSpacing: "0.25em", fontFamily: "'Chakra Petch',sans-serif" }}>◆ NEUTRAL OBJECTIVES</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {box(C.purple, "🔮", "POWER CREEP", power.status, (
          <>
            <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 800, fontSize: 11, letterSpacing: "0.1em", color: C.purple, margin: "4px 0 2px" }}>POWER CREEP</div>
            <div style={{ fontSize: 9, color: C.dim, lineHeight: 1.5 }}>
              First hero to a <b style={{ color: C.gold }}>DOUBLE KILL</b> (10 sales) claims it → <b style={{ color: C.green }}>team EXP ×1.2 today</b>
            </div>
            {power.status === "slain" && power.slainBy && <div style={{ fontSize: 10, color: C.green, fontWeight: 800, marginTop: 6 }}>SLAIN BY {power.slainBy}</div>}
          </>
        ))}
        {box(C.hp, "💀", "LORD", lord.status, (
          <>
            <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 800, fontSize: 11, letterSpacing: "0.1em", color: C.hp, margin: "4px 0 2px" }}>LORD</div>
            <div style={{ fontSize: 9, color: C.dim, lineHeight: 1.5 }}>
              Break the season's best single-day revenue → <b style={{ color: C.gold }}>base DMG ×2</b> tomorrow
            </div>
          </>
        ))}
      </div>
    </div>
  );
}

// ── Attack ranking (who hits the enemy hardest) ──────────────
function AttackRanking({ rows, meId }) {
  const sorted = (rows || []).filter((p) => p.damage > 0);
  const max = sorted.length ? sorted[0].damage : 1;
  const myIdx = sorted.findIndex((p) => p.playerId === meId);
  return (
    <Frame pad={14}>
      <Eyebrow right="THIS SEASON">⚔ ATTACK RANKING</Eyebrow>
      <div style={{ fontSize: 10, textAlign: "center", marginBottom: 8, fontFamily: "'Chakra Petch',sans-serif",
        color: myIdx >= 0 ? C.cyan : C.dimmer }}>
        {myIdx >= 0 ? `YOU'RE #${myIdx + 1} · ${fmt(sorted[myIdx].damage)} DMG ON THE ENEMY` : "Land a sale to strike the enemy base"}
      </div>
      {sorted.length === 0 ? (
        <div style={{ fontSize: 12, textAlign: "center", color: C.dim, padding: "10px 0" }}>No damage dealt yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {sorted.map((p, i) => {
            const isMe = p.playerId === meId;
            const topCol = i === 0 ? C.gold : i < 3 ? C.text : C.dim;
            return (
              <div key={p.playerId} style={{ position: "relative", clipPath: CLIP_SM, overflow: "hidden",
                background: C.panelSoft, border: `1px solid ${isMe ? C.cyan + "AA" : i === 0 ? C.gold + "55" : C.line}`, padding: "7px 10px" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(p.damage / max) * 100}%`,
                  background: isMe ? `${C.cyan}12` : i === 0 ? `${C.gold}12` : `${C.cyan}08` }} />
                <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 22, textAlign: "center", fontSize: i < 3 ? 16 : 13, fontWeight: 800, color: topCol, fontFamily: "'Chakra Petch',sans-serif" }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </div>
                  <Avatar p={p} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                      {isMe && <span style={{ fontSize: 8, fontWeight: 800, color: C.cyan, background: `${C.cyan}22`, border: `1px solid ${C.cyan}66`, borderRadius: 3, padding: "1px 5px", fontFamily: "'Chakra Petch',sans-serif" }}>YOU</span>}
                      <RankChip rank={p.rank} small />
                    </div>
                    <div style={{ fontSize: 9, color: C.dim }}>{p.role} · Lv{p.level}</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: i === 0 ? C.gold : C.text, fontFamily: "'Chakra Petch',sans-serif" }}>{fmt(p.damage)}</div>
                </div>
              </div>
            );
          })}
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
      <Eyebrow right="WINNING / HIGH-CTR">🎯 CREATIVE RANKING</Eyebrow>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {list.map((p, i) => (
          <div key={p.playerId} style={{ clipPath: CLIP_SM, background: C.panelSoft, border: `1px solid ${i === 0 ? C.purple + "77" : C.line}`, padding: "7px 10px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 22, textAlign: "center", fontSize: i < 3 ? 16 : 13, fontWeight: 800, color: i === 0 ? C.purple : C.text, fontFamily: "'Chakra Petch',sans-serif" }}>
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
            </div>
            <Avatar p={p} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 13 }}>{p.name}</div>
              <div style={{ fontSize: 9, color: C.dim }}>{p.role}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: C.purple, fontFamily: "'Chakra Petch',sans-serif" }}>🎯 {p.winningCount}</div>
              <div style={{ fontSize: 9, color: C.dim }}>CTR ×{p.highCtrCount}</div>
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function KillFeed({ feed }) {
  const rows = feed || [];
  return (
    <Frame pad={14}>
      <Eyebrow right={<span style={{ color: C.green }}>● LIVE</span>}>TODAY'S ACHIEVEMENTS</Eyebrow>
      {rows.length === 0 ? (
        <div style={{ fontSize: 12, textAlign: "center", color: C.dim, padding: "10px 0" }}>No achievements yet today. Go get First Blood! ⚔️</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {rows.map((f, i) => (
            <div key={i} className="feedItem" style={{ display: "flex", alignItems: "center", gap: 10, clipPath: CLIP_SM, background: C.panelSoft, border: `1px solid ${C.line}`, padding: "7px 10px", animationDelay: `${i * 0.07}s` }}>
              <div style={{ fontSize: 18 }}>{f.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: C.gold, fontFamily: "'Chakra Petch',sans-serif" }}>{f.tag}</div>
                <div style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  <b>{f.name}</b> <span style={{ color: C.dim }}>· {f.description}</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                {f.exp > 0 && <div style={{ fontSize: 12, fontWeight: 800, color: C.cyan }}>+{f.exp}</div>}
                <div style={{ fontSize: 9, color: C.dim }}>{f.timestamp ? (f.timestamp.split(" ")[1] || "") : ""}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Frame>
  );
}

export default function Battlefield({ state, meId }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <style>{`
        @keyframes crystalPulse { 0%,100%{ transform:scale(1); filter:drop-shadow(0 0 8px currentColor);} 50%{ transform:scale(1.12); filter:drop-shadow(0 0 18px currentColor);} }
        .crystalPulse { animation: crystalPulse 1.6s ease-in-out infinite; }
        @keyframes feedIn { from{opacity:0; transform:translateX(16px);} to{opacity:1; transform:none;} }
        .feedItem { animation: feedIn .5s ease both; }
        @media (prefers-reduced-motion: reduce){ .crystalPulse,.feedItem{ animation:none!important; } }
      `}</style>
      <CrystalWar cw={state.crystalWar || {}} />
      <NeutralObjectives buffs={state.buffs} />
      <AttackRanking rows={state.damageRanking} meId={meId} />
      <CreativeBoard rows={state.creativeRanking} />
      <KillFeed feed={state.feed} />
    </div>
  );
}

import { C, HEX, CLIP_SM, HERO_IMG, ROLE_DEFAULT_CLASS, fmt } from "../ml.jsx";
import { getTv } from "../api.js";
import { usePolling } from "../hooks.js";
import { Loading } from "../ui.jsx";

const DATA_MS = 30000;
const imgFor = (heroClass, role) => HERO_IMG[heroClass || ROLE_DEFAULT_CLASS[role] || "Fighter"];

const SPARKS = [
  [5, 12, 1.0, 0], [16, 60, 0.8, 0.6], [28, 24, 0.9, 1.2], [40, 78, 1.1, 0.3],
  [54, 16, 0.9, 0.9], [67, 52, 1.0, 1.5], [80, 26, 0.8, 0.4], [90, 66, 1.0, 1.0],
  [10, 40, 0.9, 1.8], [48, 46, 1.0, 2.1], [72, 84, 0.8, 0.7], [88, 10, 0.9, 1.4],
];

export default function DashboardApp() {
  const state = usePolling(getTv, DATA_MS);
  if (!state.data && !state.error) return <Loading label="Loading dashboard…" />;
  if (!state.data) return <Loading label="Data sync failed — retrying…" />;
  const d = state.data;
  const boss = d.boss || {};

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", color: C.text, fontFamily: "'Inter',sans-serif", boxSizing: "border-box", padding: "2.6vh 2.6vw", position: "relative",
      background: `radial-gradient(ellipse 55% 45% at 50% 0%, #16204E 0%, transparent 60%), radial-gradient(ellipse 80% 55% at 50% 110%, ${C.gold}10 0%, transparent 55%), ${C.bg}` }}>
      <style>{`
        @keyframes cpz {0%,100%{transform:scale(1);filter:drop-shadow(0 0 10px currentColor);}50%{transform:scale(1.12);filter:drop-shadow(0 0 26px currentColor);}}
        .cpz{animation:cpz 1.6s ease-in-out infinite;}
        @keyframes tw{0%,100%{opacity:.18;transform:scale(.7);}50%{opacity:1;transform:scale(1.2);}}
        .tw{animation:tw 2.6s ease-in-out infinite;}
        @keyframes rays{to{transform:rotate(360deg);}}
        .rays{animation:rays 44s linear infinite;}
        @keyframes shimmer{to{background-position:200% center;}}
        .shine{background:linear-gradient(100deg,#FFE79A 0%,#F5C542 22%,#FFFDF0 42%,#F5C542 62%,#FFE79A 100%);background-size:200% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;animation:shimmer 3.2s linear infinite;}
        @keyframes sweep{0%{left:-25%;}55%,100%{left:125%;}}
        .sweep{position:absolute;top:0;bottom:0;width:16%;transform:skewX(-18deg);background:linear-gradient(100deg,transparent,#FFFFFF24,transparent);animation:sweep 3.8s ease-in-out infinite;pointer-events:none;}
        @keyframes glowText{0%,100%{filter:drop-shadow(0 0 1vh currentColor);}50%{filter:drop-shadow(0 0 2.6vh currentColor);}}
        .glowText{animation:glowText 2.4s ease-in-out infinite;}
        @media (prefers-reduced-motion: reduce){.cpz,.tw,.rays,.shine,.sweep,.glowText{animation:none!important;}}
      `}</style>

      <div className="rays" style={{ position: "absolute", inset: "-30% -10%", opacity: 0.14, pointerEvents: "none",
        background: `conic-gradient(from 0deg at 50% 45%, transparent 0deg, ${C.gold}20 5deg, transparent 12deg, transparent 28deg, ${C.cyan}16 34deg, transparent 42deg, transparent 62deg, ${C.gold}16 68deg, transparent 76deg)` }} />
      {SPARKS.map((s, i) => (
        <div key={i} className="tw" style={{ position: "absolute", left: `${s[0]}%`, top: `${s[1]}%`, fontSize: `${s[2]}vw`, color: C.goldHi, filter: `drop-shadow(0 0 0.7vw ${C.gold})`, animationDelay: `${s[3]}s`, pointerEvents: "none", zIndex: 0 }}>✦</div>
      ))}

      <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", gap: "2vh" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: "2.6vw", letterSpacing: "0.05em", lineHeight: 1 }}>
            WEPROJECT <span className="shine">LEGENDS</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1.6vw" }}>
            <div style={{ fontSize: "1.2vw", color: C.dim, fontFamily: "'Chakra Petch',sans-serif" }}>{boss.month || ""}</div>
            <div style={{ color: C.green, fontWeight: 900, fontSize: "1.3vw", fontFamily: "'Chakra Petch',sans-serif", textShadow: `0 0 1.2vh ${C.green}` }}>● LIVE</div>
          </div>
        </div>

        {/* Middle: Boss (left) + Rankings (right) */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: "2vw" }}>
          <BossPanel boss={boss} />
          <RankPanel rows={d.topDamage} bossName={boss.name} />
        </div>

        {/* Feed strip */}
        <FeedStrip feed={d.feed} />
      </div>
    </div>
  );
}

/* ── Boss (all 3 stages at once) ── */
function StageCard({ s }) {
  const cleared = s.down, active = s.active;
  const accent = s.isCrystal ? C.cyan : C.gold;
  const col = cleared ? C.green : active ? accent : C.dimmer;
  return (
    <div style={{ flex: s.isCrystal ? 1.3 : 1, clipPath: CLIP_SM, padding: "2.2vh 1vw 1.8vh", textAlign: "center", position: "relative", overflow: "hidden",
      background: cleared ? "#08160F" : active ? `${accent}16` : C.panelSoft,
      border: `2px solid ${cleared ? C.green + "66" : active ? accent : C.line}`, opacity: cleared ? 0.9 : active ? 1 : 0.5,
      boxShadow: active ? `0 0 2.4vh ${accent}44` : "none" }}>
      {active && <div className="sweep" />}
      <div className={s.isCrystal && !cleared ? "cpz" : ""} style={{ fontSize: s.isCrystal ? "8vh" : "6vh", lineHeight: 1, color: col, filter: cleared ? "grayscale(1)" : `drop-shadow(0 0 2.4vh ${col})` }}>{cleared ? "💥" : s.icon}</div>
      <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: "1.5vw", color: col, margin: "1vh 0 0.6vh", textShadow: cleared ? "none" : `0 0 1.2vh ${col}88`, textDecoration: cleared ? "line-through" : "none" }}>{s.name}</div>
      <div style={{ transform: "skewX(-8deg)", height: "2vh", background: "#02040D", border: `2px solid ${col}55`, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.max(0, (s.pct || 0) * 100)}%`, background: cleared ? "transparent" : `linear-gradient(90deg, ${col}88, ${col})`, boxShadow: cleared ? "none" : `0 0 1.4vh ${col}`, transition: "width 1.1s cubic-bezier(.2,.8,.3,1)" }} />
      </div>
      <div style={{ fontSize: "1vw", marginTop: "0.8vh", color: cleared ? C.green : C.dim, fontWeight: cleared ? 900 : 700, fontFamily: "'Chakra Petch',sans-serif" }}>{cleared ? "CLEARED" : fmt(s.remaining) + " HP"}</div>
    </div>
  );
}

function BossPanel({ boss }) {
  const stages = boss.stages || [];
  const dealt = boss.dealt || 0, target = boss.target || 1000000;
  const defeated = boss.defeated;
  const stageNo = Math.min((boss.stageIndex ?? 0) + 1, 3);
  const glow = defeated ? C.green : C.cyan;
  return (
    <div style={{ flex: 1.5, minWidth: 0, clipPath: CLIP_SM, background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${C.cyan}12 0%, transparent 60%), ${C.panel}`, border: `2px solid ${C.line}`, padding: "2.4vh 1.6vw", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="shine" style={{ fontSize: "1.1vw", fontWeight: 900, letterSpacing: "0.22em", fontFamily: "'Chakra Petch',sans-serif" }}>◆ MONTHLY GAUNTLET</div>
          <div className="glowText" style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: "3.4vw", color: glow, textShadow: `0 0 2.4vh ${glow}`, textTransform: "uppercase", lineHeight: 1.02 }}>{boss.name || "Crystal Citadel"}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: "0.9vw", color: C.dimmer, letterSpacing: "0.12em" }}>STAGE</div>
          <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: "2.6vw", color: glow, textShadow: `0 0 1.4vh ${glow}66` }}>{defeated ? 3 : stageNo}<span style={{ fontSize: "1.3vw", color: C.dimmer }}>/3</span></div>
        </div>
      </div>

      {defeated && (
        <div style={{ margin: "1.4vh 0 0", padding: "1vh 1.4vw", clipPath: CLIP_SM, background: `${C.gold}22`, border: `2px solid ${C.gold}`, textAlign: "center", position: "relative", overflow: "hidden",
          fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: "1.5vw", color: C.gold, textShadow: `0 0 1.6vh ${C.gold}` }}>
          <div className="sweep" />🏆 CRYSTAL SHATTERED — WEPROJECT CLEARS THE MONTH!
        </div>
      )}

      <div style={{ flex: 1, display: "flex", gap: "1vw", alignItems: "stretch", marginTop: "2vh" }}>
        {stages.map((s, i) => <StageCard key={i} s={s} />)}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2vh", fontFamily: "'Chakra Petch',sans-serif" }}>
        <div>
          <div style={{ fontSize: "0.9vw", color: C.dimmer, letterSpacing: "0.1em" }}>TOTAL DAMAGE</div>
          <div style={{ fontWeight: 900, fontSize: "2vw", color: C.gold, textShadow: `0 0 1.4vh ${C.gold}66` }}>RM {fmt(dealt)} <span style={{ fontSize: "1.1vw", color: C.dimmer }}>/ {fmt(target)}</span></div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.9vw", color: C.dimmer, letterSpacing: "0.1em" }}>TODAY</div>
          <div style={{ fontWeight: 900, fontSize: "2vw", color: C.cyan, textShadow: `0 0 1.4vh ${C.cyan}66` }}>+{fmt(boss.todayDamage || 0)}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Rankings (MVP + list) ── */
function HexImg({ heroClass, role, col, size }) {
  const img = imgFor(heroClass, role);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{ position: "absolute", inset: 0, clipPath: HEX, background: `radial-gradient(circle at 50% 30%, ${col}40, #060A1E 75%)`, overflow: "hidden" }}>
        {img && <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 12%" }} />}
      </div>
      <div style={{ position: "absolute", inset: 0, clipPath: HEX, boxShadow: `0 0 1.4vh ${col}88` }} />
    </div>
  );
}

function RankPanel({ rows, bossName }) {
  const list = (rows || []).filter((p) => p.damage > 0);
  const mvp = list[0];
  const rest = list.slice(1, 6);
  const mvpImg = mvp && imgFor(mvp.heroClass, mvp.role);
  return (
    <div style={{ flex: 1, minWidth: 0, clipPath: CLIP_SM, background: C.panel, border: `2px solid ${C.line}`, padding: "2.4vh 1.4vw", display: "flex", flexDirection: "column" }}>
      <div className="shine" style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: "1.6vw", marginBottom: "1.4vh", letterSpacing: "0.04em" }}>⚔ TOP DAMAGE ON THE BOSS</div>

      {mvp ? (
        <div style={{ display: "flex", alignItems: "center", gap: "1.2vw", clipPath: CLIP_SM, background: `linear-gradient(120deg, ${C.gold}1E 0%, transparent 70%)`, border: `2px solid ${C.gold}`, padding: "1.6vh 1.2vw", position: "relative", overflow: "hidden", boxShadow: `0 0 2.4vh ${C.gold}33` }}>
          <div className="sweep" />
          <div className="cpz" style={{ width: "13vh", height: "18vh", flexShrink: 0, color: C.gold }}>
            {mvpImg ? <img src={mvpImg} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", filter: `drop-shadow(0 0 2.4vh ${C.gold})` }} />
              : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: "9vh" }}>🦸</div>}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: "1vw", color: C.gold, fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900 }}>🥇 MVP</div>
            <div style={{ fontSize: "2.6vw", fontWeight: 900, fontFamily: "'Chakra Petch',sans-serif", lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{mvp.name}</div>
            <div style={{ fontSize: "0.95vw", color: C.dim, margin: "0.4vh 0 0.8vh" }}>{mvp.role} · Lv{mvp.level}</div>
            <div className="shine" style={{ fontSize: "2.6vw", fontWeight: 900, fontFamily: "'Chakra Petch',sans-serif", lineHeight: 1, filter: `drop-shadow(0 0 1.4vh ${C.gold})` }}>{fmt(mvp.damage)}</div>
          </div>
        </div>
      ) : <div style={{ color: C.dim, fontSize: "1.2vw" }}>No damage yet.</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.9vh", marginTop: "1.4vh", flex: 1 }}>
        {rest.map((p, i) => (
          <div key={p.playerId} style={{ display: "flex", alignItems: "center", gap: "0.9vw", clipPath: CLIP_SM, background: C.panelSoft, border: `1px solid ${C.line}`, padding: "0.9vh 0.9vw", minWidth: 0 }}>
            <div style={{ fontSize: "1.5vw", fontWeight: 900, color: C.gold, fontFamily: "'Chakra Petch',sans-serif", width: "2vw", textAlign: "center" }}>{i + 2}</div>
            <HexImg heroClass={p.heroClass} role={p.role} col={C.cyan} size="3.4vh" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: "1.2vw", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
            </div>
            <div style={{ fontWeight: 900, fontSize: "1.3vw", color: C.gold, fontFamily: "'Chakra Petch',sans-serif" }}>{fmt(p.damage)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Feed strip (horizontal) ── */
function FeedStrip({ feed }) {
  const rows = (feed || []).slice(0, 5);
  return (
    <div style={{ flexShrink: 0 }}>
      <div className="shine" style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: "1.4vw", marginBottom: "1vh", letterSpacing: "0.04em" }}>TODAY'S ACHIEVEMENTS</div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(rows.length, 1)}, 1fr)`, gap: "1vw" }}>
        {rows.length === 0 && <div style={{ color: C.dim, fontSize: "1.2vw" }}>No achievements yet today — go get First Blood! ⚔️</div>}
        {rows.map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.8vw", clipPath: CLIP_SM, background: `linear-gradient(100deg, ${C.cyan}12, ${C.panelSoft} 45%)`, border: `1px solid ${C.cyan}55`, padding: "1.2vh 1vw", minWidth: 0 }}>
            <div style={{ fontSize: "2.4vw", filter: `drop-shadow(0 0 1vh ${C.cyan}55)` }}>{f.icon}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: C.gold, fontWeight: 900, fontSize: "0.85vw", fontFamily: "'Chakra Petch',sans-serif", letterSpacing: "0.05em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.tag}</div>
              <div style={{ fontSize: "1.05vw", fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}{f.exp > 0 ? <span style={{ color: C.cyan }}> +{f.exp}</span> : null}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

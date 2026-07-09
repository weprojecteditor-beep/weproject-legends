import { useState, useEffect } from "react";
import { C, HEX, CLIP_SM, HERO_IMG, ROLE_DEFAULT_CLASS, fmt } from "../ml.jsx";
import { getTv } from "../api.js";
import { usePolling } from "../hooks.js";
import { Loading } from "../ui.jsx";

const DATA_MS = 30000;
const SCREEN_MS = 12000;
const SCREENS = 3;

const imgFor = (heroClass, role) => HERO_IMG[heroClass || ROLE_DEFAULT_CLASS[role] || "Fighter"];

export default function TvApp() {
  const state = usePolling(getTv, DATA_MS);
  const [screen, setScreen] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setScreen((s) => (s + 1) % SCREENS), SCREEN_MS);
    return () => clearInterval(t);
  }, []);

  if (!state.data && !state.error) return <Loading label="Summoning heroes…" />;
  if (!state.data) return <Loading label="Data sync failed — retrying…" />;
  const d = state.data;

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: C.bg, color: C.text, fontFamily: "'Inter',sans-serif", boxSizing: "border-box", padding: "3vh 3vw", position: "relative" }}>
      <style>{`
        @keyframes cpz {0%,100%{transform:scale(1);filter:drop-shadow(0 0 10px currentColor);}50%{transform:scale(1.12);filter:drop-shadow(0 0 26px currentColor);}}
        .cpz{animation:cpz 1.6s ease-in-out infinite;}
        @keyframes bossbob {0%,100%{transform:translateY(0) scale(1);}50%{transform:translateY(-1.4vh) scale(1.05);}}
        .bossbob{animation:bossbob 2.6s ease-in-out infinite;}
        @keyframes fin{from{opacity:0;transform:translateX(2vw);}to{opacity:1;transform:none;}}
        .fin{animation:fin .5s ease both;}
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2vh" }}>
        <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 800, fontSize: "2.4vw", letterSpacing: "0.06em" }}>
          WEPROJECT <span style={{ color: C.gold }}>LEGENDS</span>
        </div>
        <div style={{ color: C.green, fontWeight: 800, fontSize: "1.1vw" }}>● LIVE · WORLD BOSS</div>
      </div>

      <div style={{ height: "84vh" }}>
        {screen === 0 && <BossScreen boss={d.boss || {}} />}
        {screen === 1 && <TopDamageScreen rows={d.topDamage} boss={d.boss || {}} />}
        {screen === 2 && <FeedScreen feed={d.feed} />}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: "1.2vw", position: "absolute", bottom: "1.6vh", left: 0, right: 0 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: "1vw", height: "1vw", borderRadius: "50%", background: i === screen ? C.gold : C.line, transition: "background .3s" }} />
        ))}
      </div>
    </div>
  );
}

function TvStage({ s }) {
  const cleared = s.down;
  const active = s.active;
  const accent = s.isCrystal ? C.cyan : C.gold;
  const col = cleared ? C.green : active ? accent : C.dimmer;
  return (
    <div style={{ flex: s.isCrystal ? 1.35 : 1, clipPath: CLIP_SM, padding: "3vh 1.4vw 2.4vh", textAlign: "center",
      background: cleared ? "#08160F" : active ? `${accent}12` : C.panelSoft,
      border: `2px solid ${cleared ? C.green + "66" : active ? accent : C.line}`, opacity: cleared ? 0.92 : active ? 1 : 0.55 }}>
      <div className={s.isCrystal && !cleared ? "cpz" : ""} style={{ fontSize: s.isCrystal ? "12vh" : "9vh", lineHeight: 1, color: col,
        filter: cleared ? "grayscale(1)" : `drop-shadow(0 0 3vh ${col})` }}>{cleared ? "💥" : s.icon}</div>
      <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: "1.8vw", color: col, margin: "1.4vh 0 0.6vh", textDecoration: cleared ? "line-through" : "none" }}>{s.name}</div>
      <div style={{ transform: "skewX(-8deg)", height: "2.4vh", background: "#02040D", border: `2px solid ${col}55`, borderRadius: 4, overflow: "hidden", boxShadow: "inset 0 0 1.5vh #000" }}>
        <div style={{ height: "100%", width: `${Math.max(0, (s.pct || 0) * 100)}%`, background: cleared ? "transparent" : `linear-gradient(90deg, ${col}88, ${col})`, boxShadow: cleared ? "none" : `0 0 1.6vh ${col}`, transition: "width 1.1s cubic-bezier(.2,.8,.3,1)" }} />
      </div>
      <div style={{ fontSize: "1.1vw", marginTop: "1vh", color: cleared ? C.green : C.dim, fontWeight: cleared ? 800 : 400, fontFamily: "'Chakra Petch',sans-serif" }}>{cleared ? "CLEARED" : fmt(s.remaining) + " HP"}</div>
    </div>
  );
}

function BossScreen({ boss }) {
  const stages = boss.stages || [];
  const dealt = boss.dealt || 0;
  const target = boss.target || 1000000;
  const defeated = boss.defeated;
  const stageNo = Math.min((boss.stageIndex ?? 0) + 1, 3);
  const glow = defeated ? C.green : C.cyan;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "center" }}>
      <div style={{ textAlign: "center", marginBottom: "2.5vh" }}>
        <div style={{ fontSize: "1.3vw", fontWeight: 800, letterSpacing: "0.3em", color: C.gold, fontFamily: "'Chakra Petch',sans-serif" }}>◆ MONTHLY GAUNTLET · {boss.month || ""} · STAGE {defeated ? 3 : stageNo}/3</div>
        <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: "4vw", color: glow, textShadow: `0 0 3vh ${glow}`, textTransform: "uppercase", lineHeight: 1.05 }}>{boss.name || "Crystal Citadel"}</div>
      </div>

      {defeated && (
        <div style={{ alignSelf: "center", margin: "0 0 2vh", padding: "1vh 3vw", clipPath: CLIP_SM, background: `${C.gold}22`, border: `2px solid ${C.gold}`, fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: "2.2vw", color: C.gold, textShadow: `0 0 2vh ${C.gold}` }}>
          🏆 CRYSTAL SHATTERED — WEPROJECT CLEARS THE MONTH!
        </div>
      )}

      <div style={{ display: "flex", gap: "2.5vw", padding: "0 3vw", alignItems: "stretch" }}>
        {stages.map((s, i) => <TvStage key={i} s={s} />)}
      </div>

      <div style={{ textAlign: "center", marginTop: "3vh", fontSize: "1.4vw", color: C.dim }}>
        Total damage <b style={{ color: C.gold }}>RM {fmt(dealt)}</b> / {fmt(target)} &nbsp;·&nbsp; Today <b style={{ color: C.cyan }}>+{fmt(boss.todayDamage || 0)}</b>
      </div>
    </div>
  );
}

function TopDamageScreen({ rows, boss }) {
  const list = (rows || []).filter((p) => p.damage > 0);
  const mvp = list[0];
  const rest = list.slice(1, 6);
  const mvpImg = mvp && imgFor(mvp.heroClass, mvp.role);
  return (
    <div style={{ display: "flex", gap: "2.5vw", height: "100%" }}>
      {/* MVP big hero spotlight */}
      <div style={{ flex: 1.15, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 800, fontSize: "2.2vw", color: C.gold, textShadow: `0 0 18px ${C.gold}88`, marginBottom: "1.4vh" }}>⚔ TOP DAMAGE ON {(boss.name || "THE BOSS").toUpperCase()}</div>
        {mvp ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "2vw", clipPath: CLIP_SM, background: `linear-gradient(120deg, ${C.gold}18 0%, transparent 70%)`, border: `2px solid ${C.gold}88`, padding: "2vh 2vw", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: "-3vw", top: "-8vh", width: "26vw", height: "26vw", borderRadius: "50%", background: `radial-gradient(circle, ${C.gold}30, transparent 68%)`, pointerEvents: "none" }} />
            <div className="cpz" style={{ position: "relative", width: "22vh", height: "36vh", flexShrink: 0, color: C.gold }}>
              {mvpImg
                ? <img src={mvpImg} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", filter: `drop-shadow(0 0 3.5vh ${C.gold})` }} />
                : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: "16vh" }}>🦸</div>}
            </div>
            <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "1.4vw", color: C.gold, fontFamily: "'Chakra Petch',sans-serif", fontWeight: 800 }}>🥇 MVP</div>
              <div style={{ fontSize: "4.8vw", fontWeight: 900, fontFamily: "'Chakra Petch',sans-serif", lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{mvp.name}</div>
              <div style={{ fontSize: "1.2vw", color: C.dim, margin: "0.6vh 0 1.6vh" }}>{mvp.role} · Lv{mvp.level}</div>
              <div style={{ fontSize: "4.2vw", fontWeight: 900, color: C.gold, fontFamily: "'Chakra Petch',sans-serif", textShadow: `0 0 24px ${C.gold}`, lineHeight: 1 }}>{fmt(mvp.damage)}</div>
              <div style={{ fontSize: "1vw", color: C.dimmer, letterSpacing: "0.15em" }}>DAMAGE ON THE BOSS</div>
            </div>
          </div>
        ) : <div style={{ color: C.dim, fontSize: "1.6vw" }}>No damage yet.</div>}
      </div>

      {/* Runners-up list */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 800, fontSize: "1.8vw", color: C.cyan, marginBottom: "2vh" }}>CHALLENGERS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh" }}>
          {rest.length === 0 && <div style={{ color: C.dim, fontSize: "1.4vw" }}>Just the one hero so far.</div>}
          {rest.map((p, i) => (
            <div key={p.playerId} style={{ display: "flex", alignItems: "center", gap: "1.2vw", clipPath: CLIP_SM, background: C.panelSoft, border: `2px solid ${C.line}`, padding: "1.4vh 1.2vw", minWidth: 0 }}>
              <div style={{ fontSize: "1.8vw", fontWeight: 800, color: C.dim, fontFamily: "'Chakra Petch',sans-serif", width: "2.5vw", textAlign: "center" }}>{i + 2}</div>
              <HexImg heroClass={p.heroClass} role={p.role} col={C.cyan} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: "1.6vw", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                <div style={{ fontSize: "1vw", color: C.dim }}>{p.role}</div>
              </div>
              <div style={{ fontWeight: 900, fontSize: "1.8vw", color: C.gold, fontFamily: "'Chakra Petch',sans-serif" }}>{fmt(p.damage)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeedScreen({ feed }) {
  const rows = feed || [];
  return (
    <div style={{ height: "100%" }}>
      <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 800, fontSize: "2.2vw", color: C.gold, marginBottom: "2vh" }}>TODAY'S ACHIEVEMENTS · <span style={{ color: C.green }}>● LIVE</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.6vw", alignContent: "start" }}>
        {rows.length === 0 && <div style={{ color: C.dim, fontSize: "1.6vw" }}>No achievements yet today — go get First Blood! ⚔️</div>}
        {rows.slice(0, 8).map((f, i) => (
          <div key={i} className="fin" style={{ display: "flex", alignItems: "center", gap: "1.4vw", clipPath: CLIP_SM, background: C.panelSoft, border: `2px solid ${C.cyan}55`, padding: "1.6vh 1.4vw", animationDelay: `${i * 0.1}s` }}>
            <div style={{ fontSize: "2.8vw" }}>{f.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: C.gold, fontWeight: 800, fontSize: "1.1vw", fontFamily: "'Chakra Petch',sans-serif" }}>{f.tag}</div>
              <div style={{ fontSize: "1.5vw" }}><b>{f.name}</b> <span style={{ color: C.dim }}>· {f.description}</span></div>
            </div>
            {f.exp > 0 && <div style={{ color: C.cyan, fontWeight: 800, fontSize: "1.8vw", fontFamily: "'Chakra Petch',sans-serif" }}>+{f.exp}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function HexImg({ heroClass, role, col }) {
  const img = imgFor(heroClass, role);
  return (
    <div style={{ position: "relative", width: "4vw", height: "4vw", flexShrink: 0 }}>
      <div style={{ position: "absolute", inset: 0, clipPath: HEX, background: `radial-gradient(circle at 50% 30%, ${col}40, #060A1E 75%)`, overflow: "hidden" }}>
        {img && <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 12%" }} />}
      </div>
      <div style={{ position: "absolute", inset: 0, clipPath: HEX, boxShadow: `0 0 16px ${col}66` }} />
    </div>
  );
}

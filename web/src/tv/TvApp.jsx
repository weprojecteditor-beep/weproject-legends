import { useState, useEffect } from "react";
import { C, HEX, CLIP_SM, heroImg, fmt } from "../ml.jsx";
import { getTv } from "../api.js";
import { usePolling } from "../hooks.js";
import { Loading } from "../ui.jsx";

const DATA_MS = 30000;
const SCREEN_MS = 12000;
const SCREENS = 3;

const imgFor = (p) => heroImg(p.heroClass, p.role, p.gender, p.level);

// scattered twinkle positions (left%, top%, size-vw, delay-s)
const SPARKS = [
  [6, 16, 1.3, 0], [18, 68, 0.9, 0.6], [30, 30, 1.1, 1.2], [44, 82, 1.4, 0.3],
  [58, 20, 1.0, 0.9], [70, 58, 1.3, 1.5], [82, 30, 0.9, 0.4], [92, 72, 1.2, 1.0],
  [12, 44, 1.0, 1.8], [50, 52, 1.2, 2.1], [64, 88, 0.9, 0.7], [86, 12, 1.1, 1.4],
  [24, 90, 1.0, 2.4], [38, 10, 1.2, 0.2], [76, 46, 1.0, 1.1], [96, 40, 0.9, 1.9],
];

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
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", color: C.text, fontFamily: "'Inter',sans-serif", boxSizing: "border-box", padding: "3vh 3vw", position: "relative",
      background: `radial-gradient(ellipse 60% 50% at 50% 0%, #16204E 0%, transparent 60%), radial-gradient(ellipse 80% 60% at 50% 110%, ${C.gold}12 0%, transparent 55%), ${C.bg}` }}>
      <style>{`
        @keyframes cpz {0%,100%{transform:scale(1);filter:drop-shadow(0 0 12px currentColor);}50%{transform:scale(1.13);filter:drop-shadow(0 0 30px currentColor);}}
        .cpz{animation:cpz 1.6s ease-in-out infinite;}
        @keyframes bossbob {0%,100%{transform:translateY(0) scale(1);}50%{transform:translateY(-1.6vh) scale(1.06);}}
        .bossbob{animation:bossbob 2.6s ease-in-out infinite;}
        @keyframes fin{from{opacity:0;transform:translateX(2vw) scale(.96);}to{opacity:1;transform:none;}}
        .fin{animation:fin .55s cubic-bezier(.2,.9,.3,1.2) both;}
        @keyframes twinkle{0%,100%{opacity:.15;transform:scale(.7);}50%{opacity:1;transform:scale(1.25);}}
        .tw{animation:twinkle 2.6s ease-in-out infinite;}
        @keyframes rays{to{transform:rotate(360deg);}}
        .rays{animation:rays 40s linear infinite;}
        @keyframes shimmer{to{background-position:200% center;}}
        .shine{background:linear-gradient(100deg,#FFE79A 0%,#F5C542 22%,#FFFDF0 42%,#F5C542 62%,#FFE79A 100%);background-size:200% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;animation:shimmer 3.2s linear infinite;}
        @keyframes sweep{0%{left:-25%;}55%,100%{left:125%;}}
        .sweep{position:absolute;top:0;bottom:0;width:14%;transform:skewX(-18deg);background:linear-gradient(100deg,transparent,#FFFFFF26,transparent);animation:sweep 3.6s ease-in-out infinite;pointer-events:none;}
        @keyframes glowText{0%,100%{filter:drop-shadow(0 0 1.4vh currentColor);}50%{filter:drop-shadow(0 0 3.4vh currentColor);}}
        .glowText{animation:glowText 2.4s ease-in-out infinite;}
        @media (prefers-reduced-motion: reduce){.cpz,.bossbob,.tw,.rays,.shine,.sweep,.glowText{animation:none!important;}}
      `}</style>

      {/* rotating rays */}
      <div className="rays" style={{ position: "absolute", inset: "-30% -10%", opacity: 0.16, pointerEvents: "none",
        background: `conic-gradient(from 0deg at 50% 45%, transparent 0deg, ${C.gold}22 5deg, transparent 12deg, transparent 26deg, ${C.cyan}18 32deg, transparent 40deg, transparent 60deg, ${C.gold}18 66deg, transparent 74deg)` }} />
      {/* twinkling sparkles */}
      {SPARKS.map((s, i) => (
        <div key={i} className="tw" style={{ position: "absolute", left: `${s[0]}%`, top: `${s[1]}%`, fontSize: `${s[2]}vw`, color: C.goldHi,
          filter: `drop-shadow(0 0 0.8vw ${C.gold})`, animationDelay: `${s[3]}s`, pointerEvents: "none", zIndex: 0 }}>✦</div>
      ))}

      <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2vh" }}>
          <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: "3.4vw", letterSpacing: "0.05em", lineHeight: 1 }}>
            WEPROJECT <span className="shine">LEGENDS</span>
          </div>
          <div style={{ color: C.green, fontWeight: 900, fontSize: "1.7vw", fontFamily: "'Chakra Petch',sans-serif", textShadow: `0 0 1.4vh ${C.green}` }}>● LIVE</div>
        </div>

        <div style={{ flex: 1, minHeight: 0 }}>
          {screen === 0 && <BossScreen boss={d.boss || {}} />}
          {screen === 1 && <TopDamageScreen rows={d.topDamage} boss={d.boss || {}} />}
          {screen === 2 && <FeedScreen feed={d.feed} />}
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "1.4vw", paddingTop: "1.2vh" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: "1.3vw", height: "1.3vw", borderRadius: "50%", background: i === screen ? C.gold : C.line,
              boxShadow: i === screen ? `0 0 1.4vh ${C.gold}` : "none", transition: "all .3s" }} />
          ))}
        </div>
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
    <div style={{ flex: s.isCrystal ? 1.35 : 1, clipPath: CLIP_SM, padding: "3.4vh 1.4vw 2.8vh", textAlign: "center", position: "relative", overflow: "hidden",
      background: cleared ? "#08160F" : active ? `${accent}18` : C.panelSoft,
      border: `3px solid ${cleared ? C.green + "77" : active ? accent : C.line}`, opacity: cleared ? 0.92 : active ? 1 : 0.5,
      boxShadow: active ? `0 0 3vh ${accent}44, inset 0 0 3vh ${accent}12` : "none" }}>
      {active && <div className="sweep" />}
      <div className={s.isCrystal && !cleared ? "cpz" : ""} style={{ fontSize: s.isCrystal ? "15vh" : "11vh", lineHeight: 1, color: col,
        filter: cleared ? "grayscale(1)" : `drop-shadow(0 0 3.4vh ${col})` }}>{cleared ? "💥" : s.icon}</div>
      <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: "2.6vw", color: col, margin: "1.6vh 0 0.8vh", letterSpacing: "0.03em",
        textShadow: cleared ? "none" : `0 0 1.6vh ${col}88`, textDecoration: cleared ? "line-through" : "none" }}>{s.name}</div>
      <div style={{ transform: "skewX(-8deg)", height: "3.2vh", background: "#02040D", border: `2px solid ${col}66`, borderRadius: 5, overflow: "hidden", boxShadow: "inset 0 0 2vh #000" }}>
        <div style={{ height: "100%", width: `${Math.max(0, (s.pct || 0) * 100)}%`, background: cleared ? "transparent" : `linear-gradient(90deg, ${col}88, ${col})`, boxShadow: cleared ? "none" : `0 0 2vh ${col}`, transition: "width 1.1s cubic-bezier(.2,.8,.3,1)" }} />
      </div>
      <div style={{ fontSize: "1.7vw", marginTop: "1.2vh", color: cleared ? C.green : C.dim, fontWeight: cleared ? 900 : 700, fontFamily: "'Chakra Petch',sans-serif" }}>{cleared ? "CLEARED" : fmt(s.remaining) + " HP"}</div>
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
      <div style={{ textAlign: "center", marginBottom: "3vh" }}>
        <div className="shine" style={{ fontSize: "1.8vw", fontWeight: 900, letterSpacing: "0.28em", fontFamily: "'Chakra Petch',sans-serif" }}>◆ MONTHLY GAUNTLET · {boss.month || ""} · STAGE {defeated ? 3 : stageNo}/3</div>
        <div className="glowText" style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: "5.6vw", color: glow, textShadow: `0 0 3.5vh ${glow}`, textTransform: "uppercase", lineHeight: 1.02, marginTop: "0.6vh" }}>{boss.name || "Crystal Citadel"}</div>
      </div>

      {defeated && (
        <div style={{ alignSelf: "center", margin: "0 0 2.5vh", padding: "1.2vh 3.5vw", clipPath: CLIP_SM, background: `${C.gold}22`, border: `3px solid ${C.gold}`, fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: "3vw", color: C.gold, textShadow: `0 0 2.5vh ${C.gold}`, position: "relative", overflow: "hidden" }}>
          <div className="sweep" />🏆 CRYSTAL SHATTERED — WEPROJECT CLEARS THE MONTH!
        </div>
      )}

      <div style={{ display: "flex", gap: "2.5vw", padding: "0 2vw", alignItems: "stretch" }}>
        {stages.map((s, i) => <TvStage key={i} s={s} />)}
      </div>

      <div style={{ textAlign: "center", marginTop: "3.4vh", fontSize: "2vw", color: C.dim, fontFamily: "'Chakra Petch',sans-serif" }}>
        Total damage <b style={{ color: C.gold, textShadow: `0 0 1.4vh ${C.gold}88` }}>RM {fmt(dealt)}</b> / {fmt(target)} &nbsp;·&nbsp; Today <b style={{ color: C.cyan, textShadow: `0 0 1.4vh ${C.cyan}88` }}>+{fmt(boss.todayDamage || 0)}</b>
      </div>
    </div>
  );
}

function TopDamageScreen({ rows, boss }) {
  const list = (rows || []).filter((p) => p.damage > 0);
  const mvp = list[0];
  const rest = list.slice(1, 6);
  const mvpImg = mvp && imgFor(mvp);
  return (
    <div style={{ display: "flex", gap: "2.5vw", height: "100%" }}>
      {/* MVP big hero spotlight */}
      <div style={{ flex: 1.15, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div className="shine" style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: "2.8vw", marginBottom: "1.6vh", letterSpacing: "0.03em" }}>⚔ TOP DAMAGE</div>
        {mvp ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "2vw", clipPath: CLIP_SM, background: `linear-gradient(120deg, ${C.gold}20 0%, transparent 70%)`, border: `3px solid ${C.gold}`, padding: "2vh 2vw", position: "relative", overflow: "hidden", boxShadow: `0 0 4vh ${C.gold}33, inset 0 0 4vh ${C.gold}10` }}>
            <div className="sweep" />
            <div style={{ position: "absolute", left: "-3vw", top: "-8vh", width: "28vw", height: "28vw", borderRadius: "50%", background: `radial-gradient(circle, ${C.gold}38, transparent 68%)`, pointerEvents: "none" }} />
            <div className="cpz" style={{ position: "relative", width: "24vh", height: "40vh", flexShrink: 0, color: C.gold }}>
              {mvpImg
                ? <img src={mvpImg} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", filter: `drop-shadow(0 0 4vh ${C.gold})` }} />
                : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: "18vh" }}>🦸</div>}
            </div>
            <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "1.8vw", color: C.gold, fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, textShadow: `0 0 1.4vh ${C.gold}` }}>🥇 MVP</div>
              <div style={{ fontSize: "6vw", fontWeight: 900, fontFamily: "'Chakra Petch',sans-serif", lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textShadow: "0 0 2vh #000" }}>{mvp.name}</div>
              <div style={{ fontSize: "1.6vw", color: C.dim, margin: "0.8vh 0 1.8vh" }}>{mvp.role} · Lv{mvp.level}</div>
              <div className="shine" style={{ fontSize: "6vw", fontWeight: 900, fontFamily: "'Chakra Petch',sans-serif", lineHeight: 1, filter: `drop-shadow(0 0 2.4vh ${C.gold})` }}>{fmt(mvp.damage)}</div>
              <div style={{ fontSize: "1.4vw", color: C.dimmer, letterSpacing: "0.18em", marginTop: "0.4vh" }}>DAMAGE ON THE BOSS</div>
            </div>
          </div>
        ) : <div style={{ color: C.dim, fontSize: "2vw" }}>No damage yet.</div>}
      </div>

      {/* Runners-up list */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: "2.3vw", color: C.cyan, marginBottom: "2vh", textShadow: `0 0 1.4vh ${C.cyan}66` }}>CHALLENGERS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.4vh" }}>
          {rest.length === 0 && <div style={{ color: C.dim, fontSize: "1.8vw" }}>Just the one hero so far.</div>}
          {rest.map((p, i) => (
            <div key={p.playerId} style={{ display: "flex", alignItems: "center", gap: "1.4vw", clipPath: CLIP_SM, background: C.panelSoft, border: `2px solid ${C.line}`, padding: "1.6vh 1.4vw", minWidth: 0 }}>
              <div style={{ fontSize: "2.4vw", fontWeight: 900, color: C.gold, fontFamily: "'Chakra Petch',sans-serif", width: "3vw", textAlign: "center", textShadow: `0 0 1vh ${C.gold}66` }}>{i + 2}</div>
              <HexImg p={p} col={C.cyan} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: "2.1vw", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                <div style={{ fontSize: "1.3vw", color: C.dim }}>{p.role}</div>
              </div>
              <div style={{ fontWeight: 900, fontSize: "2.3vw", color: C.gold, fontFamily: "'Chakra Petch',sans-serif", textShadow: `0 0 1.2vh ${C.gold}66` }}>{fmt(p.damage)}</div>
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
      <div className="shine" style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: "2.8vw", marginBottom: "2.2vh", letterSpacing: "0.03em" }}>TODAY'S ACHIEVEMENTS</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.8vw", alignContent: "start" }}>
        {rows.length === 0 && <div style={{ color: C.dim, fontSize: "2vw" }}>No achievements yet today — go get First Blood! ⚔️</div>}
        {rows.slice(0, 8).map((f, i) => (
          <div key={i} className="fin" style={{ display: "flex", alignItems: "center", gap: "1.4vw", clipPath: CLIP_SM, background: `linear-gradient(100deg, ${C.cyan}12, ${C.panelSoft} 45%)`, border: `2px solid ${C.cyan}66`, padding: "1.9vh 1.5vw", animationDelay: `${i * 0.1}s`, boxShadow: `0 0 1.6vh ${C.cyan}18` }}>
            <div style={{ fontSize: "3.6vw", filter: `drop-shadow(0 0 1.4vh ${C.cyan}55)` }}>{f.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: C.gold, fontWeight: 900, fontSize: "1.5vw", fontFamily: "'Chakra Petch',sans-serif", letterSpacing: "0.06em", textShadow: `0 0 1vh ${C.gold}66` }}>{f.commander ? "⚔ COMMANDER" : f.tag}</div>
              <div style={{ fontSize: "2vw" }}><b style={{ color: f.commander ? C.gold : C.text }}>{f.name}</b> <span style={{ color: C.dim, fontSize: "1.5vw" }}>· {f.description}</span></div>
            </div>
            {f.exp > 0 && <div style={{ color: C.cyan, fontWeight: 900, fontSize: "2.4vw", fontFamily: "'Chakra Petch',sans-serif", textShadow: `0 0 1.4vh ${C.cyan}` }}>+{f.exp}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function HexImg({ p, col }) {
  const img = imgFor(p);
  return (
    <div style={{ position: "relative", width: "5vw", height: "5vw", flexShrink: 0 }}>
      <div style={{ position: "absolute", inset: 0, clipPath: HEX, background: `radial-gradient(circle at 50% 30%, ${col}40, #060A1E 75%)`, overflow: "hidden" }}>
        {img && <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 12%" }} />}
      </div>
      <div style={{ position: "absolute", inset: 0, clipPath: HEX, boxShadow: `0 0 1.6vh ${col}88` }} />
    </div>
  );
}

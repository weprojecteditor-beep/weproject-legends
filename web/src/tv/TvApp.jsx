import { useState, useEffect } from "react";
import { C, GOLD_GRAD, HEX, CLIP_SM, RANKS, HERO_IMG, CLASS_COLOR, ROLE_DEFAULT_CLASS, fmt } from "../ml.jsx";
import { getTv } from "../api.js";
import { usePolling } from "../hooks.js";
import { Loading } from "../ui.jsx";

const DATA_MS = 30000;
const SCREEN_MS = 12000;
const SCREENS = 4;

const segRemain = (dealt, segs) => {
  let d = dealt; const out = [];
  for (const s of segs) { out.push(Math.max(0, s - d)); d = Math.max(0, d - s); }
  return out;
};
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
        @keyframes fin{from{opacity:0;transform:translateX(2vw);}to{opacity:1;transform:none;}}
        .fin{animation:fin .5s ease both;}
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2vh" }}>
        <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 800, fontSize: "2.4vw", letterSpacing: "0.06em" }}>
          WEPROJECT <span style={{ color: C.gold }}>LEGENDS</span>
        </div>
        <div style={{ color: C.green, fontWeight: 800, fontSize: "1.1vw" }}>● LIVE · CRYSTAL WAR</div>
      </div>

      <div style={{ height: "84vh" }}>
        {screen === 0 && <CrystalScreen cw={d.crystalWar || {}} />}
        {screen === 1 && <FactionScreen team="weproject" label="WE PROJECT" col={C.cyan} f={d.factions?.weproject} />}
        {screen === 2 && <FactionScreen team="wellous" label="WELLOUS" col={C.enemy} f={d.factions?.wellous} />}
        {screen === 3 && <FeedScreen feed={d.mixedFeed} />}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: "1.2vw", position: "absolute", bottom: "1.6vh", left: 0, right: 0 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ width: "1vw", height: "1vw", borderRadius: "50%", background: i === screen ? C.gold : C.line, transition: "background .3s" }} />
        ))}
      </div>
    </div>
  );
}

function TvBase({ label, col, dealtOnThem, segs }) {
  const rem = segRemain(dealtOnThem, segs);
  const names = ["TOWER I", "TOWER II", "CRYSTAL"];
  const icons = ["🗼", "🗼", "💎"];
  return (
    <div style={{ flex: 1 }}>
      <div style={{ textAlign: "center", fontFamily: "'Chakra Petch',sans-serif", fontWeight: 800, fontSize: "2vw", color: col, textShadow: `0 0 16px ${col}88`, marginBottom: "2vh" }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.6vh" }}>
        {segs.map((full, i) => {
          const left = rem[i]; const down = left === 0;
          const pct = full > 0 ? (left / full) * 100 : 0;
          const isCrystal = i === 2;
          return (
            <div key={i} style={{ clipPath: CLIP_SM, padding: "1.4vh 1.2vw", background: down ? "#0A0D22" : `${col}10`, border: `2px solid ${down ? C.line : col + "77"}`, opacity: down ? 0.5 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.8vh" }}>
                <span className={isCrystal && !down ? "cpz" : ""} style={{ fontSize: isCrystal ? "2.6vw" : "1.8vw", color: col, filter: down ? "grayscale(1)" : `drop-shadow(0 0 12px ${col})` }}>{down ? "💥" : icons[i]}</span>
                <span style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 800, fontSize: "1vw", color: down ? C.dimmer : col, textDecoration: down ? "line-through" : "none" }}>{down ? "DESTROYED" : names[i]}</span>
                <span style={{ fontSize: "1vw", color: C.dim }}>{down ? "" : fmt(left) + " HP"}</span>
              </div>
              <div style={{ transform: "skewX(-12deg)", height: "1.4vh", background: "#02040D", border: `1px solid ${col}44`, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: down ? "transparent" : `linear-gradient(90deg, ${col}88, ${col})`, boxShadow: down ? "none" : `0 0 14px ${col}`, transition: "width 1s ease" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CrystalScreen({ cw }) {
  const segs = cw.segs && cw.segs.length ? cw.segs : [300000, 300000, 400000];
  const wpBaseRem = segRemain(cw.dealtByWl || 0, segs).reduce((a, b) => a + b, 0); // WP base drained by WL
  const wlBaseRem = segRemain(cw.dealtByWp || 0, segs).reduce((a, b) => a + b, 0);
  const wpWinning = wlBaseRem < wpBaseRem;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "3vw", marginBottom: "3vh" }}>
        <div style={{ color: C.cyan, fontFamily: "'Chakra Petch',sans-serif", fontWeight: 800, fontSize: "2.6vw", textShadow: `0 0 18px ${C.cyan}` }}>{wpWinning ? "▲ LEADING" : ""}</div>
        <div style={{ width: "5vw", height: "5vw", transform: "rotate(45deg)", background: GOLD_GRAD, padding: 2, boxShadow: `0 0 40px ${C.gold}` }}>
          <div style={{ width: "100%", height: "100%", background: "#0A0F28", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ transform: "rotate(-45deg)", fontFamily: "'Chakra Petch',sans-serif", fontWeight: 800, fontSize: "2.4vw", color: C.goldHi }}>VS</span>
          </div>
        </div>
        <div style={{ color: C.enemy, fontFamily: "'Chakra Petch',sans-serif", fontWeight: 800, fontSize: "2.6vw", textShadow: `0 0 18px ${C.enemy}` }}>{!wpWinning ? "LEADING ▼" : ""}</div>
      </div>
      <div style={{ display: "flex", gap: "4vw", padding: "0 2vw" }}>
        <TvBase label="WE PROJECT BASE" col={C.cyan} dealtOnThem={cw.dealtByWl || 0} segs={segs} />
        <TvBase label="WELLOUS BASE" col={C.enemy} dealtOnThem={cw.dealtByWp || 0} segs={segs} />
      </div>
      <div style={{ textAlign: "center", marginTop: "3vh", fontSize: "1.2vw", color: C.dim }}>
        Today — <b style={{ color: C.cyan }}>WeProject {fmt(cw.wpToday || 0)}</b> · <b style={{ color: C.enemy }}>Wellous {fmt(cw.wlToday || 0)}</b> damage dealt
      </div>
    </div>
  );
}

function FactionScreen({ label, col, f }) {
  const top3 = (f && f.top3Damage) || [];
  const feed = (f && f.feed) || [];
  return (
    <div style={{ display: "flex", gap: "3vw", height: "100%" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 800, fontSize: "2.4vw", color: col, textShadow: `0 0 18px ${col}88`, marginBottom: "2vh" }}>💎 {label} · TOP DAMAGE</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.6vh" }}>
          {top3.length === 0 && <div style={{ color: C.dim, fontSize: "1.4vw" }}>No damage yet.</div>}
          {top3.map((p, i) => (
            <div key={p.playerId} style={{ display: "flex", alignItems: "center", gap: "1.4vw", clipPath: CLIP_SM, background: `${col}10`, border: `2px solid ${i === 0 ? col + "88" : C.line}`, padding: "1.4vh 1.4vw" }}>
              <div style={{ fontSize: "2.2vw", fontWeight: 800, color: i === 0 ? C.gold : C.text, fontFamily: "'Chakra Petch',sans-serif", width: "3vw", textAlign: "center" }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</div>
              <HexImg heroClass={p.heroClass} role={p.role} col={col} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: "2vw" }}>{p.name}</div>
                <div style={{ fontSize: "1vw", color: C.dim }}>{p.role}</div>
              </div>
              <div style={{ fontWeight: 800, fontSize: "2vw", color: i === 0 ? C.gold : C.text, fontFamily: "'Chakra Petch',sans-serif" }}>{fmt(p.damage)}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 800, fontSize: "1.8vw", color: C.gold, marginBottom: "2vh" }}>TODAY'S ACHIEVEMENTS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh" }}>
          {feed.length === 0 && <div style={{ color: C.dim, fontSize: "1.4vw" }}>Nothing yet today.</div>}
          {feed.slice(0, 6).map((fi, i) => (
            <div key={i} className="fin" style={{ display: "flex", alignItems: "center", gap: "1.2vw", clipPath: CLIP_SM, background: C.panelSoft, border: `2px solid ${C.line}`, padding: "1.2vh 1.2vw", animationDelay: `${i * 0.08}s` }}>
              <div style={{ fontSize: "2.2vw" }}>{fi.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.gold, fontWeight: 800, fontSize: "1vw", fontFamily: "'Chakra Petch',sans-serif" }}>{fi.tag}</div>
                <div style={{ fontSize: "1.3vw" }}><b>{fi.name}</b> <span style={{ color: C.dim }}>· {fi.description}</span></div>
              </div>
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
        {rows.slice(0, 8).map((f, i) => {
          const teamCol = f.team === "wellous" ? C.enemy : C.cyan;
          return (
            <div key={i} className="fin" style={{ display: "flex", alignItems: "center", gap: "1.4vw", clipPath: CLIP_SM, background: C.panelSoft, border: `2px solid ${teamCol}55`, padding: "1.6vh 1.4vw", animationDelay: `${i * 0.1}s` }}>
              <div style={{ fontSize: "2.8vw" }}>{f.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.gold, fontWeight: 800, fontSize: "1.1vw", fontFamily: "'Chakra Petch',sans-serif" }}>{f.tag} <span style={{ color: teamCol }}>💎</span></div>
                <div style={{ fontSize: "1.5vw" }}><b>{f.name}</b> <span style={{ color: C.dim }}>· {f.description}</span></div>
              </div>
              {f.exp > 0 && <div style={{ color: C.cyan, fontWeight: 800, fontSize: "1.8vw", fontFamily: "'Chakra Petch',sans-serif" }}>+{f.exp}</div>}
            </div>
          );
        })}
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

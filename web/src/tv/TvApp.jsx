import { useState, useEffect, useRef } from "react";
import { C, TEAM_COLORS, fmt, medal, ropePercent, timeUntil } from "../theme.js";
import { getTv } from "../api.js";
import { usePolling } from "../hooks.js";
import { Loading } from "../ui.jsx";

const DATA_REFRESH_MS = 30000; // pull data every 30s
const SCREEN_MS = 12000; // rotate screen every 12s (SPEC: 4 screens x 12s)
const SCREENS = 4;
const INTERRUPT_MS = 3000;

export default function TvApp() {
  const state = usePolling(getTv, DATA_REFRESH_MS);
  const [screen, setScreen] = useState(0);
  const [interrupt, setInterrupt] = useState(null);
  const prevRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setScreen((s) => (s + 1) % SCREENS), SCREEN_MS);
    return () => clearInterval(t);
  }, []);

  // Detect Crystal War events (tower destroyed / lord slain / victory) between polls.
  useEffect(() => {
    const cur = state.data?.crystalWar;
    const prev = prevRef.current;
    if (cur && prev) {
      if (cur.crystalBroken !== "none" && prev.crystalBroken === "none") {
        fireInterrupt(`VICTORY — ${cur.crystalBroken.toUpperCase()} WINS`);
      } else if (cur.wpTowers > prev.wpTowers || cur.wlTowers > prev.wlTowers) {
        fireInterrupt("TOWER DESTROYED");
      } else if (cur.lord?.side !== "none" && cur.lord?.date !== prev.lord?.date) {
        fireInterrupt(`LORD HAS BEEN SLAIN — ${cur.lord.side.toUpperCase()} DMG ×2`);
      }
    }
    if (cur) prevRef.current = cur;
  }, [state.data]);

  function fireInterrupt(text) {
    setInterrupt(text);
    setTimeout(() => setInterrupt(null), INTERRUPT_MS);
  }

  if (!state.data && !state.error) return <Loading label="Summoning heroes…" />;
  if (!state.data) return <Loading label="Data sync failed — retrying…" />;

  const data = state.data;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: C.bg,
        color: C.text,
        fontFamily: "'Inter', sans-serif",
        position: "relative",
        boxSizing: "border-box",
        padding: "3vh 3vw",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: "2vh" }}>
        <div>
          <div style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: "2.4vw", fontWeight: 700, letterSpacing: "0.06em" }}>
            WEPROJECT <span style={{ color: C.gold }}>LEGENDS</span>
          </div>
          <div style={{ color: C.dim, fontSize: "1vw" }}>Crystal War · Week {data.crystalWar.weekNo}</div>
        </div>
        <div className="flex items-center gap-4">
          {state.error && <div style={{ color: C.hp, fontSize: "1vw" }}>⚠ Data sync failed</div>}
          <div style={{ color: C.green, fontSize: "1.1vw", fontWeight: 700 }}>● LIVE</div>
        </div>
      </div>

      <div style={{ height: "82vh" }}>
        {screen === 0 && <CrystalWarScreen cw={data.crystalWar} factions={data.factions} />}
        {screen === 1 && <FactionScreen team="weproject" faction={data.factions.weproject} />}
        {screen === 2 && <FactionScreen team="wellous" faction={data.factions.wellous} />}
        {screen === 3 && <MixedFeedScreen feed={data.mixedFeed} />}
      </div>

      <div className="flex justify-center gap-3" style={{ position: "absolute", bottom: "1.5vh", left: 0, right: 0 }}>
        {Array.from({ length: SCREENS }).map((_, i) => (
          <div key={i} style={{ width: "1vw", height: "1vw", borderRadius: "50%", background: i === screen ? C.gold : C.line, transition: "background 0.3s" }} />
        ))}
      </div>

      {interrupt && <Interrupt text={interrupt} />}
    </div>
  );
}

function Interrupt({ text }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(10,13,28,0.92)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
        animation: "toastIn .25s ease both",
      }}
    >
      <div
        style={{
          fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: "5vw",
          color: C.gold, textAlign: "center", textShadow: `0 0 40px ${C.gold}AA`, letterSpacing: "0.05em",
        }}
      >
        {text}
      </div>
    </div>
  );
}

function CrystalWarScreen({ cw, factions }) {
  const rope = ropePercent(cw.liveNet);
  const wpDanger = (cw.wlTowers / cw.towersPerSide) * 100;
  const wlDanger = (cw.wpTowers / cw.towersPerSide) * 100;
  const wpDmgToday = (factions.weproject.top3Damage || []).reduce((s, p) => s + p.damage, 0);
  const wlDmgToday = (factions.wellous.top3Damage || []).reduce((s, p) => s + p.damage, 0);

  return (
    <div className="flex flex-col justify-center h-full">
      <div style={{ color: C.dim, fontSize: "1.4vw", letterSpacing: "0.2em", fontFamily: "'Chakra Petch', sans-serif", textAlign: "center", marginBottom: "2vh" }}>
        Banks Sunday 23:59 · {timeUntil(cw.lockAt)} left
      </div>

      <div className="flex items-center justify-center gap-12" style={{ marginBottom: "3vh" }}>
        <BigCrystal team="weproject" dangerPct={wpDanger} />
        <div style={{ fontSize: "4vw", fontWeight: 700, color: C.gold, fontFamily: "'Chakra Petch', sans-serif" }}>VS</div>
        <BigCrystal team="wellous" dangerPct={wlDanger} />
      </div>

      <div className="flex items-center justify-center gap-8" style={{ marginBottom: "2vh" }}>
        <BigTowers destroyed={cw.wlTowers} total={cw.towersPerSide} color={TEAM_COLORS.weproject} />
        <BigTowers destroyed={cw.wpTowers} total={cw.towersPerSide} color={TEAM_COLORS.wellous} />
      </div>

      <div className="relative w-full rounded-full overflow-hidden" style={{ height: "5vh", background: "#070A16", border: `2px solid ${C.line}`, margin: "0 auto", maxWidth: "60vw" }}>
        <div className="absolute top-0 h-full" style={{ left: "50%", width: 3, background: C.line }} />
        <div
          className="absolute top-0 h-full rounded-full"
          style={{
            width: "3vh", left: `calc(${rope}% - 1.5vh)`,
            background: cw.liveNet >= 0 ? TEAM_COLORS.weproject : TEAM_COLORS.wellous,
            boxShadow: `0 0 20px ${cw.liveNet >= 0 ? TEAM_COLORS.weproject : TEAM_COLORS.wellous}AA`,
            transition: "left 1s ease",
          }}
        />
      </div>
      <div className="flex justify-center gap-16 mt-3" style={{ fontSize: "1.6vw", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700 }}>
        <span style={{ color: TEAM_COLORS.weproject }}>WEPROJECT {fmt(wpDmgToday)}</span>
        <span style={{ color: TEAM_COLORS.wellous }}>WELLOUS {fmt(wlDmgToday)}</span>
      </div>
    </div>
  );
}

function BigCrystal({ team, dangerPct }) {
  const col = TEAM_COLORS[team];
  const intensity = 0.35 + (dangerPct / 100) * 0.65;
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="crystal-glow"
        style={{
          width: "9vw", height: "9vw", borderRadius: "1.5vw", transform: "rotate(45deg)",
          background: `linear-gradient(160deg, ${col}33, ${col}99)`,
          border: `3px solid ${col}`,
          boxShadow: `0 0 ${20 + intensity * 40}px ${col}${dangerPct >= 66 ? "DD" : "88"}`,
          animation: dangerPct >= 66 ? "crystalPulse 1s ease-in-out infinite" : "none",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <span style={{ transform: "rotate(-45deg)", fontSize: "3vw" }}>💎</span>
      </div>
      <div style={{ color: col, fontWeight: 700, fontSize: "1.4vw", fontFamily: "'Chakra Petch', sans-serif" }}>
        {team === "weproject" ? "WEPROJECT" : "WELLOUS"}
      </div>
    </div>
  );
}

function BigTowers({ destroyed, total, color }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} style={{ fontSize: "2vw", opacity: i < destroyed ? 0.2 : 1 }}>{i < destroyed ? "💥" : "🗼"}</span>
      ))}
      <span style={{ color, fontSize: "1.1vw", marginLeft: "0.5vw" }}>{total - destroyed}/{total}</span>
    </div>
  );
}

function FactionScreen({ team, faction }) {
  const col = TEAM_COLORS[team];
  const top3 = faction.top3Damage || [];
  const feed = faction.feed || [];
  return (
    <div className="grid grid-cols-2 gap-6 h-full">
      <div className="flex flex-col">
        <div style={{ color: col, fontSize: "1.8vw", fontWeight: 700, letterSpacing: "0.15em", fontFamily: "'Chakra Petch', sans-serif", marginBottom: "2vh" }}>
          {team === "weproject" ? "WEPROJECT" : "WELLOUS"} · TOP DAMAGE
        </div>
        <div className="flex flex-col gap-3">
          {top3.length === 0 && <Empty text="No damage yet" />}
          {top3.map((p, i) => (
            <div key={p.playerId} className="rounded-2xl flex items-center gap-4" style={{ padding: "1.6vh 1.2vw", background: C.panelSoft, border: `2px solid ${i === 0 ? col + "88" : C.line}` }}>
              <div style={{ width: "2.5vw", textAlign: "center", fontSize: "2vw", fontWeight: 700, color: i === 0 ? col : C.text, fontFamily: "'Chakra Petch', sans-serif" }}>{medal(i)}</div>
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: "1.8vw", fontWeight: 700 }}>{p.name}</div>
                <div style={{ color: C.dim, fontSize: "1vw" }}>{p.role}</div>
              </div>
              <div style={{ fontSize: "1.9vw", fontWeight: 700, color: col, fontFamily: "'Chakra Petch', sans-serif" }}>{fmt(p.damage)}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col">
        <div style={{ color: C.dim, fontSize: "1.6vw", letterSpacing: "0.2em", fontFamily: "'Chakra Petch', sans-serif", marginBottom: "2vh" }}>
          TODAY'S ACHIEVEMENTS
        </div>
        <div className="flex flex-col gap-3 flex-1" style={{ overflow: "hidden" }}>
          {feed.length === 0 && <Empty text="No achievements yet today" />}
          {feed.slice(0, 5).map((f, i) => (
            <div key={i} className="feed-item flex items-center gap-4 rounded-2xl" style={{ padding: "1.4vh 1.2vw", background: C.panelSoft, border: `2px solid ${C.line}` }}>
              <div style={{ fontSize: "2.2vw" }}>{f.icon}</div>
              <div className="flex-1 min-w-0">
                <div style={{ color: C.gold, fontSize: "1.1vw", fontWeight: 700, fontFamily: "'Chakra Petch', sans-serif" }}>{f.tag}</div>
                <div style={{ fontSize: "1.3vw" }}>
                  <span style={{ fontWeight: 700 }}>{f.name}</span>
                  <span style={{ color: C.dim }}> · {f.description}</span>
                </div>
              </div>
              <div style={{ color: C.exp, fontSize: "1.6vw", fontWeight: 700, fontFamily: "'Chakra Petch', sans-serif" }}>+{f.exp}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MixedFeedScreen({ feed }) {
  const rows = feed || [];
  return (
    <div className="flex flex-col h-full">
      <div style={{ color: C.dim, fontSize: "1.6vw", letterSpacing: "0.2em", fontFamily: "'Chakra Petch', sans-serif", marginBottom: "1.5vh" }}>
        TODAY'S ACHIEVEMENTS <span style={{ color: C.green }}>● LIVE</span>
      </div>
      <div className="grid grid-cols-2 gap-4 flex-1 content-start" style={{ overflow: "hidden" }}>
        {rows.length === 0 && <Empty text="No achievements yet today — go get First Blood! ⚔️" />}
        {rows.slice(0, 8).map((f, i) => {
          const col = TEAM_COLORS[f.team] || C.dim;
          return (
            <div key={i} className="feed-item flex items-center gap-4 rounded-2xl" style={{ padding: "1.6vh 1.2vw", background: C.panelSoft, border: `2px solid ${col}55` }}>
              <div style={{ fontSize: "2.4vw" }}>💎</div>
              <div style={{ fontSize: "2.6vw" }}>{f.icon}</div>
              <div className="flex-1 min-w-0">
                <div style={{ color: C.gold, fontSize: "1.2vw", fontWeight: 700, letterSpacing: "0.1em", fontFamily: "'Chakra Petch', sans-serif" }}>{f.tag}</div>
                <div style={{ fontSize: "1.5vw" }}>
                  <span style={{ fontWeight: 700 }}>{f.name}</span>
                  <span style={{ color: col }}> · {f.team}</span>
                </div>
              </div>
              <div style={{ color: C.exp, fontSize: "1.8vw", fontWeight: 700, fontFamily: "'Chakra Petch', sans-serif" }}>+{f.exp}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="flex items-center justify-center w-full" style={{ color: C.dim, fontSize: "1.4vw", padding: "4vh 0" }}>
      {text}
    </div>
  );
}

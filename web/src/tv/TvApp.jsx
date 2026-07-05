import { useState, useEffect } from "react";
import { C, RANK_COLORS, PHASE_META, monthName, fmt, daysLeftInMonth, medal } from "../theme.js";
import { getState } from "../api.js";
import { usePolling } from "../hooks.js";
import { Loading } from "../ui.jsx";

const DATA_REFRESH_MS = 30000; // pull data every 30s
const SCREEN_MS = 15000; // rotate screen every 15s
const SCREENS = 3;

export default function TvApp() {
  const state = usePolling(getState, DATA_REFRESH_MS);
  const [screen, setScreen] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setScreen((s) => (s + 1) % SCREENS), SCREEN_MS);
    return () => clearInterval(t);
  }, []);

  if (!state.data && !state.error) return <Loading label="Summoning heroes…" />;
  if (!state.data) {
    return <Loading label="Data sync failed — retrying…" />;
  }

  const data = state.data;
  const rage = data.boss.rage;

  return (
    <div
      className="rage-frame"
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
        animation: rage ? "rageFlicker 1.4s ease-in-out infinite" : "none",
        border: rage ? `6px solid ${C.hp}` : "none",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: "2vh" }}>
        <div>
          <div style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: "2.4vw", fontWeight: 700, letterSpacing: "0.06em" }}>
            WEPROJECT <span style={{ color: C.gold }}>LEGENDS</span>
          </div>
          <div style={{ color: C.dim, fontSize: "1vw" }}>Season 1 · {monthName(data.boss.month)}</div>
        </div>
        <div className="flex items-center gap-4">
          {state.error && (
            <div style={{ color: C.hp, fontSize: "1vw" }}>⚠ Data sync failed</div>
          )}
          <div style={{ color: C.green, fontSize: "1.1vw", fontWeight: 700 }}>● LIVE</div>
        </div>
      </div>

      {rage && (
        <div
          style={{
            textAlign: "center",
            fontFamily: "'Chakra Petch', sans-serif",
            fontWeight: 700,
            fontSize: "1.8vw",
            color: C.hp,
            marginBottom: "1.5vh",
            letterSpacing: "0.1em",
          }}
        >
          🔥 BOSS RAGE — ALL EXP ×1.5
        </div>
      )}

      <div style={{ height: rage ? "78vh" : "82vh" }}>
        {screen === 0 && <BossScreen boss={data.boss} />}
        {screen === 1 && <BoardsScreen damage={data.damageRanking} creative={data.creativeRanking} />}
        {screen === 2 && <FeedScreen feed={data.feed} />}
      </div>

      {/* Screen dots */}
      <div className="flex justify-center gap-3" style={{ position: "absolute", bottom: "1.5vh", left: 0, right: 0 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: "1vw",
              height: "1vw",
              borderRadius: "50%",
              background: i === screen ? C.gold : C.line,
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function BossScreen({ boss }) {
  const remaining = Math.max(0, boss.hpMax - boss.damage);
  const dLeft = daysLeftInMonth(boss.month);
  return (
    <div className="flex flex-col justify-center h-full">
      <div className="flex items-end justify-between" style={{ marginBottom: "2vh" }}>
        <div>
          <div style={{ color: C.dim, fontSize: "1.4vw", letterSpacing: "0.2em", fontFamily: "'Chakra Petch', sans-serif" }}>
            WORLD BOSS · {monthName(boss.month)}
            {dLeft != null && (
              <span style={{ color: dLeft <= 3 ? C.hp : C.gold, marginLeft: "1vw" }}>
                · {dLeft} DAYS LEFT
              </span>
            )}
          </div>
          <div style={{ fontSize: "5vw", fontWeight: 700, fontFamily: "'Chakra Petch', sans-serif", lineHeight: 1.05 }}>
            {monthName(boss.month)} Overlord 👹
          </div>
          <div style={{ color: C.dim, fontSize: "1.4vw" }}>Target RM {fmt(boss.hpMax)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: C.hp, fontSize: "6vw", fontWeight: 700, fontFamily: "'Chakra Petch', sans-serif", lineHeight: 1 }}>
            {boss.pctLeft.toFixed(1)}%
          </div>
          <div style={{ color: C.dim, fontSize: "1.4vw" }}>HP Remaining</div>
        </div>
      </div>

      {/* Big HP bar */}
      <div
        className="relative w-full rounded-full overflow-hidden boss-pulse"
        style={{ height: "7vh", background: "#070A16", border: `2px solid ${C.line}`, boxShadow: `0 0 30px ${C.hp}55` }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${boss.pctLeft}%`,
            background: `linear-gradient(90deg, ${C.hpDeep}, ${C.hp})`,
            boxShadow: `0 0 30px ${C.hp}`,
            transition: "width 1s ease",
            animation: "bossPulse 1.8s ease-in-out infinite",
          }}
        />
        {[75, 50, 25].map((m) => (
          <div key={m} className="absolute top-0 h-full" style={{ left: `${m}%`, width: 3, background: C.bg }} />
        ))}
        <div
          className="absolute inset-0 flex items-center justify-center font-bold"
          style={{ color: "#fff", textShadow: "0 2px 6px #000", fontSize: "2vw", fontFamily: "'Chakra Petch', sans-serif" }}
        >
          {fmt(remaining)} / {fmt(boss.hpMax)}
        </div>
      </div>

      {/* Phase rewards */}
      <div className="grid grid-cols-4 gap-4" style={{ marginTop: "3vh" }}>
        {boss.phases.map((p) => {
          const meta = PHASE_META[p.at] || { label: `${p.at}%`, icon: "🎁" };
          return (
            <div
              key={p.at}
              className="rounded-2xl text-center"
              style={{
                padding: "2vh 1vw",
                background: p.unlocked ? `${C.gold}18` : C.panelSoft,
                border: `2px solid ${p.unlocked ? C.gold + "77" : C.line}`,
                opacity: p.unlocked ? 1 : 0.5,
              }}
            >
              <div style={{ fontSize: "3vw" }}>{p.unlocked ? meta.icon : "🔒"}</div>
              <div style={{ fontSize: "1.6vw", color: p.unlocked ? C.gold : C.dim, fontFamily: "'Chakra Petch', sans-serif" }}>
                {p.at}%
              </div>
              <div style={{ fontSize: "1.3vw", color: p.unlocked ? C.text : C.dim }}>{meta.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BoardsScreen({ damage, creative }) {
  const dmg = (damage || []).filter((p) => p.damage > 0).slice(0, 6);
  const max = dmg.length ? dmg[0].damage : 1;
  const crv = (creative || []).slice(0, 6);
  return (
    <div className="grid grid-cols-2 gap-6 h-full">
      {/* Damage */}
      <div className="flex flex-col">
        <div style={{ color: C.dim, fontSize: "1.6vw", letterSpacing: "0.2em", fontFamily: "'Chakra Petch', sans-serif", marginBottom: "1.5vh" }}>
          DAMAGE RANKING
        </div>
        <div className="flex flex-col gap-3 flex-1">
          {dmg.length === 0 && <Empty text="No damage yet" />}
          {dmg.map((p, i) => (
            <div
              key={p.playerId}
              className="relative rounded-2xl overflow-hidden flex items-center gap-4"
              style={{ padding: "1.4vh 1.2vw", background: C.panelSoft, border: `2px solid ${i === 0 ? C.gold + "88" : C.line}` }}
            >
              <div className="absolute left-0 top-0 h-full" style={{ width: `${(p.damage / max) * 100}%`, background: i === 0 ? `${C.gold}1A` : `${C.exp}10` }} />
              <div className="relative" style={{ width: "2.5vw", textAlign: "center", fontSize: "2vw", fontWeight: 700, color: i === 0 ? C.gold : C.text, fontFamily: "'Chakra Petch', sans-serif" }}>
                {medal(i)}
              </div>
              <div className="relative flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: "1.8vw", fontWeight: 700 }}>{p.name}</span>
                  <RankBadge rank={p.rank} />
                </div>
                <div style={{ color: C.dim, fontSize: "1vw" }}>{p.role} · Lv{p.level}</div>
              </div>
              <div className="relative" style={{ fontSize: "1.9vw", fontWeight: 700, color: i === 0 ? C.gold : C.text, fontFamily: "'Chakra Petch', sans-serif" }}>
                {fmt(p.damage)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Creative */}
      <div className="flex flex-col">
        <div style={{ color: C.dim, fontSize: "1.6vw", letterSpacing: "0.2em", fontFamily: "'Chakra Petch', sans-serif", marginBottom: "1.5vh" }}>
          CREATIVE RANKING
        </div>
        <div className="flex flex-col gap-3 flex-1">
          {crv.length === 0 && <Empty text="No winning creatives yet" />}
          {crv.map((p, i) => (
            <div
              key={p.playerId}
              className="rounded-2xl flex items-center gap-4"
              style={{ padding: "1.4vh 1.2vw", background: C.panelSoft, border: `2px solid ${i === 0 ? C.purple + "88" : C.line}` }}
            >
              <div style={{ width: "2.5vw", textAlign: "center", fontSize: "2vw", fontWeight: 700, color: i === 0 ? C.purple : C.text, fontFamily: "'Chakra Petch', sans-serif" }}>
                {medal(i)}
              </div>
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: "1.8vw", fontWeight: 700 }}>{p.name}</div>
                <div style={{ color: C.dim, fontSize: "1vw" }}>{p.role}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "1.8vw", fontWeight: 700, color: C.purple, fontFamily: "'Chakra Petch', sans-serif" }}>
                  🎯 {p.winningCount}
                </div>
                <div style={{ color: C.dim, fontSize: "1vw" }}>CTR ×{p.highCtrCount}</div>
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
    <div className="flex flex-col h-full">
      <div style={{ color: C.dim, fontSize: "1.6vw", letterSpacing: "0.2em", fontFamily: "'Chakra Petch', sans-serif", marginBottom: "1.5vh" }}>
        TODAY'S ACHIEVEMENTS <span style={{ color: C.green }}>● LIVE</span>
      </div>
      <div className="grid grid-cols-2 gap-4 flex-1 content-start" style={{ overflow: "hidden" }}>
        {rows.length === 0 && <Empty text="No achievements yet today — go get First Blood! ⚔️" />}
        {rows.slice(0, 8).map((f, i) => (
          <div
            key={i}
            className="feed-item flex items-center gap-4 rounded-2xl"
            style={{ padding: "1.6vh 1.2vw", background: C.panelSoft, border: `2px solid ${C.line}`, animationDelay: `${i * 0.1}s` }}
          >
            <div style={{ fontSize: "2.6vw" }}>{f.icon}</div>
            <div className="flex-1 min-w-0">
              <div style={{ color: C.gold, fontSize: "1.2vw", fontWeight: 700, letterSpacing: "0.1em", fontFamily: "'Chakra Petch', sans-serif" }}>
                {f.tag}
              </div>
              <div style={{ fontSize: "1.5vw" }}>
                <span style={{ fontWeight: 700 }}>{f.name}</span>
                <span style={{ color: C.dim }}> · {f.description}</span>
              </div>
            </div>
            <div style={{ color: C.exp, fontSize: "1.8vw", fontWeight: 700, fontFamily: "'Chakra Petch', sans-serif" }}>
              +{f.exp}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankBadge({ rank }) {
  if (!rank) return null;
  const col = RANK_COLORS[rank] || C.dim;
  return (
    <span
      style={{
        color: col,
        border: `1px solid ${col}66`,
        background: `${col}1A`,
        fontFamily: "'Chakra Petch', sans-serif",
        fontSize: "0.9vw",
        padding: "0.2vh 0.6vw",
        borderRadius: 999,
        letterSpacing: "0.05em",
        fontWeight: 600,
      }}
    >
      {rank.toUpperCase()}
    </span>
  );
}

function Empty({ text }) {
  return (
    <div className="flex items-center justify-center w-full" style={{ color: C.dim, fontSize: "1.4vw", padding: "4vh 0" }}>
      {text}
    </div>
  );
}

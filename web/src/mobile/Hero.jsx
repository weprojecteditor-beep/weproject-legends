import { useState, useEffect } from "react";
import { C, Frame, Eyebrow, RoleTag, RankChip, WarBar, Badge, badgeMeta, classOf, RANKS, GOLD_GRAD, CLIP_SM, fmt } from "../ml.jsx";

const SKIN_TIERS = [
  { tier: "GENERAL", unlock: 1, col: "#8C96C4" },
  { tier: "ELITE", unlock: 10, col: "#3EE0F0" },
  { tier: "LEGEND", unlock: 20, col: "#F5C542" },
];
const LEVEL_REWARDS = [
  { lv: 5, icon: "💰", label: "+100 Gold" },
  { lv: 10, icon: "🎭", label: "Elite Skin" },
  { lv: 15, icon: "💰", label: "+300 Gold" },
  { lv: 20, icon: "🎭", label: "Legend Skin" },
  { lv: 25, icon: "💰", label: "+500 Gold" },
  { lv: 30, icon: "🏛️", label: "Hall of Fame" },
];
const CYAN_DEEP = "#0E7C8C";

export default function Hero({ player, onMission }) {
  const cls = classOf(player.heroClass, player.role);
  const lvl = player.level;
  const highestSkin = SKIN_TIERS.filter((s) => lvl >= s.unlock).slice(-1)[0]?.tier || "GENERAL";
  const [skin, setSkin] = useState(highestSkin);
  const [busyMission, setBusyMission] = useState(null);
  // Optimistic mission state: flip instantly on tap, drop the override once the
  // server catches up (so it never waits on the slow Apps Script round-trip).
  const [overrides, setOverrides] = useState({});
  useEffect(() => {
    setOverrides((prev) => {
      const next = { ...prev };
      (player.missionsToday || []).forEach((m) => {
        if (next[m.missionId] !== undefined && (next[m.missionId] === m.status || m.status === "approved" || m.status === "rejected")) delete next[m.missionId];
      });
      return next;
    });
  }, [player.missionsToday]);
  const clickMission = async (m) => {
    const cur = overrides[m.missionId] || m.status;
    if (busyMission || cur === "approved") return;
    setOverrides((o) => ({ ...o, [m.missionId]: cur === "pending" ? "todo" : "pending" }));
    setBusyMission(m.missionId);
    try { await onMission(m); } finally { setBusyMission(null); }
  };
  const rankTarget = player.seasonExp + (player.expToNextRank || 0);
  const nextRankCol = RANKS[player.nextRank] || C.gold;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* ── Hero Showcase ── */}
      <Frame glow={cls.color} pad={0}>
        <div style={{ position: "relative", minHeight: 280, background: `radial-gradient(ellipse 90% 70% at 50% 20%, ${cls.color}26 0%, transparent 60%)` }}>
          <div style={{ position: "absolute", inset: 0, opacity: 0.35,
            background: `conic-gradient(from 180deg at 50% 15%, transparent 0deg, ${cls.color}14 8deg, transparent 16deg, transparent 28deg, ${cls.color}10 36deg, transparent 44deg, transparent 60deg, ${cls.color}14 68deg, transparent 76deg)` }} />
          {cls.img
            ? <img src={cls.img} alt="" style={{ position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)", height: 215, filter: `drop-shadow(0 0 30px ${cls.color}77)` }} />
            : <div style={{ position: "absolute", top: 40, left: "50%", transform: "translateX(-50%)", fontSize: 110, filter: `drop-shadow(0 0 30px ${cls.color})` }}>{cls.icon}</div>}
          <div style={{ position: "absolute", top: 10, left: 10 }}><RankChip rank={player.rank} /></div>
          <div style={{ position: "absolute", top: 10, right: 10, textAlign: "right" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: cls.color, letterSpacing: "0.14em", fontFamily: "'Chakra Petch',sans-serif", textShadow: `0 0 12px ${cls.color}` }}>
              {cls.icon} {cls.label}
            </div>
            <div style={{ fontSize: 8, color: C.dimmer, marginTop: 4 }}>hero set at login</div>
          </div>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: `linear-gradient(transparent, ${C.bgDeep}F0 55%)`, padding: "44px 16px 14px", textAlign: "center" }}>
            <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: 30, letterSpacing: "0.14em", background: GOLD_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: `drop-shadow(0 0 18px ${C.gold}66)` }}>
              {player.name}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 5, alignItems: "center" }}>
              <RoleTag role={player.role} />
              <span style={{ fontSize: 11, color: C.gold, fontWeight: 800 }}>🪙 {fmt(player.gold)}</span>
              <span style={{ fontSize: 11, color: C.dim }}>Lv{lvl}</span>
            </div>
          </div>
        </div>
        <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <WarBar pct={player.expToNextLevel ? (player.expInLevel / player.expToNextLevel) * 100 : 100} h={12}
            grad={`linear-gradient(90deg,${CYAN_DEEP},${C.cyan})`} glowCol={C.cyan}
            label={`LEVEL ${lvl} → ${lvl + 1}`} right={`${player.expInLevel}/${player.expToNextLevel} EXP`} />
          {player.nextRank ? (
            <WarBar pct={rankTarget ? (player.seasonExp / rankTarget) * 100 : 100} h={12}
              grad={`linear-gradient(90deg,#5B3BBB,${nextRankCol})`} glowCol={nextRankCol}
              label={`ROAD TO ${player.nextRank.toUpperCase()}`} right={`${fmt(player.seasonExp)}/${fmt(rankTarget)}`} />
          ) : (
            <div style={{ fontSize: 11, color: C.gold, fontFamily: "'Chakra Petch',sans-serif" }}>★ MAX RANK — {fmt(player.seasonExp)} Season EXP</div>
          )}
        </div>
      </Frame>

      {/* ── Skins gallery ── */}
      <Frame pad={14}>
        <Eyebrow right={`YOU ARE LV${lvl}`}>SKINS · {cls.label}</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 9 }}>
          {SKIN_TIERS.map((s) => {
            const owned = lvl >= s.unlock;
            const equipped = skin === s.tier;
            return (
              <button key={s.tier} onClick={() => owned && setSkin(s.tier)} style={{
                clipPath: CLIP_SM, padding: "10px 6px", cursor: owned ? "pointer" : "not-allowed",
                background: equipped ? `linear-gradient(180deg,${s.col}22,${s.col}08)` : C.panelSoft,
                border: `1px solid ${equipped ? s.col : C.line}`, textAlign: "center", position: "relative" }}>
                <div style={{ width: 56, height: 56, margin: "0 auto 6px", position: "relative" }}>
                  {cls.img
                    ? <img src={cls.img} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", filter: owned ? `drop-shadow(0 0 10px ${s.col}AA)` : "grayscale(1) brightness(0.5)" }} />
                    : <div style={{ fontSize: 38, filter: owned ? "none" : "grayscale(1) brightness(0.5)" }}>{cls.icon}</div>}
                  {!owned && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🔒</div>}
                </div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: owned ? s.col : C.dimmer, fontFamily: "'Chakra Petch',sans-serif" }}>{s.tier}</div>
                <div style={{ fontSize: 8, color: C.dimmer, marginTop: 2 }}>{equipped ? "EQUIPPED" : owned ? "TAP TO EQUIP" : `UNLOCK AT LV${s.unlock}`}</div>
              </button>
            );
          })}
        </div>
      </Frame>

      {/* ── Level rewards roadmap ── */}
      <Frame pad={14}>
        <Eyebrow right="LEVEL NEVER RESETS">LEVEL REWARDS</Eyebrow>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {LEVEL_REWARDS.map((r) => {
            const got = lvl >= r.lv;
            const next = !got && LEVEL_REWARDS.find((x) => lvl < x.lv)?.lv === r.lv;
            return (
              <div key={r.lv} style={{ flexShrink: 0, width: 76, textAlign: "center", clipPath: CLIP_SM, padding: "9px 4px",
                background: got ? `linear-gradient(180deg,${C.gold}1E,${C.gold}06)` : next ? `linear-gradient(180deg,${C.cyan}14,transparent)` : C.panelSoft,
                border: `1px solid ${got ? C.gold + "66" : next ? C.cyan + "66" : C.line}`, opacity: got || next ? 1 : 0.6 }}>
                <div style={{ fontSize: 20, filter: got ? `drop-shadow(0 0 8px ${C.gold})` : "none" }}>{got || next ? r.icon : "🔒"}</div>
                <div style={{ fontSize: 10, fontWeight: 900, marginTop: 3, color: got ? C.gold : next ? C.cyan : C.dimmer, fontFamily: "'Chakra Petch',sans-serif" }}>LV {r.lv}</div>
                <div style={{ fontSize: 8, color: got ? C.text : C.dim, marginTop: 2, lineHeight: 1.3 }}>{r.label}</div>
                {got && <div style={{ fontSize: 7.5, color: C.green, fontWeight: 800, marginTop: 2 }}>✓ CLAIMED</div>}
                {next && <div style={{ fontSize: 7.5, color: C.cyan, fontWeight: 800, marginTop: 2 }}>NEXT</div>}
              </div>
            );
          })}
        </div>
      </Frame>

      {/* ── Fast climber ── */}
      {player.paceEligible && player.paceEligible.length > 0 && (
        <Frame glow={C.gold} pad={14}>
          <Eyebrow>⚡ FAST CLIMBER — EXTRA BOUNTY</Eyebrow>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {player.paceEligible.map((p, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span>🏅 {p.label}</span>
                <span style={{ fontWeight: 800, color: C.gold, fontFamily: "'Chakra Petch',sans-serif" }}>+{fmt(p.bonus)}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 9, color: C.dimmer, marginTop: 8 }}>Leveled up fast — GM confirms & grants this bonus.</div>
        </Frame>
      )}

      {/* ── Missions ── */}
      <Frame pad={14}>
        <Eyebrow right="ALL APPROVED +30">DAILY MISSIONS</Eyebrow>
        {(!player.missionsToday || player.missionsToday.length === 0) ? (
          <div style={{ fontSize: 12, textAlign: "center", color: C.dim, padding: "8px 0" }}>No missions configured for your role yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {player.missionsToday.map((m) => {
              const st = overrides[m.missionId] || m.status;
              const border = st === "approved" ? C.green : st === "pending" ? C.orange : C.line;
              const busy = busyMission === m.missionId;
              return (
                <button key={m.missionId} type="button" onClick={() => clickMission(m)} style={{
                  display: "flex", alignItems: "center", gap: 11, width: "100%",
                  background: st === "approved" ? `linear-gradient(90deg,${C.green}12,${C.panelSoft})` : st === "pending" ? `linear-gradient(90deg,${C.orange}10,${C.panelSoft})` : C.panelSoft,
                  border: `1px solid ${border}66`, clipPath: CLIP_SM, padding: "11px 13px", cursor: st === "approved" ? "default" : "pointer", color: C.text, textAlign: "left" }}>
                  <div style={{ width: 20, height: 20, flexShrink: 0, transform: "rotate(45deg)", background: st === "approved" ? C.green : "transparent",
                    border: `2px solid ${st === "approved" ? C.green : st === "pending" ? C.orange : C.dimmer}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {st === "approved" && <span style={{ transform: "rotate(-45deg)", fontSize: 11, fontWeight: 900, color: "#04101E" }}>✓</span>}
                    {st === "pending" && <span style={{ transform: "rotate(-45deg)", fontSize: 9, color: C.orange }}>⏳</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: st === "approved" ? C.dim : C.text, textDecoration: st === "approved" ? "line-through" : "none" }}>{m.text}</div>
                    {st === "pending" && <div style={{ fontSize: 9, color: C.orange, fontWeight: 800, marginTop: 2 }}>⏳ WAITING GM APPROVAL · tap to cancel</div>}
                    {st === "approved" && <div style={{ fontSize: 9, color: C.green, fontWeight: 800, marginTop: 2 }}>✓ APPROVED · EXP GRANTED</div>}
                    {(!st || st === "todo") && <div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>tap to submit</div>}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 900, color: st === "approved" ? C.green : C.cyan, fontFamily: "'Chakra Petch',sans-serif" }}>{busy ? "…" : "+" + m.exp}</span>
                </button>
              );
            })}
          </div>
        )}
        <div style={{ fontSize: 9, color: C.dimmer, marginTop: 9, textAlign: "center" }}>EXP is granted after GM approval · missions are managed in Google Sheets</div>
      </Frame>

      {/* ── Badges ── */}
      <Frame pad={14}>
        <Eyebrow>BADGES</Eyebrow>
        {(!player.badges || player.badges.length === 0) ? (
          <div style={{ fontSize: 12, color: C.dim }}>No badges yet — earn milestones & achievements to collect them.</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {player.badges.map((b, i) => { const m = badgeMeta(b); return <Badge key={i} icon={m.icon} label={b} tier={m.tier} />; })}
          </div>
        )}
      </Frame>
    </div>
  );
}

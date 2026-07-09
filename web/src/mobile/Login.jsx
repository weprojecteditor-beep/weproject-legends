import { useState, useEffect } from "react";
import { C, Frame, Avatar, GOLD_GRAD, CLIP_SM, CLASS_COLOR, fmt } from "../ml.jsx";
import { HERO_CLASS_BY_ROLE, CLASS_FAMILY_BY_ROLE } from "../theme.js";
import { getRoster, getPlayer, setHeroClass } from "../api.js";
import { Loading, PinDots, Keypad } from "../ui.jsx";

export default function Login({ onLogin }) {
  const [step, setStep] = useState("splash"); // splash | select | pin | class | welcome
  const [roster, setRoster] = useState(null);
  const [hero, setHero] = useState(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [player, setPlayer] = useState(null);

  useEffect(() => {
    getRoster()
      .then((list) => setRoster([...list].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setRoster([]));
  }, []);

  const pickHero = (h) => { setHero(h); setPin(""); setErr(""); setStep("pin"); };

  const tryPin = async (fullPin) => {
    setBusy(true); setErr("");
    try {
      const p = await getPlayer(hero.playerId, fullPin);
      setPlayer(p);
      setStep(p.heroClass ? "welcome" : "class");
    } catch (e) {
      setErr("Wrong PIN, try again"); setPin("");
    } finally { setBusy(false); }
  };

  const onDigit = (d) => {
    if (busy || pin.length >= 4) return;
    const next = pin + d;
    setPin(next); setErr("");
    if (next.length === 4) tryPin(next);
  };
  const onBackspace = () => !busy && setPin((p) => p.slice(0, -1));
  const finishLogin = (hc) => onLogin({ id: hero.playerId, pin, name: player.name, team: player.team, role: player.role, heroClass: hc });

  if (step === "splash") return <Splash onEnter={() => setStep("select")} />;
  if (roster === null) return <Loading />;

  if (step === "select") {
    return (
      <Shell title="SELECT YOUR HERO" subtitle="WEPROJECT · 16 heroes">
        <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: "62vh", overflowY: "auto" }}>
          {roster.map((p) => (
            <button key={p.playerId} onClick={() => pickHero(p)}
              style={{ display: "flex", alignItems: "center", gap: 10, clipPath: "polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)",
                background: C.panelSoft, border: `1px solid ${C.line}`, padding: "8px 12px", color: C.text, textAlign: "left" }}>
              <Avatar p={p} size={38} />
              <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{p.name}</span>
              <span style={{ fontSize: 10, color: C.dim }}>{p.role}</span>
            </button>
          ))}
        </div>
      </Shell>
    );
  }

  if (step === "pin") {
    return (
      <Shell title="ENTER PIN" subtitle={hero.name}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22, alignItems: "center" }}>
          <PinDots length={4} filled={pin.length} />
          {err && <div style={{ fontSize: 13, color: C.hp }}>{err}</div>}
          {busy && <div style={{ fontSize: 11, color: C.dim }}>Checking…</div>}
          <Keypad onDigit={onDigit} onBackspace={onBackspace} />
          <button onClick={() => setStep("select")} style={{ fontSize: 11, color: C.dim, background: "none", border: "none" }}>← Not {hero.name}?</button>
        </div>
      </Shell>
    );
  }

  if (step === "class") {
    return <ChooseClass player={player} pin={pin} onDone={finishLogin} />;
  }

  return (
    <Shell title={`⚔ WELCOME, ${player.name.toUpperCase()}`} subtitle="the war awaits">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <Avatar p={player} size={92} />
        <button onClick={() => finishLogin(player.heroClass)}
          style={{ width: "100%", padding: "12px 0", fontWeight: 800, fontSize: 13, clipPath: "polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)",
            background: GOLD_GRAD, color: "#0A0D1C", border: "none", fontFamily: "'Chakra Petch',sans-serif", letterSpacing: "0.06em" }}>
          ENTER THE BATTLEFIELD
        </button>
      </div>
    </Shell>
  );
}

const SPARKS = [[8, 14], [22, 72], [80, 18], [90, 66], [50, 8], [14, 88], [72, 86], [42, 52], [60, 30], [33, 24]];

function Splash({ onEnter }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, overflow: "hidden",
      background: `radial-gradient(ellipse 70% 40% at 20% 25%, ${C.cyan}18 0%, transparent 55%), radial-gradient(ellipse 70% 40% at 80% 25%, ${C.enemy}18 0%, transparent 55%), radial-gradient(ellipse 100% 70% at 50% 30%, #0E1840 0%, ${C.bgDeep} 65%)`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
      {/* rotating rays */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.25, pointerEvents: "none",
        background: `conic-gradient(from 0deg at 50% 40%, transparent 0deg, ${C.gold}10 6deg, transparent 12deg, transparent 24deg, ${C.cyan}0C 30deg, transparent 36deg, transparent 48deg, ${C.enemy}0C 54deg, transparent 60deg)`,
        animation: "spinSlow 30s linear infinite" }} />
      {/* twinkling sparkles */}
      {SPARKS.map((s, i) => (
        <div key={i} style={{ position: "absolute", left: `${s[0]}%`, top: `${s[1]}%`, fontSize: i % 3 === 0 ? 16 : 10, color: C.goldHi,
          filter: `drop-shadow(0 0 6px ${C.gold})`, animation: `pulse ${2 + (i % 3)}s ease-in-out ${i * 0.2}s infinite`, pointerEvents: "none" }}>✦</div>
      ))}

      <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: 22, letterSpacing: "0.14em",
        background: GOLD_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: `drop-shadow(0 0 18px ${C.gold}77)`,
        marginBottom: 4, animation: "fadeIn .8s ease .1s both" }}>LEAGUE OF LEGENDS</div>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.4em", color: C.dim, fontFamily: "'Chakra Petch',sans-serif", marginBottom: 16, animation: "fadeIn .8s ease .2s both" }}>SEASON 1 · 2026</div>

      {/* The boss looms; our heroes rally below */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 8 }}>
        <div className="floaty" style={{ fontSize: 92, filter: `drop-shadow(0 0 30px ${C.hp})`, animation: "vsPop .5s cubic-bezier(.2,1.6,.4,1) .5s both" }}>🐲</div>
        <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: 16, color: C.hp, letterSpacing: "0.06em", textShadow: `0 0 22px ${C.hp}`, animation: "fadeIn .8s ease .7s both" }}>THE REVENUE OVERLORD</div>
        <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.2em", marginBottom: 10, animation: "fadeIn .8s ease .8s both" }}>1,000,000 HP</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
          <img className="crystalL" src="/avatars/marksman.png" alt="" style={{ height: 96, filter: `drop-shadow(0 0 22px ${C.cyan})`, animation: "slamL .6s cubic-bezier(.2,1.4,.4,1) .9s both" }} />
          <img className="crystalR" src="/avatars/fighter.png" alt="" style={{ height: 96, filter: `drop-shadow(0 0 22px ${C.cyan})`, animation: "slamR .6s cubic-bezier(.2,1.4,.4,1) .9s both" }} />
        </div>
        <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: 18, color: C.cyan, letterSpacing: "0.06em", textShadow: `0 0 24px ${C.cyan}`, marginTop: 4 }}>WEPROJECT</div>
        <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.2em" }}>16 HEROES · ONE BOSS</div>
      </div>

      <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 800, fontSize: 12, letterSpacing: "0.3em", margin: "12px 0 6px",
        background: GOLD_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "fadeIn .8s ease 1.2s both" }}>⚔ SLAY THE BOSS ⚔</div>
      <div style={{ fontSize: 10, color: C.dim, marginBottom: 22, textAlign: "center", animation: "fadeIn .8s ease 1.4s both" }}>Every RM of revenue is damage · beat it before month-end</div>
      <button onClick={onEnter} style={{ clipPath: CLIP_SM, padding: "14px 44px", border: "none", cursor: "pointer",
        background: GOLD_GRAD, color: "#0A0F28", fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: 14, letterSpacing: "0.15em",
        animation: "fadeIn .8s ease 1.6s both, glowPulse 2s ease 2s infinite" }}>ENTER THE BATTLEFIELD</button>
    </div>
  );
}

function Shell({ title, subtitle, children }) {
  return (
    <div style={{ minHeight: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px", background: C.bg, color: C.text }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: "0.04em" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{subtitle}</div>}
        </div>
        <Frame>{children}</Frame>
      </div>
    </div>
  );
}

function ChooseClass({ player, pin, onDone }) {
  const options = HERO_CLASS_BY_ROLE[player.role] || [];
  const [heroClass, setClass] = useState(options[0] || "");
  const [gender, setGender] = useState("female");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const confirm = async () => {
    setBusy(true); setErr("");
    try {
      const r = await setHeroClass(player.playerId, pin, heroClass, gender);
      if (!r.ok) throw new Error(r.error || "Could not save class");
      onDone(heroClass);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <Shell title="CHOOSE YOUR CLASS" subtitle={`${player.role} · ${CLASS_FAMILY_BY_ROLE[player.role] || ""}`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {options.map((h) => {
            const sel = heroClass === h;
            const col = CLASS_COLOR[h] || C.gold;
            return (
              <button key={h} onClick={() => setClass(h)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 4px",
                  clipPath: "polygon(6px 0,100% 0,100% 100%,0 100%,0 6px)",
                  background: sel ? `${col}1E` : C.panelSoft, border: `1px solid ${sel ? col : C.line}`, color: C.text }}>
                <Avatar p={{ heroClass: h, role: player.role, rank: player.rank }} size={44} />
                <div style={{ fontSize: 10, fontWeight: 800, color: sel ? col : C.dim, fontFamily: "'Chakra Petch',sans-serif" }}>{h}</div>
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["female", "male"].map((g) => (
            <button key={g} onClick={() => setGender(g)}
              style={{ flex: 1, padding: "7px 0", fontSize: 11, fontWeight: 700, clipPath: "polygon(6px 0,100% 0,100% 100%,0 100%,0 6px)",
                background: gender === g ? `${C.gold}1A` : C.panelSoft, border: `1px solid ${gender === g ? C.gold : C.line}`, color: gender === g ? C.gold : C.dim }}>
              {g === "female" ? "♀ Female" : "♂ Male"}
            </button>
          ))}
        </div>
        {err && <div style={{ fontSize: 12, color: C.hp, textAlign: "center" }}>{err}</div>}
        <button onClick={confirm} disabled={busy}
          style={{ width: "100%", padding: "11px 0", fontWeight: 800, fontSize: 13, clipPath: "polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)",
            background: GOLD_GRAD, color: "#0A0D1C", border: "none", fontFamily: "'Chakra Petch',sans-serif", opacity: busy ? 0.6 : 1 }}>
          {busy ? "Saving…" : "LOCK IN HERO"}
        </button>
      </div>
    </Shell>
  );
}

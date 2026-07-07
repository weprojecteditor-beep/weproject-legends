import { useState, useEffect } from "react";
import { C, HERO_CLASS_BY_ROLE, HERO_ICONS, CLASS_FAMILY_BY_ROLE, TEAM_COLORS, TEAM_LABELS } from "../theme.js";
import { getRoster, getPlayer, setHeroClass } from "../api.js";
import { Loading, Panel, PinDots, Keypad } from "../ui.jsx";

export default function Login({ onLogin }) {
  const [step, setStep] = useState("splash"); // splash | select | pin | class | welcome
  const [roster, setRoster] = useState(null);
  const [hero, setHero] = useState(null); // { playerId, name, role, team }
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [player, setPlayer] = useState(null); // full getPlayer() response after PIN success

  useEffect(() => {
    getRoster()
      .then((list) => setRoster([...list].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setRoster([]));
  }, []);

  const pickHero = (h) => {
    setHero(h);
    setPin("");
    setErr("");
    setStep("pin");
  };

  const tryPin = async (fullPin) => {
    setBusy(true);
    setErr("");
    try {
      const p = await getPlayer(hero.playerId, fullPin);
      setPlayer(p);
      setStep(p.heroClass ? "welcome" : "class");
    } catch (e) {
      setErr("Wrong PIN, try again");
      setPin("");
    } finally {
      setBusy(false);
    }
  };

  const onDigit = (d) => {
    if (busy || pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setErr("");
    if (next.length === 4) tryPin(next);
  };
  const onBackspace = () => !busy && setPin((p) => p.slice(0, -1));

  const finishLogin = (finalHeroClass) => {
    onLogin({ id: hero.playerId, pin, name: player.name, team: player.team, role: player.role, heroClass: finalHeroClass });
  };

  if (step === "splash") return <Splash onEnter={() => setStep("select")} />;
  if (roster === null) return <Loading />;

  if (step === "select") {
    return (
      <Shell title="Select your hero">
        <div className="flex flex-col gap-2" style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {["weproject", "wellous"].map((team) => {
            const rows = roster.filter((p) => p.team === team);
            if (!rows.length) return null;
            return (
              <div key={team} className="mb-2">
                <div
                  className="text-xs font-bold mb-1"
                  style={{ color: TEAM_COLORS[team], letterSpacing: "0.15em", fontFamily: "'Chakra Petch', sans-serif" }}
                >
                  {TEAM_LABELS[team]}
                </div>
                <div className="flex flex-col gap-1.5">
                  {rows.map((p) => (
                    <button
                      key={p.playerId}
                      onClick={() => pickHero(p)}
                      className="rounded-xl px-3 py-2.5 text-left flex items-center justify-between"
                      style={{ background: C.panelSoft, border: `1px solid ${C.line}`, color: C.text }}
                    >
                      <span className="font-semibold text-sm">{p.name}</span>
                      <span className="text-xs" style={{ color: C.dim }}>{p.role}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Shell>
    );
  }

  if (step === "pin") {
    return (
      <Shell title={`Enter PIN`} subtitle={hero.name}>
        <div className="flex flex-col gap-6 items-center">
          <PinDots length={4} filled={pin.length} />
          {err && <div className="text-sm" style={{ color: C.hp }}>{err}</div>}
          {busy && <div className="text-xs" style={{ color: C.dim }}>Checking…</div>}
          <Keypad onDigit={onDigit} onBackspace={onBackspace} />
          <button onClick={() => setStep("select")} className="text-xs" style={{ color: C.dim }}>
            ← Not {hero.name}?
          </button>
        </div>
      </Shell>
    );
  }

  if (step === "class") {
    return <ChooseClass player={player} pin={pin} onDone={(hc) => finishLogin(hc)} />;
  }

  // welcome
  return (
    <Shell title={`⚔ Welcome back, ${player.name.toUpperCase()}`} subtitle="the war awaits">
      <button
        onClick={() => finishLogin(player.heroClass)}
        className="w-full rounded-xl py-3 text-sm font-bold"
        style={{ background: `linear-gradient(90deg, ${C.goldDeep}, ${C.gold})`, color: "#0A0D1C" }}
      >
        Enter the Battlefield
      </button>
    </Shell>
  );
}

function Splash({ onEnter }) {
  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-5 text-center"
      style={{ background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}
    >
      <div
        className="text-3xl font-bold mb-2"
        style={{ fontFamily: "'Chakra Petch', sans-serif", letterSpacing: "0.08em", color: C.hp }}
      >
        ⚔ THE WAR IS ON ⚔
      </div>
      <div className="text-sm mb-8" style={{ color: C.dim }}>WEPROJECT LEGENDS · Crystal War Season</div>
      <button
        onClick={onEnter}
        className="rounded-xl px-6 py-3 text-sm font-bold"
        style={{ background: `linear-gradient(90deg, ${C.goldDeep}, ${C.gold})`, color: "#0A0D1C" }}
      >
        Enter the battlefield
      </button>
    </div>
  );
}

function Shell({ title, subtitle, children }) {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-5"
      style={{ background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}
    >
      <div className="w-full" style={{ maxWidth: 380 }}>
        <div className="text-center mb-6">
          <div className="text-xl font-bold" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>{title}</div>
          {subtitle && <div className="text-xs mt-1" style={{ color: C.dim }}>{subtitle}</div>}
        </div>
        <Panel>{children}</Panel>
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
    setBusy(true);
    setErr("");
    try {
      const r = await setHeroClass(player.playerId, pin, heroClass, gender);
      if (!r.ok) throw new Error(r.error || "Could not save class");
      onDone(heroClass);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Choose your class" subtitle={`${player.role} · ${CLASS_FAMILY_BY_ROLE[player.role]}`}>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          {options.map((h) => (
            <button
              key={h}
              onClick={() => setClass(h)}
              className="rounded-xl py-3 flex flex-col items-center gap-1"
              style={{
                background: heroClass === h ? `${C.gold}1A` : C.panelSoft,
                border: `1px solid ${heroClass === h ? C.gold : C.line}`,
              }}
            >
              <div className="text-2xl">{HERO_ICONS[h] || "🦸"}</div>
              <div className="text-xs font-semibold">{h}</div>
            </button>
          ))}
        </div>

        <label className="text-xs font-bold mt-2" style={{ color: C.dim, letterSpacing: "0.15em" }}>
          AVATAR STYLE
        </label>
        <div className="flex gap-2">
          {["female", "male"].map((g) => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className="flex-1 rounded-xl py-2 text-sm font-semibold capitalize"
              style={{
                background: gender === g ? `${C.exp}1A` : C.panelSoft,
                border: `1px solid ${gender === g ? C.exp : C.line}`,
                color: gender === g ? C.exp : C.dim,
              }}
            >
              {g}
            </button>
          ))}
        </div>

        {err && <div className="text-sm text-center" style={{ color: C.hp }}>{err}</div>}

        <button
          onClick={confirm}
          disabled={busy || !heroClass}
          className="rounded-xl py-3 text-sm font-bold mt-1"
          style={{ background: `linear-gradient(90deg, ${C.goldDeep}, ${C.gold})`, color: "#0A0D1C", opacity: busy ? 0.6 : 1 }}
        >
          {busy ? "Saving…" : "Confirm & Enter"}
        </button>
      </div>
    </Shell>
  );
}

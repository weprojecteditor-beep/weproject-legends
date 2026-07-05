import { useState, useEffect } from "react";
import { C } from "../theme.js";
import { getState, getPlayer } from "../api.js";
import { Loading } from "../ui.jsx";

export default function Login({ onLogin }) {
  const [roster, setRoster] = useState(null);
  const [id, setId] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getState()
      .then((s) => {
        const list = [...(s.damageRanking || [])].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        setRoster(list);
      })
      .catch(() => setRoster([]));
  }, []);

  const submit = async () => {
    if (!id) {
      setErr("Select your hero first");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const p = await getPlayer(id, pin);
      onLogin({ id, pin, name: p.name });
    } catch (e) {
      setErr("Wrong PIN, try again");
    } finally {
      setBusy(false);
    }
  };

  if (roster === null) return <Loading />;

  const fieldStyle = {
    background: C.panelSoft,
    border: `1px solid ${C.line}`,
    color: C.text,
    borderRadius: 12,
    padding: "12px 14px",
    width: "100%",
    fontSize: 16,
    outline: "none",
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-5"
      style={{ background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}
    >
      <div className="w-full" style={{ maxWidth: 380 }}>
        <div className="text-center mb-6">
          <div
            className="text-2xl font-bold"
            style={{ fontFamily: "'Chakra Petch', sans-serif", letterSpacing: "0.06em" }}
          >
            WEPROJECT <span style={{ color: C.gold }}>LEGENDS</span>
          </div>
          <div className="text-xs mt-1" style={{ color: C.dim }}>
            Select your hero
          </div>
        </div>

        <div
          className="rounded-2xl p-5 flex flex-col gap-3"
          style={{ background: C.panel, border: `1px solid ${C.line}` }}
        >
          <label className="text-xs font-bold" style={{ color: C.dim, letterSpacing: "0.15em" }}>
            HERO
          </label>
          <select
            value={id}
            onChange={(e) => {
              setId(e.target.value);
              setErr("");
            }}
            style={fieldStyle}
          >
            <option value="">— Select your hero —</option>
            {roster.map((p) => (
              <option key={p.playerId} value={p.playerId}>
                {p.name} · {p.role}
              </option>
            ))}
          </select>

          <label className="text-xs font-bold mt-1" style={{ color: C.dim, letterSpacing: "0.15em" }}>
            ENTER PIN
          </label>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={pin}
            placeholder="4-digit PIN"
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, ""));
              setErr("");
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            style={fieldStyle}
          />

          {err && (
            <div className="text-sm text-center" style={{ color: C.hp }}>
              {err}
            </div>
          )}

          <button
            onClick={submit}
            disabled={busy}
            className="rounded-xl py-3 text-sm font-bold mt-1"
            style={{
              background: `linear-gradient(90deg, ${C.goldDeep}, ${C.gold})`,
              color: "#0A0D1C",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? "Entering…" : "Enter Battlefield"}
          </button>
        </div>

        <div className="text-center text-xs mt-4" style={{ color: C.dim }}>
          Season 1 · Your PIN is set by HR
        </div>
      </div>
    </div>
  );
}

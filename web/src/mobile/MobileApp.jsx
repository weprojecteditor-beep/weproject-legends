import { useState, useEffect, useCallback, Component } from "react";
import { C, TEAM_COLORS, fmt } from "../theme.js";
import { GOLD_GRAD, CLIP_SM } from "../ml.jsx";
import { getState, getPlayer, getShop, redeem, submitMission } from "../api.js";
import { usePolling } from "../hooks.js";
import { Loading, SyncBadge } from "../ui.jsx";
import Login from "./Login.jsx";
import Battlefield from "./Battlefield.jsx";
import Hero from "./Hero.jsx";
import Guide from "./Guide.jsx";
import Shop from "./Shop.jsx";

const AUTH_KEY = "wpl_auth";
const REFRESH_MS = 60000;

// Keeps a broken tab from white-screening the whole app.
class TabBoundary extends Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidUpdate(prev) { if (prev.tab !== this.props.tab && this.state.err) this.setState({ err: null }); }
  render() {
    if (this.state.err) {
      return (
        <div style={{ textAlign: "center", color: C.dim, padding: "40px 16px" }}>
          <div style={{ fontSize: 28 }}>⚠️</div>
          <div style={{ marginTop: 8, fontSize: 13 }}>This screen hit a snag. Try another tab or reload.</div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function MobileApp() {
  const [auth, setAuth] = useState(() => {
    try { const s = sessionStorage.getItem(AUTH_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const login = (a) => { sessionStorage.setItem(AUTH_KEY, JSON.stringify(a)); setAuth(a); };
  const logout = () => { sessionStorage.removeItem(AUTH_KEY); setAuth(null); };

  if (!auth) return <Login onLogin={login} />;
  return <Shell auth={auth} onLogout={logout} />;
}

function Shell({ auth, onLogout }) {
  const [tab, setTab] = useState("battle");
  const [toast, setToast] = useState(null);

  const stateFetch = useCallback(() => getState(auth.team), [auth.team]);
  const state = usePolling(stateFetch, REFRESH_MS, [auth.team]);
  const playerFetch = useCallback(() => getPlayer(auth.id, auth.pin), [auth.id, auth.pin]);
  const player = usePolling(playerFetch, REFRESH_MS, [auth.id, auth.pin]);
  const shopFetch = useCallback(() => getShop(auth.team), [auth.team]);
  const shop = usePolling(shopFetch, REFRESH_MS, [auth.team]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const gold = player.data?.gold ?? 0;
  const teamCol = TEAM_COLORS[auth.team] || C.gold;

  const doRedeem = async (item) => {
    try {
      const r = await redeem(auth.id, auth.pin, item.itemId);
      if (r.ok) { setToast(`🎉 ${item.name} redeemed! Pending GM approval`); player.refresh(); shop.refresh(); }
      else setToast(`⚠️ ${r.error || "Redeem failed"}`);
    } catch (e) { setToast("⚠️ Redeem failed — try again"); }
  };
  const doMission = async (mission) => {
    try {
      const r = await submitMission(auth.id, auth.pin, mission.missionId);
      if (r.ok) { setToast(r.status === "pending" ? "⏳ Waiting GM approval" : "Submission cancelled"); player.refresh(); }
      else setToast(`⚠️ ${r.error || "Could not submit"}`);
    } catch (e) { setToast("⚠️ Could not submit — try again"); }
  };

  const bootLoading =
    (tab === "battle" && !state.data) ||
    (tab === "hero" && !player.data) ||
    (tab === "guide" && !state.data) ||
    (tab === "shop" && (!shop.data || !player.data));
  if (bootLoading && !state.error && !player.error && !shop.error) return <Loading />;

  const syncError = state.error || player.error || shop.error;
  const tabs = [
    { id: "battle", label: "⚔ Battle" },
    { id: "hero", label: "🧙 Hero" },
    { id: "guide", label: "📜 Guide" },
    { id: "shop", label: "🛒 Shop" },
  ];

  return (
    <div style={{ minHeight: "100vh", width: "100%", color: C.text, fontFamily: "'Inter', sans-serif", position: "relative",
      background: `radial-gradient(ellipse 70% 45% at 12% 0%, ${C.cyan}16 0%, transparent 55%), radial-gradient(ellipse 70% 45% at 88% 0%, ${C.enemy}14 0%, transparent 55%), radial-gradient(ellipse 120% 60% at 50% -10%, #14204E 0%, ${C.bg} 55%), ${C.bg}` }}>
      {/* faint hex-grid texture */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.05,
        backgroundImage: `repeating-linear-gradient(60deg, ${C.cyan} 0 1px, transparent 1px 46px), repeating-linear-gradient(-60deg, ${C.cyan} 0 1px, transparent 1px 46px)` }} />
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, padding: "14px 16px 10px", background: `linear-gradient(${C.bgDeep}F5 60%, transparent)` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 900, fontSize: 18, letterSpacing: "0.1em",
              background: GOLD_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: `drop-shadow(0 0 16px ${C.gold}55)` }}>
              WEPROJECT LEGENDS
            </div>
            <div style={{ fontSize: 10, color: teamCol, fontWeight: 700, letterSpacing: "0.06em" }}>
              💎 {auth.name} · {auth.team === "wellous" ? "WELLOUS" : "WEPROJECT"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: C.goldHi, background: `linear-gradient(180deg,${C.gold}25,${C.gold}0A)`, border: `1px solid ${C.gold}66`, clipPath: CLIP_SM, padding: "5px 12px", fontFamily: "'Chakra Petch',sans-serif", textShadow: `0 0 12px ${C.gold}` }}>
              🪙 {fmt(gold)}
            </div>
            <button onClick={onLogout} style={{ fontSize: 11, color: C.dim, background: C.panel, border: `1px solid ${C.line}`, clipPath: CLIP_SM, padding: "4px 9px" }}>Exit</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          {tabs.map((t) => {
            const on = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ flex: 1, padding: "8px 0", fontSize: 12, fontWeight: 800, clipPath: CLIP_SM, fontFamily: "'Chakra Petch',sans-serif",
                  background: on ? GOLD_GRAD : C.panel, color: on ? "#0A0D1C" : C.dim, border: on ? "none" : `1px solid ${C.line}`,
                  boxShadow: on ? `0 0 16px ${C.gold}66` : "none", transition: "all .2s" }}>
                {t.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
          <SyncBadge updatedAt={state.data?.updatedAt} error={syncError} />
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "0 16px 32px", display: "flex", flexDirection: "column", gap: 12, maxWidth: 560, margin: "0 auto" }}>
        <TabBoundary tab={tab}>
          {tab === "battle" && state.data && <Battlefield state={state.data} meId={auth.id} team={auth.team} />}
          {tab === "hero" && player.data && <Hero player={player.data} onMission={doMission} />}
          {tab === "guide" && state.data && <Guide state={state.data} role={auth.role} />}
          {tab === "shop" && shop.data && player.data && (
            <Shop items={shop.data} gold={gold} onRedeem={doRedeem} redemptions={player.data.redemptionHistory || []} />
          )}
        </TabBoundary>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 20,
          background: "#1E2542", border: `1px solid ${C.gold}66`, color: C.text, clipPath: CLIP_SM, padding: "10px 16px",
          fontSize: 13, fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,.5)", animation: "toastIn .25s ease both", maxWidth: "90%" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

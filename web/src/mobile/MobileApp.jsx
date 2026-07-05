import { useState, useEffect, useCallback } from "react";
import { C, fmt } from "../theme.js";
import { getState, getPlayer, getShop, redeem } from "../api.js";
import { usePolling } from "../hooks.js";
import { Loading, SyncBadge } from "../ui.jsx";
import Login from "./Login.jsx";
import Battlefield from "./Battlefield.jsx";
import Hero from "./Hero.jsx";
import Shop from "./Shop.jsx";

const AUTH_KEY = "wpl_auth";
const REFRESH_MS = 60000;

export default function MobileApp() {
  const [auth, setAuth] = useState(() => {
    try {
      const s = sessionStorage.getItem(AUTH_KEY);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });

  const login = (a) => {
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(a));
    setAuth(a);
  };
  const logout = () => {
    sessionStorage.removeItem(AUTH_KEY);
    setAuth(null);
  };

  if (!auth) return <Login onLogin={login} />;
  return <Shell auth={auth} onLogout={logout} />;
}

function Shell({ auth, onLogout }) {
  const [tab, setTab] = useState("battle");
  const [toast, setToast] = useState(null);

  const state = usePolling(getState, REFRESH_MS);
  const playerFetch = useCallback(() => getPlayer(auth.id, auth.pin), [auth.id, auth.pin]);
  const player = usePolling(playerFetch, REFRESH_MS, [auth.id, auth.pin]);
  const shop = usePolling(getShop, REFRESH_MS);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const gold = player.data?.gold ?? 0;

  const doRedeem = async (item) => {
    try {
      const r = await redeem(auth.id, auth.pin, item.itemId);
      if (r.ok) {
        setToast(`🎉 ${item.name} redeemed! Pending GM approval`);
        player.refresh();
        shop.refresh();
        state.refresh();
      } else {
        setToast(`⚠️ ${r.error || "Redeem failed"}`);
      }
    } catch (e) {
      setToast("⚠️ Redeem failed — try again");
    }
  };

  // First load, nothing to show yet
  const bootLoading =
    (tab === "battle" && !state.data) ||
    (tab === "hero" && !player.data) ||
    (tab === "shop" && (!shop.data || !player.data));
  if (bootLoading && !state.error && !player.error && !shop.error) {
    return <Loading />;
  }

  const syncError = state.error || player.error || shop.error;
  const tabs = [
    { id: "battle", label: "⚔️ Battlefield" },
    { id: "hero", label: "🧙 My Hero" },
    { id: "shop", label: "🛒 Shop" },
  ];

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3" style={{ background: `linear-gradient(${C.bg} 75%, transparent)` }}>
        <div className="flex items-center justify-between">
          <div>
            <div
              className="text-lg font-bold"
              style={{ fontFamily: "'Chakra Petch', sans-serif", letterSpacing: "0.06em" }}
            >
              WEPROJECT <span style={{ color: C.gold }}>LEGENDS</span>
            </div>
            <div className="text-xs" style={{ color: C.dim }}>
              {auth.name} · Season 1
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="rounded-full px-3 py-1 text-xs font-bold"
              style={{ background: `${C.gold}14`, color: C.gold, border: `1px solid ${C.gold}44` }}
            >
              🪙 {fmt(gold)}
            </div>
            <button
              onClick={onLogout}
              className="rounded-full px-2 py-1 text-xs"
              style={{ background: C.panel, color: C.dim, border: `1px solid ${C.line}` }}
            >
              Exit
            </button>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 rounded-xl py-2 text-sm font-bold"
              style={{
                background: tab === t.id ? `linear-gradient(90deg, ${C.goldDeep}, ${C.gold})` : C.panel,
                color: tab === t.id ? "#0A0D1C" : C.dim,
                border: tab === t.id ? "none" : `1px solid ${C.line}`,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex justify-end mt-1">
          <SyncBadge updatedAt={state.data?.updatedAt} error={syncError} />
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-8 flex flex-col gap-3" style={{ maxWidth: 560, margin: "0 auto" }}>
        {tab === "battle" && state.data && <Battlefield state={state.data} meId={auth.id} />}
        {tab === "hero" && player.data && <Hero player={player.data} />}
        {tab === "shop" && shop.data && player.data && (
          <Shop
            items={shop.data}
            gold={gold}
            onRedeem={doRedeem}
            redemptions={player.data.redemptions || []}
          />
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed left-1/2 rounded-xl px-4 py-2 text-sm font-semibold z-20"
          style={{
            bottom: 24,
            transform: "translateX(-50%)",
            background: "#1E2542",
            border: `1px solid ${C.gold}66`,
            color: C.text,
            boxShadow: "0 8px 24px rgba(0,0,0,.5)",
            animation: "toastIn .25s ease both",
            maxWidth: "90%",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

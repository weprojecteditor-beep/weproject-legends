// ---------- Apps Script Web App client ----------
// The base URL is your deployed /exec endpoint, set in .env as VITE_API_URL.
const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  // Surfaced clearly instead of a confusing "undefined?action=..." fetch.
  console.error("VITE_API_URL is not set. Copy web/.env.example to web/.env and paste your /exec URL.");
}

async function apiGet(params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_URL}?${qs}`, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data && data.error) throw new Error(data.error);
  return data;
}

// POST as text/plain so the browser treats it as a "simple request" and skips
// the CORS preflight that Apps Script can't answer. Body is still JSON; the
// action is a query param on the URL (mirrors the GET ?action= convention).
async function apiPost(action, body) {
  const res = await fetch(`${API_URL}?action=${action}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const getRoster = () => apiGet({ action: "roster" });
export const getState = (team) => apiGet({ action: "state", team });
export const getTv = () => apiGet({ action: "tv" });
export const getPlayer = (id, pin) => apiGet({ action: "player", id, pin });
export const getShop = (team) => apiGet({ action: "shop", team });

export const redeem = (playerId, pin, itemId) => apiPost("redeem", { playerId, pin, itemId });
export const submitMission = (playerId, pin, missionId) => apiPost("submitMission", { playerId, pin, missionId });
export const setHeroClass = (playerId, pin, heroClass, gender) =>
  apiPost("setHeroClass", { playerId, pin, heroClass, gender });

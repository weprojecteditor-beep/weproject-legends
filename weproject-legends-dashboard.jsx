import { useState, useEffect } from "react";

// ---------- Design tokens ----------
const C = {
  bg: "#0A0D1C",
  panel: "#12172B",
  panelSoft: "#1A2038",
  line: "#232B4A",
  gold: "#F5C542",
  goldDeep: "#C89A1F",
  hp: "#FF3B5C",
  hpDeep: "#8E1230",
  exp: "#3EE0F0",
  purple: "#9B6DFF",
  green: "#4ADE80",
  text: "#E8ECFF",
  dim: "#8A93B8",
};

const RANK_COLORS = {
  Warrior: "#9CA3AF", Elite: "#CD7F32", Master: "#C0C0C0",
  Epic: "#9B6DFF", Legend: "#F5C542", Mythic: "#FF3B5C", "Mythical Glory": "#3EE0F0",
};

// ---------- Mock data (real roster) ----------
const BOSS = { name: "July Overlord", hpMax: 1000000, damageDealt: 618400, daysLeft: 9, rage: false };

const DAMAGE_BOARD = [
  { name: "Nina", role: "Marketer", rank: "Epic", lvl: 17, damage: 212300, streak: 3 },
  { name: "Qistina", role: "Live Host", rank: "Epic", lvl: 15, damage: 154200 },
  { name: "Azim", role: "Marketer", rank: "Legend", lvl: 21, damage: 128800 },
  { name: "Wing Nam", role: "Marketer", rank: "Master", lvl: 12, damage: 88700 },
  { name: "Dayah", role: "Live Host", rank: "Master", lvl: 11, damage: 64200 },
  { name: "Intan", role: "Marketer", rank: "Elite", lvl: 9, damage: 41200 },
];

const CREATIVE_BOARD = [
  { name: "Justin", role: "Editor", rank: "Legend", winning: 3, highCtr: 5 },
  { name: "Safiah", role: "Editor", rank: "Epic", winning: 2, highCtr: 4 },
  { name: "Nina", role: "Marketer", rank: "Epic", winning: 2, highCtr: 1 },
  { name: "Syafie", role: "Editor", rank: "Master", winning: 1, highCtr: 3 },
];

const FEED = [
  { icon: "⚔️", tag: "FIRST BLOOD", who: "Qistina", what: "First order of the day", exp: 10, t: "09:12" },
  { icon: "🎯", tag: "WINNING CREATIVE", who: "Justin", what: "Creative #A-114 hit 10 purchases", exp: 80, t: "11:47" },
  { icon: "⚔️⚔️", tag: "DOUBLE KILL", who: "Nina", what: "10 purchases in a single day", exp: 20, t: "14:03" },
  { icon: "🤝", tag: "ASSIST", who: "Syafie", what: "Helped Azim re-cut a live ad", exp: 15, t: "15:26" },
  { icon: "💀", tag: "SAVAGE", who: "Nina", what: "3-day ROAS target streak", exp: 60, t: "17:51" },
];

const ME = {
  name: "Nina", role: "Marketer", rank: "Epic", lvl: 17,
  expInLevel: 340, expToNext: 500, seasonExp: 4120, nextRank: "Legend", nextRankAt: 5500,
  badges: ["S1 Epic", "Assist Queen · May", "Sharpshooter"],
};

const MISSIONS_INIT = [
  { id: 1, text: "Publish ≥1 ad", exp: 10, done: true },
  { id: 2, text: "Submit report before 10:30am", exp: 5, done: true },
  { id: 3, text: "Blast 1 audience pool", exp: 10, done: false },
];

const SHOP = [
  { icon: "☕", name: "Coffee Voucher", price: 300 },
  { icon: "🧋", name: "Bubble Tea", price: 400 },
  { icon: "🎁", name: "Mystery Box", price: 500 },
  { icon: "🍱", name: "Lunch Voucher RM20", price: 800 },
  { icon: "🎟️", name: "Late Pass (1×)", price: 2000 },
  { icon: "🕐", name: "Leave 1hr Early", price: 3000 },
  { icon: "🧃", name: "Team Tea Time — Your Pick", price: 4000 },
  { icon: "🎧", name: "Limited Drop: Earbuds", price: 5000 },
];

const fmt = (n) => n.toLocaleString("en-US");

// ---------- Small pieces ----------
function RankChip({ rank, small }) {
  const col = RANK_COLORS[rank] || C.dim;
  return (
    <span
      className={"inline-flex items-center rounded-full font-semibold " + (small ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1")}
      style={{ color: col, border: `1px solid ${col}66`, background: `${col}1A`, fontFamily: "'Chakra Petch', sans-serif", letterSpacing: "0.05em" }}
    >
      {rank.toUpperCase()}
    </span>
  );
}

function Panel({ children, style }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: C.panel, border: `1px solid ${C.line}`, ...style }}>
      {children}
    </div>
  );
}

function SectionTitle({ children, right }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="text-xs font-bold" style={{ color: C.dim, letterSpacing: "0.2em", fontFamily: "'Chakra Petch', sans-serif" }}>
        {children}
      </div>
      {right}
    </div>
  );
}

// ---------- Boss ----------
function BossCard() {
  const pctLeft = Math.max(0, 100 - (BOSS.damageDealt / BOSS.hpMax) * 100);
  const phases = [
    { at: 75, label: "Snack Day", icon: "🍪" },
    { at: 50, label: "Coffee Day", icon: "☕" },
    { at: 25, label: "Pizza Day", icon: "🍕" },
    { at: 0, label: "Leave Early", icon: "🏆" },
  ];
  return (
    <Panel style={{ background: `linear-gradient(160deg, ${C.panel} 60%, #221029 100%)`, position: "relative", overflow: "hidden" }}>
      <div className="absolute text-7xl opacity-10" style={{ right: -8, top: -12 }}>👹</div>
      <SectionTitle right={<span className="text-xs" style={{ color: C.dim }}>{BOSS.daysLeft} days left</span>}>
        WORLD BOSS · JULY
      </SectionTitle>

      <div className="flex items-end justify-between mb-2">
        <div>
          <div className="text-xl font-bold" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>{BOSS.name}</div>
          <div className="text-xs" style={{ color: C.dim }}>Target RM {fmt(BOSS.hpMax)}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color: C.hp, fontFamily: "'Chakra Petch', sans-serif" }}>
            {pctLeft.toFixed(1)}%
          </div>
          <div className="text-xs" style={{ color: C.dim }}>HP remaining</div>
        </div>
      </div>

      {/* HP bar */}
      <div className="relative w-full rounded-full overflow-hidden" style={{ height: 22, background: "#070A16", border: `1px solid ${C.line}` }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${pctLeft}%`,
            background: `linear-gradient(90deg, ${C.hpDeep}, ${C.hp})`,
            boxShadow: `0 0 14px ${C.hp}AA`,
            transition: "width 1s ease",
          }}
        />
        {[75, 50, 25].map((m) => (
          <div key={m} className="absolute top-0 h-full" style={{ left: `${m}%`, width: 2, background: "#0A0D1C" }} />
        ))}
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color: "#fff", textShadow: "0 1px 3px #000" }}>
          {fmt(BOSS.hpMax - BOSS.damageDealt)} / {fmt(BOSS.hpMax)}
        </div>
      </div>

      {/* Phases */}
      <div className="grid grid-cols-4 gap-2 mt-3">
        {phases.map((p) => {
          const unlocked = pctLeft <= p.at;
          return (
            <div key={p.at} className="rounded-xl p-2 text-center" style={{ background: unlocked ? `${C.gold}14` : C.panelSoft, border: `1px solid ${unlocked ? C.gold + "55" : C.line}`, opacity: unlocked ? 1 : 0.55 }}>
              <div className="text-lg">{unlocked ? p.icon : "🔒"}</div>
              <div className="text-xs mt-1" style={{ color: unlocked ? C.gold : C.dim }}>{p.at}%</div>
              <div className="text-xs" style={{ color: unlocked ? C.text : C.dim }}>{p.label}</div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ---------- Damage leaderboard ----------
function DamageBoard() {
  const sorted = [...DAMAGE_BOARD].sort((a, b) => b.damage - a.damage);
  const max = sorted[0].damage;
  return (
    <Panel>
      <SectionTitle right={<span className="text-xs" style={{ color: C.dim }}>This month</span>}>DAMAGE RANKING</SectionTitle>
      <div className="flex flex-col gap-2">
        {sorted.map((p, i) => (
          <div key={p.name} className="relative rounded-xl px-3 py-2 overflow-hidden" style={{ background: C.panelSoft, border: `1px solid ${i === 0 ? C.gold + "66" : C.line}` }}>
            <div className="absolute left-0 top-0 h-full" style={{ width: `${(p.damage / max) * 100}%`, background: i === 0 ? `${C.gold}14` : `${C.exp}0D` }} />
            <div className="relative flex items-center gap-3">
              <div className="w-6 text-center font-bold" style={{ color: i === 0 ? C.gold : i < 3 ? C.text : C.dim, fontFamily: "'Chakra Petch', sans-serif" }}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm truncate">{p.name}</span>
                  <RankChip rank={p.rank} small />
                  {p.streak ? <span className="text-xs" style={{ color: C.hp }}>🔥×{p.streak}</span> : null}
                </div>
                <div className="text-xs" style={{ color: C.dim }}>{p.role} · Lv{p.lvl}</div>
              </div>
              <div className="text-sm font-bold" style={{ color: i === 0 ? C.gold : C.text, fontFamily: "'Chakra Petch', sans-serif" }}>
                {fmt(p.damage)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ---------- Creative leaderboard ----------
function CreativeBoard() {
  return (
    <Panel>
      <SectionTitle right={<span className="text-xs" style={{ color: C.dim }}>Winning / High-CTR</span>}>CREATIVE RANKING</SectionTitle>
      <div className="flex flex-col gap-2">
        {CREATIVE_BOARD.map((p, i) => (
          <div key={p.name} className="rounded-xl px-3 py-2 flex items-center gap-3" style={{ background: C.panelSoft, border: `1px solid ${i === 0 ? C.purple + "77" : C.line}` }}>
            <div className="w-6 text-center font-bold" style={{ color: i === 0 ? C.purple : i < 3 ? C.text : C.dim, fontFamily: "'Chakra Petch', sans-serif" }}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm truncate">{p.name}</span>
                <RankChip rank={p.rank} small />
              </div>
              <div className="text-xs" style={{ color: C.dim }}>{p.role}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold" style={{ color: C.purple, fontFamily: "'Chakra Petch', sans-serif" }}>🎯 {p.winning}</div>
              <div className="text-xs" style={{ color: C.dim }}>CTR ×{p.highCtr}</div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ---------- Kill feed ----------
function KillFeed() {
  return (
    <Panel>
      <SectionTitle right={<span className="text-xs" style={{ color: C.green }}>● LIVE</span>}>TODAY'S ACHIEVEMENTS</SectionTitle>
      <div className="flex flex-col gap-2">
        {FEED.slice().reverse().map((f, i) => (
          <div key={i} className="feed-item flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: C.panelSoft, border: `1px solid ${C.line}`, animationDelay: `${i * 0.12}s` }}>
            <div className="text-xl">{f.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold" style={{ color: C.gold, letterSpacing: "0.12em", fontFamily: "'Chakra Petch', sans-serif" }}>{f.tag}</div>
              <div className="text-sm truncate">
                <span className="font-semibold">{f.who}</span>
                <span style={{ color: C.dim }}> · {f.what}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold" style={{ color: C.exp }}>+{f.exp}</div>
              <div className="text-xs" style={{ color: C.dim }}>{f.t}</div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ---------- Hero profile ----------
function HeroTab({ gold, missions, toggleMission }) {
  const rankCol = RANK_COLORS[ME.rank];
  const lvlPct = (ME.expInLevel / ME.expToNext) * 100;
  const rankPct = Math.min(100, (ME.seasonExp / ME.nextRankAt) * 100);
  return (
    <div className="flex flex-col gap-3">
      <Panel style={{ background: `linear-gradient(160deg, ${C.panel} 55%, ${rankCol}22 130%)` }}>
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center" style={{ width: 76, height: 76 }}>
            <div className="absolute inset-0 rounded-full" style={{ border: `3px solid ${rankCol}`, boxShadow: `0 0 16px ${rankCol}77` }} />
            <div className="text-4xl">🦸‍♀️</div>
            <div className="absolute rounded-full px-2 text-xs font-bold" style={{ bottom: -6, background: rankCol, color: "#0A0D1C", fontFamily: "'Chakra Petch', sans-serif" }}>
              Lv{ME.lvl}
            </div>
          </div>
          <div className="flex-1">
            <div className="text-xl font-bold" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>{ME.name}</div>
            <div className="text-xs mb-1" style={{ color: C.dim }}>{ME.role} · Season 1</div>
            <RankChip rank={ME.rank} small />
          </div>
          <div className="text-right">
            <div className="text-xl font-bold" style={{ color: C.gold, fontFamily: "'Chakra Petch', sans-serif" }}>🪙 {fmt(gold)}</div>
            <div className="text-xs" style={{ color: C.dim }}>Gold balance</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: C.dim }}>Lv{ME.lvl} → Lv{ME.lvl + 1}</span>
            <span style={{ color: C.exp }}>{ME.expInLevel}/{ME.expToNext} EXP</span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: "#070A16" }}>
            <div className="h-full rounded-full" style={{ width: `${lvlPct}%`, background: `linear-gradient(90deg, #1899AC, ${C.exp})`, boxShadow: `0 0 8px ${C.exp}88` }} />
          </div>

          <div className="flex justify-between text-xs mb-1 mt-3">
            <span style={{ color: C.dim }}>Road to {ME.nextRank}</span>
            <span style={{ color: RANK_COLORS[ME.nextRank] }}>{fmt(ME.seasonExp)}/{fmt(ME.nextRankAt)} Season EXP</span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: "#070A16" }}>
            <div className="h-full rounded-full" style={{ width: `${rankPct}%`, background: `linear-gradient(90deg, ${C.purple}, ${RANK_COLORS[ME.nextRank]})` }} />
          </div>
        </div>
      </Panel>

      <Panel>
        <SectionTitle right={<span className="text-xs" style={{ color: C.dim }}>Complete all +30</span>}>DAILY MISSIONS</SectionTitle>
        <div className="flex flex-col gap-2">
          {missions.map((m) => (
            <button
              key={m.id}
              onClick={() => toggleMission(m.id)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-left w-full"
              style={{ background: C.panelSoft, border: `1px solid ${m.done ? C.green + "55" : C.line}` }}
            >
              <div
                className="flex items-center justify-center rounded-full text-xs font-bold"
                style={{ width: 22, height: 22, background: m.done ? C.green : "transparent", border: `2px solid ${m.done ? C.green : C.dim}`, color: "#0A0D1C" }}
              >
                {m.done ? "✓" : ""}
              </div>
              <div className="flex-1 text-sm" style={{ color: m.done ? C.dim : C.text, textDecoration: m.done ? "line-through" : "none" }}>
                {m.text}
              </div>
              <div className="text-sm font-bold" style={{ color: C.exp }}>+{m.exp}</div>
            </button>
          ))}
        </div>
      </Panel>

      <Panel>
        <SectionTitle>BADGES</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {ME.badges.map((b) => (
            <span key={b} className="text-xs rounded-full px-3 py-1" style={{ background: `${C.gold}14`, color: C.gold, border: `1px solid ${C.gold}44` }}>
              🏅 {b}
            </span>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// ---------- Shop ----------
function ShopTab({ gold, redeem }) {
  return (
    <div className="flex flex-col gap-3">
      <Panel style={{ background: `linear-gradient(160deg, ${C.panel} 60%, ${C.gold}14 140%)` }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs" style={{ color: C.dim, letterSpacing: "0.2em", fontFamily: "'Chakra Petch', sans-serif" }}>MY GOLD</div>
            <div className="text-3xl font-bold" style={{ color: C.gold, fontFamily: "'Chakra Petch', sans-serif" }}>🪙 {fmt(gold)}</div>
          </div>
          <div className="text-xs text-right" style={{ color: C.dim }}>Gold is earned with EXP.<br />Spending never affects your Rank.</div>
        </div>
      </Panel>
      <div className="grid grid-cols-2 gap-3">
        {SHOP.map((s) => {
          const can = gold >= s.price;
          return (
            <div key={s.name} className="rounded-2xl p-3 flex flex-col items-center text-center" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
              <div className="text-3xl mb-1">{s.icon}</div>
              <div className="text-sm font-semibold mb-1" style={{ minHeight: 36 }}>{s.name}</div>
              <div className="text-sm font-bold mb-2" style={{ color: C.gold, fontFamily: "'Chakra Petch', sans-serif" }}>🪙 {fmt(s.price)}</div>
              <button
                onClick={() => can && redeem(s)}
                className="w-full rounded-lg py-1.5 text-sm font-bold"
                style={{
                  background: can ? `linear-gradient(90deg, ${C.goldDeep}, ${C.gold})` : C.panelSoft,
                  color: can ? "#0A0D1C" : C.dim,
                  border: can ? "none" : `1px solid ${C.line}`,
                  cursor: can ? "pointer" : "not-allowed",
                }}
              >
                {can ? "Redeem" : "Not enough Gold"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- App ----------
export default function App() {
  const [tab, setTab] = useState("battle");
  const [gold, setGold] = useState(1860);
  const [missions, setMissions] = useState(MISSIONS_INIT);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleMission = (id) => {
    setMissions((ms) =>
      ms.map((m) => {
        if (m.id !== id) return m;
        const done = !m.done;
        setGold((g) => g + (done ? m.exp : -m.exp));
        if (done) setToast(`✅ Mission complete +${m.exp} EXP / Gold`);
        return { ...m, done };
      })
    );
  };

  const redeem = (item) => {
    setGold((g) => g - item.price);
    setToast(`🎉 ${item.name} redeemed! Pending GM approval`);
  };

  const tabs = [
    { id: "battle", label: "⚔️ Battlefield" },
    { id: "hero", label: "🧙 My Hero" },
    { id: "shop", label: "🛒 Shop" },
  ];

  return (
    <div className="min-h-screen w-full" style={{ background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');
        .feed-item { animation: slideIn .5s ease both; }
        @keyframes slideIn { from { opacity: 0; transform: translateX(18px); } to { opacity: 1; transform: none; } }
        @keyframes toastIn { from { opacity: 0; transform: translateY(12px);} to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .feed-item { animation: none; } }
        button:focus-visible { outline: 2px solid ${C.exp}; outline-offset: 2px; }
      `}</style>

      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3" style={{ background: `linear-gradient(${C.bg} 75%, transparent)` }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-bold" style={{ fontFamily: "'Chakra Petch', sans-serif", letterSpacing: "0.06em" }}>
              WEPROJECT <span style={{ color: C.gold }}>LEGENDS</span>
            </div>
            <div className="text-xs" style={{ color: C.dim }}>Season 1 · July 2026</div>
          </div>
          <div className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: `${C.gold}14`, color: C.gold, border: `1px solid ${C.gold}44` }}>
            🪙 {fmt(gold)}
          </div>
        </div>
        {/* Tabs */}
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
      </div>

      {/* Body */}
      <div className="px-4 pb-8 flex flex-col gap-3" style={{ maxWidth: 560, margin: "0 auto" }}>
        {tab === "battle" && (
          <>
            <BossCard />
            <KillFeed />
            <DamageBoard />
            <CreativeBoard />
          </>
        )}
        {tab === "hero" && <HeroTab gold={gold} missions={missions} toggleMission={toggleMission} />}
        {tab === "shop" && <ShopTab gold={gold} redeem={redeem} />}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed left-1/2 rounded-xl px-4 py-2 text-sm font-semibold z-20"
          style={{
            bottom: 24, transform: "translateX(-50%)", background: "#1E2542",
            border: `1px solid ${C.gold}66`, color: C.text, boxShadow: "0 8px 24px rgba(0,0,0,.5)",
            animation: "toastIn .25s ease both", maxWidth: "90%",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

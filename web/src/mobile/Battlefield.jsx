import { C, RANK_COLORS, PHASE_META, monthName, fmt } from "../theme.js";
import { Panel, SectionTitle, RankChip } from "../ui.jsx";

function BossCard({ boss }) {
  const pctLeft = boss.pctLeft;
  const remaining = Math.max(0, boss.hpMax - boss.damage);
  return (
    <Panel
      style={{
        background: `linear-gradient(160deg, ${C.panel} 60%, #221029 100%)`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div className="absolute text-7xl opacity-10" style={{ right: -8, top: -12 }}>
        👹
      </div>
      <SectionTitle
        right={
          <span className="text-xs" style={{ color: boss.rage ? C.hp : C.dim }}>
            {boss.rage ? "🔥 RAGE ×1.5" : "Live"}
          </span>
        }
      >
        WORLD BOSS · {monthName(boss.month)}
      </SectionTitle>

      <div className="flex items-end justify-between mb-2">
        <div>
          <div className="text-xl font-bold" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>
            {monthName(boss.month)} Overlord
          </div>
          <div className="text-xs" style={{ color: C.dim }}>
            Target RM {fmt(boss.hpMax)}
          </div>
        </div>
        <div className="text-right">
          <div
            className="text-2xl font-bold"
            style={{ color: C.hp, fontFamily: "'Chakra Petch', sans-serif" }}
          >
            {pctLeft.toFixed(1)}%
          </div>
          <div className="text-xs" style={{ color: C.dim }}>
            HP Remaining
          </div>
        </div>
      </div>

      <div
        className="relative w-full rounded-full overflow-hidden"
        style={{ height: 22, background: "#070A16", border: `1px solid ${C.line}` }}
      >
        <div
          className="h-full rounded-full boss-pulse"
          style={{
            width: `${pctLeft}%`,
            background: `linear-gradient(90deg, ${C.hpDeep}, ${C.hp})`,
            boxShadow: `0 0 14px ${C.hp}AA`,
            transition: "width 1s ease",
            animation: boss.rage ? "bossPulse 1.2s ease-in-out infinite" : "none",
          }}
        />
        {[75, 50, 25].map((m) => (
          <div
            key={m}
            className="absolute top-0 h-full"
            style={{ left: `${m}%`, width: 2, background: "#0A0D1C" }}
          />
        ))}
        <div
          className="absolute inset-0 flex items-center justify-center text-xs font-bold"
          style={{ color: "#fff", textShadow: "0 1px 3px #000" }}
        >
          {fmt(remaining)} / {fmt(boss.hpMax)}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-3">
        {boss.phases.map((p) => {
          const meta = PHASE_META[p.at] || { label: `${p.at}%`, icon: "🎁" };
          return (
            <div
              key={p.at}
              className="rounded-xl p-2 text-center"
              style={{
                background: p.unlocked ? `${C.gold}14` : C.panelSoft,
                border: `1px solid ${p.unlocked ? C.gold + "55" : C.line}`,
                opacity: p.unlocked ? 1 : 0.55,
              }}
            >
              <div className="text-lg">{p.unlocked ? meta.icon : "🔒"}</div>
              <div className="text-xs mt-1" style={{ color: p.unlocked ? C.gold : C.dim }}>
                {p.at}%
              </div>
              <div className="text-xs" style={{ color: p.unlocked ? C.text : C.dim }}>
                {meta.label}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function KillFeed({ feed }) {
  return (
    <Panel>
      <SectionTitle right={<span className="text-xs" style={{ color: C.green }}>● LIVE</span>}>
        TODAY'S ACHIEVEMENTS
      </SectionTitle>
      {feed.length === 0 ? (
        <div className="text-sm text-center py-4" style={{ color: C.dim }}>
          No achievements yet today. Go get First Blood! ⚔️
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {feed.map((f, i) => (
            <div
              key={i}
              className="feed-item flex items-center gap-3 rounded-xl px-3 py-2"
              style={{ background: C.panelSoft, border: `1px solid ${C.line}`, animationDelay: `${i * 0.08}s` }}
            >
              <div className="text-xl">{f.icon}</div>
              <div className="flex-1 min-w-0">
                <div
                  className="text-xs font-bold"
                  style={{ color: C.gold, letterSpacing: "0.12em", fontFamily: "'Chakra Petch', sans-serif" }}
                >
                  {f.tag}
                </div>
                <div className="text-sm truncate">
                  <span className="font-semibold">{f.name}</span>
                  <span style={{ color: C.dim }}> · {f.description}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold" style={{ color: C.exp }}>
                  +{f.exp}
                </div>
                <div className="text-xs" style={{ color: C.dim }}>
                  {f.timestamp ? f.timestamp.split(" ")[1] || "" : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function DamageBoard({ rows }) {
  const sorted = rows.filter((p) => p.damage > 0);
  const max = sorted.length ? sorted[0].damage : 1;
  return (
    <Panel>
      <SectionTitle right={<span className="text-xs" style={{ color: C.dim }}>This month</span>}>
        DAMAGE RANKING
      </SectionTitle>
      {sorted.length === 0 ? (
        <div className="text-sm text-center py-4" style={{ color: C.dim }}>
          No damage dealt yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((p, i) => (
            <div
              key={p.playerId}
              className="relative rounded-xl px-3 py-2 overflow-hidden"
              style={{ background: C.panelSoft, border: `1px solid ${i === 0 ? C.gold + "66" : C.line}` }}
            >
              <div
                className="absolute left-0 top-0 h-full"
                style={{ width: `${(p.damage / max) * 100}%`, background: i === 0 ? `${C.gold}14` : `${C.exp}0D` }}
              />
              <div className="relative flex items-center gap-3">
                <div
                  className="w-6 text-center font-bold"
                  style={{ color: i === 0 ? C.gold : i < 3 ? C.text : C.dim, fontFamily: "'Chakra Petch', sans-serif" }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{p.name}</span>
                    <RankChip rank={p.rank} small />
                  </div>
                  <div className="text-xs" style={{ color: C.dim }}>
                    {p.role} · Lv{p.level}
                  </div>
                </div>
                <div
                  className="text-sm font-bold"
                  style={{ color: i === 0 ? C.gold : C.text, fontFamily: "'Chakra Petch', sans-serif" }}
                >
                  {fmt(p.damage)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function CreativeBoard({ rows }) {
  return (
    <Panel>
      <SectionTitle right={<span className="text-xs" style={{ color: C.dim }}>Winning / High-CTR</span>}>
        CREATIVE RANKING
      </SectionTitle>
      {rows.length === 0 ? (
        <div className="text-sm text-center py-4" style={{ color: C.dim }}>
          No winning creatives yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((p, i) => (
            <div
              key={p.playerId}
              className="rounded-xl px-3 py-2 flex items-center gap-3"
              style={{ background: C.panelSoft, border: `1px solid ${i === 0 ? C.purple + "77" : C.line}` }}
            >
              <div
                className="w-6 text-center font-bold"
                style={{ color: i === 0 ? C.purple : i < 3 ? C.text : C.dim, fontFamily: "'Chakra Petch', sans-serif" }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm truncate">{p.name}</span>
                <div className="text-xs" style={{ color: C.dim }}>
                  {p.role} · incl. Assist Damage
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold" style={{ color: C.purple, fontFamily: "'Chakra Petch', sans-serif" }}>
                  🎯 {p.winningCount}
                </div>
                <div className="text-xs" style={{ color: C.dim }}>
                  CTR ×{p.highCtrCount}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

export default function Battlefield({ state }) {
  return (
    <>
      <BossCard boss={state.boss} />
      <KillFeed feed={state.feed || []} />
      <DamageBoard rows={state.damageRanking || []} />
      <CreativeBoard rows={state.creativeRanking || []} />
    </>
  );
}

import { C, fmt } from "../theme.js";
import { coinReward } from "../ml.jsx";
import { Panel, SectionTitle } from "../ui.jsx";

const CATEGORY_LABEL = {
  mission: "Mission",
  action: "Action",
  milestone: "Milestone",
  achievement: "Achievement",
  assist: "Assist",
  mvp: "MVP",
  adjust: "Adjust",
};

export default function Guide({ state, role }) {
  const actions = (state.actionsTable || []).filter((a) => a.role === role || a.role === "Any");
  const missions = (state.missionsConfig || []).filter((m) => m.role === role || m.role === "Any");

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs text-center" style={{ color: C.dim }}>
        Rules are managed by the GM in Google Sheets — this always reflects the latest numbers.
      </div>

      <Panel>
        <SectionTitle>DAILY MISSIONS · {role}</SectionTitle>
        {missions.length === 0 ? (
          <div className="text-sm text-center py-3" style={{ color: C.dim }}>No missions configured yet.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {missions.map((m) => (
              <div key={m.missionId} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: C.panelSoft, border: `1px solid ${C.line}` }}>
                <span className="text-sm">{m.text}</span>
                <span className="text-sm font-bold" style={{ color: m.exp > 0 ? C.exp : C.gold }}>{m.exp > 0 ? `+${m.exp}` : (coinReward(m.text) != null ? `🪙 +${coinReward(m.text)}` : "🪙")}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel>
        <SectionTitle>EXP RULES · {role}</SectionTitle>
        {actions.length === 0 ? (
          <div className="text-sm text-center py-3" style={{ color: C.dim }}>No rules configured yet.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {actions.map((a) => (
              <div key={a.actionId} className="rounded-xl px-3 py-2" style={{ background: C.panelSoft, border: `1px solid ${C.line}` }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{a.name}</span>
                  <span className="text-sm font-bold" style={{ color: C.exp }}>+{a.exp}</span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: C.dim }}>{a.condition}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="text-xs rounded-full px-2 py-0.5"
                    style={{ color: C.gold, background: `${C.gold}14`, border: `1px solid ${C.gold}44` }}
                  >
                    {CATEGORY_LABEL[a.category] || a.category}
                  </span>
                  {a.dailyCap != null && (
                    <span className="text-xs" style={{ color: C.dim }}>daily cap ref. {fmt(a.dailyCap)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

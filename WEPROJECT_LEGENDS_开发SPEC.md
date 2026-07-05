# WEPROJECT LEGENDS — 开发 Spec（直接复制给 Claude Code）

> 使用方法：在项目文件夹打开 Claude Code，把本文件放进文件夹（连同 UI 参考文件 `weproject-legends-dashboard.jsx`），然后说：「按照 SPEC.md 分阶段实现，先做 Phase 1」。

---

## 项目概述

为 16 人电商营销团队开发一个游戏化业绩 Dashboard（Mobile Legends 风格）。Google Sheets 作数据库（HR 每天手动录入），Google Apps Script 作免费 API 层，React Web App 作前端。三种使用场景：办公室 TV 大屏轮播、员工手机查看个人资料、商店兑换。

**技术栈（不要更改）：**
- 数据库：Google Sheets
- API：Google Apps Script（Web App 部署，返回 JSON）
- 前端：React + Vite，部署到 Vercel
- 样式：参考 `weproject-legends-dashboard.jsx` 的设计 token（深蓝底 #0A0D1C、金 #F5C542、HP 红 #FF3B5C、EXP 青 #3EE0F0、段位色表），字体 Chakra Petch（数字/标题）+ Inter（正文）
- **UI 语言：全部英文**。参考文件里的中文界面文案一律转成英文，对照表见文末「UI Copy」一节
- 无真实登录系统：员工从下拉选自己的名字 + 4 位 PIN（存在 Players 表），仅防误操作，不需要加密级安全

---

## Phase 1：Google Sheets 结构

生成一个初始化脚本（Apps Script 或给出手动建表说明 + 可导入的 CSV），建立以下 7 个 Tab：

### Tab 1: `Players`
| 列 | 说明 |
|---|---|
| player_id | P001, P002… |
| name | 显示名 |
| role | Marketer / Editor / LiveHost |
| pin | 4 位数字 |
| avatar | emoji 或图片 URL |
| join_date | 入职日（新人保护判定用） |
| active | TRUE/FALSE |

**预填 16 名成员（player_id 按此顺序 P001–P016，PIN 由 GM 分配后填入）：**

| Role | Members |
|---|---|
| Marketer (8) | Izz, Nina, Azim, Wing Nam, Wen Pei, Nizam, Intan, Ain |
| LiveHost (5) | Qistina, Dayah, Syaza, Alia, Connie |
| Editor (3) | Justin, Syafie, Safiah |

### Tab 2: `EXP_Log`（核心流水账，GM 每天录这里）
| 列 | 说明 |
|---|---|
| log_id | 自增 |
| date | 发生日期 |
| player_id | — |
| category | mission / action / milestone / achievement / assist / boss / mvp / adjust |
| item | 文字描述（如 "Winning Creative #A114"） |
| exp | 数值（可为负，用于 Refund 扣回） |
| amount_rm | 若为 Revenue 类，填 RM 金额（算 Boss Damage 用），否则留空 |
| approved | TRUE/FALSE（GM 勾选后才生效） |
| note | 备注 |

### Tab 3: `Redemptions`（商店兑换记录）
| 列 | 说明 |
|---|---|
| timestamp / player_id / item_id / item_name / gold_cost / status | status: pending / approved / fulfilled / rejected |

### Tab 4: `Shop`
| 列 | 说明 |
|---|---|
| item_id / name / icon(emoji) / price / stock(-1=无限) / active | — |

预填 8 个商品：Coffee Voucher 300 / Bubble Tea 400 / Mystery Box 500 / Lunch Voucher 800 / 迟到豁免卡 2000 / 提早放工1小时 3000 / 团队下午茶点单权 4000 / 限量实物 5000（stock=1）

### Tab 5: `Boss`
| 列 | 说明 |
|---|---|
| month | 2026-07 |
| hp_max | 例 1000000 |
| refund_adjust | 每周结算的 Refund 总额（加回 HP 用） |
| rage_active | TRUE/FALSE（GM 手动开，前端才显示 Rage） |
| defeated_streak | 连续击杀月数 |

Boss 当前伤害 = SUM(EXP_Log 中 approved=TRUE 的 amount_rm) − refund_adjust，由 API 计算，不手填。

### Tab 6: `Config`（所有游戏数值，代码从这里读，不要写死在代码里）
键值对两列（key / value），至少包含：
- 段位门槛：warrior=0, elite=800, master=2000, epic=3600, legend=5500, mythic=7500
- Level 门槛：lv5=1000, lv10=3000, lv15=6000, lv20=10000, lv25=15000, lv30=21000（中间等级线性插值）
- daily_cap=200, rage_cap=300, rage_multiplier=1.5
- season_start, season_end（日期）
- cap 豁免类别：milestone, achievement, boss, mvp

### Tab 7: `Achievements_Feed`（TV 弹幕来源）
| 列 | 说明 |
|---|---|
| timestamp / player_id / tag(如 FIRST BLOOD) / icon(emoji) / description / exp | GM 录入，前端按时间倒序显示当天的 |

---

## Phase 2：Apps Script API

单文件 `Code.gs`，部署为 Web App（Execute as: me；Access: Anyone with link）。

### GET endpoints（doGet，用 ?action= 区分）

**`?action=state`** → 返回全局状态 JSON：
```
{
  boss: { month, hpMax, damage, pctLeft, rage, phases: [{at:75, unlocked:bool}...] },
  damageRanking: [{ playerId, name, role, rank, level, damage }...],      // 按 amount_rm 汇总
  creativeRanking: [{ playerId, name, role, winningCount, highCtrCount }], // 从 EXP_Log item 关键字统计
  feed: [今天的 Achievements_Feed],
  updatedAt
}
```

**`?action=player&id=P001&pin=1234`** → 个人资料：
```
{
  name, role, avatar,
  level, expInLevel, expToNextLevel,          // 按 Config level 表算，用全部历史 EXP
  seasonExp, rank, nextRank, expToNextRank,   // 只算 season_start 之后的 EXP
  gold,                                        // 总 approved EXP − 已 approved 兑换的 gold_cost
  todayExp, badges(从 EXP_Log 提取),
  recentLog: 最近 20 条
}
```

**`?action=shop`** → 商品列表 + 库存

### POST endpoint（doPost）

**兑换**：body = { playerId, pin, itemId } → 校验 PIN、Gold 余额、库存 → 写入 Redemptions（status=pending）→ 返回成功。Gold 立即冻结（余额计算时把 pending 也扣掉），GM 在 Sheet 里改 status 完成审核。

### 计算规则（重要，写进注释）
1. 只统计 approved=TRUE 的行
2. Gold = 累计 approved EXP − (approved + pending) 兑换
3. Rank 用赛季内 EXP；Level 用全部历史 EXP
4. 每日上限逻辑**不在 API 里强制**（GM 录入时人工把关），但 API 返回 todayExp 供 GM 核对
5. 所有响应加 CORS 头，缓存 60 秒（CacheService）避免 Sheet 读取超限

---

## Phase 3：React 前端

三个路由，UI 完全按 `weproject-legends-dashboard.jsx` 参考文件的风格实现（该文件是带假数据的原型，把假数据换成 API 调用即可，组件结构可直接沿用）：

### `/` 手机端（默认）
- 首次进入：选名字 + 输 PIN（存 sessionStorage，不用 localStorage）
- 三个 Tab：⚔️ 战场（Boss + 弹幕 + 双榜）/ 🧙 英雄（个人 Profile + 今日任务状态只读显示）/ 🛒 商店（兑换走 POST）
- 每 60 秒自动刷新

### `/tv` TV 大屏模式（重点）
- 横屏 1920×1080 优化，无需登录
- 自动轮播 3 屏，每屏 15 秒：① Boss 血条特写 + 阶段奖励 ② Damage 榜 + Creative 榜并排 ③ 今日 Achievement 弹幕墙
- 字体放大 2–3 倍，Boss 血条要有呼吸光效
- rage_active=TRUE 时全屏加红色火焰边框 + "🔥 BOSS RAGE ×1.5" 横幅
- 每 30 秒拉一次数据；新 Achievement 出现时从右侧滑入并短暂高亮

### `/gm` 简易 GM 面板（可选，Phase 4 再做）
- 显示今日各人 todayExp（核对上限用）、pending 兑换列表

### 通用要求
- API URL 放 `.env`（VITE_API_URL）
- 加载中显示游戏风格 loading（"Summoning heroes…"）
- API 失败显示上次缓存数据 + "Data sync failed" 小角标，不要白屏
- 响应式：手机 380px 起，TV 1920px

---

## Phase 4：部署

1. Apps Script：Deploy → New deployment → Web app → 拿到 /exec URL
2. 前端：push 到 GitHub → Vercel import → 设 VITE_API_URL 环境变量
3. 给出 TV 端设置说明（Chrome 全屏打开 /tv，禁休眠）

---

## 验收清单

- [ ] GM 在 EXP_Log 加一行并勾 approved 后，60 秒内 TV 血条和排行榜更新
- [ ] Editor 出现在 Creative 榜而不是只有 Damage 榜
- [ ] 员工手机兑换后 Gold 立即冻结，Redemptions 出现 pending 行
- [ ] Gold 不足时兑换按钮禁用
- [ ] rage_active 开关能触发 TV Rage 特效
- [ ] 赛季 EXP 与历史 EXP 分开计算正确（Rank vs Level）
- [ ] Refund 负数行会同时扣个人 Damage 和加回 Boss HP
- [ ] PIN 错误时返回友好错误，不暴露他人数据

---

## 明确不做（V1 范围外）

- 不接 Meta Ads API / 公司 System API（数据全部 GM 手录）
- 不做真实账号系统 / OAuth
- 不做自动发奖、自动判定 Achievement
- 不用数据库（Supabase 等），坚持 Google Sheets

---

## UI Copy（英文文案对照，全站统一用这套）

| 位置 | English Copy |
|---|---|
| Tabs | ⚔️ Battlefield / 🧙 My Hero / 🛒 Shop |
| Boss 区 | WORLD BOSS · JULY / HP Remaining / Target RM 1,000,000 / xx days left |
| 阶段奖励 | Snack Day / Coffee Day / Pizza Day / Leave 1hr Early / 🔒 Locked |
| Rage 横幅 | 🔥 BOSS RAGE — ALL EXP ×1.5 |
| 榜单 | Damage Ranking / Creative Ranking / incl. Assist Damage |
| 弹幕区 | TODAY'S ACHIEVEMENTS / ● LIVE |
| Profile | Level / Season EXP / Rank Progress / Gold Balance / Daily Missions / Complete all +30 / Badges |
| 商店 | MY GOLD / Redeem / Not enough Gold / Redeemed! Pending GM approval / Gold is earned with EXP — spending it never affects your Rank |
| 登录 | Select your hero / Enter PIN / Wrong PIN, try again |
| 系统 | Summoning heroes… / Data sync failed / Last updated xx:xx |

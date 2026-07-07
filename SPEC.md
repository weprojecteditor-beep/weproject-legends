# WEPROJECT LEGENDS — 开发 Spec V5.1（单一权威版，直接复制给 Claude Code）
> 使用方法：在项目文件夹打开 Claude Code，把本文件 + UI 参考文件 `weproject-legends-dashboard.jsx` 放进文件夹，然后说：「按照 SPEC.md 分阶段实现，先做 Phase 1」。
>
> **本文件已完全取代旧版 V1–V4 及所有增补，不要再参考旧版。冲突一律以本文件为准。**
---
## 0. 已锁定的核心决策（先读，覆盖一切）
1. **删除 World Boss** — Crystal War 是唯一战斗系统。原 Boss 的阶段奖励（Snack / Coffee / Pizza / Leave Early）改挂在**拆塔**上。
2. **Crystal War = 纯客观 Revenue，1:1，Live Tug + Weekly Lock**（见 §4）。Mission / Assist 等主观项目**永不**影响水晶战。**水晶战的机制模型见 §4.0，那是唯一权威定义，冲突以 §4.0 为准。**
3. **Hero Class = 按 role 锁定「职业大类」，大类内有多个英雄可自选**。加成由 role 决定（写在 `Actions` 表的 role 行里），大类内各英雄只是外观/身份差异，不影响数值 → 对战永远平衡。
4. **KO 排行榜 = 跨队 Lane Matchup**（#1 打 #1…）。跨队**只共享 Damage 数字 + 名字**，其余（Gold / 兑换 / 任务 / EXP 明细）严格隔离。
5. **水晶「闪闪发亮」在 Dashboard 和 TV 两处都要**，光效强度随水晶/塔 HP 变化。
6. **Refund 只走一条路**：在 `EXP_Log` 补一条负数行（负 `amount_rm` / 负 `exp`）。**删除所有 refund_adjust 字段**，杜绝双重扣款。
7. **升级速度奖励**：pace badge + 「首个到 Lv X」赏金，均以 **join_date** 为起点计算（护新人）。API 只**标记**资格，由 GM 发放（不自动发奖）。
8. **赛季 = 自然月**（Rank / Crystal War / Buffs 同步每月重置）。
9. **Daily cap 为「参考值」**：Guide 页显示、API 返回 `todayExp` 供 GM 核对，**API 不拒绝任何行**，GM 录入时人工把关。
10. **所有倍率（Power Creep ×1.2、Lord ×2）由 GM 录入时算进数字**；前端 flag 只驱动视觉，API 绝不自己乘。
11. **Apps Script 现实约束**（写进注释）：`ContentService` 无法设 CORS 响应头 → GET 走简单请求，POST 用 `text/plain` body 绕过预检；所有写操作用 `LockService`；`CacheService` 分端点缓存（每 key <100KB）60 秒；PIN 失败用缓存做限速。
12. 前端 **4 个 Tab**；TV **单台中立广播**（4 屏轮播）；登录走 **War Splash → 选英雄 → PIN → 欢迎**，首次登入补「选职业（限本 role 大类）+ 头像」。
13. Gold 显示 clamp 到 ≥0，内部保留真实值（可为负，随后续 EXP 自愈）。
---
## 项目概述
为 16 人电商营销团队（后扩展为 WeProject + Wellous 双队）开发游戏化业绩 Dashboard（Mobile Legends 风格）。Google Sheets 作数据库（GM 每天手动录入），Google Apps Script 作免费 API 层，React Web App 作前端。三种场景：办公室单台 TV 大屏轮播、员工手机看个人资料、商店兑换。
**技术栈（不要更改）：**
- 数据库：Google Sheets（单一 Sheet，双队同表）
- API：Google Apps Script（单文件 Web App，返回 JSON）
- 前端：React + Vite，部署 Vercel
- 样式：深蓝底 `#0A0D1C`、金 `#F5C542`、HP 红 `#FF3B5C`、EXP 青 `#3EE0F0`；WeProject 青色主题 / Wellous 红色主题；字体 Chakra Petch（数字/标题）+ Inter（正文）
- **UI 全英文**，文案对照见文末
- 无真实登录：员工选名字 + 4 位 PIN，仅防误操作
---
## Phase 1：Google Sheets 结构（共 11 个 Tab）
生成初始化脚本（Apps Script 建表 + 可导入 CSV）。
### Tab 1: `Players`
| 列 | 说明 |
|---|---|
| player_id | P001… |
| team | weproject / wellous |
| name | 显示名 |
| role | Marketer / Editor / LiveHost |
| hero_class | 见 §Hero Class；**必须属于本 role 的大类**，首次登入自选 |
| gender_pref | 选头像用 |
| pin | 4 位数字 |
| avatar | emoji 或图片 URL |
| join_date | 入职日（新人保护 + pace 奖励起点） |
| active | TRUE/FALSE |
**预填 WeProject 16 名成员（P001–P016，PIN 由 GM 填，hero_class 留空待选）：**
| Role | Members |
|---|---|
| Marketer (8) | Izz, Nina, Azim, Wing Nam, Wen Pei, Nizam, Intan, Ain |
| LiveHost (5) | Qistina, Dayah, Syaza, Alia, Connie |
| Editor (3) | Justin, Syafie, Safiah |
Wellous 成员由 GM 后续在同表按 `team=wellous` 填入。
### Tab 2: `EXP_Log`（核心流水账，GM 每天录）
| 列 | 说明 |
|---|---|
| log_id | 自增 |
| date | 发生日期 |
| player_id | — |
| category | mission / action / milestone / achievement / assist / mvp / adjust |
| item | 文字描述（如 "Winning Creative #A114"） |
| exp | 数值（可为负，用于 Refund/扣回） |
| amount_rm | Revenue 类填 RM 金额（算 Damage + Crystal War 用），否则留空 |
| approved | TRUE/FALSE（勾选后才生效） |
| note | 备注 |
> **同一 amount_rm 同时驱动两处：个人 Damage 排行 + 该队 Crystal War 累计。这是有意为之（一个数字，两种呈现），不是 bug。** Refund = 补一条负 amount_rm 行，两处自动回滚。
### Tab 3: `Redemptions`
| 列 | 说明 |
|---|---|
| timestamp / player_id / item_id / item_name / gold_cost / status | status: pending / approved / fulfilled / rejected |
### Tab 4: `Shop`
| 列 | 说明 |
|---|---|
| item_id / team / name / icon / price / stock(-1=无限) / active | 两队商店不同，按 team 维护 |
WeProject 预填 8 商品：Coffee Voucher 300 / Bubble Tea 400 / Mystery Box 500 / Lunch Voucher 800 / Late Pass 2000 / Leave 1hr Early 3000 / Team Tea Treat 4000 / Limited Item 5000 (stock=1)。Wellous 商店留空待 GM 填。
### Tab 5: `Config`（所有数值，代码从这里读，不写死）
key / value 两列，至少：
- 段位门槛：warrior=0, elite=800, master=2000, epic=3600, legend=5500, mythic=7500
- Level 门槛：lv5=1000, lv10=3000, lv15=6000, lv20=10000, lv25=15000, lv30=21000（线性插值）
- daily_cap=200（参考值，不强制）
- cap 豁免类别：milestone, achievement, mvp
- season_start, season_end（= 当月首尾）
- **Crystal War**：towers_per_side=3, week_reset_day=monday, lock_time=23:59, lord_multiplier=2
- **KO 榜**：ko_margin=2（一方 Damage ≥ 对手 2× 显示 KO）
- **Pace 奖励**：pace_lv10_days=30 / pace_lv10_bonus=500；pace_lv20_days=75 / pace_lv20_bonus=1000（pace 类以 join_date 为起点，护新人）。
  - ⚠️ **bounty_lv15=1000 的判定基准**：因为 Level 用全历史 EXP 永不重置，若按"有史以来首个到 Lv15"会导致一辈子只触发一次。故改为按 **season_exp（赛季/当月 EXP）** 判定——「本赛季首个赛季 EXP 达到 Lv15 对应门槛者」，每赛季可重新触发一次，人人有机会。
- **安全**：pin_fail_limit=10, pin_fail_window_min=10
### Tab 6: `Achievements_Feed`（TV 弹幕来源）
| 列 | 说明 |
|---|---|
| timestamp / player_id / tag(如 FIRST BLOOD) / icon / description / exp | 时间倒序显示当天；team 由 player_id 推导，混合弹幕带队伍徽章 |
### Tab 7: `Actions`（EXP 规则总表 = Hero Class 加成的载体）
| 列 | 说明 |
|---|---|
| action_id / team / role / name_en / condition_en / exp / daily_cap / category(action/milestone/achievement/assist) / active |
> **Class 加成机制**：加成由 `role` 决定，就是这张表里 role 对应的行。同一大类内的不同英雄（如 Marksman/Mage/Assassin）共享该 role 的行，数值相同，只是外观不同 → 平衡不受影响。GM 加/减奖励只动此表，Guide 页自动同步。
### Tab 8: `Missions`（每日任务配置）
| mission_id / team / role / text_en / exp / sort / active |
### Tab 9: `Mission_Log`（提交 + 审批）
| date / player_id / mission_id / status | pending / approved / rejected。员工提交=pending；GM 改 approved → 同步写一行 EXP_Log，EXP 才生效 |
### Tab 10: `Crystal_War`（塔状态 API 维护，周结算历史）
| 列 | 说明 |
|---|---|
| season | 2026-07 |
| current_week_no | 当前第几周 |
| week_start | 本周一日期 |
| wp_towers | WeProject 已拆掉 Wellous 的塔数（0–3；3 后再赢一周 = 拆水晶） |
| wl_towers | 反之 |
| crystal_broken | none / weproject / wellous |
| lord_double_side | 次日 ×2 归属（weproject/wellous/none） |
| lord_double_date | ×2 生效日 |
> 本周实时净额（tug 位置）不存，由 API 从 `EXP_Log` 现算（见 §4）。GM 每周日 23:59 触发一次结算（GM 面板按钮或改 current_week_no），API 把当周赢家 +1 塔。
### Tab 11: `Buffs`（中立野怪）
| date / buff_type(power/lord) / status(alive/slain) / slain_by / effect_until |
- **Power Creep**：每日刷新。击杀条件锁死为**当日个人首个达成 10 笔有效成交（Double Kill）者**——与 Achievement 的 Double Kill 定义完全一致，不用 winning creative、不用 GM 主观认定。该员工替全队斩杀 → 全队当日 EXP ×1.2（GM 录入当日分数时算进去）
- **Lord**：打破赛季单日 Revenue 纪录（API 比对 `Config` 记录值，破纪录时更新）→ 次日该队 Crystal 伤害 ×2（GM 录入时算进）。**因为 ×2 是 GM 手动算，`lord_double_date` 到期日 API 无法自动核对**，故 GM 面板必须在生效当日显示醒目横幅「⚠️ 今天要给 {队伍} 的 Revenue 算 Lord ×2」，防止 GM 忘记或算错日子。
---
## §4.0 Crystal War 机制模型（唯一权威定义，冲突以此为准）
**两层结构，互不混淆：**
**第 1 层 — 本周绳索（Live Tug，连续，每周一清零）**
- 绳索位置 = 本周净额 = `SUM(我队 approved amount_rm，本周内) − SUM(敌队同式)`。正数=绳子往敌方推。
- 绳索**只反映本周**，纯实时可视化，每周一 00:00 视觉上弹回中点。
- 绳索**不是 HP 池**，不累计跨周。
**第 2 层 — 塔（离散，每周结算一次）**
- 每边 3 座塔，是**离散的周胜场计数**，不是 HP 条。
- 每周日 23:59 结算：当周绳索净额为正的一方 = 本周赢家 → 敌方 **+1 塔被拆**（即 `wp_towers` 或 `wl_towers` +1）。净额为 0（平）= 无人拆塔。
- 拆满敌方 3 塔后，**下一个赢的周** = 拆水晶 = 该队直接赢下赛季。
**绳索与塔的关系（这就是"推塔"观感）**：绳子推到你这一端到顶 = 视觉上该周你赢 = 周日结算时倒一座敌塔 + 绳子重置回中点。绳子是"本周进度"，塔是"已赢周数的战果"。
**个人 Damage 排行（第 3 个独立视图）**
- 个人 Damage = `SUM(该员工 approved amount_rm，整月累计)`，**整月不清零**。
- 它与绳索共用同一批 `amount_rm` 数据，但**聚合口径不同**（个人 vs 全队、整月 vs 本周）。§0.6「一个数字两种呈现」指的是"同一笔 Revenue 既进个人 Damage 也进水晶战净额"，**不代表两者数值相等或同步清零**。验收清单据此理解。
**赛季末残缺周规则（§0.8 月末 vs 周日结算对齐）**
- 若某周工作日 <4 天（通常是月末残缺周），**该周不单独结算、不给塔**，其净额并入**上一个完整周**一起算。
- 保证没有队伍靠 2 天的偶然爆发赢下整个赛季。
**赛季胜负判定（优先级）**：① 先拆掉敌方 3 塔 + 水晶者胜 → ② 若月末无人拆水晶，拆敌塔总数多者胜 → ③ 再平，赛季总 Revenue 高者胜。
---
## Phase 2：Apps Script API（单文件 `Code.gs`）
部署为 Web App（Execute as: me；Access: Anyone with link）。
### GET（doGet，`?action=` 区分）
**`?action=state&team=weproject`**（手机端，按登录者 team）→
```
{
  crystalWar: {
    weekNo, weekStart, lockAt,
    liveNet,                 // 本周 (本队Rev − 敌队Rev)，正=我方推进
    liveLeader,              // 'us' | 'enemy' | 'even'
    ourTowers, enemyTowers,  // 依 team 镜像
    crystalBroken,           // none | us | enemy
    lord: { side, date }     // 次日 ×2 状态
  },
  laneMatchups: [            // 跨队 KO 榜，仅 name + damage
    // 配对规则（防泄露对方人数）：两队各按 Damage 降序，只配到 min(我队人数, 敌队人数) 个 slot；
    // 多出来的人不显示敌方格，也不显示"敌方空位"。一方 Damage ≥ 对手 ko_margin(×2) 显示 KO。
    { slot, us:{name,damage}, enemy:{name,damage}, ko:'us'|'enemy'|null }
  ],
  creativeRanking: [{ playerId, name, role, winningCount, highCtrCount }],  // 本队
  buffs: { powerCreep:{status,slainBy}, lord:{status,slainBy} },
  feed: [今天本队 Achievements_Feed],
  actionsTable, missionsConfig,   // Guide 页用，按 team+role
  updatedAt
}
```
**`?action=tv`**（单台中立 TV，返回双队）→ `{ crystalWar(中立视角:wp/wl), factions:{weproject:{top3Damage,feed}, wellous:{...}}, mixedFeed, laneMatchups, updatedAt }`
**`?action=player&id=P001&pin=1234`** →
```
{
  name, role, team, avatar, heroClass, classFamily,
  level, expInLevel, expToNextLevel,          // 全历史 EXP
  seasonExp, rank, nextRank, expToNextRank,   // 赛季(当月) EXP
  gold,                                        // 见计算规则，显示 clamp ≥0
  todayExp, badges,
  missionsToday: [{ missionId, text, status }],// todo/pending/approved
  redemptionHistory: [...],
  paceEligible: [{ type:'pace'|'bounty', label, bonus }],  // API 标记，GM 发放
  recentLog: 最近 20 条
}
```
**`?action=shop&team=weproject`** → 商品 + 库存
### POST（doPost，body 用 `text/plain` 承载 JSON 以绕过 CORS 预检）
- **redeem** `{ playerId, pin, itemId }` → 校验 PIN / Gold / 库存 → 写 Redemptions(pending) → Gold 立即冻结。**防重复**：同员工同商品若已有一条 **pending**（未审批）则拒绝再提交；但**已 approved/fulfilled 的不算**——员工一天正当地买 2 杯咖啡是允许的（第一杯审批后即可买第二杯）。
- **submitMission** `{ playerId, pin, missionId }` → 写 Mission_Log(pending)；再次点击=取消（删 pending 行）
- **setHeroClass** `{ playerId, pin, heroClass, gender }` → **校验 heroClass ∈ 本 role 大类**，否则拒绝；写回 Players
- **lockWeek** `{ adminPin, weekNo }`（GM）→ 读当周净额，赢家 +1 塔（满 3 塔后再赢=拆水晶），推进 current_week_no
### 计算规则（写进注释）
1. 只统计 `approved=TRUE`。
2. **Gold** = 累计 approved EXP − (approved + pending) 兑换总额；显示 clamp ≥0，内部保留真实值。**若内部真实值 < 显示值（即真实为负，通常因 Refund 扣回或并发兑换）**，`player` 接口额外返回 `goldPendingAdjustment: true` + `goldRealValue`，前端在 Gold 旁显示小提示「⚠️ pending adjustment」，避免员工看到 0 却买不了东西又不知原因。
3. **Rank** 用赛季(当月)EXP；**Level** 用全历史 EXP。
4. **Cap 不强制**：API 返回 `todayExp`，绝不拒绝行。
5. **Crystal War**：完整机制模型见 **§4.0（权威）**。要点：本周净额（绳索，每周清零）与个人 Damage（整月累计）是两层，共用 `amount_rm` 但聚合口径不同；周日 23:59 结算赢家 +1 塔；工作日 <4 天的残缺周并入上一完整周不单独给塔；Refund 走负行自动回滚两层；Lord ×2 已由 GM 算进数字。赛季胜负优先级见 §4.0。
6. **Pace / Bounty**：API 依 `join_date` + EXP_Log 时间戳算资格，写入 `paceEligible` **仅标记**，由 GM 发放（保持「不自动发奖」）。
7. **倍率**：Power Creep ×1.2 / Lord ×2 一律 GM 录入时算进 EXP/amount_rm；API 不乘，flag 只驱动视觉。
8. **Apps Script**：不设 CORS 头（`ContentService` 不支持）；GET 简单请求、POST `text/plain`；所有写操作 `LockService.getScriptLock()`；`CacheService` 分端点缓存 60 秒（注意 100KB/key 上限，`actionsTable` 单独缓存）；PIN 失败按 `id` 计数缓存，超 `pin_fail_limit` 短暂锁定，错误返回友好文案且**不暴露他人数据**。
---
## Phase 3：React 前端（UI 按 `weproject-legends-dashboard.jsx` 风格）
### `/` 手机端
- 登录：War Splash → 选英雄卡片 → PIN（4 菱形灯 + 数字键盘，第 4 位自动进入）→ 欢迎横幅；**首次登入**（hero_class 空）补：选职业（**只列本 role 大类的英雄**）+ 性别 + 头像。登录态存 sessionStorage。
- **4 个 Tab**：⚔ Battle / 🧙 Hero / 📜 Guide / 🛒 Shop
- **Battle 顺序**：Crystal War（Live Tug 绳索条 + 会闪闪发亮的双水晶 + 双方 3 塔 + 本周倒计时/结算点 + Lord/Power Creep 状态）→ **Lane Matchup KO 榜**（#1 vs #1…，一方 ≥2× 显示 KO 徽记）→ Creative Ranking → Kill Feed
- **水晶发光**：光效强度随水晶/塔剩余而变（满血明亮呼吸，濒危裂纹闪烁）
- **Mission 审批流**：点击=提交（⏳ WAITING GM APPROVAL 橙），GM approve 后 ✓ EXP GRANTED 绿；EXP 绝不在点击时发放
- **Hero 页**：个人 Profile + 今日任务只读状态 + Pace Badge 展示
- **Guide 页**：按 role+team 筛选的完整规则表（读 Actions/Missions），顶部注明「规则由 Google Sheet 管理」
- **Shop**：兑换走 POST + Redemption History（PENDING/APPROVED/FULFILLED）
- 头像：六边形 + 段位色发光环（Feed 50px / 榜 48px，≥44px）
- 每 60 秒自动刷新；失败显示上次缓存 + "Data sync failed" 角标，不白屏
### `/tv` 单台中立广播（重点，横屏 1920×1080，无需登录）
自动轮播 **4 屏 × 12 秒**：
1. **CRYSTAL WAR 全屏** — 双基地（塔 + 闪亮水晶）+ 金色 VS + Live Tug 绳索条 + 双方今日伤害
2. **WEPROJECT 阵营屏**（青）— Top 3 Damage + 今日成就
3. **WELLOUS 阵营屏**（红）— 同构
4. **双队混合成就弹幕** — 每条带队伍水晶徽章（💎青 / 💎红）
**打断动画**（全屏 3 秒后回轮播）：拆塔 → "TOWER DESTROYED"；Lord 被杀 → "LORD HAS BEEN SLAIN — DMG ×2"；拆水晶 → "VICTORY"。字体放大 2–3 倍，每 30 秒拉数据。
### `/gm` 简易 GM 面板（Phase 4）
今日各人 todayExp 核对、pending 兑换/任务列表、**Lock Week 结算按钮**、Pace/Bounty 待发放清单。
### 通用
- API URL 放 `.env`（VITE_API_URL）
- Loading 用游戏风格文案（"Summoning heroes…"）
- 响应式：手机 380px 起，TV 1920px
- 资源目录：`/avatars`（{class}_{gender}.png）、`/frames`（段位框）、`/badges`（徽章 PNG）；缺图用内置样式占位，就绪后无缝替换
---
## Phase 4：部署
1. Apps Script → Deploy → Web app → 拿 `/exec` URL
2. 前端 push GitHub → Vercel import → 设 `VITE_API_URL`
3. TV：Chrome 全屏打开 `/tv`，禁休眠
---
## Hero Class（按 role 锁大类，大类内自选）
| Role | 大类 | 可选英雄 | 加成侧重（体现在 Actions role 行） |
|---|---|---|---|
| Marketer | **Carry** | Marksman / Mage / Assassin | winning creative / Revenue milestone 类 EXP 更高 |
| LiveHost | **Fighter** | Fighter / Tank / Berserker | 直播成交 / 逼单类 EXP 更高 |
| Editor | **Support** | Support / Bard / Summoner | 其剪辑的广告成为 winning creative 时的 Assist 加成 |
同大类各英雄数值一致（仅外观/头像不同），保证对战平衡。`setHeroClass` 必须校验所选英雄属于本 role 大类。
---
## 验收清单
- [ ] GM 在 EXP_Log 加一行并勾 approved 后，60 秒内 TV 与榜单更新
- [ ] 一笔 approved Revenue 同时进入本队本周绳索净额（每周清零）与个人 Damage（整月累计）——两层聚合口径不同，非同步清零（见 §4.0）
- [ ] Crystal War 绳索条随本周净额实时移动、周一视觉清零；周日 23:59 结算后赢家 +1 塔并触发 TOWER DESTROYED
- [ ] 工作日 <4 天的月末残缺周不单独给塔，并入上一完整周
- [ ] 拆满 3 塔后再赢一周 → 拆水晶 → VICTORY 全屏
- [ ] Lane KO 榜只配到 min(两队人数) 个 slot，不暴露对方总人数；一方 ≥2× 显示 KO；跨队只出现 name + damage，无 Gold/兑换/任务泄露
- [ ] Lord ×2 生效日，GM 面板显示提醒横幅
- [ ] Power Creep 击杀条件 = 当日个人首个 10 笔成交，与 Achievement Double Kill 一致
- [ ] bounty_lv15 按赛季 EXP 判定，每赛季可重新触发；Gold 真实为负时前端显示 pending adjustment
- [ ] Refund 负行同时回滚个人 Damage 与该队 Crystal 净额（无双重扣款，无 refund_adjust 字段）
- [ ] Editor 出现在 Creative 榜（Damage 榜按 Revenue，Editor 无 Revenue 则不占位）
- [ ] 兑换后 Gold 立即冻结、出现 pending；Gold 不足按钮禁用；同商品同日不可重复提交
- [ ] setHeroClass 拒绝跨大类选择（Editor 选不到 Marksman）
- [ ] 赛季(当月)EXP 与全历史 EXP 分开（Rank vs Level）
- [ ] Pace badge / 首个到 Lv15 赏金按 join_date 正确标记（API 只标记，GM 发放）
- [ ] 手机端 POST（text/plain）无 CORS 预检失败；并发兑换/提交不丢数据
- [ ] PIN 错误友好提示且不暴露他人数据；连续错误触发短暂锁定
- [ ] 水晶在 Dashboard 与 TV 两处都发光，光效随 HP 变化
---
## 明确不做（V1 范围外）
- 不接 Meta Ads / 公司 System API（数据全 GM 手录）
- 不做真实账号 / OAuth
- **不自动发奖 / 不自动判定 Achievement / 不自动发 pace 奖励**（API 只标记，GM 发放）
- 不用外部数据库（Supabase 等），坚持 Google Sheets
- **不做 World Boss**（已由 Crystal War 取代）
---
## UI Copy（全站英文，统一用这套）
| 位置 | English Copy |
|---|---|
| Tabs | ⚔ Battle / 🧙 Hero / 📜 Guide / 🛒 Shop |
| Crystal War | CRYSTAL WAR · ONE FIGHT, TWO FRONTS / This week · net lead / Banks Sun 23:59 / Week {n} |
| Towers | TOWER DESTROYED / Towers {x}/3 |
| Victory | CRYSTAL SHATTERED — {TEAM} WINS / VICTORY |
| Neutral | LORD ALIVE — break the daily revenue record → DMG ×2 / LORD HAS BEEN SLAIN — DMG ×2 / POWER CREEP CLAIMED |
| KO 榜 | Lane Matchups / KO / Damage Ranking / Creative Ranking |
| Feed | TODAY'S ACHIEVEMENTS / ● LIVE |
| Profile | Level / Season EXP / Rank Progress / Gold Balance / Daily Missions / Complete all +30 / Badges / Fast Climber |
| Mission | Submit / ⏳ Waiting GM approval / ✓ EXP granted |
| Shop | MY GOLD / Redeem / Not enough Gold / Redeemed! Pending GM approval / Gold is earned with EXP — spending it never affects your Rank |
| Login | ⚔ THE WAR IS ON ⚔ / Enter the battlefield / Select your hero / Choose your class / Enter PIN / Wrong PIN, try again / ⚔ Welcome back, {NAME} — the war awaits |
| System | Summoning heroes… / Data sync failed / Last updated xx:xx |

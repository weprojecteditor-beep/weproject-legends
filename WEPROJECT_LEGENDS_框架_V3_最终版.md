# WEPROJECT LEGENDS — 游戏框架 V3.1（最终版）

> 定稿版。⚠️ 本文件是**管理层/GM 版**，含内部机制（Boss Rage 保密条款、Mystery Box 概率表等），发给员工前请先做「员工版」删减。

---

## 0. 核心设计原则

### 双货币系统

| 货币 | 用途 | 特性 |
|------|------|------|
| **EXP** ⭐ | 升 Level、升 Rank | 只增不减，赛季内累积，不能消费 |
| **Gold** 🪙 | Reward Shop 兑换 | 每获得 1 EXP 同时获得 1 Gold，随便花 |

### 数据源（唯一标准，开赛前公告）

| 数据 | 以什么为准 |
|---|---|
| 实际 Order / Revenue（Boss HP、Milestone、Revenue King、Kill 系成就） | **公司 System 实际订单**。订单以**已付款**为准；**COD 以成功签收计**，未签收/拒收不算 Revenue（每周结算统一核对） |
| 广告指标（ROAS、CTR、Purchases、Winning Creative 判定） | **Ads Manager** |
| Pixel Bug | Marketer 有责任主动修复，Pixel 异常期间数据不追溯补分 |

### 其他核心原则

1. **赛季制**：3 个月一个 Season，Rank 软重置
2. **每日 EXP 上限 200**：只限制「动作类」EXP（Mission、Launch Ads、Blast、交片等）。**Revenue / Live Milestone、Achievement、Boss、MVP 奖励全部豁免**——爆发日该拿多少拿多少，Revenue 刷不了假的
3. **Winning 标准全部量化写死**（见第 2 节），每季 review 一次
4. **Game Master = HR**（不参赛，无利益冲突），每天 15 分钟录入审核
5. **Streak 规则**：MC（需病假单）当天暂停、不中断连续纪录；Annual Leave / 无薪假则中断

---

## 1. World Boss（月度团队目标）

- Boss HP = 当月 Team Revenue Target（RM1 = 1 HP）
- Revenue 以公司 System **有效订单**计（已付款 / COD 已签收）
- **Refund / 拒收处理**：每周结算时把金额加回 Boss HP，同步扣减该成员个人 Damage；若结算后某个**已领取的 Milestone 档位不再成立**，GM 以负数 adjust 扣回对应 EXP/Gold（防止「假单冲 Milestone、退款留分数」）

### 阶段奖励

| Boss HP 剩余 | 团队奖励 | 额外 |
|---|---|---|
| 75% | 零食日 | 全员 +30 Gold |
| 50% | Coffee Day | 全员 +50 Gold |
| 25% | Pizza Day | 全员 +80 Gold |
| 0%（击败） | 全员提早放工 1 小时 | 全员 +150 Gold + 击杀纪念 Badge |
| Overkill（超额 10%+） | 团聚餐 或 半天 Team Outing | 全员 +300 Gold |

### 特殊机制

- **Boss Rage 🔥（内部保密）**：所有 EXP/Gold ×1.5，每日上限同步升到 **300**。
  开启时间由 **GM 每月机动决定**（3–5 个工作天，通常在月底冲刺期，但**不固定日期、不公布规律**），到开启当天才在 TV / Group 宣布。
  🤫 不写进员工版规则。固定「每月最后 5 天」跑一个月大家就摸清规律了，机动才防囤货。
- **连续击杀**：连续 2 个月击败 Boss，第 3 个月解锁「Legendary Boss」——目标更高，全部奖励翻倍。
- **闪电战 ⚡（可选限时活动）**：每季一次，为期 2 周。随机抽签组队（每队保证 Marketer + Editor + Host 齐全），全部队伍打同一个特殊 Boss、比贡献占比（PvE 不 PvP），打完解散。奖励由 GM 当期公告。日常**不设固定战队**——素材受众共用的模式下，固定分组会导致藏 Winning Script。

### 榜单（Dashboard 双榜并列）

| 榜单 | 排名依据 | 主要对象 |
|---|---|---|
| ⚔️ Damage 榜 | 个人有效订单 Revenue | Marketer / Live Host |
| 🎬 Creative 贡献榜 | Winning Creative 数 + 高 CTR 素材数 | Editor / Marketer |

---

## 2. EXP / Gold 获取表

> 基准：认真工作的员工每天约 60–120 EXP，月累积 1,500–2,500。

### 通用（所有角色）

| 行为 | EXP/Gold | 限制 |
|---|---|---|
| 完成当日全部 Daily Mission | +30（全勤 Bonus） | 每天 1 次 |
| 分享知识 / SOP / Winning Script | +20 | 每周最多 2 次 |
| Assist（被队友认证的帮助） | +15（跨职能 +20） | **每位帮助者**每周最多获认证 3 次 |

### Marketer

| 行为 | EXP/Gold | 定义 / 防刷条件 |
|---|---|---|
| Launch 新广告 | +10 / 个（每日上限 +30） | 需 Spend ≥ RM50 且投满 24 小时才计分 |
| 准时交 Daily Report | +5 | 10:30am 前 |
| 达到当日 ROAS Target | +30 | ROAS ≥ 4 **且当日 Spend ≥ RM500** |
| Winning Creative | +80 | 见下方统一定义 |
| Revenue Milestone | +50 / 每 RM10,000（当日有效订单累计） | ✅ 不计入每日上限 |
| Blast 一个 Audience Pool | +10（每日上限 +20） | — |

### Editor

| 行为 | EXP/Gold | 定义 / 防刷条件 |
|---|---|---|
| 准时交片 | +10 / 条 | Assigned 后 2 天内；**只有排片表上 Assigned 的片才计分** |
| 高 CTR 素材 | +40 | CTR ≥ 3.5% 且 Impression > 1,000 |
| Winning Creative（自己剪的） | +80 | 见下方统一定义 |
| 主动出 Script 被采用 | +25 | — |

### Live Host

| 行为 | EXP/Gold | 定义 |
|---|---|---|
| 完成一场 Live（1–2 小时/场） | +20 | — |
| Live Revenue Milestone | +30 / 每 RM5,000（单场有效订单累计） | ✅ 不计入每日上限 |
| 配合拍摄广告素材 | +15 / 次 | — |
| Blast 一个 Audience Pool | +10（每日上限 +20） | — |

### 📌 Winning Creative 统一定义（重要）

- 触发：单一素材**累计** Purchases 达 10，且**判定当下累计 ROAS 仍 ≥ 3**
- 续领：之后每再累计 +10 Purchases（20、30、40…）且累计 ROAS 仍 ≥ 3，可再领一次 +80
- 归属：**投放的 Marketer 和剪辑的 Editor 各领一次 +80**（互不影响）；若 Marketer 自己剪的素材，只领一份
- 数据以 Ads Manager 为准，GM 每周核对档位

---

## 3. Level 系统（永久，不随赛季重置）

| Level | 累积 EXP | 里程碑奖励 |
|---|---|---|
| Lv 5 | 1,000 | +100 Gold |
| Lv 10 | 3,000 | 专属头像框 |
| Lv 15 | 6,000 | +300 Gold |
| Lv 20 | 10,000 | 专属头像框 |
| Lv 25 | 15,000 | +500 Gold |
| Lv 30 | 21,000 | 专属头像框 + 名字进「名人堂」 |

---

## 4. Hero Profile（个人角色卡）

Avatar（可自选）· Role · Level + EXP 进度条 · 当前赛季 Rank + Badge · Gold 余额 · Achievement 墙 · 今日 Daily Mission 状态 ✅❌

---

## 5. Rank 系统（赛季制，赛季 = 3 个月）

| Rank | 赛季累积 EXP | 视觉奖励 |
|---|---|---|
| Warrior | 0 | — |
| Elite | 800 | 铜色边框 |
| Master | 2,000 | 银色边框 |
| Epic | 3,600 | 紫色边框 + Badge |
| Legend | 5,500 | 金色边框 + Badge |
| Mythic | 7,500 | 动态边框 + Badge |
| Mythical Glory | 赛季前 3 名且 ≥7,500 | 专属称号 + TV 展示 |

- **软重置**：赛季结束掉 2 个大段位开始新赛季
- **赛季结算奖励**：Epic +200 / Legend +400 / Mythic +800 / Glory +1,500 Gold + 赛季纪念 Badge（永久保留）

---

## 6. Daily / Weekly Mission

每日任务全部完成额外 +30。

**Marketer（每日）**：① Publish ≥1 个 Ads（+10，需符合防刷条件）② 准时交 Report 10:30am 前（+5）③ Blast 1 个 Audience Pool（+10）

**Editor（每日）**：① 完成当日 Assigned Video（+10）② 准时交片：Assigned 后 2 天内（+5）

**Live Host（每日）**：① 完成当日 Live（+20）② Blast 1 个 Audience Pool（+10）

### Weekly Mission

| 角色 | 任务 | 奖励 |
|---|---|---|
| Marketer | 本周产出 1 个 Winning Creative | +100 |
| Editor | 本周零 Delay（全部片在 Assigned 后 2 天内交齐）+ ≥1 高 CTR 素材 | +100 |
| Live Host | 本周 Live 累计有效 Revenue ≥ RM4,000 | +100 |
| 全员 | 本周 4/5 天完成全部 Daily Mission | +50 |

---

## 7. Assist System

**流程**：被帮助的人提交申请（注明谁帮了什么）→ GM 每天审核 → 帮助者 +15（跨职能 +20）

**规则**：每位帮助者每周最多获认证 3 次；同一对人每周最多互相认证 1 次

**🏆 Assist King / Queen（月度）**：当月获认证 Assist 最多者，+200 Gold + 专属 Badge + TV 公告

---

## 8. Achievement System

当天达成即时在 TV / Group 弹出公告。**成就奖励不计入每日上限。**
Kill 系成就以**个人名下 System 有效订单**计（含 Live 订单）。

| Achievement | 触发条件 | 奖励 |
|---|---|---|
| ⚔️ First Blood | 当天团队第一笔有效成交 | +10 |
| ⚔️⚔️ Double Kill | 个人单日 10 个 Purchase | +20 |
| 🔥 Triple Kill | 个人单日 30 个 Purchase | +40 |
| 💀 Savage | 连续 3 天达成个人核心 KPI（定义见下） | +60 |
| 👑 Revenue King | 单日最高 Sales（每天自动颁发 1 人） | +30 |
| 🛡️ Godlike | 连续 7 个工作天完成全部 Daily Mission | +80 |
| 🎯 Sharpshooter | 单月 3 个 Winning Creative | +150 |
| 🌟 Legendary | 打破公司历史单日/单场纪录 | +200 + 永久名人堂 |

**判定细则**：
- Double / Triple Kill 可叠加：同日先达 10 领 Double，再达 30 再领 Triple
- **个人核心 KPI 定义**（Savage 用）：Marketer = 当日 ROAS 达标（含 Spend ≥ RM500）；Editor = 当日 Assigned 全部按时完成；Live Host = 完成当日 Live 且当日 Live Revenue ≥ RM800
- Streak 类（Savage / Godlike）：MC 暂停不中断，AL / 无薪假中断

---

## 9. Reward Shop

| 奖励 | 价格 🪙 | 备注 |
|---|---|---|
| Coffee Voucher | 300 | — |
| Bubble Tea | 400 | — |
| Mystery Box 🎁 | 500 | 奖池见下 |
| Lunch Voucher（RM20） | 800 | — |
| 迟到豁免卡（1 次） | 2,000 | 每月限购 1 张 |
| 提早放工 1 小时 | 3,000 | 需提前 1 天预约 |
| 团队下午茶由你点单 🧋 | 4,000 | 公司出钱请全 Team，菜单你说了算 |
| 限量实物（耳机/周边等） | 5,000 | 每季上架 1 件，先到先得 |

### Mystery Box 奖池（GM 内部执行表，不公开概率）

| 档位 | 概率 | 内容 |
|---|---|---|
| 小奖 | 60% | +50 Gold / 零食包 / 奶茶一杯 |
| 中奖 | 30% | Lunch Voucher / RM20 Grab 券 / 指定队友奶茶（公司出钱） |
| 大奖 | 10% | **双倍 EXP 卡**（自选一天当日 EXP ×2）/ 办公室 DJ 权 1 天 / RM50 实物小礼 |

**双倍 EXP 卡规则**：使用当日，每日上限同步 ×2（400）；**不与 Boss Rage 叠加**，两者同日生效时取高者（×2），防止 ×3 破坏数值。

### 运营规则
- 每季 review 价格：换太快涨价，没人换降价
- 不定期上架限量商品制造惊喜

---

## 10. MVP Awards

### 每周（轮换 1–2 个类别）
Revenue MVP / ROAS MVP / Creative MVP → +100 Gold + TV 展示一周

### 每月（全类别）

| MVP | 标准 | 奖励 |
|---|---|---|
| Revenue MVP | 当月最高 Damage | +300 Gold + Badge |
| ROAS MVP | 当月最佳 ROAS，**当月 Spend ≥ RM10,000**（建议值，开赛前可调） | +300 Gold + Badge |
| Creative MVP | 最多 Winning Creative（Marketer/Editor 皆可） | +300 Gold + Badge |
| Editor MVP | 交片量 × 准时率 × 高 CTR 数综合分 | +300 Gold + Badge |
| Live Host MVP | Live Revenue + 场次稳定度 | +300 Gold + Badge |
| Team Player MVP | Assist 数 + 跨职能贡献 | +300 Gold + Badge |
| Most Improved MVP | 环比进步最大（%）；**每人每季最多得 1 次** | +300 Gold + Badge |
| 🏆 Overall MVP | 综合以上 + 团队投票 30% | +500 Gold + 奖杯 + 名人堂 |

同一人单月最多 2 个 MVP（Overall 除外）。

---

## 11. 防刷与公平机制（GM 手册）

1. 每日上限 200（Rage 300 / 双倍卡日 400），只限动作类；Milestone / Achievement / Boss / MVP 豁免
2. Revenue 只认有效订单（已付款 / COD 签收）；Refund 周结算扣回 HP、Damage，必要时扣回 Milestone EXP
3. Winning / CTR / ROAS 标准全部写死，每季 review
4. Launch Ads 需 Spend ≥ RM50 + 投满 24h；交片只认排片表 Assigned
5. Assist 双向认证 + 每周上限
6. GM = HR，不参赛；每周 Audit 全部数据
7. 新人保护：入职首月 Daily Mission 难度减半，EXP 正常发
8. 申诉通道：48 小时内向 GM 申诉，Team Lead 仲裁
9. Boss Rage 时间机动 + 保密，开启当天才宣布

---

## 12. Dashboard 与工具

- **Google Sheets**：EXP/Gold 台账（GM 每天录入）
- **Web App**：游戏 Dashboard（TV 模式 + 个人 Profile + 商店），全英文界面——开发 Spec 见配套文件
- **WhatsApp/Telegram Group**：即时 Achievement 公告

---

## 13. 预算预估（16 人团队 / 月）

| 项目 | 估算 |
|---|---|
| Reward Shop 兑换（人均 ~RM30–50/月） | RM 480–800 |
| Boss 阶段奖励 | RM 300–500 |
| MVP 奖励（实体奖杯一次性 RM100） | 主要是 Gold |
| **合计** | **约 RM 850–1,450/月**（人均 RM 55–90） |

---

## 14. 上线前 Checklist

- [ ] 全部数值填入 Google Sheet Config（含 ROAS MVP 的 Spend 门槛最终值）
- [ ] 制作**员工版规则**（删除：Boss Rage 条款、Mystery Box 概率表、防刷内部逻辑）
- [ ] GM（HR）培训：录入流程、审核标准、周结算（Refund/COD 核对）、申诉处理
- [ ] Pilot 试跑 2 周校准数值
- [ ] 全员 Briefing（当游戏发布会办）→ Season 1 开赛 🎮

---

*V3.1 Final · 2026-07 定稿 · Team: 8 Marketers / 5 Live Hosts / 3 Editors + GM (HR)*

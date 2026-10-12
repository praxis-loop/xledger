---
target: accounts page
total_score: 13
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 3
target_identity: "file:/home/xan/oazon_sync/praxis/xledger/frontend/app/src/pages/accounts-page.tsx"
target_fingerprint: "sha256:08aa7069178ac1b17feccd6a823050293736fbdc3fc5bcac951d358deb75cee7"
target_path: /home/xan/oazon_sync/praxis/xledger/frontend/app/src/pages/accounts-page.tsx
timestamp: 2026-10-12T03-21-07Z
slug: frontend-app-src-pages-accounts-page-tsx
closed: true
---
Method: dual-agent (A: design review · B: detector + browser evidence)

# 账户页 Critique：frontend/app/src/pages/accounts-page.tsx

## Design Health Score
| # | 启发式 | 分数 | 关键问题 |
|---|---|---|---|
| 1 | 系统状态可见 | 1 | 加载中和请求失败都显示成"总余额 ¥0.00 / 还没有账户"；提交时没有进行中状态，成功后也没有提示 |
| 2 | 贴近真实世界 | 2 | 账户类型直接显示 CREDIT/INVESTMENT 原始值；没有"电子钱包"类型；"财务架构""运营标签"之类的行话 |
| 3 | 用户控制与自由 | 1 | 账户不能归档或恢复（API 支持）；删除账本、归档分类一点即生效，没有撤销 |
| 4 | 一致性与标准 | 1 | 仍是遗留样式层；同一个数在各处分别叫"总余额""当前余额""总资产" |
| 5 | 错误预防 | 1 | 名称不是必填；编辑对话框会显示错误的账户类型；破坏性操作不确认 |
| 6 | 识别而非回忆 | 2 | 已归档账户没有任何标记；手机上分类列表放在嵌套滚动框里 |
| 7 | 灵活高效 | 2 | 账户不能搜索或排序，账户卡片也不能跳转到该账户的交易 |
| 8 | 简洁美观 | 2 | 三层卡片嵌套，账户、账本、分类、标签四块内容挤在一页 |
| 9 | 错误识别与恢复 | 0 | 名称留空提交：后端返回 400，前端抛出未处理的 ApiError，对话框卡住，没有任何提示 |
| 10 | 帮助与文档 | 1 | 没说明总资产只算已绑定账户、未绑定账户的交易不计入、信用卡的期初余额要填负数 |
| 合计 | | 13/40 | 差（Poor） |

## Design Specificity Verdict
设计评审：看不出是为 xledger 设计的，还停留在 Stitch 时期的通用 Material 后台模板（英文大写类型、卡片套卡片、行话），和已迁移的交易页像两个不同的产品。
静态检测：源码和共享组件扫描干净（退出码 0），问题都出在运行时。
浏览器内检测：桌面 16 处、手机 22 处——字号过小（5 处 10px 分组标签，手机端另有 6 处 9px 底部标签栏，属于外壳组件），占位文字对比度只有 4.1:1（2 处），嵌套卡片 9 处；对话框内部 0 处。

## Priority Issues
- [P0] 加载中、请求失败都显示成"没有账户"（accounts-page.tsx:83, :113-116, :188, :219）。修复：根据 isPending 显示骨架屏，根据 isError 显示错误提示和重试按钮，只在请求成功且为空时显示空状态。建议命令：/impeccable harden
- [P0] 新建和编辑账户的表单没有校验，也没有错误处理（:118-132）。修复：名称设为 required 并去掉首尾空格；提交逻辑包一层 try/catch，把服务端错误显示到 TextField 的 error 上；提交中禁用按钮。建议命令：/impeccable harden
- [P1] 账户的归档和类型规则有错或缺失：已归档账户没有标记，页面上没有归档入口；类型直接显示原始值；下拉选项 cash/bank/credit 和 API 契约 debit/credit/cash/ewallet 对不上，后端也不校验（:192-218, :421-449, openapi.yaml:117）。建议命令：/impeccable clarify + harden
- [P1] 视觉层和信息架构偏离 DESIGN.md：12px 圆角卡片套在灰底上、10px 大写宽字距标签、藏青色、rose 色用于非金额操作、搜索框没有焦点提示且占位文字对比度只有 4.1:1、同一个数叫法不一；账本、分类、标签和账户挤在同一页。建议命令：/impeccable layout，之后 /impeccable polish
- [P1] DialogShell 对键盘和读屏用户不可用：没有 role="dialog" 和 aria-modal；焦点不移入对话框、不被限制在对话框内、关闭后不回到原按钮；关闭按钮的读屏名称写死成英文（dialog-shell.tsx:28-46）。建议命令：/impeccable harden

## Persona Red Flags
- Alex：到"新建账户"要按 16 次 Tab；账户不能搜索或排序；卡片不能跳转到 /transactions?account=。
- Sam：没有 h1，分区标题是 <p>；搜索框获得焦点时完全看不出来（不满足 WCAG 2.4.7）；提交失败不会被读出来；对话框焦点会逃出去。
- Casey：编辑、归档、删除按钮只有 36px 高；点"归档"立即生效，误触无法撤销；分类区是滚动框里又套一层滚动；320px 宽时横向溢出 49px。

## Minor Observations
- 期初余额和当前余额相同时也会重复显示。
- 总账本的"删除"按钮是禁用的，但没说为什么。
- 初始余额输入框没有 inputMode="decimal"，也没提示信用卡要填负数；建好后也不能再改。
- 英文界面用了 Title Case；"default"徽标全小写。
- 标签区只能看不能改，0 个标签时也占一整块区域。
- 已归档账户会计入总额，这条规则还没定。

## Questions to Consider
- 既然"账户"页讲的是钱在哪，为什么大部分空间给了分类和标签？
- 是否该显示"资产 / 负债 / 净值"，而不是一个把正负相加的"总余额"？
- 是否该在这页提示未归入账户的支出金额，把 PRD 的这条规则明确展示出来？

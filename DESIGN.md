---
name: xledger
description: 口袋里的账房：原生、克制、数字优先的个人记账 PWA
colors:
  action-blue: "#0066cc"
  action-blue-tint: "#eaf3ff"
  action-blue-tint-pressed: "#dbeaff"
  grouped-ground: "#f2f2f7"
  surface: "#ffffff"
  segment-track: "#e3e3e8"
  ink: "#191c1e"
  ink-secondary: "#434653"
  ink-tertiary: "#6e6e73"
  control-ink: "#3a3a3c"
  hairline: "rgba(0, 0, 0, 0.1)"
  income-green: "#176b3a"
  income-tint: "#e8f7ee"
  income-edge: "#b7ebcc"
  expense-red: "#b4233c"
  expense-tint: "#fdecef"
  expense-edge: "#f5c2c7"
  error: "#ba1a1a"
  error-tint: "#ffdad6"
typography:
  large-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "normal"
  figure:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "normal"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "normal"
  tab-label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "9px"
    fontWeight: 500
    lineHeight: 1.1
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.action-blue}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "#0059b3"
  button-tinted:
    backgroundColor: "{colors.action-blue-tint}"
    textColor: "{colors.action-blue}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "44px"
  button-tinted-pressed:
    backgroundColor: "{colors.action-blue-tint-pressed}"
    textColor: "{colors.action-blue}"
  button-destructive:
    backgroundColor: "{colors.error}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    height: "44px"
  button-destructive-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.error}"
    rounded: "{rounded.sm}"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.action-blue}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    height: "44px"
  segmented-control:
    backgroundColor: "{colors.segment-track}"
    textColor: "{colors.control-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "2px"
    height: "44px"
  segmented-control-selected:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.action-blue}"
    rounded: "{rounded.sm}"
  metric-card-income:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.income-green}"
    rounded: "{rounded.sm}"
    padding: "14px"
  metric-card-expense:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.expense-red}"
    rounded: "{rounded.sm}"
    padding: "14px"
  metric-card-balance:
    backgroundColor: "{colors.action-blue}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "14px"
  tab-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-tertiary}"
    typography: "{typography.tab-label}"
    height: "64px"
  tab-bar-item-active:
    textColor: "{colors.action-blue}"
  text-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "44px"
---

# Design System: xledger

## Overview

**Creative North Star: "口袋里的账房" (The Pocket Counting House)**

xledger 应该像手机自带的系统 App 一样安静、可信：打开就是数字，界面退后。视觉基线是 Apple Human Interface Guidelines：分组浅灰底上放白色内容面，靠发丝线分隔，只有一种操作蓝，金额用固定的收入绿和支出红。不引入 Ionic / Framework7 / Konsta 运行时，这一层是项目自己维护的一小套 Tailwind 样式。

密度保持适中。手机端是"无框分组页"：紧凑的导航标题、原生质感的分段控件、两列收支卡加一张整宽余额卡，再往下是分组列表。桌面端（≥ 1000px）保留更宽松的仪表盘构图，加上 230px 侧边栏和紧凑顶栏。两端是同一个世界，只是排布不同。

**迁移状态（必读）。** 当前代码里叠着两层：本文件记录的 iOS 层（`#0066cc`、`#f2f2f7`、系统字体、句首大写的标签），以及 Stitch 设计稿时期遗留的 Material 层（藏青 `#00327d` primary、`surface-container-*` 色阶、全大写宽字距标签、超粗 `extrabold` 大标题）。**本文件以 iOS 层为准**：新代码一律按本文件写；改到旧代码时顺手收敛到这一层，不要再往遗留层上加东西。已迁完：Dashboard、交易页（列表 / 日历 / 导入与新增对话框）、账户页、设置页（账本 / 分类 / 标签 / 数据与 API）、顶栏、侧边栏、底部标签栏，以及 `Button`、`TextField`、`SelectField`、`Chip`、`MetricCard`、`PageSection`、`DialogShell`、`ConfirmDialog`、`GroupedSection`、`InlineNameForm`、`UndoToast`、`SegmentedControl`。统计、预算、导入、快捷记账、登录等页面的局部样式仍在遗留层上。

**Tailwind 写法。** 这一层的色值在 `tailwind.config.ts` 里已经注册为具名 token：`action`（`-hover` / `-tint` / `-tint-pressed`）、`ground`、`segment-track`、`ink`（`-secondary` / `-tertiary` / `-control`）、`income`（`-tint` / `-edge`）、`expense`（`-tint` / `-edge`），用法如 `bg-action`、`text-ink-secondary`、`border-income-edge`。新代码用这些类名，不要再写 `#0066cc` 这类硬编码色值，也不要用 `primary` / `surface-container-*` / `on-surface-*` 这类遗留类名。

**Key Characteristics:**
- 数字是主角：金额用最大、最重的字号，装饰为零
- 唯一操作色 `action-blue`；绿和红只用来表示钱的方向
- 分组浅灰底 + 白色内容面 + 发丝线，阴影克制
- 系统字体栈，中文落到 PingFang SC / 微软雅黑
- 所有可交互目标 ≥ 44px，四边都处理安全区
- 尊重 `prefers-reduced-motion`

## Colors

调色板很克制：中性灰白占大面积，一种蓝负责操作，一对红绿负责金额方向。

### Primary
- **Action Blue（操作蓝）**：唯一的操作与选中色，用于主按钮、链接、标签栏选中项、分段控件选中文字、焦点环，以及余额卡的底色。对白底 5.57:1、对分组底 4.99:1，正常字号文字可以安全使用。
- **Action Blue Tint（浅操作蓝）/ Pressed**：着色按钮（tinted button）的底色和按下态，例如 Dashboard 上的"Review Transactions"。

### Secondary
- **Income Green（收入绿）**：收入金额与正向变化。配 **Income Tint** 作百分比徽标底、**Income Edge** 作收入卡描边。对白底 6.56:1。
- **Expense Red（支出红）**：支出金额与负向变化。配 **Expense Tint**、**Expense Edge**。对白底 6.47:1。
- **Error / Error Tint**：只用于表单校验和系统错误，**不要**拿来表示支出。

### Neutral
- **Grouped Ground（分组底）**：页面底色、移动端半透明顶栏底色、`::selection` 以外的大面积背景。
- **Surface（内容面）**：卡片、列表组、标签栏、输入框、分段控件选中块。
- **Segment Track（分段轨道）**：分段控件的凹槽底。
- **Ink（正文墨）**：标题、金额以外的主要文字。
- **Ink Secondary（次级墨）**：说明文字、辅助信息（对分组底 8.4:1）。
- **Ink Tertiary（三级墨）**：指标卡标签、标签栏未选中项（对分组底 4.54:1，已到 AA 下限，不能再浅）。
- **Control Ink（控件墨）**：分段控件未选中文字、语言选择器。
- **Hairline（发丝线）**：顶栏 / 标签栏的分隔线和列表分隔线。

### 数据可视化
分析页分类图使用一组 6 色分类色板（`frontend/app/src/pages/analytics-page.tsx` 中的 `CHART_PALETTE`）：`#003f8f`、`#21a67a`、`#e25563`、`#c08725`、`#5b66c9`、`#67727f`。图例中收入点用操作蓝系、支出点用红系。

### 待定
- **转账色。** PRD 要求"转账蓝色"，但代码里还没有专用的转账色。在这个色定下来之前，不要直接拿操作蓝表示转账，否则会和"可点击"的语义打架。

### Named Rules
**The One Blue Rule.** 操作蓝是界面里唯一表示"可以点"的颜色。遗留的藏青 `#00327d` 改到哪里就迁到哪里，不要新增使用。

**The Money Direction Rule.** 绿只表示钱进来，红只表示钱出去。颜色永远不能单独承担语义：金额必须同时带正负号或"收入 / 支出"文字，让色觉障碍用户和读屏器都能分辨。

## Typography

**Display Font:** 系统字体（-apple-system / SF Pro Display，回退 PingFang SC、Microsoft YaHei、sans-serif）
**Body Font:** 系统字体（-apple-system / SF Pro Text，同一回退链）

**Character:** 完全交给系统字体：在 iPhone 上就是原生 App 的字，在 Windows 上落到微软雅黑，中英文混排不跳字重。层级靠字号和字重拉开，不靠换字体。

`index.html` 仍然加载了 Google Fonts 的 Inter 和 Manrope，但没有任何样式引用它们。这是遗留产物，可以删掉，省一次跨域请求。

### Hierarchy
- **Large Title**（700，手机 34px / 桌面 44px 且加粗到 800，行高 1.25）：每页一个导航大标题，如"Financial Overview"。
- **Figure**（700，手机 24px / 桌面 36px，行高 1）：指标卡金额，全站最大的数字。
- **Headline**（700，24px，行高 1.25）：分组区块标题，如"Action Center""Spending Trend"。
- **Body**（400，14px，行高约 1.6）：说明文字、列表正文；段落最长控制在约 65ch。
- **Label**（600，13px，句首大写）：分段控件、指标卡标签、表单标签。
- **Tab Label**（500，9px）：底部标签栏六个短标签。这是全站最小字号，不能再小，也不要用在别处。

### Named Rules
**The Quiet Label Rule.** 标签用句首大写、正常字距。遗留的 `uppercase tracking-[0.14em–0.2em]` 小号粗体标签（`TextField`、`SelectField`、`Chip`、`PageSection` eyebrow）改到哪里就迁到哪里；中文本来就没有大小写，宽字距只会让中文显得松散。

**The Number First Rule.** 一屏里最大、最重的字永远是金额，标题不能和数字抢。

## Layout

- **断点：** 1000px 是外壳分界（不是 1024px，给 Safari 滚动条留余量）。< 1000px 显示紧凑顶栏 + 底部标签栏；≥ 1000px 显示 230px 侧边栏 + 带搜索框的顶栏。`md`（768px）切换卡片内部的宽松构图；`xl`（1280px）才展开完整的账户信息块和文字按钮。内容最大宽度 1680px。
- **手机端：** 两侧留白 16px（并与安全区取最大值）；指标卡两列（收入 / 支出）+ 整宽余额卡；分组区块之间 16–24px。
- **列表：** 列表项间距 ≥ 12px（PRD 约束）；交易按日分组。
- **安全区：** 统一使用 `--safe-area-top/bottom/left/right` 变量（默认等于 `env()`，测试时可覆盖）。顶栏加上上边距，标签栏加上下 / 左 / 右边距，`.pb-mobile-nav` 给内容留出 `5rem + 底部安全区`。
- **间距节奏：** 4 / 8 / 12 / 16 / 20 / 24px；卡片内边距手机 14px、桌面 20px。

## Elevation & Depth

以平为主、轻微分层。层次主要来自"分组浅灰底上浮着白色面"这种色调差，加上发丝线；阴影只是点到为止。导航外壳用半透明加背景模糊（`backdrop-blur-xl`）表现"悬在内容之上"。

### Shadow Vocabulary
- **Ambient**（`0 10px 24px rgba(25, 28, 30, 0.055)`）：主按钮和浮起的白色面板，极淡的环境阴影。
- **Segment Thumb**（`0 1px 2px rgba(0, 0, 0, 0.12)`）：分段控件选中块，模拟 iOS 滑块。
- **Scrim**（`rgba(15, 23, 42, 0.24)` + `backdrop-blur-sm`）：对话框遮罩。

### Named Rules
**The Hairline Rule.** 分隔优先用发丝线和底色差，不用粗边框，也不叠阴影。指标卡用 1px 语义色描边，余额卡用实底，二者都不加阴影。

## Shapes

小圆角，原生感。**注意：** `tailwind.config.ts` 重写了圆角刻度，`rounded-lg` = 4px、`rounded-xl` = 8px、`rounded-2xl` = 12px、`rounded-3xl` = 16px，比 Tailwind 默认值小一档。

- 卡片和指标卡：4px（`sm`），iOS 设计规格要求"尽量 ≤ 8px"
- 分段控件轨道、着色按钮：8px（`md`）
- 对话框、旧版 `PageSection` 面板：12px（`lg`）
- 徽标、圆形图标按钮（44px）、头像、滚动条：全圆角

## Components

### Buttons
**原生、克制、触手可及。**
- **Shape:** 小圆角（4px），高度 ≥ 44px。
- **Primary:** 操作蓝实底白字，13–14px semibold，配 Ambient 阴影，hover 加深到 `action-hover`，按下时 `scale(0.98)`。
- **Secondary:** 白底、发丝线描边、操作蓝字，hover 时换成浅操作蓝底。
- **Tinted:** 浅操作蓝底 + 操作蓝字，8px 圆角，按下态加深一档。Dashboard 的次级动作都用它。
- **Ghost:** 透明底 + 操作蓝字，用于顶栏的退出、搜索提交。
- **Destructive / Destructive ghost:** `error` 红实底白字只用在确认对话框的最终按钮上（"归档账户""删除账本"）；进入破坏性流程的入口用 `error` 红字透明底。两者都不用支出红。
- **圆形图标按钮:** 44×44 全圆，`bg-white/80`，图标为操作蓝；手机顶栏用它承载安装、个人资料、退出。
- **Focus:** 2px 实线外框 `#0066cc`，偏移 2px；动效只用 `transition` 200ms，并带 `motion-reduce:transition-none`。

### Segmented Control
signature 组件。原生 radio + label 实现，方向键切换、焦点环都是原生行为。轨道 `segment-track` 8px 圆角，内边距 2px，高度 44px；选中块为白底、操作蓝字、Segment Thumb 阴影。手机端撑满宽度，桌面端最小宽度 360px。

### Metric Cards
- **收入 / 支出卡:** 白底 + 1px 语义色描边（`income-edge` / `expense-edge`），标签用三级墨，金额用语义色 + Figure 字级，右上角放一个语义色浅底的百分比徽标。
- **余额卡:** 操作蓝实底白字，承载总资产 / 当前余额和同步说明，是一屏里唯一的实底色块。
- `MetricCard` 用同一套样式（白底 + 1px 语义色描边，`primary` 色调为操作蓝实底），不用彩色侧边条。

### Inputs / Fields
- **Style:** 高度 44px，4px 圆角，1px 中性描边，14px 正文。
- **Focus:** 背景变白，描边变成操作蓝；`outline` 被全局去掉，所以焦点必须靠描边颜色变化体现。
- **Error:** 描边和提示文字用 `error`，提示放在字段下方。
- **Disabled:** 分组底色 + 三级墨文字，鼠标指针显示为不可用。
- **Label:** 13px semibold、次级墨、句首大写。

### Navigation
- **底部标签栏（< 1000px）:** 白色不透明底、顶部发丝线、高 64px + 底 / 左 / 右安全区；六个目的地（首页、流水、报表、账户、导入、设置），21px 线性图标 + 9px 标签；选中为操作蓝且图标描边 2.5，未选中为三级墨且描边 2；用 `aria-current="page"` 标识当前页；靠 CSS 控制显隐，不在 JS 里检测视口。
- **顶栏:** 手机端是 `grouped-ground` 85% 透明度 + 背景模糊 + 发丝线；桌面端改为白色半透明，左侧放紧凑搜索框，右侧放通知 / 帮助 / 语言 / 账户。
- **侧边栏（≥ 1000px）:** 宽 230px，白底 + 右侧发丝线；操作蓝品牌标 + 小写 `xledger` 字标（Ink 色）；导航项高 44px，选中时为浅操作蓝底 + 操作蓝字，hover 时换成分组底。

### Transaction Rows
- **桌面:** 表格列宽固定，各行同一列对齐；表头为 12px 三级墨、句首大写；类型用语义色浅底徽标（收入 / 支出 / 转账），金额右对齐、等宽数字、带正负号；操作列宽度固定，金额右边缘不会随按钮数量漂移。
- **手机:** 分组列表（同一张白色面 + 发丝线分隔），不再一行一卡；左侧 44px 复选框，右侧金额，元信息合并成一行"类型 · 账户 · 时间"。
- **转账:** 用 Ink 色、不带正负号，直到转账色确定。

### Grouped Lists（设置页、账户列表）
- 一个分组 = 上方 13px 次级墨小标题（右侧可放一个次要按钮）+ 下方一行 12px 三级墨说明 + 一张白色面，行与行之间用发丝线分隔，不再一行一卡。
- 行高 ≥ 48px；行尾操作是 44px 圆形图标按钮（编辑用铅笔，删除用垃圾桶），删除按钮 hover 时为 `error` 红。某行缺少某个操作时用等宽占位，保证同类按钮上下对齐。
- 新建 / 重命名直接在列表里出现一行 `InlineNameForm`：回车保存、Esc 取消、出错时错误写在行内。
- 账户行：整行是跳到该账户交易的链接（`/transactions?account=`），编辑是独立按钮；元信息一行写成"类型 · 欠款 · 期初 ¥X"，期初余额只在与当前余额不同时显示；手机上隐藏类型图标和箭头，把宽度留给名称和金额。
- 已归档账户收在默认折叠的"已归档（n）"分组里，文字降为次级 / 三级墨，提供"恢复"。

### Dialogs
- 原生 `<dialog>` + `showModal()`：浏览器提供 dialog 角色、背景不可交互、焦点限制在对话框内和 Esc；关闭后焦点回到打开它的按钮；关闭按钮放在 DOM 最后，所以打开时焦点落在第一个字段上。
- 居中卡片，最大宽度 768px（确认框 448px），12px 圆角，Scrim 遮罩，点击遮罩可关闭；右上角是 44px 圆形关闭按钮（分组底色，读屏名称走翻译）；标题用 Headline 字级（24px，桌面 28px）+ Ink 色。提交中隐藏关闭按钮并禁用 Esc。
- **ConfirmDialog**：只用于删除或会改变总资产的操作。标题写明对象（"归档「招行信用卡」？"），正文写明后果和能否恢复，两个按钮都写动作名，不用"确定"。可以安全撤销的操作（移除分类）改用 `UndoToast`，不弹确认。

### States
- 数据页必须区分三种状态：加载中显示骨架（`motion-safe:animate-pulse`）+ 读屏文字；失败显示原因和"重试"；只有请求成功且确实为空才显示空状态。任何时候都不能在加载或失败时显示"¥0.00"或"还没有账户"。
- 表单提交：客户端先校验必填项（错误写在字段下方，通过 `aria-describedby` 关联、`aria-invalid` 标红），服务端错误写在表单底部的 `role="alert"` 里，提交中按钮显示"正在……"并禁用。

## Do's and Don'ts

### Do:
- **Do** 所有可点击的元素都用操作蓝 `#0066cc`，焦点环统一为 2px `#0066cc`、偏移 2px。
- **Do** 页面底色用分组底 `#f2f2f7`，内容放在白色面上，用发丝线 `rgba(0,0,0,0.1)` 分隔。
- **Do** 金额同时带颜色和正负号 / 文字；收入用 `#176b3a`，支出用 `#b4233c`。
- **Do** 所有可交互目标 ≥ 44px，固定在顶部 / 底部的外壳都处理安全区变量。
- **Do** 每个过渡都加 `motion-reduce:transition-none`。
- **Do** 改到遗留组件时，顺手把藏青、大写宽字距标签、`extrabold` 大标题迁移到本文件的规范。

### Don't:
- **Don't** 在加载中或请求失败时渲染空状态或 ¥0.00 总额。
- **Don't** 让删除类操作一点就生效：不可撤销的走 `ConfirmDialog`，可撤销的给 `UndoToast`。
- **Don't** 新增使用藏青 `#00327d` / `#0047ab`、`primary-gradient` 或 `bg-primary` 系列的遗留 Material 色阶。
- **Don't** 用 Tailwind 的 `emerald-600` / `rose-600` 给金额上色：`emerald-600` 对白底只有 3.77:1，正常字号不达 AA；统一改用 `income-green` / `expense-red`。
- **Don't** 用 `error` 红表示支出，也不要用支出红表示错误。
- **Don't** 在标签上用全大写和宽字距（`tracking-[0.14em]` 以上）。
- **Don't** 引入 Ionic、Framework7、Konsta 之类的移动 UI 运行时；iOS 质感由项目自己的 Tailwind 层实现。
- **Don't** 卡片圆角超过 8px，也不要给卡片叠阴影来制造层次。

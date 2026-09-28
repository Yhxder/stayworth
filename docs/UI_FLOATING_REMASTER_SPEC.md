# StayWorth 视觉重构：FloatingHeader + BookingPanel 重制（第三轮）

日期：2026-09-28
范围：`<FloatingHeader />`（功能层）、`<BookingPanel />`（内容层）、全站字体锁定、字段命名统一。
关系：本文档在「材质分层、明暗三态、术语词典」上继承 `UI_APPLE_HIG_SPEC.md`，只覆盖吸顶栏形态与预订面板排版的部分。

---

# 第一阶段 · 视觉规范锁定

## 1. 组件层级（内容层 / 功能层）

| 层 | 组件 | 材料 | 关键参数 |
| --- | --- | --- | --- |
| 功能层 | `<FloatingHeader />`（含 `<BrandLogo />`、快照徽标、`<ThemeToggle />`） | 毛玻璃悬浮岛（全站仅 2 处玻璃之一） | `fixed top-4` 居中、`max-w-7xl`、`rounded-2xl`、`backdrop-blur-xl`、1px 高光边、多层环境阴影 |
| 功能层 | `<ComparisonTray />` | 毛玻璃 | 桌面吸顶 / 移动吸底，参数不变 |
| 内容层 | `<BookingPanel />` | 近实心面板，**无毛玻璃** | `--surface-panel-solid`、1px 发丝线、`rounded-2xl`、`p-6`→`p-8` |
| 内容层 | 酒店卡片、模块面板、Index 表格、信任卡片 | 标准表面 + 发丝线 | 与上一轮一致 |

玻璃使用点仍为 2 处（悬浮岛、比较托盘），`tests/frontend-structure.test.mjs` 里有自动断言。

## 2. 表面与描边 token（新增/调整）

| Token | 深色 | 浅色 | 用途 | 与提示词的对应 |
| --- | --- | --- | --- | --- |
| `--surface-panel-solid` | `#16161a` | `#ffffff` | 预订面板底色 | 即 `bg-[#16161a]` / `bg-zinc-900/90` |
| `--panel-border` | `rgba(255,255,255,0.12)` | `rgba(9,10,14,0.12)` | 面板 1px 轮廓 | 即 `border-zinc-800` |
| `--header-glass` | `rgba(0,0,0,0.40)` | `rgba(255,255,255,0.40)` | 悬浮岛玻璃底色 | 即 `bg-black/40` / `bg-white/40` |
| `--header-glass-edge` | `rgba(255,255,255,0.16)` | `rgba(9,10,14,0.12)` | 岛的 1px 折射高光 | 即 `border-white/10` |
| `--field-surface` | `rgba(255,255,255,0.04)` | `--surface-sunken` | 字段行底色 | 嵌入式分组行 |
| `--field-surface-active` | `rgba(255,255,255,0.08)` | `rgba(9,10,14,0.05)` | 聚焦/点按态 | 即 `bg-zinc-800/50` |

## 3. 字体与字距：本轮不动（用户明确要求）

沿用上一轮已上线的排版规范，本轮不改字体族、不改字距：

```css
--font-display: "Helvetica Neue", Helvetica, "PingFang SC", …, Arial, sans-serif;
--font-sans:    "PingFang SC", "Helvetica Neue", Helvetica, …, Arial, sans-serif;
--font-mono:    "SF Mono", ui-monospace, …, monospace; /* 仅数值使用 + tabular-nums */
```

即：标题用 Helvetica Neue、正文用 PingFang SC、价格与积分用等宽字体对齐；中文标签保持 `letter-spacing: 0`，只有纯拉丁大写小标签允许 `0.08em`。因此提示词里的 `tracking-wider` **不采用**（中文加宽字距会把中英混排拆散），字号层级的调整只体现在预订面板的 Label / Value 对比上。

## 4. 字号与对比度（面板与页头）

| 元素 | 字号 / 字重 | 颜色 | 实测对比度 |
| --- | --- | --- | --- |
| 品牌主标题 | `1.0625rem` / 700 | `--label-primary` | 深 17.6:1 / 浅 18.6:1 |
| 品牌副标题 | `0.75rem`（12px 下限） | `--label-tertiary` | 深 7.2:1 / 浅 5.8:1 |
| 字段标签 | `0.75rem` / 500 | `--label-tertiary` | 深 ≈7.0:1 / 浅 ≈5.6:1 |
| 字段数值 | `1.125rem` / 700 | `--label-primary` | 深 17.6:1 |
| 面板标题 | `1.25rem` / 700 | `--label-primary` | 深 17.6:1 |
| 开关说明 | `0.8125rem` | `--label-secondary` | 深 11.7:1 |

**两处有意偏离提示词**（依据你给的裁决顺序，无障碍与排版优先于视觉偏好）：

1. 提示词写 `text-zinc-500`（`#71717a`）作标签色，压在 `#16161a` 上只有 **3.9:1**，低于 AA 的 4.5:1。改用 `--label-tertiary`（`#98a1b0`，≈7.0:1）。
2. 提示词写 `tracking-wider`。按用户本轮确认，字体与字距保持上一轮规范不变，因此不采用 `wider`。

## 5. 业务字段定义（全站唯一命名）

| 字段键 | 中文名 | 英文名 | 单位 | 说明 |
| --- | --- | --- | --- | --- |
| `valuePerTenThousand` | 每万分兑换价值 | value per 10,000 points | 当地货币 / 万分 | 全站唯一指标名；含 `aria-label` 与 README |
| `marketReference` | 市场参考中位数 | market reference median | 当地货币 / 万分 | 市场口径，必须同时标注口径范围、样本量与数据日期 |
| `pointsRequired` | 所需积分 | points required | 分 | 积分房总积分 |
| `cashPrice` | 现金总价 | cash price | 当地货币 | 含税含费快照 |

`IMAGE_PROXY_URL`（`app/lib/image-proxy.ts`）预留为图片代理入口，默认 `/media/hotel`；换成自建 CDN 或第三方代理时只改这一处，`<HotelImage />`、`<HeroImage />` 与 Worker 接口同源。

# 第二阶段 · 滚动排版蓝图

## 6. 悬浮岛的滚动边缘物理逻辑

1. 岛体 `position: fixed`，脱离文档流：内容在它**下方**穿过，而不是被推开。页面用 `padding-top: calc(var(--header-height) + 16px)` 预留视觉起点。
2. 折射靠两层叠加：`backdrop-blur-xl`（24px）模糊穿过它的内容，`--header-glass` 半透明底色托底保证文字可读；两者缺一不可，只有模糊会在亮内容上丢掉轮廓。
3. 1px 折射高光：`::before` 用 mask 抠出 1px 环，顶部偏亮、底部偏暗，模拟光从上方来的玻璃边缘。
4. 悬浮深度：`0 12px 32px -12px rgba(0,0,0,.55)` + `0 2px 8px rgba(0,0,0,.35)`，不用单层大黑影。
5. 不再使用整幅渐隐边缘带：悬浮岛四周有留白，内容在岛的两侧正常显示，这正是 Apple 悬浮工具的形态。滚动驱动动画（`animation-timeline: scroll(root)`）改为只加强岛的阴影，不铺底色。
6. 降级：`prefers-reduced-transparency` 时岛体改不透明 `--surface-raised`；`prefers-contrast: more` 时描边与文字升到最高对比。

## 7. 预订面板的自适应对齐

| 断点 | 布局 | 说明 |
| --- | --- | --- |
| ≥1024px | 字段 4 列：城市目的地 / 入住 / 退房 / 品牌层级；第二行 出行人数 + 开关区（跨 2 列）+ 主按钮 | 主按钮与字段行同高对齐，视觉重心在右下 |
| 768–1024px | 字段 2 列，开关区跨 2 列，主按钮跨 2 列 | 平板单屏可完成全部输入 |
| <768px | 单列，主按钮整行 | 触控目标 ≥44px，输入顺序不变 |

面板内边距：移动 `p-6`（24px），桌面 `p-8`（32px）。字段行之间用 1px 发丝线而不是各自边框，形成 iOS「嵌入式分组」的连续感。

# 第三阶段 · 组件实现清单

| 组件 | 文件 | 职责 |
| --- | --- | --- |
| `<FloatingHeader />` | `app/components/shell/FloatingHeader.tsx` | 悬浮玻璃岛：几何、玻璃材质、内部排版 |
| `<BrandLogo />` | `app/components/shell/BrandLogo.tsx` | 品牌区（SW 标记 + 主副标题） |
| `<ThemeToggle />` | `app/components/theme/ThemeToggle.tsx` | 三态外观，实体微色块，不套玻璃 |
| `<BookingPanel />` | `app/components/home/BookingPanel.tsx` | 嵌入式分组表单 + iOS 开关 + 主操作 |
| `<InputField />` | `app/components/ui/InputField.tsx` | Label over Value 字段行（无硬边框） |

验收：`npm run lint`、`npm test`、`npm run test:e2e` 全绿；390px 无横向溢出；既有 ARIA 契约、键盘顺序、URL 参数与接口结构不变。

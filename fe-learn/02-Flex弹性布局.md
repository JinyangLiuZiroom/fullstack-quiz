# 模块二：Flex 弹性布局（完整学习指南）

> **学习目标**：彻底掌握 Flex 布局，能用它独立完成 90% 的页面排版——居中、两栏、等分布局、换行均分、吸底、卡片流，并会手算 `grow/shrink/basis` 宽度分配。
> **适合谁**：会写 div + 基础 CSS，但经常被「垂直居中」「宽度怎么分」「为什么被挤没」卡住的同学。
> **学完能做什么**：不看文档也能排出版面，遇到布局问题能定位是主轴/交叉轴/换行哪一层的事。

---

## 1. 前置知识

- 知道 HTML 的「块级元素（div 独占一行）」和「行内元素（span 并排）」
- 会写基本 CSS：`display`、`width`、`height`、`margin`、`padding`
- 理解「父元素 / 子元素」的包含关系

老派布局靠 `float` + `position: absolute` 硬拼，容易塌高度、难居中、难自适应。Flex 是 CSS3 的弹性盒子模型，给**容器**设 `display:flex`，里面的**子项**自动按规则排列，绝大多数布局不用算死宽度。

---

## 2. 核心概念：容器、项目、两根轴

```
┌─────────────────────────────────────┐
│  父容器（display:flex）                │
│  ┌────┐ ┌────┐ ┌────┐               │
│  │子项│ │子项│ │子项│   ← 主轴(main)  │
│  └────┘ └────┘ └────┘               │
│          ↑ 交叉轴(cross)             │
└─────────────────────────────────────┘
```

- **主轴（main axis）**：子项排列的方向，由 `flex-direction` 决定
- **交叉轴（cross axis）**：与主轴垂直的方向
- **容器（container）**：设了 `display:flex` 的元素
- **项目（item）**：容器的直接子元素（**只作用一层**，孙元素不受影响）

---

## 3. 快速开始：三行实现水平垂直居中

```css
.parent {
  display: flex;
  justify-content: center;   /* 主轴居中 */
  align-items: center;       /* 交叉轴居中 */
  height: 300px;
}
```

```html
<div class="parent"><div class="child">我居中了</div></div>
```

这是最高频需求，记住这三行等于解决一半布局问题。

---

## 4. 容器属性（完整）

```css
.box {
  display: flex;

  /* 1. 主轴方向 */
  flex-direction: row;            /* 默认：左→右 */
  /* row-reverse 右→左 | column 上→下 | column-reverse 下→上 */

  /* 2. 是否换行 */
  flex-wrap: nowrap;             /* 默认：不换行，子项会被压缩 */
  /* wrap：空间不够就换行 */

  /* 3. 主轴对齐（最重要） */
  justify-content: flex-start;   /* 默认靠起点 */
  /* center 居中 | flex-end 靠终点 |
     space-between 两端贴边、中间均分 |
     space-around  每个两侧间距相等 |
     space-evenly  所有间距完全相等 */

  /* 4. 交叉轴对齐（单行） */
  align-items: stretch;          /* 默认：拉伸填满交叉轴 */
  /* flex-start | center | flex-end | baseline(按文字基线) */

  /* 5. 多行时交叉轴对齐（仅 wrap 且有换行时生效） */
  align-content: flex-start;
  /* 取值同 justify-content，但作用于「多行整体」 */

  /* 6. 子项间距（推荐，替代 margin 拼接） */
  gap: 12px;                     /* 行列都 12px；gap: 12px 8px 表示 行 列 */
}
```

### flex-direction 决定「哪根轴是主轴」

```
row（默认）：   主轴=水平，交叉轴=垂直
column：       主轴=垂直，交叉轴=水平
```
所以 `justify-content` 永远管**主轴**，`align-items` 永远管**交叉轴**。改了 `flex-direction`，它们的方向就跟着变。这是最容易迷糊的点——记住「跟着主轴走」。

### align-content vs align-items（最易混）

- 容器**只有一行**（nowrap 或没换行）：用 `align-items` 控制子项在交叉轴的对齐。
- 容器**多行**（wrap 后）：`align-items` 控制「每一行内部」子项对齐；`align-content` 控制「多行作为一个整体」在交叉轴怎么分布（类似 justify-content 的多行版）。
- 单行时 `align-content` **不生效**。

---

## 5. 子项三大属性：grow / shrink / basis（必考计算）

这是 Flex 最容易考计算、也最容易用错的地方，一定记公式。

- **`flex-basis`**：子项在**主轴方向的初始尺寸**，优先级高于 `width`（行内方向为 `height`）。`auto` = 用 width/内容宽。
- **`flex-grow`**：有**剩余空间**时，按比值**放大**。`默认 0`（不放大）。
- **`flex-shrink`**：空间**不足**时，按比值**缩小**。`默认 1`（允许缩）。

简写：`flex: grow shrink basis`。最常用：
- `flex: 1` = `flex: 1 1 0%`（占满剩余，等分利器）
- `flex: 0 0 auto`（不伸不缩，用自身宽度）

### 计算题 1：放大分配

容器宽 500px，3 个子项 `flex-basis:100px`，`grow` 分别为 `1 / 2 / 2`：

```
剩余空间 = 500 - 3×100 = 200px
grow 总和 = 1 + 2 + 2 = 5
A 最终 = 100 + 200×(1/5) = 140px
B 最终 = 100 + 200×(2/5) = 180px
C 最终 = 100 + 200×(2/5) = 180px
```

### 计算题 2：缩小分配

容器宽 300px，3 个子项 `flex-basis:150px`、`flex-shrink:1`：

```
需要空间 = 3×150 = 450px，超出 150px
收缩量权重和 = 150×1 + 150×1 + 150×1 = 450
每个收缩 = 150 × (150×1) / 450 = 50px
最终每个 = 150 - 50 = 100px
```
若 shrink 不同（如 `1/2/3`），则按 `basis×shrink` 的加权和分配收缩量（谁权重越大缩越多）。

### `flex-shrink: 0` 是什么

表示「**不许缩小**」，常用于固定宽度的侧边栏、图标、按钮，防止被空间不足时挤没。很多人把它和 `flex-grow:0`（不许放大）搞混——**grow 管放大、shrink 管缩小**。

### `flex-basis: 0` vs `auto` 的区别

- `flex:1` = `1 1 0%`：basis 是 0，剩余空间全按 grow 分 → **等分最均匀**。
- `flex:auto` = `1 1 auto`：basis 用内容宽，剩余空间再按 grow 分 → 内容多的子项最终更宽。
- 想三等分用 `flex:1`；想「按内容比例分」用 `flex:auto`。

---

## 6. 经典布局矩阵（背下来，直接抄）

### ① 水平垂直居中
```css
.parent { display: flex; justify-content: center; align-items: center; }
```

### ② 左右两栏：左固定、右自适应
```css
.wrap { display: flex; }
.side { width: 200px; flex-shrink: 0; }   /* 固定，不许缩 */
.main { flex: 1; }                          /* 占满剩余 */
```

### ③ 顶部+内容+底部（footer 吸底）
```css
.page { display: flex; flex-direction: column; min-height: 100vh; }
.content { flex: 1; }   /* 占满，把 footer 顶到底 */
.footer { flex-shrink: 0; }
```

### ④ 等分成 N 份
```css
.row { display: flex; gap: 12px; }
.row > * { flex: 1; }   /* 每份平分剩余 */
```

### ⑤ 两端对齐（标题 + 更多按钮）
```css
.head { display: flex; justify-content: space-between; align-items: center; }
```

### ⑥ 底部导航：固定 + 均分中间
```css
.nav { display: flex; height: 56px; }
.logo { width: 120px; flex-shrink: 0; }
.menu { flex: 1; display: flex; justify-content: space-around; align-items: center; }
.avatar { width: 80px; flex-shrink: 0; }
```

### ⑦ 换行卡片流（一行 3 个）
```css
.cards { display: flex; flex-wrap: wrap; gap: 16px; }
.card { flex: 0 0 calc(33.333% - 11px); }  /* 不伸不缩，按宽度算（减 gap） */
```

### ⑧ 圣杯/后台布局（侧边固定 + 顶栏 + 内容）
```css
.layout { display: flex; height: 100vh; }
.sidebar { width: 220px; flex-shrink: 0; }
.right { flex: 1; display: flex; flex-direction: column; }
.topbar { height: 56px; flex-shrink: 0; }
.content { flex: 1; overflow: auto; }
```

---

## 7. 常见坑与排错

| # | 现象 | 根因 | 正确写法 |
| --- | --- | --- | --- |
| 1 | Flex 不生效 | 给子元素设了 `display:flex` 而不是父容器 | 容器设 `display:flex`，子项只设 flex 属性 |
| 2 | 垂直居中失效 | 父容器没设高度（交叉轴无空间） | 给父容器 `height` 或用 `min-height:100vh` |
| 3 | `justify-content` 不管用 | 弄混了主轴方向（设了 column 却当水平用） | 确认 flex-direction，主轴跟着它走 |
| 4 | 子项被压缩变形 | 默认 `flex-shrink:1` 允许缩 | 固定项加 `flex-shrink:0` |
| 5 | 想整体居中却只对一行生效 | `margin:auto` 只管自身，多行要用 align-content | 多行用 `align-content: center` |
| 6 | 三等分不均匀 | 用了 `flex:auto`（按内容宽） | 用 `flex:1`（basis 0） |
| 7 | `flex-basis` 被 `width` 覆盖 | 没理解优先级 | 行内方向 basis 优先；统一用 basis 或 width 别混 |
| 8 | 换行后行间距乱 | 没设 `align-content` 且默认 stretch | 多行设 `align-content: flex-start/center` |
| 9 | 孙元素没被 Flex 排列 | Flex 只作用直接子元素 | 给孙元素的父（子项）也设 `display:flex` |
| 10 | 图片/文本溢出撑破布局 | 没限制 `min-width:0` | 子项加 `min-width:0` 允许收缩内容 |
| 11 | gap 在某些旧浏览器无效 | 老 Safari 不支持 | 旧项目用 margin 兜底或确认浏览器版本 |

**关键技巧**：子项内容过长（如长文本）会撑破 Flex，给子项加 `min-width: 0`（配合 `overflow:hidden; text-overflow:ellipsis; white-space:nowrap` 做省略号）。

---

## 8. 完整实战：后台管理框架布局

目标：左侧固定 220px 侧边栏，顶部 56px 顶栏，右侧内容区可滚动，底部无吸底（内容区滚动）。

```html
<div class="layout">
  <aside class="sidebar">侧边栏</aside>
  <div class="right">
    <header class="topbar">顶栏</header>
    <main class="content">
      <p>这里是内容，很长很长……</p>
    </main>
  </div>
</div>

<style>
.layout { display: flex; height: 100vh; }
.sidebar { width: 220px; flex-shrink: 0; background: #2c3e50; color: #fff; }
.right { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.topbar { height: 56px; flex-shrink: 0; background: #ecf0f1; }
.content { flex: 1; overflow: auto; padding: 16px; }
</style>
```

验收：
- [ ] 侧边栏宽度固定不被压缩
- [ ] 顶栏固定 56px
- [ ] 内容区变长时只有内容区滚，整体不滚
- [ ] 窗口缩放时右侧自适应

---

## 9. 最佳实践

1. 居中第一反应写 `display:flex` + 双 center。
2. 自适应占满用 `flex:1`；固定宽度加 `flex-shrink:0`。
3. 子项间距统一用 `gap`，别用 `margin` 拼接（避免首尾多余间距）。
4. 多行布局记得 `flex-wrap:wrap` + `align-content`。
5. 长文本子项加 `min-width:0` 防撑破。
6. 复杂布局先画「容器嵌套图」：哪层管横向、哪层管纵向，一层只解决一个方向。

---

## 10. 自测清单

- [ ] 能说出主轴/交叉轴由谁决定
- [ ] 能默写水平垂直居中的三行 CSS
- [ ] 会算 grow/shrink/basis 三种场景的宽度
- [ ] 分得清 align-items 和 align-content
- [ ] 知道 `flex-shrink:0` 防压缩
- [ ] 能独立写出两栏/三等分/卡片流/吸底
- [ ] 遇到布局错能定位是方向/对齐/换行哪层问题

---

## 11. 延伸阅读

- MDN Flexbox 完整指南：https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_flexible_box_layout
- CSS Tricks Flex 速查（图解）：https://css-tricks.com/snippets/css/a-guide-to-flexbox/
- 交互式练习：https://flexboxfroggy.com/ （游戏化练 Flex，强烈推荐）

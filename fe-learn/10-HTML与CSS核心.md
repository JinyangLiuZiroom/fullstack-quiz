# 模块十：HTML/CSS 核心与 Grid 布局（完整学习指南）

> **学习目标**：夯实 CSS 底层——盒模型、display、定位（position）、BFC、层叠上下文、文档流，并掌握二维布局方案 **Grid**（配合模块二学过的 Flex，Flex 管一维、Grid 管二维）。能独立还原常见页面布局，避开「margin 塌陷、z-index 失效、高度塌陷、grid 轨道算不清」等典型坑。
> **适合谁**：会写 HTML 标签和基础 CSS，但布局经常靠试、靠猜，遇到「怎么都不对齐、怎么都铺不满」就抓瞎的同学。
> **学完能做什么**：用 Grid 搭一个后台主页（侧边栏 + 顶部栏 + 内容区 + 底栏的圣杯布局），用 position 做吸顶导航和遮罩弹窗，理解为什么 `margin-top` 会「穿透」父元素。

---

## 1. 前置知识（先确认你会这些）

- 能写 HTML 结构：`<div>`/`<span>`/`<ul>`/`<table>`/`<img>`/`<a>`
- 会写基础 CSS：选择器、颜色、字体、`width`/`height`、`padding`/`margin`
- 已学模块二（Flex 一维布局）——本篇在 Flex 之上讲二维布局
- 知道「块级元素占一行、行内元素并排」的直觉

---

## 2. 核心概念一：盒模型

每个元素都是一个矩形盒子，由内到外：**content → padding → border → margin**。

### 2.1 `content-box` vs `border-box`

```css
.box {
  width: 100px;
  padding: 10px;
  border: 5px solid #000;
}
```

- **`content-box`（默认）**：`width: 100px` 只算 content，实际占位 = 100 + 20(padding) + 10(border) = **130px**
- **`border-box`**：`width: 100px` 包含 content+padding+border，实际占位就是 **100px**，content 被压缩

> **全局最佳实践**：项目开头加 `* { box-sizing: border-box; }`，从此 `width` 就是你看到的盒子宽，布局心智负担减半。几乎所有 UI 库都这么做。

### 2.2 margin 塌陷（Collapsing）

**相邻兄弟**的上下 margin 取**最大值**而非相加；**父元素与首个子元素**的 `margin-top` 会「穿透」到父元素外。

```html
<div class="parent">
  <div class="child">我</div>
</div>
```
```css
.parent { /* 没设 border/padding/overflow */ }
.child { margin-top: 30px; }   /* 父元素整体被往下推 30px，而不是 child 在父内下移 */
```

**解决**：父元素加 `padding-top`、`border-top`，或 `overflow: hidden`，或父用 flex/grid（它们建立新 BFC）。

---

## 3. 核心概念二：文档流与 display

- **块级（block）**：独占一行，`div`/`p`/`h1`/`ul`
- **行内（inline）**：并排，宽高无效，`span`/`a`/`strong`
- **行内块（inline-block）**：并排但能设宽高，`img`/`input`/按钮
- **`display: none`**：直接不渲染（不占空间）；`visibility: hidden` 占空间但看不见

> 布局的本质就是「把元素搬出/放进文档流，并控制它怎么排」。

---

## 4. 核心概念三：定位 position

| 值 | 参照物 | 是否脱流 | 典型用途 |
|---|---|---|---|
| `static` | 默认，不定位 | 否 | —— |
| `relative` | 自己原位置 | 否 | 微调、给 absolute 当容器 |
| `absolute` | 最近的非 static 祖先 | **是** | 弹窗、角标、吸顶内层 |
| `fixed` | 视口（浏览器窗口） | **是** | 吸顶导航、回到顶部、蒙层 |
| `sticky` | 滚动到阈值前 relative，之后 fixed | 否 | 表头吸顶、侧边栏吸顶 |

```css
.parent { position: relative; }   /* 给子元素当定位容器 */
.child  { position: absolute; top: 10px; right: 10px; }  /* 相对 parent 右上角 */
```

> **经典坑**：`absolute` 找不到参照物时，会一路找到 `<body>` 甚至相对视口，布局全飞。记住：**absolute 的爹必须是 relative/absolute/fixed**。

---

## 5. 核心概念四：BFC 与层叠上下文

### 5.1 BFC（块级格式化上下文）

BFC 是一块「独立渲染区域」，内部布局不影响外部。触发 BFC 的方式：`overflow` 非 `visible`、`float`、`position: absolute/fixed`、`display: flex/grid/inline-block`。

**BFC 解决的问题**：
- 清除浮动（父包住浮动子元素，高度不塌陷）
- 阻止 margin 塌陷
- 阻止文字环绕浮动

### 5.2 浮动 `float`（了解即可）

现代布局用 Flex/Grid，float 已基本被取代，只剩「文字环绕图片」场景。记住**父元素会塌陷**，需用 BFC 或 `clearfix` 清除。

### 5.3 层叠上下文（z-index 失效的根因）

`z-index` 只在「同一层叠上下文」内比大小。根元素是一个大上下文；`position` 非 static 且 `z-index` 非 auto、或 `opacity<1`、`transform` 非 none 等会**创建新层叠上下文**。

```css
/* 父创建了层叠上下文，子的 z-index 只在父内部比，盖不过父外的元素 */
.parent { position: relative; z-index: 1; }
.child  { position: absolute; z-index: 999; }  /* 只和 .parent 内的兄弟比 */
```

> **z-index 乱飞排错口诀**：先看「谁的祖先创建了层叠上下文」，再在同上下文内排高低；跨上下文比 z-index 没意义。

---

## 6. 核心概念五：Grid 二维布局

Flex 是一维（一行或一列）。**Grid 是二维（同时管行和列）**，适合整体页面骨架、卡片网格。

### 6.1 最小网格

```css
.container {
  display: grid;
  grid-template-columns: 100px 1fr 1fr;  /* 三列：100px、剩余均分两份 */
  grid-template-rows: auto 200px;         /* 两行 */
  gap: 10px;                              /* 行列间距 */
}
```

- `fr` = 剩余空间比例（`1fr 1fr` 各占一半剩余）
- `repeat(3, 1fr)` = 三等分
- `grid-template-columns: 200px repeat(2, 1fr) 100px`

### 6.2 显式放置子项

```css
.item-a {
  grid-column: 1 / 3;   /* 占第 1~2 列（线编号，含左不含右） */
  grid-row: 1 / 2;
}
```

线编号从 1 开始（容器左上角是 1 线）。`grid-column: 1 / -1` 表示从首列到末列（跨满整行）。

### 6.3 圣杯布局（后台骨架神器）

```css
.layout {
  display: grid;
  grid-template-columns: 200px 1fr;        /* 左栏固定 200，右区自适应 */
  grid-template-rows: 60px 1fr 40px;        /* 顶栏 60、内容自适应、底栏 40 */
  grid-template-areas:
    "side top"
    "side main"
    "side foot";
  height: 100vh;
}
.side  { grid-area: side; }
.top   { grid-area: top; }
.main  { grid-area: main; overflow: auto; }
.foot  { grid-area: foot; }
```

> `grid-template-areas` 用「可视化字符地图」摆布局，可读性极高，是页面骨架首选。

### 6.4 响应式网格（自动换行）

```css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
/* 容器变窄时自动从 4 列变 3/2/1 列，无需媒体查询 */
```

---

## 7. 常见坑与排错表

| # | 现象 | 根因 | 正确做法 |
|---|---|---|---|
| 1 | 设了 width 却还是比预期宽 | `content-box` 没算 padding/border | 全局 `box-sizing: border-box` |
| 2 | 子元素 margin-top 把父元素顶下去 | margin 塌陷穿透 | 父加 `overflow:hidden`/`padding-top`/flex |
| 3 | absolute 元素跑到页面角落 | 没设定位容器（爹是 static） | 给父加 `position: relative` |
| 4 | fixed 弹窗相对某个 div 定位 | 祖先有 transform 创建了包含块 | fixed 的参照会变；弹窗放 body 层级 |
| 5 | z-index 怎么调都盖不住 | 跨了不同层叠上下文 | 找到创建上下文的祖先，在同上下文内排序 |
| 6 | 父元素高度为 0（子全 float） | 浮动脱流父包不住 | 父 `overflow:hidden` 触发 BFC 或 clearfix |
| 7 | grid 列挤在一起 | 用 px 写死没留 fr | 自适应列用 `1fr`/`minmax` |
| 8 | grid 子项重叠 | 多个子项 grid-area 冲突或线写错 | 检查 `grid-column/row` 范围是否重叠 |
| 9 | `1fr` 内容溢出撑破 | 内容最小宽度 > fr 分配 | 加 `min-width: 0` 允许收缩 |
| 10 | sticky 不吸顶 | 父容器 `overflow: hidden/auto` 或没到阈值 | 父不裁剪滚动；设 `top: 0` |
| 11 | 行内元素设宽高无效 | inline 不支持宽高 | 改 `inline-block` 或 `block` |
| 12 | 图片底部有缝隙 | inline 元素基线对齐留白 | `display:block` 或 `vertical-align:bottom` |

---

## 8. 完整实战：后台主页骨架

**目标**：左侧 200px 固定栏，顶部 60px 吸顶条，中间内容自适应可滚动，底部 40px 状态栏。窄屏自动变单列。

```html
<div class="layout">
  <aside class="side">侧边栏</aside>
  <header class="top">顶部导航</header>
  <main class="main">
    <div class="cards">
      <div class="card">卡片1</div>
      <div class="card">卡片2</div>
      <div class="card">卡片3</div>
      <div class="card">卡片4</div>
    </div>
  </main>
  <footer class="foot">状态栏</footer>
</div>
```

```css
* { box-sizing: border-box; margin: 0; }
.layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  grid-template-rows: 60px 1fr 40px;
  grid-template-areas: "side top" "side main" "side foot";
  height: 100vh;
}
.side  { grid-area: side; background: #2c3e50; color: #fff; }
.top   { grid-area: top; background: #ecf0f1; }
.main  { grid-area: main; overflow: auto; padding: 16px; }
.foot  { grid-area: foot; background: #ecf0f1; font-size: 12px; }

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
.card { background: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 8px; }

/* 窄屏：变单列，侧边栏移到顶部 */
@media (max-width: 600px) {
  .layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto 60px 1fr 40px;
    grid-template-areas: "side" "top" "main" "foot";
  }
}
```

**验收打勾**：
- [ ] 桌面端呈现「左栏 + 顶栏 + 内容 + 底栏」四区，且不出现滚动条外的双滚动
- [ ] 中间卡片随窗口宽度自动从 4 列变 1 列
- [ ] 窗口缩到 600px 以下，侧边栏移到顶部，布局不崩
- [ ] 改 `grid-template-areas` 字符图能直观调整区域，不靠试

---

## 9. 最佳实践

1. **全局 `box-sizing: border-box`**，布局宽度心智统一。
2. **整页骨架用 Grid（二维），组件内排列用 Flex（一维）**，别混着硬凑。
3. **吸顶/弹窗用 fixed/sticky**，记得给 absolute 的父加 `relative`。
4. **布局字符图 `grid-template-areas`** 做页面分区，可读性最佳。
5. **响应式优先用 `fr`/`minmax`/`auto-fill`**，少写死媒体查询。
6. **z-index 统一管理**（如定义 `--z-modal: 1000`），避免乱飞。
7. **高度塌陷用 BFC（overflow/flex/grid）** 而非 hack。

---

## 10. 自测清单（全打勾才算掌握）

- [ ] 能说清 content-box 与 border-box 区别，并知道为什么全局用后者
- [ ] 知道 margin 塌陷的表现和 3 种解法
- [ ] 能讲清 relative/absolute/fixed/sticky 的参照物和是否脱流
- [ ] 知道 z-index 失效是因为层叠上下文
- [ ] 能用 Grid 写出圣杯布局（侧+顶+主+底）
- [ ] 会用 `fr`/`repeat`/`minmax`/`grid-template-areas`
- [ ] 能手写响应式卡片网格（auto-fill + minmax）
- [ ] 能排查高度塌陷、absolute 跑飞、图片缝隙三类坑

---

## 11. 延伸阅读

- MDN CSS 盒模型：https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Box_Model
- MDN Grid 布局指南：https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Grid_Layout
- Grid 可视化练习：https://cssgridgarden.com/（中文）
- 层叠上下文详解：https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_positioned_layout/Understanding_z-index/Stacking_context

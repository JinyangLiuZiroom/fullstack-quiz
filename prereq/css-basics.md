# CSS 基础（前置知识补完）

> 一句话：CSS 决定「长什么样」——颜色、间距、布局。

## 你应该会什么（检验）
- 会写 class / id / 基础选择器
- 知道 `display`、`width`、`height`、`margin`、`padding` 是干嘛的
- 理解「父元素 / 子元素」的包含关系

## 30 秒上手
```css
.box {                 /* 类选择器 */
  display: block;
  width: 200px;
  padding: 12px;       /* 内边距：内容与边框之间 */
  margin: 8px;         /* 外边距：盒子与其他盒子之间 */
  border: 1px solid #ddd;
}
#app { color: red; }   /* id 选择器，权重更高 */
```

## 盒模型（必记）
每个元素是一个盒子：**content + padding + border + margin**。
默认 `box-sizing: content-box`（width 不含 padding/border），新手常被尺寸算错坑；
统一加 `*{ box-sizing:border-box }` 让 width 包含 padding+border，更直观。

## 一个练习
画两个并排的色块，用 `margin` 留出间距。做完回主文章。

## 常见误解
- `margin` 和 `padding` 不一样：padding 是「自己内缩」，margin 是「推开别人」。
- 相邻块级元素的 `margin` 会「塌陷」（取较大值），不是相加。

↩ 回到学习笔记首页：../learn.html

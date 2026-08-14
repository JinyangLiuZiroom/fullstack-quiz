# HTML 基础（前置知识补完）

> 一句话：HTML 是用「标签」描述网页**结构**的语言，不负责样式和逻辑。

## 你应该会什么（检验）
- 能写出 `<div>`、`<input>`、`<button>`、`<ul><li>`、`<table>`、`<img>`、`<a>`
- 知道「块级元素」（div 独占一行）和「行内元素」（span 并排）

## 30 秒上手
```html
<!doctype html>
<html lang="zh-CN">
  <head><meta charset="utf-8"><title>demo</title></head>
  <body>
    <h1>标题</h1>
    <div class="box">块级，独占一行</div>
    <span>行内</span><span>并排</span>
    <a href="https://example.com">链接</a>
    <img src="a.png" alt="描述">
  </body>
</html>
```

## 一个练习
写一个「用户名输入框 + 提交按钮」的静态结构，不写任何 JS，在浏览器打开能看到。做完再回主文章。

## 常见误解
- `<div>` 和 `<span>` 只是**语义/排版不同**，样式都能用 CSS 改；默认行为才是「块级 vs 行内」。
- `alt` 不是可有可无：图片加载失败或读屏时会显示它，务必写。
- HTML 不报错：写错标签浏览器会「尽力修复」，所以 bug 常常静默——用 DevTools 的 Elements 面板核对真实结构。

↩ 回到学习笔记首页：../learn.html

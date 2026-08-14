# XSS 与脚本注入概念（前置知识补完）

> 一句话：XSS 是「攻击者把恶意 JS 塞进你的页面并执行」，从而偷 cookie、钓鱼。

## 你应该会什么（检验）
- 知道 `<script>` 里的 JS 会在页面执行
- 知道「攻击者能往页面塞 JS」意味着什么

## 30 秒上手
```html
<!-- 评论区没过滤，用户输入被当 HTML 执行 -->
<div>你好 <script>alert(document.cookie)</script></div>
```
用户写的 `<script>` 被原样插入页面 → 浏览器执行 → 偷走登录态。

## 一个练习
想清楚：为什么「展示用户输入」时必须转义，而不是直接 `innerHTML` 塞进去。做完回主文章（模块十七专门讲防御）。

## 常见误解
- XSS 不只对 `<script>` 有效，`onerror=`、`href="javascript:"` 也能执行。
- 防御主线：不信任任何用户输入，输出时转义；敏感 cookie 加 `HttpOnly`。

↩ 回到学习笔记首页：../../learn.html

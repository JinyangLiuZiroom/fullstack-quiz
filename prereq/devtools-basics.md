# 浏览器 DevTools 基础（前置知识补完）

> 一句话：DevTools 是调试前端的「放大镜」，F12 打开。

## 你应该会什么（检验）
- 会用 Chrome，`F12` 或 `Ctrl+Shift+I`（Mac `Cmd+Opt+I`）打开
- 知道 Elements / Console / Network 三个面板干嘛用

## 30 秒上手
- **Elements**：看真实 DOM 结构、改样式实时预览
- **Console**：敲 JS、看报错和 `console.log`
- **Network**：看每个请求的 URL、方法、状态码、请求/响应内容
- **设备模拟**：右上角手机图标，模拟手机屏幕（移动端适配用）

## 一个练习
打开任意网页，Console 里敲 `document.title` 看返回；Network 里找主页请求看状态码。做完回主文章。

## 常见误解
- Elements 里改的样式**只在本机当前页面生效**，不会改源码，用来试效果。
- 报错先看 Console 红色信息，比瞎猜快十倍。

↩ 回到学习笔记首页：../learn.html

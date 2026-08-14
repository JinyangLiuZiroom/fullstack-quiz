# Node.js 环境（前置知识补完）

> 一句话：Node.js 让 JS 能脱离浏览器运行在服务端/命令行，前端构建工具（Vite 等）都依赖它。

## 你应该会什么（检验）
- 已安装 Node.js（建议 18+）
- `node -v` 能打印版本

## 30 秒上手
```bash
node -v          # 例如 v20.11.0
node             # 进入 REPL，可直接敲 JS 运行
```
装 Node 后用它跑脚本、装包、启动构建；浏览器里跑的是「前端 JS」，Node 里跑的是「服务端/工具 JS」，语法一样但能力不同（Node 没有 `document`）。

## 一个练习
`node -e "console.log(1+1)"` 能打印 2，说明环境 OK。做完回主文章。

## 常见误解
- 前端项目「需要 Node」是为了**构建**，不是让用户装 Node；最终产物是静态 HTML/JS，浏览器直接跑。
- 不同项目要不同 Node 版本时，用 `nvm`（Mac/Linux）或 `n` 切换。

↩ 回到学习笔记首页：../../learn.html

# 命令行与 npm（前置知识补完）

> 一句话：前端项目靠命令行装依赖、跑脚本，npm 是 Node 的包管理器。

## 你应该会什么（检验）
- `node -v` 能看到版本
- `npm install` 装依赖、`npm run dev` 跑开发服务器、`npm run build` 打包

## 30 秒上手
```bash
node -v            # 确认 Node 已装，建议 18+
npm install        # 按 package.json 装全部依赖
npm run dev        # 跑开发服务器（热更新）
npm run build      # 打包到 dist/
npx tsc --init     # 临时调用某个包的命令（不用全局装）
```
`pnpm` / `yarn` 是 npm 的替代品，命令类似。

## 一个练习
新建一个空文件夹，`npm init -y` 然后 `npm install dayjs`，在 node 里 `require('dayjs')` 能用。做完回主文章。

## 常见误解
- `npm install xxx` 装到依赖里并写进 `package.json`；漏了 `--save` 老版本不会记录（新版本默认记录）。
- `node_modules` 不用提交到 Git（有 `.gitignore` 忽略），别人 `npm install` 即可还原。

↩ 回到学习笔记首页：../learn.html

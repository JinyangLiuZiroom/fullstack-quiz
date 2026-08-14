# 模块五：Vite 工程化与构建（完整学习指南）

> **学习目标**：从零跑起一个 Vue3 + TypeScript 项目，理解 dev / build / preview 的区别，掌握代理、路径别名、环境变量、类型门禁，能独立启动项目并打出不带类型错误的生产包。
> **适合谁**：拿到一个前端工程不知道怎么启动、build 报错看不懂、`import` 路径写了一长串 `../../` 的同学。
> **学完能做什么**：初始化项目、配 `@` 别名和 `/api` 代理、用环境变量区分 dev/prod、让 `npm run build` 过类型检查，交付一个可上线的 `dist/`。

---

## 1. 前置知识

- 装好 Node.js 18+（用 `node -v` 确认）
- 会用 npm（或 pnpm/yarn）安装依赖
- 知道「开发」和「上线」是两回事：开发要快+热更新，上线要小+压缩

---

## 2. 为什么用 Vite（而不是 Webpack）

- **冷启动极快**：基于浏览器原生 ESM，不打包依赖，启动秒开
- **热更新（HMR）毫秒级**：改一行只更新那一行，不刷新整页
- **开箱即用**：内置 TS、CSS 预处理、代理、打包
- **配置少**：一个 `vite.config.ts` 搞定

---

## 3. 快速开始：初始化项目

```bash
npm create vite@latest my-app -- --template vue-ts
cd my-app
npm install
npm run dev        # 开发服务器，默认 http://localhost:5173
```

目录结构（重点看这几个）：
```
my-app/
├─ index.html          # 入口 HTML，<div id="app">
├─ vite.config.ts      # 工程配置（代理/别名/插件）
├─ tsconfig.json       # TS 配置（类型检查规则）
├─ tsconfig.node.json  # 给 vite.config 用的 TS 配置
├─ package.json        # 脚本与依赖
├─ .env                # 公共环境变量
├─ .env.development    # 开发环境变量
├─ .env.production     # 生产环境变量
└─ src/
   ├─ main.ts          # 挂载 App 到 #app
   ├─ App.vue          # 根组件
   ├─ env.d.ts         # 声明 .env 里 VITE_ 变量的类型
   └─ ...
```

---

## 4. 三条核心命令

| 命令 | 作用 | 注意 |
| --- | --- | --- |
| `npm run dev` | 启动开发服务器，带 HMR | 不压缩、不校验类型、不打包 |
| `npm run build` | 产出 `dist/`（上线包） | 默认先 `vue-tsc` 类型检查再打包 |
| `npm run preview` | 本地预览打包结果 | 验证 dist 是否真能跑，模拟生产 |

`package.json` 里的脚本通常长这样：
```json
"scripts": {
  "dev": "vite",
  "build": "vue-tsc -b && vite build",   // 先类型检查再打包
  "preview": "vite preview"
}
```

> **重点**：`npm run dev` 不报错 ≠ 能 `build`。`dev` 不校验类型，写错类型也能跑；`build` 会因为类型错误（`vue-tsc`）失败。**CI 流水线的「类型门禁」就是 build 这步**——类型不过就不让上线。

---

## 5. vite.config.ts 必会三件事

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],                 // Vue 单文件组件支持（必须）

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))  // @ = src 目录
    }
  },

  server: {
    port: 5173,
    open: true,                     // 启动自动开浏览器
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true          // 解决 dev 跨域（见模块四）
      }
    }
  },

  build: {
    outDir: 'dist',                 // 输出目录
    sourcemap: false,               // 生产关 sourcemap，减小体积、防源码泄露
    chunkSizeWarningLimit: 1500     // 包过大告警阈值
  }
})
```

### 路径别名 `@`

配好后代码里：
```ts
import { request } from '@/utils/request'   // ✅ 不用写 ../../utils/request
```
`tsconfig.json` 里也要同步配（两边都要，否则 TS 报错）：
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
```

---

## 6. 环境变量（区分 dev / prod）

Vite 用 `.env` 文件管理环境变量，规则：
- `.env`：所有环境都加载
- `.env.development`：只在 `npm run dev` 加载
- `.env.production`：只在 `npm run build` 加载
- **只有 `VITE_` 前缀的变量才会暴露给前端代码**

```bash
# .env.development
VITE_API_BASE=http://localhost:8080
VITE_APP_TITLE=测试环境

# .env.production
VITE_API_BASE=https://api.xxx.com
VITE_APP_TITLE=生产环境
```

```ts
// 代码里读取
const base = import.meta.env.VITE_API_BASE
console.log(import.meta.env.VITE_APP_TITLE)
```

`src/env.d.ts` 里声明类型（不然 TS 不认识）：
```ts
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_BASE: string
  readonly VITE_APP_TITLE: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

> **安全红线**：`VITE_` 变量会打包进前端代码，浏览器完全可见。**绝不放密钥**（数据库密码、私钥、secret）。敏感配置放后端，前端只放「公开的运行配置」（接口地址、开关）。真正的密钥走后端环境变量。

---

## 7. 类型门禁（CI 必过）

`build` 里的 `vue-tsc -b` 会检查整个项目的 TS 类型（`--noEmit` 只查不产出）。常见类型坑：

| 坑 | 现象 | 解法 |
| --- | --- | --- |
| `ref` 没标类型 | 推断成 `Ref<number>` 但用成字符串报错 | `ref<number>(0)` |
| 接口返回结构没定义 | `res.data.x` 报「可能不存在」 | 定义 `interface` 描述返回 |
| 滥用 `any` | 失去类型保护，后续取值全无提示 | 用 `unknown` 或补类型 |
| 解构丢类型 | 解构后变量变 `any` | 用 `toRefs` 保留类型 |
| 第三方库无类型 | 报找不到模块声明 | 装 `@types/xxx` 或写 `declare module` |
| 事件参数类型错 | `@click` 参数类型不匹配 | 用 `(e: MouseEvent) => {}` |

想让 dev 时也实时标红类型错误，装 Volar 插件（Vue 官方）。编辑器里写错类型立刻红波浪线，比 build 才报错体验好。

---

## 8. 构建产物与部署常识

`npm run build` 后 `dist/` 内容：
```
dist/
├─ index.html
├─ assets/
│  ├─ index-xxxx.js     # 打包后的 JS（已压缩、哈希命名）
│  └─ index-xxxx.css    # 打包后的 CSS
```
- **哈希命名**：内容变了文件名才变，配合 CDN 缓存策略（长期缓存，更新即换名）
- **部署**：把 `dist/` 整个丢到 Nginx/静态服务器/对象存储即可
- **SPA 路由**：用 `history` 模式时，Nginx 要配 `try_files $uri /index.html`（刷新 404 问题）

---

## 9. 常见坑与排错

| # | 现象 | 根因 | 解法 |
| --- | --- | --- | --- |
| 1 | build 失败但 dev 正常 | `vue-tsc` 类型错误 | 按报错补类型，别用 any 糊弄 |
| 2 | `@/` 报错找不到模块 | tsconfig 没配 paths | tsconfig + vite 两边都配别名 |
| 3 | 环境变量 `undefined` | 没加 `VITE_` 前缀 | 改名 `VITE_XXX` |
| 4 | 生产接口地址错 | `.env.production` 没配或覆盖错 | 检查对应环境文件 |
| 5 | 代理没生效跨域 | target 写错 / 没 changeOrigin | 核对 target，加 changeOrigin |
| 6 | 刷新页面 404 | SPA history 模式 Nginx 没配 | Nginx `try_files $uri /index.html` |
| 7 | 打包体积过大 | 没做代码分割/引入了大库 | 路由懒加载、按需引入 |
| 8 | dev 改代码不热更 | 改的是被 import 的静态资源或配置 | 重启 dev，配置改动需重启 |
| 9 | 端口被占用 | 5173 已被占用 | `server.port` 换端口或关占用进程 |
| 10 | 依赖装不上/慢 | 网络或源问题 | 换 `npm config set registry` 或用 pnpm |

---

## 10. 完整实战

目标：起一个 Vue3+TS 项目，配 `@` 别名、`/api` 代理到 localhost:8080，用 `.env.development` 配接口地址，build 成功产出 dist。

```bash
npm create vite@latest demo -- --template vue-ts
cd demo && npm install
```

```ts
// vite.config.ts 加 alias + proxy（如上第 5 节）
// .env.development 加 VITE_API_BASE=http://localhost:8080
// 在 src/env.d.ts 声明变量类型
// 在任意组件用 import.meta.env.VITE_API_BASE
npm run build   # 看到 dist/ 生成、无类型错误 = 过关
npm run preview # 本地预览验证能跑
```

验收：
- [ ] `dist/` 生成
- [ ] 控制台无类型错误
- [ ] dev 访问 `/api/xxx` 走代理不跨域
- [ ] `import.meta.env.VITE_API_BASE` 能正确读到

---

## 11. 最佳实践

1. **别名用 `@` 代替 `../../`**，路径清晰不易错。
2. **环境配置走 `.env.*` + `VITE_` 前缀**，dev/prod 不碰代码。
3. **秘密绝不进前端**，密钥一律后端管。
4. **CI 用 `build`（含类型门禁）**，类型不过不让上线。
5. **依赖加锁**：提交 `package-lock.json` / `pnpm-lock.yaml`，保证团队依赖一致。
6. **生产关 sourcemap**，防源码泄露。
7. **大项目路由懒加载**，减小首屏体积。

---

## 12. 自测清单

- [ ] 能初始化一个 Vue3+TS 项目并 `npm run dev`
- [ ] 说得出 dev / build / preview 区别
- [ ] 会配 `@` 别名（vite + tsconfig 两边都配）
- [ ] 会用 `.env.*` + `VITE_` 区分环境
- [ ] 知道 `VITE_` 变量会进前端包、不能放密钥
- [ ] 理解 build 的类型门禁，能修常见类型错误
- [ ] 知道 SPA 刷新 404 要 Nginx 配 try_files

---

## 13. 延伸阅读

- Vite 官方文档：https://cn.vitejs.dev/guide/
- Vite 配置项：https://cn.vitejs.dev/config/
- 环境变量：https://cn.vitejs.dev/guide/env-and-mode.html
- Vue+TS 工程：https://cn.vuejs.org/guide/typescript/overview.html

# 模块七：Vue Router 路由（完整学习指南）

> **学习目标**：理解前端路由的本质，掌握 Vue Router 的安装、配置、动态路由、嵌套路由、编程式导航、路由守卫与懒加载，能独立搭出一个多页面后台框架，并避开「刷新白屏、守卫死循环、参数取不到」等典型坑。
> **适合谁**：已经学过模块一（Vue3 响应式），会写组件、会用 Vite 起项目，但还没做过多页面跳转的同学。
> **学完能做什么**：做一个带侧边栏导航 + 列表页 + 详情页 + 登录拦截的后台框架，刷新不白屏，未登录跳登录页。

---

## 1. 前置知识（先确认你会这些）

- 已掌握模块一：`ref`/`reactive`/`computed`、`<script setup>`、组件通信
- 会用 Vite 创建并运行项目（`npm create vite`、`npm run dev`）
- 理解「单页应用（SPA）」：整个站点只有一个 `index.html`，页面切换靠 JS 动态换内容，不真刷新浏览器
- 知道 URL 长什么样：`path`、`query`（? 后面）、`hash`（# 后面）

如果 SPA 没概念，先记住一句话：**前端路由就是「URL 变了，但页面不整页刷新，只换中间那块内容」**。

---

## 2. 核心概念：前端路由到底在干嘛

### 2.1 两种模式

| 模式 | URL 样子 | 原理 | 部署注意 |
|---|---|---|---|
| **hash**（默认） | `http://a.com/#/user/1` | 改 `#` 后面，浏览器不向服务器发请求，JS 监听 `hashchange` | 服务器无需特殊配置，**刷新不会 404** |
| **history** | `http://a.com/user/1` | 用 HTML5 `pushState` 改 URL，美观，但刷新时浏览器会真去请求 `/user/1` | 服务器必须兜底返回 `index.html`，否则刷新 404 |

> 真实项目基本都用 **history 模式**（URL 干净、利于 SEO）。代价是部署要配 fallback。下面 2.4 和坑表会专门讲。

### 2.2 三个核心角色

- **`router`**：路由实例，配置「哪个路径对应哪个组件」
- **`<router-view />`**：路由出口（坑位），匹配的组件渲染到这里
- **`<router-link to="...">`**：声明式跳转（渲染成 `<a>`），等价于代码里的 `router.push`

---

## 3. 快速开始：最小可运行路由

### 3.1 安装

```bash
npm install vue-router@4
```

### 3.2 配置路由表 `src/router/index.js`

```js
// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import About from '../views/About.vue'

// 1. 路由表：path -> component
const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About },
]

// 2. 创建路由实例（history 模式）
const router = createRouter({
  history: createWebHistory(),   // 用 history 模式
  routes,
})

export default router
```

### 3.3 挂到应用 `src/main.js`

```js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'   // 引入上面那个 router

createApp(App)
  .use(router)   // 关键：注册路由，组件里才能用 <router-view>/<router-link>
  .mount('#app')
```

### 3.4 在 App.vue 放出口和导航

```vue
<!-- App.vue -->
<template>
  <nav>
    <!-- 声明式跳转，渲染成 <a href="/about"> -->
    <router-link to="/">首页</router-link> |
    <router-link to="/about">关于</router-link>
  </nav>

  <!-- 路由出口：当前 URL 匹配的组件渲染在这里 -->
  <router-view />
</template>
```

跑起来访问 `/` 显示 Home，`/about` 显示 About，且**页面不整页刷新**。

---

## 4. 进阶用法（实战必会）

### 4.1 动态路由（带参数）

```js
// 配置：冒号开头表示动态段
{ path: '/user/:id', component: User }
```

```vue
<!-- User.vue 里取参数 -->
<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()   // 当前路由信息（响应式）
console.log(route.params.id)   // 访问 /user/123 得到 "123"（是字符串！）
</script>
```

### 4.2 嵌套路由（后台框架核心）

```js
const routes = [{
  path: '/admin',
  component: AdminLayout,      // 布局组件，里面要有 <router-view/>
  children: [
    { path: '', component: AdminHome },          // /admin 默认子页
    { path: 'users', component: AdminUsers },    // /admin/users
    { path: 'users/:id', component: AdminUserDetail }, // /admin/users/1
  ],
}]
```

```vue
<!-- AdminLayout.vue 里必须再放一个 <router-view/> 给子路由 -->
<template>
  <aside>侧边栏</aside>
  <main>
    <router-view />   <!-- 子路由组件渲染在这里 -->
  </main>
</template>
```

### 4.3 编程式导航

```js
import { useRouter } from 'vue-router'

const router = useRouter()

router.push('/about')                 // 跳转到路径
router.push({ path: '/user/1' })      // 对象写法
router.push({ name: 'user', params: { id: 1 } })  // 命名路由（推荐，路径改了不影响）
router.replace('/login')              // 替换历史（不能后退）
router.back()                         // 后退
```

> **命名路由**：给路由配 `name: 'user'`，跳转用 `name + params`，以后改 `path` 不用全局搜替换，维护性更好。

### 4.4 路由参数 vs 查询参数

```js
// /search?keyword=vue&page=2
route.params   // 动态段，来自 /:xxx
route.query    // ? 后面的，route.query.keyword === 'vue'，route.query.page === '2'
```

- 用 `params`：`/user/123`（资源定位，语义是「某个用户」）
- 用 `query`：`/search?keyword=vue`（筛选条件，可缺省）

### 4.5 路由守卫（登录拦截）

```js
// 全局前置守卫：每次跳转前执行
router.beforeEach((to, from) => {
  const token = localStorage.getItem('token')
  // 想去需要登录的页，但没 token
  if (to.meta.requiresAuth && !token) {
    return { name: 'login' }   // 中断并跳登录（return false 取消，return 路径 重定向）
  }
  // 不返回 / 返回 true 表示放行
})
```

```js
// 路由上标记是否需要登录
{ path: '/admin', component: AdminLayout, meta: { requiresAuth: true } }
```

> 守卫里 `return` 一个路由对象 = 重定向；`return false` = 取消导航；什么都不返回 / `return true` = 放行。

### 4.6 路由懒加载（性能）

```js
// 不要顶部 import，改成函数，访问时才加载该页 JS
const User = () => import('../views/User.vue')

const routes = [{ path: '/user/:id', component: User }]
```

打包后每个页面是独立 chunk，首屏只加载当前页代码，提速明显。

### 4.7 404 与通配

```js
// 放路由表最后
{ path: '/:pathMatch(.*)*', component: NotFound }
```

### 4.8 滚动行为

```js
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition   // 浏览器后退时回到原位置
    return { top: 0 }                          // 否则滚到顶部
  },
})
```

---

## 5. 常见坑与排错表

| # | 现象 | 根因 | 正确做法 |
|---|---|---|---|
| 1 | 刷新子路由（如 `/user/1`）报 404 | history 模式服务器没配 fallback | Nginx `try_files $uri /index.html`；Vite dev 已自带，部署才暴露 |
| 2 | 路由写了页面空白 | `App.vue` 忘了放 `<router-view/>` | 每个有子路由的组件都要有出口 |
| 3 | 点 `<router-link>` 整页刷新 | 用了 `to="/xxx"` 但外面包了 `<a href>` | 不要嵌套 `<a>`，`<router-link>` 本身就是链接 |
| 4 | `route.params.id` 取不到 | 在 `setup` 外缓存了 route，或用了 `query` 当 `params` | 用命名路由 `params`；动态段用 `:id`；`query` 用 `route.query` |
| 5 | 参数变了组件不刷新 | 复用同一组件，生命周期不重走 | `watch(() => route.params.id, fn)` 或 `<router-view :key="route.fullPath"/>` |
| 6 | 守卫里死循环 | 没 token 跳 login，但 login 也被 `requiresAuth` 拦截又跳 login | login 路由不要加 `requiresAuth`，或守卫里排除登录页 |
| 7 | `router.push` 后拿不到数据 | 认为 push 是同步的 | push 返回 Promise，要 `await` 或在 `onMounted` 里读 |
| 8 | 刷新后 `params` 丢了 | 刷新浏览器，JS 状态清空，动态参数靠 URL 保留但 `query` 才能持久 | 需要刷新保留的用 `query`，或刷新时从接口重新拉 |
| 9 | 路由切换动画失效 | 没给 `<router-view>` 包 `<transition>` 或 key 不对 | `<transition><router-view v-slot="{ Component }"><component :is="Component"/></router-view></transition>` |
| 10 | 部署到子路径（如 `/app/`）白屏 | `createWebHistory()` 没传 base | `createWebHistory('/app/')` 且服务器子路径一致 |
| 11 | 懒加载组件 404 | 路径写错或文件名大小写不符 | 用 `@/views/xxx` 别名并检查文件名大小写（Linux 区分） |
| 12 | 守卫里 `await` 异步后没 return | 异步取权限期间导航已放行 | 在 `async` 守卫里 `return` 最终结果，或用 `next`（Vue Router4 推荐直接 return） |

---

## 6. 完整实战：后台框架

目标：侧边栏 + 首页/用户列表/用户详情/登录拦截，刷新 `/users/1` 不白屏。

**步骤 1**：`router/index.js`

```js
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/login', name: 'login', component: () => import('@/views/Login.vue') },
  {
    path: '/',
    component: () => import('@/layouts/BasicLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'home', component: () => import('@/views/Home.vue') },
      { path: 'users', name: 'users', component: () => import('@/views/UserList.vue') },
      { path: 'users/:id', name: 'user-detail', component: () => import('@/views/UserDetail.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFound.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  if (to.meta.requiresAuth && !token) return { name: 'login' }
})

export default router
```

**步骤 2**：`layouts/BasicLayout.vue`（出口 + 导航）

```vue
<template>
  <div class="layout">
    <aside class="side">
      <router-link :to="{ name: 'home' }">首页</router-link>
      <router-link :to="{ name: 'users' }">用户列表</router-link>
    </aside>
    <main class="content">
      <router-view />
    </main>
  </div>
</template>
```

**步骤 3**：`views/UserDetail.vue`（取参数）

```vue
<script setup>
import { useRoute } from 'vue-router'
const route = useRoute()
// 访问 /users/1 时 route.params.id === '1'
</script>
<template>
  <h2>用户 {{ route.params.id }} 的详情</h2>
</template>
```

**验收打勾**：
- [ ] `npm run dev` 后点侧边栏能在首页/用户列表间切换，地址栏变但页面不整页刷新
- [ ] 直接浏览器访问 `/users/1` 能显示详情（不是 404）
- [ ] 清掉 localStorage 的 token 后访问 `/` 自动跳 `/login`
- [ ] 刷新任意子页不白屏

---

## 7. 最佳实践

1. **一律用命名路由**（`name` + `params`），路径重构零成本。
2. **所有页面用懒加载**，首屏只加载必要代码。
3. **需要刷新保留的筛选状态用 `query`**，资源定位用 `params`**。
4. **404 路由永远放最后**，用 `/:pathMatch(.*)*`。
5. **登录拦截放全局前置守卫**，不要每个页面手写判断。
6. **子路径部署**（`/app/`）记得 `createWebHistory('/app/')` 同步改。
7. **动态参数变化要 `watch` 或用 `:key`**，否则组件不更新。

---

## 8. 自测清单（全打勾才算掌握）

- [ ] 能说清 hash 和 history 模式的区别和部署代价
- [ ] 能独立配出「布局 + 子路由」的后台框架
- [ ] 知道 `params` 和 `query` 分别怎么取、各自适合什么场景
- [ ] 能写出登录拦截守卫且不会死循环
- [ ] 知道 history 模式刷新 404 怎么解决（Nginx/Vite 配置）
- [ ] 会给路由加懒加载和 404 兜底
- [ ] 动态参数变化时知道怎么让组件重新加载数据

---

## 9. 延伸阅读

- Vue Router 官方文档：https://router.vuejs.org/zh/
- 部署配置（不同服务器 fallback）：https://router.vuejs.org/zh/guide/essentials/history-mode.html
- 组合式 API：https://router.vuejs.org/zh/guide/advanced/composition-api.html

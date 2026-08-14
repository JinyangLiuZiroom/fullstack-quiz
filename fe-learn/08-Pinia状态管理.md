# 模块八：Pinia 状态管理（完整学习指南）

> **学习目标**：理解为什么需要集中式状态管理，掌握 Pinia 的 store 定义（state / getters / actions）、在组件里读取与修改状态、跨 store 调用、状态持久化，并能避开「直接改 state 不响应、store 在外部误用、刷新丢数据」等典型坑。
> **适合谁**：已学模块一（Vue3 响应式）和模块七（Vue Router），写过多组件但被「数据怎么在组件间共享」折磨过的同学。
> **学完能做什么**：用 Pinia 管理用户登录态和全局主题，做一个登录后顶部显示用户名、退出登录全站清空状态的真实案例。

---

## 1. 前置知识（先确认你会这些）

- 模块一：`ref`/`reactive`、`<script setup>`、组合式 API 📖 [模块一：Vue3响应式](index.html#01-Vue3响应式与组合式API.md)
- 模块七：Vue Router 基本会用（本篇实战会用到登录拦截） 📖 [模块七：VueRouter路由](index.html#07-VueRouter路由.md)
- 知道「prop 透传」的痛：父 → 子 → 孙，数据要一层层传，改了还要一层层 emit 回去
- 已安装项目并 `npm install` 📖 [前置：命令行与 npm](../prereq/index.html#cli-npm.md)

> 如果组件层级浅（父子两层），用 `props` + `emit` 就够了，**不要一上来就上 Pinia**。Pinia 解决的是「跨组件、跨层级、全局共享」的状态。

---

## 2. 核心概念：什么时候需要 Pinia

| 场景 | 用不用 Pinia |
|---|---|
| 父传子两层数据 | ❌ props 足够 |
| 兄弟组件共享一份数据 | ✅ Pinia |
| 用户登录信息全站都要 | ✅ Pinia |
| 主题色 / 语言 全局生效 | ✅ Pinia |
| 列表筛选条件多个页面共用 | ✅ Pinia |

**一句话**：Pinia 是「全局可响应的数据仓库」，任何组件都能读、能改，且改了所有用到它的地方自动更新。

> Pinia 是 Vuex 的官方继任者。Vuex 有 `state/mutations/actions/getters` 还强制 `mutation` 改 state，写起来啰嗦。Pinia 去掉了 `mutation`，**state 直接在 action 里改**，TS 支持更好，代码量减半。新项目直接用 Pinia。

---

## 3. 快速开始：第一个 store

### 3.1 安装与挂载

```bash
npm install pinia
```

```js
// main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

createApp(App)
  .use(createPinia())   // 注册 Pinia
  .mount('#app')
```

### 3.2 定义一个 store（组合式写法，推荐）

```js
// stores/counter.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 第一个参数是 store 的唯一 id
export const useCounterStore = defineStore('counter', () => {
  // state：用 ref / reactive
  const count = ref(0)

  // getters：用 computed（派生数据）
  const double = computed(() => count.value * 2)

  // actions：用普通函数（改 state、发请求、写业务逻辑）
  function increment() {
    count.value++
  }
  function reset() {
    count.value = 0
  }

  return { count, double, increment, reset }
})
```

### 3.3 在组件里用

```vue
<script setup>
import { useCounterStore } from '@/stores/counter'

const counter = useCounterStore()
</script>

<template>
  <p>count = {{ counter.count }}</p>
  <p>double = {{ counter.double }}</p>
  <button @click="counter.increment()">+1</button>
  <button @click="counter.reset()">重置</button>
</template>
```

> **注意**：`const counter = useCounterStore()` 拿到的是 store 实例，模板里直接用 `counter.count`（**不需要 `.value`**，Pinia 已经帮你解包）。但在 `<script>` 里读 `count.value` 时仍要 `.value`，因为 `count` 本身是 `ref`。

---

## 4. 进阶用法

### 4.1 选项式写法（更贴近 Vuex 老手）

```js
export const useUserStore = defineStore('user', {
  state: () => ({ name: '', token: '' }),
  getters: {
    isLogin: (state) => !!state.token,
  },
  actions: {
    login(name, token) {
      this.name = name
      this.token = token
    },
    logout() {
      this.name = ''
      this.token = ''
    },
  },
})
```

两种写法任选，**新项目推荐组合式（和 `<script setup>` 风格统一）**。

### 4.2 解构 store 的坑（必须用 `storeToRefs`）

```js
import { storeToRefs } from 'pinia'

const counter = useCounterStore()
// ❌ 错误：直接解构会丢失响应性
const { count } = counter          // count 变成普通数字，改了不触发更新

// ✅ 正确：用 storeToRefs 保持响应性
const { count, double } = storeToRefs(counter)
// action 不用解构，直接通过 store 调用
const { increment } = counter       // 其实可以直接 counter.increment()
```

> **规则**：state / getter 用 `storeToRefs` 解构；action 直接 `store.xxx()` 调用，不解构。

### 4.3 跨 store 调用

```js
export const useCartStore = defineStore('cart', () => {
  const items = ref([])
  const user = useUserStore()   // 在 store 内部用另一个 store
  function checkout() {
    if (!user.isLogin) return   // 复用用户 store 的状态
    // ...
  }
  return { items, checkout }
})
```

### 4.4 异步 action（发请求）

```js
export const useUserStore = defineStore('user', () => {
  const profile = ref(null)
  const loading = ref(false)

  async function fetchProfile() {
    loading.value = true
    try {
      const res = await api.get('/me')   // 真实接口
      profile.value = res.data
    } finally {
      loading.value = false
    }
  }
  return { profile, loading, fetchProfile }
})
```

### 4.5 状态持久化（刷新不丢）

Pinia 状态在内存，**刷新页面就清空**。要持久化（如登录 token）用 `pinia-plugin-persistedstate`：

```bash
npm install pinia-plugin-persistedstate
```

```js
// main.js
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
```

```js
export const useUserStore = defineStore('user', () => {
  const token = ref('')
  return { token }
}, {
  persist: true,   // 整个 store 自动存 localStorage
})
```

更精细控制：

```js
{
  persist: {
    key: 'my-user',
    storage: localStorage,
    paths: ['token', 'name'],   // 只持久化这两个字段
  }
}
```

---

## 5. 常见坑与排错表

| # | 现象 | 根因 | 正确做法 |
|---|---|---|---|
| 1 | 解构后数据变了页面不更新 | 直接 `const { count } = store` 丢了响应性 | 用 `storeToRefs(store)` 解构 state/getter |
| 2 | 组件外调 store 报「getActivePinia」 | store 在 `app.use(pinia)` 前被调用 | 确保在 `main.js` 注册 Pinia 后再用；组件外调用需先 `setActivePinia(pinia)` |
| 3 | 刷新后登录态丢了 | Pinia 在内存，刷新清空 | 用持久化插件或手动读写 localStorage |
| 4 | action 里 `this` 是 undefined | 组合式写法里用了 `this` | 组合式写法没有 `this`，直接用 ref 变量；需要 `this` 用选项式写法 |
| 5 | 多个组件改同一 state 互相影响 | 这是预期（共享），但你改错 store | 检查 store id 是否唯一，是否误用成局部 ref |
| 6 | getter 里改 state | getter 应只读派生 | 改数据放 action |
| 7 | 模板里写 `counter.count.value` | store 已解包，多写了 .value | 模板里直接 `counter.count` |
| 8 | `storeToRefs` 把 action 也变成 ref | action 不需要响应性解构 | action 不解构，直接 `store.actionName()` 调 |
| 9 | 持久化后旧字段报错 | 存储结构变了但 localStorage 还有旧的 | 升级时 `localStorage.removeItem(key)` 或加版本号 |
| 10 | 页面卡死 / 无限循环 | getter 相互调用或 action 里同步改触发自身 | getter 只依赖 state；action 改 state 不要在 computed 里调 |
| 11 | SSR/严格模式直接替换 state 报错 | 用 `$patch` 之外的方式整体替换 | 用 `store.$patch({...})` 或 `$state` 整体赋值 |
| 12 | TypeScript 类型推断不出来 | 没给 state 初始值 / 用了 any | 给 ref 初始值（如 `ref<string[]>([])`），避免 any |

---

## 6. 完整实战：登录态全站共享

**目标**：登录后顶部导航显示用户名；任意页面能读到 `isLogin`；退出登录全站清空并跳登录页；刷新后仍保持登录。

```js
// stores/user.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

export const useUserStore = defineStore('user', () => {
  const token = ref('')
  const name = ref('')

  const isLogin = computed(() => !!token.value)

  async function login(username, password) {
    const res = await api.post('/login', { username, password })
    token.value = res.data.token
    name.value = res.data.name
    // 跳转交给调用方或这里
  }

  function logout() {
    token.value = ''
    name.value = ''
    // 清理持久化（如果用了插件，置空即可，插件会同步）
  }

  return { token, name, isLogin, login, logout }
}, {
  persist: { paths: ['token', 'name'] },   // 刷新保持登录
})
```

```vue
<!-- components/TopBar.vue -->
<script setup>
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
const user = useUserStore()
const router = useRouter()
function onLogout() {
  user.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header>
    <template v-if="user.isLogin">
      欢迎，{{ user.name }}
      <button @click="onLogout">退出</button>
    </template>
    <router-link v-else :to="{ name: 'login' }">登录</router-link>
  </header>
</template>
```

**验收打勾**：
- [ ] 登录成功后，TopBar 立即显示用户名（不用刷新、不用 emit）
- [ ] 在任意子页面也能读到 `user.isLogin`
- [ ] 点退出后全站 `isLogin` 变 false，跳到登录页
- [ ] 刷新页面仍保持登录态（持久化生效）

---

## 7. 最佳实践

1. **state 用 ref/reactive，getter 用 computed，改数据放 action**，别在 getter 里改。
2. **组件里解构 state/getter 必须用 `storeToRefs`**，action 不解构。
3. **需要刷新的状态（token/偏好）持久化**，临时 UI 状态别持久化。
4. **跨 store 直接互相调用**，别通过组件中转。
5. **异步请求放 action**，组件只管触发和读 loading。
6. **store 按业务域拆分**（user / cart / theme），别塞一个大 store。
7. **用组合式写法**与 `<script setup>` 风格统一，TS 推断更好。

---

## 8. 自测清单（全打勾才算掌握）

- [ ] 能说清 Pinia 解决什么问题、何时该用何时不该用
- [ ] 能定义含 state/getter/action 的 store 并在组件使用
- [ ] 知道为什么解构要用 `storeToRefs`，且 action 不要解构
- [ ] 能写异步 action 拉数据并暴露 loading
- [ ] 能实现登录态全站共享 + 刷新保持
- [ ] 知道组合式写法和选项式写法的区别
- [ ] 能排查「解构后不响应」「刷新丢数据」两类高频坑

---

## 9. 延伸阅读

- Pinia 官方文档：https://pinia.vuejs.org/zh/
- 持久化插件：https://prazdevs.github.io/pinia-plugin-persistedstate/
- 从 Vuex 迁移：https://pinia.vuejs.org/zh/cookbook/migration-vuex.html

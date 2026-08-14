# 模块十五：前端测试（Vitest）（完整学习指南）

> **学习目标**：理解前端为什么也要写测试，掌握 Vitest（Vue 生态首选测试框架）的配置、单元测试用例写法（describe/it/expect）、组件测试、请求层测试与覆盖率统计，能独立给 Vue3 + TS 项目加测试并接入 CI，并避开「测试环境没 DOM、组件挂载报错、异步断言失败、mock 不生效」等典型坑。
> **适合谁**：已学模块一（Vue3）、模块三（Axios）、模块九（TS），写过功能但不确定「改了会不会炸」，想用测试兜底的同学。
> **学完能做什么**：给一个工具函数和一段 Axios 请求封装写单测，给一个 Vue 组件写交互测试，本地和 CI 都能跑绿。

---

## 1. 前置知识（先确认你会这些）

- 模块一：Vue3 组件、`ref`/`computed` 📖 [模块一：Vue3响应式](index.html#01-Vue3响应式与组合式API.md)
- 模块三：Axios 封装请求 📖 [模块三：Axios与HTTP请求实战](index.html#03-Axios与HTTP请求实战.md)
- 模块九：TypeScript 基础 📖 [模块九：TypeScript实战](index.html#09-TypeScript实战.md)
- 知道「单元测试」= 测最小单元（函数/组件）的输入输出是否符合预期
- 跑过 `npm run xxx` 📖 [前置：命令行与 npm](../../prereq/index.html#cli-npm.md)

> 前端测试金字塔（模块大纲里有）：**多写单元测试（快、稳）**，少写 E2E（慢、脆）。Vitest 专攻单元/组件测试，跑在 Node + jsdom 环境，速度极快（基于 Vite，无需额外构建）。

---

## 2. 核心概念：测什么、用什么

| 测的对象 | 用什么 | 举例 |
|---|---|---|
| 纯函数 / 工具 | Vitest 原生 | 格式化金额、校验手机号 |
| 请求层（Axios 封装） | Vitest + Mock axios | 断言返回类型、错误处理 |
| Vue 组件 | Vitest + @vue/test-utils + jsdom | 点击按钮文本变、表单校验 |
| E2E（整链路） | Playwright/Cypress | 真实浏览器跑全流程（非本篇） |

> Vitest 和 Jest API 几乎一致（`describe/it/expect`），但 Vitest 原生支持 TS、ESM、Vite 配置，Vue 项目零摩擦接入。

---

## 3. 快速开始：安装与配置

```bash
npm install -D vitest @vue/test-utils jsdom
```

```ts
// vite.config.ts（Vitest 复用 Vite 配置）
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',     // 组件测试需要 DOM 环境
    globals: true,            // 直接用 describe/it/expect，不用 import
    coverage: {
      provider: 'v8',         // 覆盖率
      reporter: ['text', 'html'],
    },
  },
})
```

```json
// package.json scripts
{ "test": "vitest run", "test:watch": "vitest", "coverage": "vitest run --coverage" }
```

---

## 4. 进阶用法

### 4.1 测纯函数

```ts
// utils/format.ts
export function formatPrice(n: number): string {
  if (n < 0) throw new Error('负数')
  return '¥' + n.toFixed(2)
}
```

```ts
// utils/format.test.ts
import { describe, it, expect } from 'vitest'
import { formatPrice } from './format'

describe('formatPrice', () => {
  it('正数加 ¥ 和两位小数', () => {
    expect(formatPrice(12)).toBe('¥12.00')
  })
  it('负数抛错', () => {
    expect(() => formatPrice(-1)).toThrow('负数')
  })
})
```

### 4.2 测请求层（Mock Axios 适配器）

```ts
// utils/request.ts
import axios from 'axios'
export async function getUserName(id: number) {
  const res = await axios.get(`/user/${id}`)
  return res.data.name
}
```

```ts
// utils/request.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import axios from 'axios'
import { getUserName } from './request'

// mock axios.get 返回值，不真发请求
vi.mock('axios', () => ({
  default: { get: vi.fn() },
}))

afterEach(() => vi.clearAllMocks())

describe('getUserName', () => {
  it('返回用户名', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { name: 'Tom' } })
    const name = await getUserName(1)
    expect(name).toBe('Tom')
    expect(axios.get).toHaveBeenCalledWith('/user/1')
  })
  it('请求失败抛错', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('network'))
    await expect(getUserName(1)).rejects.toThrow('network')
  })
})
```

### 4.3 测 Vue 组件（@vue/test-utils）

```vue
<!-- components/Counter.vue -->
<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>
<template>
  <button @click="count++">{{ count }}</button>
</template>
```

```ts
// components/Counter.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Counter from './Counter.vue'

describe('Counter', () => {
  it('点击按钮数字 +1', async () => {
    const wrapper = mount(Counter)
    expect(wrapper.text()).toContain('0')
    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('1')
  })
})
```

> `mount` 把组件挂到 jsdom，`trigger('click')` 模拟点击，`wrapper.text()` 读渲染文本。异步操作（含 nextTick）记得 `await`。

### 4.4 异步与 nextTick

```ts
it('异步更新后断言', async () => {
  const wrapper = mount(AsyncComp)
  await wrapper.find('button').trigger('click')
  await nextTick()                 // 等 DOM 更新
  expect(wrapper.text()).toContain('加载完成')
})
```

### 4.5 覆盖率

```bash
npm run coverage     # 生成 coverage/ 报告，看哪些行没测到
```

---

## 5. 常见坑与排错表

| # | 现象 | 根因 | 正确做法 |
|---|---|---|---|
| 1 | 组件测试报 `document is not defined` | 没配 jsdom 环境 | `test.environment: 'jsdom'` |
| 2 | `describe` 未定义 | 没开 `globals` 也没 import | `globals: true` 或显式 import |
| 3 | mock axios 不生效 | mock 写在 import 之后 | `vi.mock` 必须提升到文件顶部（hoist）或在测试文件顶部 |
| 4 | `toHaveBeenCalledWith` 不匹配 | 调用参数顺序/对象引用不同 | 用 `expect.objectContaining` 部分匹配 |
| 5 | 点击后断言读不到新值 | 没等 DOM 更新 | `await trigger` 后加 `await nextTick()` |
| 6 | `mount` 子组件报错 | 子组件依赖全局（如 router） | 用 `global.plugins`/`global.stubs` 提供或 stub |
| 7 | 测试互相污染状态 | 共享模块单例（如 Pinia store） | `beforeEach` 里重置：`setActivePinia(createPinia())` |
| 8 | `rejects.toThrow` 不生效 | 函数没返回 Promise | 确保 await 的是 Promise；用 `await expect(p).rejects.toThrow()` |
| 9 | TS 类型在测试里报错 | 没装 vitest 类型 | `tsconfig` 加 `"types": ["vitest/globals"]` |
| 10 | 覆盖率不全 | 只跑了部分文件 | 确认 include 覆盖 src；`test.include` 配置 |
| 11 | 每次跑全量慢 | 没用 watch 或只跑改的 | 开发用 `vitest`（watch），CI 用 `vitest run` |
| 12 | CI 里测试失败本地却过 | 本地有未提交改动 / 环境差异 | CI 用干净 checkout；环境统一 jsdom |

---

## 6. 完整实战：给请求封装 + 组件加测试

**目标**：请求封装 `getUser` 在成功返回 User、失败抛错；Counter 组件点击 +1。配置接好后 `vitest run` 全绿。

```ts
// api/user.ts
import axios from 'axios'
export interface User { id: number; name: string }
export async function getUser(id: number): Promise<User> {
  const res = await axios.get<User>(`/user/${id}`)
  return res.data
}
```

```ts
// api/user.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import axios from 'axios'
import { getUser } from './user'
vi.mock('axios', () => ({ default: { get: vi.fn() } }))
afterEach(() => vi.clearAllMocks())

describe('getUser', () => {
  it('成功返回 User', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { id: 1, name: 'Tom' } })
    const u = await getUser(1)
    expect(u.name).toBe('Tom')
  })
  it('失败抛错', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('404'))
    await expect(getUser(1)).rejects.toThrow('404')
  })
})
```

**验收打勾**：
- [ ] `npm run test` 跑出 Counter 和 getUser 两个用例，全绿
- [ ] 故意让 `getUser` 返回 `undefined.name` 时测试报红（说明断言有效）
- [ ] `npm run coverage` 生成报告，能看到 user.ts 覆盖率
- [ ] 改了 `getUser` 逻辑，相关测试立即拦住回归

---

## 7. 最佳实践

1. **多写单元测试**：函数/请求层/工具是测试重点，性价比最高。
2. **请求层用 `vi.mock` 假掉网络**，断言入参和返回，不真发请求。
3. **组件测试只验行为**（点击后文本/状态变），不验内部实现。
4. **异步断言前 `await nextTick`**，避免读到旧 DOM。
5. **`vi.mock` 写在顶部**，利用 hoist 保证先 mock 后 import。
6. **测试独立**：`beforeEach` 重置 Pinia/状态，避免串台。
7. **接 CI**：把 `vitest run` 放进流水线（和 tsc 门禁并列），PR 卡测试。
8. **覆盖率作参考不全信**：关键逻辑 100%，UI 细节不必强求。

---

## 8. 自测清单（全打勾才算掌握）

- [ ] 能区分单元/组件/E2E 测试各自用什么工具
- [ ] 能给 Vite 项目接 Vitest + jsdom 并跑通
- [ ] 会写纯函数、请求层（mock axios）、组件三种测试
- [ ] 知道 `vi.mock` 必须置顶、异步要 `await nextTick`
- [ ] 能生成覆盖率报告并读
- [ ] 知道测试污染怎么用 beforeEach 重置
- [ ] 能把测试接进 CI 当门禁

---

## 9. 延伸阅读

- Vitest 官方文档：https://vitest.dev/guide/
- @vue/test-utils：https://test-utils.vuejs.org/
- 测试金字塔：https://martinfowler.com/articles/practical-test-pyramid.html
- 覆盖率 v8：https://vitest.dev/guide/coverage.html

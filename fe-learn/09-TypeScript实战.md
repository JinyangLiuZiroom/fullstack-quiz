# 模块九：TypeScript 实战（完整学习指南）

> **学习目标**：从 JS 平滑过渡到 TS，掌握类型注解、接口、类型别名、泛型、类型收窄、常用工具类型，以及 TS 与 Vue3 + Axios 的结合写法，能独立给前端项目加类型约束并避开「类型报错看不懂、any 满天飞、泛型不会写」等典型坑。
> **适合谁**：会 JavaScript（ES6+），写过 Vue 组件或 Node 脚本，但没系统用过 TS，或一写就 `any` 的同学。
> **学完能做什么**：给一个 Axios 请求封装和 Vue 组件加完整类型，接口返回自动提示字段，编译期挡掉「字段拼错、少传参」这类 bug。

---

## 1. 前置知识（先确认你会这些）

- JavaScript：变量、函数、对象、数组、Promise、ES6 模块
- 命令行：`npm install`、`npx tsc --init`
- 知道「编译」概念：TS 不能直接跑浏览器，要先编译成 JS
- 已学过模块一（Vue3），本篇会用到 `<script setup lang="ts">`

> TS 是 JS 的超集：合法 JS 都是合法 TS。所以你可以渐进接入，**不必一次改全量**。

---

## 2. 核心概念：TS 到底帮你做什么

TS 在「写代码时（编译期）」检查类型，而不是运行时：

```ts
function add(a: number, b: number): number {
  return a + b
}
add(1, 2)      // ✅
add(1, '2')    // ❌ 编译报错：'2' 不是 number
```

好处：
1. **编辑器自动提示**（点 `.` 出来字段）
2. **编译期抓 bug**（字段拼错、参数类型不对、少传参）
3. **重构安全**（改了接口字段，所有用到处立刻标红）
4. **文档即类型**（接口就是活的 API 文档）

---

## 3. 快速开始：最小 TS 项目

### 3.1 安装与初始化

```bash
npm install -D typescript
npx tsc --init        # 生成 tsconfig.json
```

`tsconfig.json` 关键项：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": true,             // 严格模式：any/隐式 any 都会报错，建议开
    "moduleResolution": "bundler",
    "noEmit": true,              // 配合 Vite，TS 只做类型检查不产出 JS
    "lib": ["ES2020", "DOM"]
  }
}
```

### 3.2 基础类型注解

```ts
let age: number = 18
let name: string = 'Tom'
let isVip: boolean = true
let list: number[] = [1, 2, 3]
let tuple: [string, number] = ['Tom', 18]   // 元组：固定顺序固定类型

// 函数
function greet(name: string): string {
  return 'hi ' + name
}

// 可选 ? 和默认值
function fn(a: number, b?: number, c: number = 10): void {}

// 联合类型
let id: number | string = 1
id = 'abc'   // ✅
```

---

## 4. 进阶用法

### 4.1 接口 `interface` 与类型别名 `type`

```ts
// interface：描述对象结构（可继承、可合并声明）
interface User {
  id: number
  name: string
  email?: string        // 可选
  readonly role: string // 只读，不能改
}

// type：更灵活，能描述联合/元组/基本类型
type ID = number | string
type Point = { x: number; y: number }
```

`interface` vs `type` 怎么选：
- 描述**对象 / 类结构** → 用 `interface`（可 `extends`、声明合并）
- 联合 / 元组 / 计算类型 → 用 `type`
- 二者都能描述对象时，团队统一选一种即可（多数项目用 `interface` 描述数据）

### 4.2 泛型 `<T>`

泛型 = 「类型当参数」，让函数/类复用又不丢类型安全。

```ts
// 一个返回首元素的函数，T 是调用时确定的类型
function first<T>(arr: T[]): T | undefined {
  return arr[0]
}
first([1, 2, 3])        // T = number，返回 number
first(['a', 'b'])       // T = string，返回 string

// 接口里用泛型（API 响应通用结构）
interface ApiRes<T> {
  code: number
  data: T
  message: string
}
interface User { id: number; name: string }
type UserRes = ApiRes<User>   // data 是 User
```

> **泛型口诀**：当你发现「这个类型随输入变」就用 `<T>`。常见场景：数组方法、API 响应、组件 props。

### 4.3 类型收窄（Narrowing）

TS 在 `if` 里会自动缩小类型范围：

```ts
function print(x: string | number) {
  if (typeof x === 'string') {
    x.toUpperCase()   // 这里 x 一定是 string，能调字符串方法
  } else {
    x.toFixed(2)      // 这里 x 一定是 number
  }
}

// 用「真值判断」收窄
function fn(x: string | null) {
  if (x) x.length      // 进到这里 x 不是 null
}

// 用 in / instanceof
if ('email' in user) { /* user 有 email 字段 */ }
```

### 4.4 常用工具类型（Utility Types）

```ts
interface User { id: number; name: string; email: string }

type PartialUser = Partial<User>        // 所有字段变可选：{id?;name?;email?}
type PickUser = Pick<User, 'id' | 'name'>   // 只取部分：{id;name}
type OmitUser = Omit<User, 'email'>      // 去掉部分：{id;name}
type ReadonlyUser = Readonly<User>       // 全只读
type UserKeys = keyof User               // 'id' | 'name' | 'email'
```

### 4.5 枚举 `enum` 与字面量类型

```ts
// 枚举：一组命名常量
enum Status { Pending = 0, Success = 1, Fail = 2 }

// 更轻量：字面量联合（推荐，编译后无多余代码）
type Status = 'pending' | 'success' | 'fail'
```

### 4.6 TS 与 Vue3 结合

```vue
<script setup lang="ts">
import { ref } from 'vue'

// 给 ref 标类型
const count = ref<number>(0)
const list = ref<User[]>([])

// 定义 props 类型
defineProps<{ msg: string; count?: number }>()

// 定义 emit 类型
const emit = defineEmits<{
  (e: 'change', id: number): void
}>()

// 接口约束
interface User { id: number; name: string }
const u: User = { id: 1, name: 'Tom' }
</script>
```

### 4.7 TS 与 Axios 结合（真实项目写法）

```ts
import axios from 'axios'

interface User { id: number; name: string }
interface ApiRes<T> { code: number; data: T; message: string }

// 响应拦截器里断言 data 类型
const res = await axios.get<ApiRes<User>>('/api/user/1')
// res.data.data 自动是 User 类型，.name 有提示
console.log(res.data.data.name)
```

---

## 5. 常见坑与排错表

| # | 现象 | 根因 | 正确做法 |
|---|---|---|---|
| 1 | 类型报错看不懂（`TS2345` 等） | 没开 `strict`，或任何类型推断失败 | 开 `strict: true`；读报错指向的行，定位哪个参数类型不符 |
| 2 | 到处 `any` 等于没用 TS | 不想写类型就 any | 用 `unknown` 替代 any（unknown 用前必须收窄）；接口优先定义 |
| 3 | 接口返回字段没提示 | 没给 Axios 泛型 `<ApiRes<T>>` | 响应都标泛型，data 自动推断 |
| 4 | `import` 类型报错「找不到模块」 | 没装 `@types/xxx` 或路径别名没配 | `npm i -D @types/node`；tsconfig 配 `paths` + `baseUrl` |
| 5 | `ref` 数组取元素没类型 | `ref([])` 推断成 `never[]` | 写 `ref<User[]>([])` 给初始类型 |
| 6 | `defineProps` 泛型写法报错 | Vue 版本旧或写法不对 | 用 `defineProps<{...}>()`（Vue 3.3+）；旧版用 `PropType` |
| 7 | 联合类型调方法报错 | 没收窄就调某分支专属方法 | 先 `if (typeof x === 'string')` 收窄再调 |
| 8 | 改接口字段全站没标红 | 用了 any 或 `as` 强转掩盖 | 删掉无谓 `as`；保留真实类型，改字段自然全标红 |
| 9 | `as` 强转把错误藏起来 | 报错就 `as any` 糊弄 | 真需要 `as` 时收窄后 `as`，禁止 `as any` |
| 10 | `enum` 打包体积大 | 用了数字 enum 编译出对象 | 简单常量用 `const enum` 或字面量联合 `'a'\|'b'` |
| 11 | `tsc` 报错但 Vite 能跑 | Vite 用 esbuild 只转译不类型检查 | 加 `npm run typecheck`（`tsc --noEmit`）进 CI 门禁 |
| 12 | `JSON.parse` 返回 `any` | 解析结果无类型 | `JSON.parse(x) as User` 或封装带泛型的 parse |

---

## 6. 完整实战：给请求层加类型

**目标**：封装一个 `request`，所有接口调用自动带类型提示，返回数据不写 any。

```ts
// utils/request.ts
import axios from 'axios'

interface ApiRes<T> {
  code: number
  data: T
  message: string
}

const instance = axios.create({ baseURL: '/api' })

// 统一返回 data（业务层只关心 data）
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const res = await instance.request<ApiRes<T>>(config)
  if (res.data.code !== 0) {
    throw new Error(res.data.message)
  }
  return res.data.data
}

// 业务接口
export interface User { id: number; name: string; vip: boolean }

export const getUser = (id: number) => request<User>({ url: `/user/${id}` })
```

```ts
// 使用
const user = await getUser(1)
// user 自动是 User 类型，user.name 有提示，拼错 user.nme 编译报错
console.log(user.name)
```

**验收打勾**：
- [ ] `tsc --noEmit` 在请求层和业务层都零报错
- [ ] 调用 `getUser(1)` 后 `.name` 有编辑器提示
- [ ] 故意写成 `user.nme` 能编译期标红
- [ ] 新增一个 `getOrder` 接口只改一行就能获得类型

---

## 7. 最佳实践

1. **开 `strict: true`**，让 TS 真正发挥作用（新项目默认开）。
2. **接口/响应结构一律用 `interface`/`type` 定义**，禁止 `any`。
3. **Axios 所有请求标泛型 `<ApiRes<T>>`**，data 自动推断。
4. **联合类型先收窄再调用方法**，别乱 `as`。
5. **`unknown` 替代 `any`**：外部不确定数据用 `unknown`，用前收窄。
6. **泛型用于复用**：数组方法、API 响应、组件 props 复用处。
7. **`tsc --noEmit` 进 CI 门禁**，别只靠 Vite 跑（Vite 不类型检查）。
8. **增量接入**：老 JS 项目可先给核心模块加类型，不必全改。

---

## 8. 自测清单（全打勾才算掌握）

- [ ] 能给变量/函数/接口写类型注解且 `tsc` 零报错
- [ ] 能区分 `interface` 和 `type` 并正确使用
- [ ] 能写泛型函数/泛型接口（如 `ApiRes<T>`）
- [ ] 会用 `Partial`/`Pick`/`Omit`/`keyof` 工具类型
- [ ] 了解类型收窄（typeof / 真值 / in）并能在联合类型上安全调用
- [ ] 能给 Vue 组件的 ref、props、emit 加类型
- [ ] 能给 Axios 请求封装加泛型并享受自动提示
- [ ] 知道 `any` vs `unknown`、知道 Vite 不替代 `tsc` 类型检查

---

## 9. 延伸阅读

- TypeScript 官方手册（中文）：https://www.typescriptlang.org/zh/docs/handbook/intro.html
- 工具类型速查：https://www.typescriptlang.org/docs/handbook/utility-types.html
- Vue3 + TS：https://cn.vuejs.org/guide/typescript/overview.html
- 类型挑战练习（进阶）：https://github.com/type-challenges/type-challenges

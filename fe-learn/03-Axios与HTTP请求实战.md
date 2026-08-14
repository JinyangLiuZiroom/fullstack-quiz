# 模块三：Axios 与 HTTP 请求实战（完整学习指南）

> **学习目标**：掌握前端如何和后端联调——封装一个生产级请求层（拦截器、无感刷新、文件下载、并发、取消、重试），并理解 HTTP 状态码与业务 code 的区别。
> **适合谁**：会写 JS、知道 HTTP 有 GET/POST，但每次联调都靠猜、报错不会查的同学。
> **学完能做什么**：独立封装 `request.ts`，对接任意后端接口，处理 401/下载/超时/并发，遇到请求问题能定位是参数发错还是响应结构对不上。

---

## 1. 前置知识

- 知道 HTTP 方法 GET/POST/PUT/DELETE 📖 [前置：HTTP 基础](../prereq/index.html#http-basics.md)
- 知道 URL、`?a=1&b=2` 查询参数、请求头 Header、请求体 Body 📖 [前置：HTTP 基础](../prereq/index.html#http-basics.md)
- 会用 `npm install axios` 📖 [前置：命令行与 npm](../prereq/index.html#cli-npm.md)
- 了解 Promise / async-await 📖 [前置：JS 异步 / 事件循环](../prereq/index.html#js-async.md)

为什么不用原生 `fetch`：Axios 自动 JSON 序列化/反序列化、拦截器、超时、取消请求、上传进度，且浏览器/Node 通用。联调协作基本都用它。

---

## 2. 核心概念：一次请求发生了什么

```
前端代码
  → 请求拦截器（加 token、改配置）
  → 发 HTTP 请求（浏览器 → 后端）
  → 后端返回响应
  → 响应拦截器（解包、统一处理错误）
  → 你的业务代码拿到数据
```
拦截器是 Axios 的灵魂：**所有请求/响应都过一道统一处理**，不用在每个接口里重复写「加 token」「弹错误」。

---

## 3. 快速开始：发第一个请求

```ts
import axios from 'axios'

// GET：参数放 params → 拼到 URL ?page=1
const res = await axios.get('/api/users', { params: { page: 1, size: 10 } })

// POST：参数放 data → 放请求体
const res2 = await axios.post('/api/users', { name: 'Tom', age: 18 })

console.log(res.data)   // 后端返回的内容
```

**最关键的区别（新手错最多）**：
- `params` → 进 URL 查询字符串（`?a=1`），用于 GET 查询条件
- `data` → 进请求体 Body（JSON），用于 POST/PUT 提交

| | 放哪 | 提现位置 | 用途 |
| --- | --- | --- | --- |
| `params` | URL query | `?a=1&b=2` | GET 查询、筛选条件 |
| `data` | 请求体 | Request Payload | POST/PUT 提交数据 |

错例：把 GET 筛选条件误放 `data`（GET 没有 body，后端收不到）；把 POST 提交误放 `params`（敏感数据暴露到 URL 且后端从 body 取不到）。

---

## 4. 进阶用法

### 4.1 创建实例（避免重复配置）

```ts
import axios from 'axios'
const service = axios.create({
  baseURL: '/api',             // 统一前缀，后面只写 /users
  timeout: 10000,              // 10s 超时
  headers: { 'Content-Type': 'application/json' }
})
// 使用
await service.get('/users', { params: { page: 1 } })
```

### 4.2 请求拦截器（统一加 token）

```ts
service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) config.headers.set('Authorization', `Bearer ${token}`)
    return config
  },
  (error) => Promise.reject(error)
)
```

### 4.3 响应拦截器（解包 + 统一错误处理）

```ts
service.interceptors.response.use(
  (response) => {
    const body = response.data
    // 约定：后端返回 { code, msg, data }，code===0 成功
    if (body.code !== 0) {
      console.error('业务错误:', body.msg)
      return Promise.reject(new Error(body.msg))
    }
    return body.data   // 页面直接拿到 data，不用每次 .data.data
  },
  (error) => {
    // HTTP 层错误（网络断、超时、5xx）
    return Promise.reject(error)
  }
)
```

### 4.4 HTTP 状态码 vs 业务 code（极重要）

```http
HTTP/1.1 200 OK
{ "code": 500, "msg": "库存不足", "data": null }
```
- **HTTP 200**：传输层成功（请求送达、后端回了）
- **业务 code 500**：业务逻辑失败（库存不够）

很多人用「HTTP 200 就成功」判断，结果业务失败了页面还当成功处理。
**判成功必须看业务 code**（或你们后端约定的字段）。同理：
- HTTP 401 = 未登录/未授权（token 失效）
- HTTP 403 = 禁止（无权限）
- HTTP 404 = 接口不存在
- HTTP 500 = 后端炸了

### 4.5 401 无感刷新（面试/实战必考）

token 快过期时返回 401，不能踢用户去登录，要静默换新 token 后重试原请求。核心是用一个「刷新队列」存住失败请求，等刷新完统一重发。

```ts
let isRefreshing = false
let queue: ((token: string) => void)[] = []

service.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config
    if (error.response?.status === 401 && !config._retry) {
      config._retry = true
      if (!isRefreshing) {
        isRefreshing = true
        try {
          const newToken = await refreshTokenApi()   // 调刷新接口拿新 token
          localStorage.setItem('token', newToken)
        } finally {
          isRefreshing = false
          // 把队列里排队的请求全部重发
          queue.forEach((cb) => cb(newToken))
          queue = []
        }
      }
      // 当前失败的请求排队，等刷新完重发
      return new Promise((resolve) => {
        queue.push((token: string) => {
          config.headers.set('Authorization', `Bearer ${token}`)
          resolve(service(config))
        })
      })
    }
    return Promise.reject(error)
  }
)
```

### 4.6 文件下载（responseType: 'blob'）

```ts
const res = await axios.get('/api/export', {
  responseType: 'blob',     // 关键！否则拿到字符串乱码
  params: { id: 1 }
})
const url = window.URL.createObjectURL(new Blob([res.data]))
const a = document.createElement('a')
a.href = url
a.download = '报表.xlsx'    // 文件名
a.click()
window.URL.revokeObjectURL(url)   // 释放内存
```

**坑**：忘记 `responseType:'blob'`，下载的文件打开是 `[object Object]` 或乱码。前端下载文件必须 blob。

### 4.7 取消请求（搜索框防乱序）

```ts
import axios from 'axios'
const controller = new AbortController()

axios.get('/api/search', { params: { kw }, signal: controller.signal })

// 用户输入新值，取消上一个未完成的请求
controller.abort()
```

旧版用 `CancelToken`（已废弃），新版用 `AbortController`。配合防抖：
```ts
let timer: number
function onInput(kw: string) {
  clearTimeout(timer)
  timer = setTimeout(() => search(kw), 300)   // 停止输入 300ms 才发
}
```

### 4.8 并发请求

```ts
const [user, orders] = await Promise.all([
  service.get('/user'),
  service.get('/orders')
])
// 两个都完成才继续；任意一个失败就进 catch
```

### 4.9 超时与重试

```ts
// 超时
service.get('/x', { timeout: 5000 })

// 简单重试（响应拦截器里，最多 3 次）
async function withRetry(fn: () => Promise<any>, n = 3) {
  try { return await fn() }
  catch (e) { if (n > 1) return withRetry(fn, n - 1); throw e }
}
```

---

## 5. 常见坑与排错

| # | 现象 | 根因 | 正确写法 |
| --- | --- | --- | --- |
| 1 | GET 参数后端收不到 | 误放 `data`（GET 无 body） | GET 用 `params` |
| 2 | POST 提交后端取不到 | 误放 `params`（暴露到 URL） | POST 用 `data` |
| 3 | 业务失败页面当成功 | 只看 HTTP 200 | 判断业务 `code` |
| 4 | 下载文件乱码 | 没设 `responseType:'blob'` | 下载加 `responseType:'blob'` |
| 5 | 401 后用户被踢登录 | 没做无感刷新 | 用刷新队列重试 |
| 6 | 刷新期间多个请求全失败 | 每个 401 都去刷新 token | 用 `isRefreshing` 锁，只刷一次 |
| 7 | 搜索结果串（旧覆盖新） | 没取消上一个请求 + 没防抖 | `AbortController` + 防抖 |
| 8 | 拦截器里拿不到 data | `response.data` 是后端整包，解包后返回 data | 拦截器返回 `body.data` |
| 9 | `config.headers.set` 报错（旧版） | 老 axios 用 `config.headers['X']=v` | axios≥1.x 用 `.set()`，或 `config.headers.Authorization=...` |
| 10 | 跨域报 CORS（见模块四） | 没配代理/后端没放行 | dev 用 Vite 代理 |
| 11 | then 里拿到 undefined | 拦截器返回了 body.data 但业务代码又 `.data` | 统一：拦截器返回 data，业务直接用 |
| 12 | 上传文件格式错 | 没用 `FormData` | `const fd=new FormData(); fd.append('file', file)` |

---

## 6. 完整实战：可复用的请求层

把第 4 节的实例 + 拦截器 + 401 刷新 + 下载封装成一个 `request.ts`，页面里这么用：

```ts
// api/user.ts
import request from '@/utils/request'

export function getUsers(page: number) {
  return request.get('/users', { params: { page } })
}
export function login(data: { name: string; pwd: string }) {
  return request.post('/login', data)
}

// 页面
const list = await getUsers(1)   // list 直接是后端 data，无 .data.data
```

**验收**：
- [ ] 每个请求自动带 `Authorization`
- [ ] 响应里统一解包，页面拿到的就是业务 data
- [ ] 业务 code 非 0 时 reject 并 console 报错
- [ ] 401 时静默刷新并重试，用户无感

---

## 7. 最佳实践

1. **封装一个实例 + 拦截器**，全项目共用，别到处 `axios.get`。
2. **baseURL 走环境变量**（见模块五），dev/prod 切换不碰代码。
3. **判成功看业务 code**，约定好字段（`code`/`data`/`msg`）全局统一。
4. **token 全局拦截器加**，别在每个接口手动写。
5. **401 统一刷新**，避免重复刷新风暴。
6. **下载文件必 blob**；上传用 FormData。
7. **搜索/联想防抖 + 取消**，防请求乱序。
8. **错误统一上报**：响应拦截器里对 5xx/网络错误做 Toast 提示或埋点。

---

## 8. 自测清单

- [ ] 说得出 params 和 data 的区别
- [ ] 能封装带拦截器的请求实例
- [ ] 知道 HTTP 200 ≠ 业务成功
- [ ] 能写出 401 无感刷新（含刷新队列）
- [ ] 会下载文件（blob）
- [ ] 会用 AbortController 取消请求
- [ ] 会 Promise.all 并发
- [ ] 遇到联调问题能查是参数发错还是响应结构对不上

---

## 9. 延伸阅读

- Axios 官方文档：https://axios-http.com/docs/intro
- 拦截器：https://axios-http.com/docs/interceptors
- AbortController：https://developer.mozilla.org/zh-CN/docs/Web/API/AbortController
- HTTP 状态码速查：https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Status

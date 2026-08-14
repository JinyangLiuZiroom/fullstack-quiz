# 模块四：浏览器跨域与 CORS（完整学习指南）

> **学习目标**：搞懂浏览器「同源策略」和 CORS 机制，能独立解决 dev 联调时满屏红的跨域报错，理解预检请求、凭据 cookie、Vite 代理和 Nginx 反向代理。
> **适合谁**：被 `Access-Control-Allow-Origin` 折磨过、只知道「让后端加个头」但不懂为什么的同学。
> **学完能做什么**：看到 CORS 报错能立刻判断是简单请求还是预检、缺哪个响应头、dev 用代理还是生产用 Nginx，并给出准确解法。

---

## 1. 前置知识

- 知道 URL 由「协议 + 域名 + 端口」组成（如 `https://api.xxx.com:8080`）
- 知道前端 dev 跑在 `localhost:5173`，后端在另一台/另一端口
- 了解 Axios 发请求（见模块三）

---

## 2. 核心概念：同源策略

浏览器出于安全，**同源策略**规定：只有「协议 + 域名 + 端口」三者完全相同才叫同源，否则跨域。

```
https://a.com:443  vs  https://a.com:8080   → 跨域（端口不同）
http://a.com       vs  https://a.com        → 跨域（协议不同）
https://a.com      vs  https://b.com        → 跨域（域名不同）
https://a.com      vs  https://api.a.com    → 跨域（子域不同）
```

**同源策略到底挡什么**：挡的是「JS 读取跨域响应的内容」。请求其实发出去了（Network 里能看到），但浏览器把响应拦下不给你 `response.data`。所以跨域**不是请求没发**，而是**响应被浏览器丢弃**。

为什么有这限制：防止恶意网页偷偷用你的登录态（cookie）调银行接口、读你的数据。这是浏览器端的安全机制，和后端没关系。

---

## 3. 简单请求 vs 预检（OPTIONS）

CORS 把请求分两类，决定浏览器发几次请求。

### 简单请求（同时满足才叫简单）

- 方法为 `GET` / `HEAD` / `POST`
- 自定义请求头只有一组「安全头」：`Accept`、`Accept-Language`、`Content-Language`、`Content-Type`（且值受限，见下）
- `Content-Type` 仅限：`text/plain`、`multipart/form-data`、`application/x-www-form-urlencoded`

满足 → 浏览器**直接发一次请求**，后端在响应里带 CORS 头即可。

### 非简单请求 → 触发预检

只要不满足上面任意一条（最常见两种）：
1. 加了自定义 Header（如 `Authorization`、`X-Token`）
2. `Content-Type: application/json`（POST JSON body）

浏览器会**先发一个 OPTIONS 预检请求**，问后端「我打算用 POST + 带 Authorization 头，你允许吗？」，后端回 Allow 头，浏览器确认没问题才发真正的请求。

```http
OPTIONS /api/users HTTP/1.1
Origin: http://localhost:5173
Access-Control-Request-Method: POST
Access-Control-Request-Headers: authorization, content-type
```

后端必须回：
```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

**坑**：后端只处理了实际请求（POST），没处理 OPTIONS，预检失败 → 真请求不发 → 报 CORS 错误。**后端必须同时放行 OPTIONS 和实际方法**（Spring 用 `@CrossOrigin` 或全局配置，Node 用 `cors` 中间件，它们默认都处理 OPTIONS）。

---

## 4. CORS 关键响应头（后端加这些）

```http
Access-Control-Allow-Origin: https://my.app.com   /* 允许的来源 */
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true            /* 允许带 cookie */
Access-Control-Max-Age: 86400                      /* 预检结果缓存 1 天，减少 OPTIONS */
Access-Control-Expose-Headers: X-Total-Count       /* 允许前端读到的自定义响应头 */
```

各字段含义：
- `Allow-Origin`：哪些源可以访问。`*` 表示任意（但带凭据时不能用 `*`）。
- `Allow-Methods`：允许哪些方法（预检用）。
- `Allow-Headers`：允许哪些自定义请求头（预检用，前端发的自定义头必须列在这里）。
- `Allow-Credentials`：是否允许带 cookie/认证信息。
- `Max-Age`：预检结果缓存多久，期间不再发 OPTIONS。
- `Expose-Headers`：默认前端只能读标准响应头（如 Content-Type），想读自定义头（如 `X-Total-Count` 分页总数）必须列在这里。

---

## 5. 带凭据（cookie）的坑（重点）

```ts
// 前端：想带上 cookie
axios.defaults.withCredentials = true
```

此时后端 `Access-Control-Allow-Origin` **不能等于 `*`**，必须写具体来源，否则浏览器拒绝：

```http
Access-Control-Allow-Origin: http://localhost:5173   /* 具体域名，不能用 * */
Access-Control-Allow-Credentials: true
```

原因：允许任意源 + 带凭据 = 任意网站都能拿你的 cookie 调接口，安全漏洞。所以两者互斥。

---

## 6. 解决方案一：Vite 代理（dev 环境首选）

dev 时前端 `localhost:5173`、后端 `api.xxx.com:8080` 跨域。用 Vite 把 `/api` 代理到后端，**浏览器只和同源的 localhost 通信，跨域由 Vite 服务端转发出去**——浏览器全程看不到跨域，根本不发 CORS 请求。

```ts
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://api.xxx.com:8080',
        changeOrigin: true,             // 改 Host 头为目标域名（多数后端按 Host 路由，必须开）
        // rewrite: (p) => p.replace(/^\/api/, '')  // 后端无 /api 前缀时去掉
      }
    }
  }
})
```

验证：Network 里请求 URL 是 `http://localhost:5173/api/xxx`（同源），由 Vite 转发到后端。此时**不需要后端加 CORS 头**（因为是同源请求）。

---

## 7. 解决方案二：Nginx 反向代理（生产环境）

生产没有 Vite，用 Nginx 把 `/api` 反代到后端，浏览器同样只同源访问：

```nginx
server {
  listen 80;
  server_name my.app.com;

  location / {
    root /usr/share/nginx/html;   # 前端静态包
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://backend:8080/;   # 转发到后端
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

或者直接让后端加 CORS 头（适合后端是独立域名、前端单独部署的场景）。

---

## 8. 常见坑与排错

| # | 现象 | 根因 | 解法 |
| --- | --- | --- | --- |
| 1 | CORS 报错，响应里无 Allow 头 | 后端没配 CORS | 后端加 Allow-Origin 等 |
| 2 | 有 OPTIONS 但预检失败 | 后端没处理 OPTIONS / Allow-Headers 不全 | 后端放行 OPTIONS + 列出自定义头 |
| 3 | 带 cookie 时报错 | `Allow-Origin:*` 与 `Allow-Credentials:true` 冲突 | 写具体域名 |
| 4 | 自定义头不在 Allow-Headers | 预检拒绝该头 | 后端 Allow-Headers 加上 |
| 5 | dev 仍跨域 | 没配 Vite 代理或 target 错 | 配 `server.proxy` + `changeOrigin` |
| 6 | 代理后 404 | 后端无 `/api` 前缀 | 加 `rewrite` 去掉前缀 |
| 7 | 生产跨域但 dev 正常 | 生产没 Nginx/后端没 CORS | 生产用 Nginx 反代或后端加头 |
| 8 | 只某个接口跨域 | 该接口方法/头触发预检，其他没触发 | 统一后端 CORS 配置覆盖所有接口 |
| 9 | 缓存导致改了头还报错 | 浏览器缓存了失败结果 | 硬刷新 / 加 `Max-Age` 调整 |
| 10 | 读不到响应里的分页总数 | 没配 `Expose-Headers` | 后端加 `Expose-Headers: X-Total-Count` |

**排错顺序（照着查）**：
1. 打开 Network，看是简单请求还是带 OPTIONS 的预检。
2. 看 OPTIONS 响应的 Allow 头齐不齐 → 不齐是后端没放行。
3. `Allow-Origin` 是不是 `*` 但前端 `withCredentials=true` → 改具体域名。
4. 前端自定义头是否在 `Allow-Headers` → 不在就预检失败。
5. dev 环境 → 直接用 Vite 代理最省事，不依赖后端改。

---

## 9. 完整实战

本地后端 `http://localhost:8080/api/hello`，前端 Vite 跑 5173。配置代理让前端访问 `/api/hello` 不跨域：

```ts
// vite.config.ts
export default defineConfig({
  server: { proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true } } }
})
```

```ts
// 前端代码
axios.get('/api/hello').then(r => console.log(r.data))
```

验收：
- [ ] 控制台不再报 CORS 红字
- [ ] Network 里请求发往 `localhost:5173/api/hello`（Vite 转发）
- [ ] 数据正常返回

---

## 10. 最佳实践

1. **dev 跨域一律用 Vite 代理**，前端零改动、不依赖后端。
2. **生产用 Nginx 反代**或后端统一 CORS，前端代码不变。
3. 后端 CORS 配置做成全局中间件，别在每个接口单独加。
4. 需要 cookie 登录态时，前后端都配 `withCredentials` + 具体 Origin。
5. 自定义响应头（如分页总数）记得 `Expose-Headers`。
6. 不要为省事把 `Allow-Origin` 设 `*`（有凭据需求时违规且不安全）。

---

## 11. 自测清单

- [ ] 能判断两个 URL 是否同源
- [ ] 说得出简单请求 vs 预检的触发条件
- [ ] 看得懂 5 个 CORS 响应头各自作用
- [ ] 知道 `*` + 凭据为何冲突
- [ ] 会配 Vite 代理解决 dev 跨域
- [ ] 知道生产环境用 Nginx 反代
- [ ] 看到 CORS 报错能按排错表定位缺哪个头

---

## 12. 延伸阅读

- MDN CORS 详解：https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CORS
- 预检请求：https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CORS#%E9%A2%84%E6%A3%80%E8%AF%B7%E6%B1%82
- Vite 代理配置：https://cn.vitejs.dev/config/server-options.html#server-proxy
- Nginx 反向代理：https://nginx.org/en/docs/http/converting_rewrite_rules.html

# HTTP 基础（前置知识补完）

> 一句话：HTTP 是浏览器和服务器「对话」的协议，前端发请求、后端回响应都走它。

## 你应该会什么（检验）
- 知道 URL 由「协议 + 域名 + 端口」组成（`https://api.xxx.com:8080`）
- 知道方法 GET/POST/PUT/DELETE、状态码 200/400/401/404/500
- 知道 Header（请求头）、Body（请求体）、`?a=1&b=2` 查询参数

## 30 秒上手
```
GET  /users?page=1        HTTP/1.1
Host: api.xxx.com
Authorization: Bearer xxx
（GET 一般无 Body）

POST /login HTTP/1.1
Content-Type: application/json
{ "name":"Li", "pwd":"123" }   <- Body
```
响应：`200 OK` / `401 未登录` / `404 不存在` / `500 服务器错`。

## 一个练习
打开 DevTools → Network，刷新任意网页，点一个请求看它的 URL、方法、状态码、Request/Response。做完回主文章。

## 常见误解
- GET 带参数走 URL（?a=1），POST 带参数走 Body；GET 不应改数据，POST 才改。
- `401` 是「没登录/凭证失效」，`403` 是「登录了但没权限」，不一样。

↩ 回到学习笔记首页：../learn.html

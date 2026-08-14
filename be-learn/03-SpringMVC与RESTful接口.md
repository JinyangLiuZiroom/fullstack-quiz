# 模块三：Spring MVC 与 RESTful 接口（完整学习指南）

> **学习目标**：掌握 Spring MVC 处理一次 HTTP 请求的完整链路，能规范地写 Controller、接收各种参数、返回统一结构、做全局异常处理，让接口「前端拿得舒服、报错不裸奔」。
> **适合谁**：能跑通模块一的 Hello 接口，但不知道 `@RequestBody`/`@PathVariable` 区别，返回结构各接口五花八门的同学。
> **学完能做什么**：写一个带统一响应体、统一异常、参数校验的 RESTful 用户模块，对齐企业后端接口规范。

---

## 1. 前置知识

- 模块一、二（Spring Boot + IoC） 📖 [模块一：SpringBoot基础与自动配置](index.html#01-SpringBoot基础与自动配置.md)
- HTTP 方法 GET/POST/PUT/DELETE、状态码 200/400/401/404/500 📖 [前置：HTTP 基础](../prereq/index.html#http-basics.md)
- JSON 长什么样 📖 [前置：JSON](../prereq/index.html#json-basics.md)

---

## 2. 核心概念：一次请求怎么走到你的方法

```
浏览器/前端 → DispatcherServlet（前端控制器）
  → HandlerMapping（找哪个 Controller 方法）
  → 参数解析器（把 JSON/路径/请求参数绑成方法入参）
  → 你的 @GetMapping 方法
  → 返回值处理器（对象 → JSON）
  → 前端
```

你只需写「中间的 Controller 方法」，其余 Spring 帮你做了。

### 常用注解分工

| 注解 | 取值位置 | 典型场景 |
|---|---|---|
| `@PathVariable` | URL 路径 `/users/{id}` | 资源 ID |
| `@RequestParam` | 查询串 `?page=1` 或表单字段 | 分页、筛选条件 |
| `@RequestBody` | 请求体 JSON | POST/PUT 的复杂对象 |
| `@RequestHeader` | 请求头 | token、traceId |
| `@CookieValue` | Cookie | sessionId |

```java
@GetMapping("/users/{id}")
public UserDTO get(@PathVariable Long id,
                   @RequestParam(required = false) String fields) { ... }

@PostMapping("/users")
public Long create(@RequestBody @Valid CreateUserReq req) { ... }
```

> **关键区分**：GET 一般没有请求体，参数走 URL 或查询串（`@RequestParam`）；POST/PUT 提交对象走 `@RequestBody`。把 `@RequestBody` 用在 GET 上是常见新手错误。

---

## 3. 快速开始：统一响应体

企业里不要直接 `return "ok"` 或 `return user`，而是包一层统一结构，前端才好统一处理：

```java
@Data
@AllArgsConstructor
public class Result<T> {
    private int code;        // 业务码：0 成功，非 0 失败
    private String message;
    private T data;
    public static <T> Result<T> ok(T data) { return new Result<>(0, "success", data); }
    public static <T> Result<T> fail(int code, String msg) { return new Result<>(code, msg, null); }
}
```

Controller 返回 `Result<UserDTO>`：

```java
@GetMapping("/{id}")
public Result<UserDTO> get(@PathVariable Long id) {
    return Result.ok(service.findById(id));
}
```

---

## 4. 进阶用法

### 4.1 参数校验（@Valid）

```java
@Data
public class CreateUserReq {
    @NotBlank(message = "用户名不能为空")
    private String name;
    @Email(message = "邮箱格式不对")
    private String email;
    @Min(18) @Max(120)
    private int age;
}

@PostMapping
public Result<Long> create(@RequestBody @Valid CreateUserReq req) {
    return Result.ok(service.create(req));
}
```

校验失败会抛 `MethodArgumentNotValidException`，配合全局异常处理返回友好信息（见 4.3）。

### 4.2 RESTful 资源风格

```
GET    /users       列表
GET    /users/{id}  详情
POST   /users       新增
PUT    /users/{id}  全量更新
DELETE /users/{id}  删除
```

### 4.3 全局异常处理（必写）

```java
@RestControllerAdvice   // 拦截所有 @RestController 的异常
public class GlobalExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Result<Void> handleValid(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldError().getDefaultMessage();
        return Result.fail(400, msg);   // 把校验 message 返回给前端
    }
    @ExceptionHandler(BizException.class)
    public Result<Void> handleBiz(BizException e) {
        return Result.fail(e.getCode(), e.getMessage());
    }
    @ExceptionHandler(Exception.class)
    public Result<Void> handleOther(Exception e) {
        log.error("未捕获异常", e);
        return Result.fail(500, "系统繁忙");
    }
}
```

> **好处**：业务代码只管抛 `BizException("库存不足")`，不用到处 try-catch；前端永远拿到 `{code,message,data}` 结构。

---

## 5. 常见坑与排错表

| 现象 | 根因 | 解决 |
|---|---|---|
| 前端 POST JSON 报 400 | 没加 `@RequestBody`，或字段名/类型对不上 | 加 `@RequestBody`；前后端字段名保持一致（用 `@JsonProperty` 映射） |
| `@RequestParam` 取不到 | 前端把参数放 body 里了 | body 用 `@RequestBody`；查询参数才用 `@RequestParam` |
| 返回 Date 变成时间戳 | 默认 Jackson 把 Date 序列化成毫秒 | 配置 `spring.jackson.date-format` 或字段加 `@JsonFormat(pattern="yyyy-MM-dd")` |
| 校验不生效（直接进方法） | 忘了 `@Valid` 注解 | 入参前加 `@Valid` |
| 全局异常没拦到 | 类没加 `@RestControllerAdvice`，或异常在过滤器层抛出 | 确认注解；过滤器异常需特殊处理 |
| 接收不到枚举 | 前端传字符串，后端枚举大小写不一致 | 用 `@JsonValue`/`@JsonCreator` 或统一小写约定 |
| 跨域 OPTIONS 预检后接不到真实请求 | 没配 CORS（见前端模块四） | 加 `@CrossOrigin` 或全局 `CorsConfiguration` |
| 大对象序列化栈溢出 | 双向关联（A 含 B，B 含 A）循环引用 | 一方加 `@JsonIgnore` 打断循环 |

---

## 6. 完整实战：用户模块（含校验 + 统一异常）

1. 实体 `UserDTO`、`CreateUserReq`（带校验注解）。
2. `UserController` 提供 `GET /api/users/{id}` 和 `POST /api/users`。
3. 写 `GlobalExceptionHandler` 统一异常。
4. 用 Postman 测：`POST` 一个 `name` 为空的请求，应返回 `{code:400, message:"用户名不能为空"}`，而不是 500 堆栈。

**验收**：正常请求返回 `Result` 包裹的数据；非法请求返回结构化错误信息；无裸 500。

---

## 7. 最佳实践

- 所有接口返回**统一 `Result<T>` 结构**，前端一套逻辑处理。
- 参数校验放 Controller 入口用 `@Valid`，业务规则校验放 Service 抛 `BizException`。
- 永远写 `@RestControllerAdvice` 全局异常，别在每个方法里 try-catch。
- 路径用 RESTful 资源风格，名词复数 `/users` 而非动词 `/getUser`。
- 入参用 DTO（如 `CreateUserReq`）而非直接接收实体，避免越权字段被前端篡改写入。

---

## 8. 自测清单

- [ ] 分得清 `@PathVariable`/`@RequestParam`/`@RequestBody` 的适用场景
- [ ] 能手写一个统一 `Result<T>` 响应体
- [ ] 会写 `@Valid` 校验 + 全局异常处理
- [ ] 知道 POST 复杂对象必须 `@RequestBody`
- [ ] 知道双向关联序列化要加 `@JsonIgnore`
- [ ] 接口命名遵循 RESTful 风格

---

## 9. 延伸阅读

- [Spring MVC 官方文档](https://docs.spring.io/spring-framework/docs/current/reference/html/web.html)
- [Bean Validation 规范](https://jakarta.ee/specifications/bean-validation/)
- 下一篇：模块四 Spring 事务管理

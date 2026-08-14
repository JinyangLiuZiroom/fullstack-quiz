# 模块五：Spring 常用注解（@Value / @ConfigurationProperties / @Scheduled / @Async / @Retryable / @Profile）（完整学习指南）

> **学习目标**：掌握后端日常最高频的 6 个「能力型」注解，能配置参数、定时任务、异步执行、失败重试、环境隔离，不再为每个功能去网上现查。
> **适合谁**：会写 CRUD，但定时任务/异步/重试还要问同事的同学。
> **学完能做什么**：写一个每天凌晨跑的定时统计、一个不阻塞主线程的异步发邮件、一个调用第三方失败自动重试 3 次的组件。

---

## 1. 前置知识

- 模块一配置（@Value/@ConfigurationProperties 在模块一讲过，这里深入） 📖 [模块一：SpringBoot基础与自动配置](index.html#01-SpringBoot基础与自动配置.md)
- 模块二 IoC（这些注解都是基于 Bean 机制） 📖 [模块二：SpringIoC与DI](index.html#02-SpringIoC与DI.md)
- 知道什么是「阻塞」：方法不返回，调用方干等 📖 [前置：阻塞与非阻塞](../../prereq/index.html#blocking-basics.md)

---

## 2. 核心概念一览

| 注解 | 作用 |
|---|---|
| `@Value` | 注入单个配置值/SpEL 表达式 |
| `@ConfigurationProperties` | 批量绑定一组配置到对象 |
| `@Scheduled` | 定时任务 |
| `@Async` | 方法异步执行（另起线程） |
| `@Retryable` | 失败自动重试（spring-retry） |
| `@Profile` | 按环境决定是否注册 Bean |

---

## 3. 快速开始：逐个击破

### 3.1 @Value 与 @ConfigurationProperties（回顾+深入）

```java
@Value("${app.timeout:5000}")          // 默认值 5000
private int timeout;

@Value("#{${app.list}.size()}")        // SpEL：取集合大小
private int size;
```

> `@Value` 不支持松散绑定（`app-timeout` 不会绑到 `app.timeout` 字段），且类型转换弱。**一组配置优先用 `@ConfigurationProperties`**（模块一已讲）。

### 3.2 @Scheduled 定时任务

```java
@EnableScheduling   // 启动类或配置类上加，开启调度
@Component
public class StatJob {
    // 每天 02:30 执行（cron：秒 分 时 日 月 周）
    @Scheduled(cron = "0 30 2 * * ?")
    public void dailyStat() { ... }

    // 固定间隔 5 秒（上次结束到下次开始）
    @Scheduled(fixedDelay = 5000)
    public void poll() { ... }

    // 固定频率 5 秒（不管上次多快，到点就跑）
    @Scheduled(fixedRate = 5000)
    public void tick() { ... }
}
```

cron 口诀：`[秒] [分] [时] [日] [月] [周(0-6 或 SUN-SAT)]`。`?` 用于「日」和「周」互斥位。

### 3.3 @Async 异步

```java
@EnableAsync          // 开启异步
@Service
public class MailService {
    @Async
    public CompletableFuture<Void> sendAsync(String to) {
        // 耗时发邮件，调用方不阻塞
        mailClient.send(to);
        return CompletableFuture.completedFuture(null);
    }
}
```

调用方：`mailService.sendAsync("a@b.com");` 立即返回，邮件在别的线程发。

### 3.4 @Retryable 重试（需引 spring-retry + @EnableRetry）

```java
@EnableRetry
@Service
public class ThirdPartyService {
    @Retryable(retryFor = RuntimeException.class, maxAttempts = 3, backoff = @Backoff(delay = 1000))
    public String call() {
        return unstableClient.call();   // 失败重试，间隔 1 秒，最多 3 次
    }
    @Recover
    public String recover(RuntimeException e) {
        return "fallback";   // 3 次都失败走这里
    }
}
```

### 3.5 @Profile 环境隔离

```java
@Configuration
@Profile("dev")
public class DevDataSourceConfig { /* 开发库 */ }

@Configuration
@Profile("prod")
public class ProdDataSourceConfig { /* 生产库 */ }
```

激活 `dev` 时只有 Dev 配置生效。

---

## 4. 进阶用法

- `@Async` 默认用 `SimpleAsyncTaskExecutor`（每次 new 线程），生产要配自定义线程池：

```java
@Bean
public Executor asyncExecutor() {
    ThreadPoolTaskExecutor e = new ThreadPoolTaskExecutor();
    e.setCorePoolSize(8); e.setMaxPoolSize(16); e.setQueueCapacity(100);
    e.setThreadNamePrefix("async-"); e.initialize(); return e;
}
@Async("asyncExecutor") public void task() {...}
```

- `@Scheduled` 默认**单线程串行**，一个任务卡住会拖慢其他。多任务要配 `SchedulingConfigurer` 用线程池。
- `@Retryable` 只对**抛异常**重试，对返回值「错误但没抛异常」不重试——业务要判断清楚。

---

## 5. 常见坑与排错表

| 现象 | 根因 | 解决 |
|---|---|---|
| `@Scheduled` 不执行 | 没加 `@EnableScheduling` | 启动类加 `@EnableScheduling` |
| 定时任务互相「卡住」 | 默认单线程 | 配线程池 `SchedulingConfigurer` |
| `@Async` 方法**同步执行了**（没异步） | 同类自调用绕过代理；或没 `@EnableAsync` | 拆到别的 Bean 调用；加 `@EnableAsync` |
| `@Async` 返回 void，异常被吞 | 异步线程异常主线程收不到 | 返回 `Future`/`CompletableFuture` 并 get 捕获，或全局异常处理器 |
| `@Retryable` 没重试 | 方法内部 catch 了异常没抛出 | 让异常抛出才能触发重试；或 `retryFor` 类型要匹配 |
| `@Retryable` 重试了「参数错误」这类不该重试的 | `retryFor` 范围太宽 | 只对瞬时故障（网络/超时）重试，参数/业务错误不重试 |
| cron 表达式写错报解析异常 | 周位用 7 或格式错 | 周用 1-6 或 SUN-SAT；用在线 cron 生成器核对 |
| `@Profile` Bean 没生效 | 激活的 profile 不对 | 确认 `--spring.profiles.active` |

---

## 6. 完整实战：异步重试发消息

```java
@EnableAsync @EnableRetry
@Service
public class NotifyService {
    @Async
    @Retryable(retryFor = {SocketTimeoutException.class}, maxAttempts = 3, backoff = @Backoff(delay = 500))
    public CompletableFuture<Void> notify(User u) {
        pushClient.push(u.getToken());   // 可能超时
        return CompletableFuture.completedFuture(null);
    }
    @Recover
    public CompletableFuture<Void> recover(SocketTimeoutException e, User u) {
        log.warn("推送最终失败 {}", u.getId());
        return CompletableFuture.completedFuture(null);
    }
}
```

**验收**：调用 `notify` 不阻塞主流程；网络超时自动重试 3 次；都失败进入 recover 记日志，不影响主业务。

---

## 7. 最佳实践

- `@Async`/`@Scheduled` 一定配自定义线程池，避免默认单线程/无限建线程。
- 重试只对**瞬时故障**（网络抖动、超时），不要重试参数错误、业务校验失败。
- 定时任务逻辑要幂等（可能重复执行），防止重复数据。
- 异步方法返回 `CompletableFuture` 便于调用方感知结果和异常。
- 环境相关 Bean 用 `@Profile` 隔离，别用 `if (env.equals("prod"))` 硬编码。

---

## 8. 自测清单

- [ ] 会写 cron 表达式（至少能查能读）
- [ ] 知道 @Scheduled 默认单线程，需配线程池
- [ ] 知道 @Async 自调用失效 + 要 @EnableAsync
- [ ] 知道 @Retryable 只对抛异常重试且要对瞬时故障
- [ ] 会用 @Profile 做环境隔离
- [ ] 会配自定义线程池给异步/调度用

---

## 9. 延伸阅读

- [Spring @Scheduled 文档](https://docs.spring.io/spring-framework/docs/current/reference/html/integration.html#scheduling)
- [Spring Retry](https://github.com/spring-projects/spring-retry)
- 模块十 Redis 分布式锁（异步/定时里的并发控制）

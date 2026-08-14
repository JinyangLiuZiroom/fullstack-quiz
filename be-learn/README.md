# 服务端（后端 Java）学习笔记 · 组内分享

> 面向零基础同学，目标：学完每篇能**熟练掌握该模块、上手开发不踩常见坑**。
> 每篇统一结构：学习目标 / 前置知识 / 核心原理 / 快速开始 / 进阶用法 / 常见坑与排错表 / 完整实战 / 最佳实践 / 自测清单 / 延伸阅读。
> 无 Android 类比，纯讲后端本身。

## 模块清单（15 篇）

### 基础与容器
1. [Spring Boot 基础与自动配置](01-SpringBoot基础与自动配置.md) — 自动配置原理、Starter、Profile、配置读取
2. [Spring IoC 与 DI](02-SpringIoC与DI.md) — 控制反转、三种注入、作用域、循环依赖
3. [Spring MVC 与 RESTful 接口](03-SpringMVC与RESTful接口.md) — 请求链路、参数注解、统一响应、全局异常
4. [Spring 事务管理](04-Spring事务管理.md) — @Transactional 失效、传播行为、回滚规则
5. [Spring 常用注解](05-Spring常用注解.md) — @Value/@ConfigurationProperties/@Scheduled/@Async/@Retryable/@Profile

### 数据层
6. [MyBatis-Plus 持久层](06-MyBatisPlus持久层.md) — LambdaQueryWrapper、更新忽略 null、分页、逻辑删除
7. [MySQL 索引与 SQL 优化](07-MySQL索引与SQL优化.md) — 覆盖索引/回表/最左前缀/索引下推/EXPLAIN
8. [MySQL 事务与锁](08-MySQL事务与锁.md) — ACID、隔离级别、Next-Key Lock、防超卖、死锁

### 缓存与消息中间件
9. [Redis 缓存](09-Redis缓存.md) — Cache-Aside、StringRedisTemplate、Hash/ZSET、击穿/穿透/雪崩
10. [Redis 分布式锁与高并发](10-Redis分布式锁与高并发.md) — SET NX PX、Lua 释放、Redisson、幂等
11. [RabbitMQ 消息队列](11-RabbitMQ消息队列.md) — 交换机/队列、死信队列、可靠投递、消费幂等
12. [Kafka 消息队列](12-Kafka消息队列.md) — 分区顺序、ISR、acks、消费者组、手动提交

### 工程与规范
13. [Nacos 配置中心与服务发现](13-Nacos配置中心与服务发现.md) — 配置中心、@RefreshScope 热更新、服务注册
14. [三层架构与工程规范](14-三层架构与工程规范.md) — Controller/Service/Mapper、DTO/VO/PO 边界
15. [Java 集合与并发常见坑](15-Java集合与并发常见坑.md) — 线程安全集合、forEach 删除、线程池、可见性

## 推荐学习路径

```
1  Spring Boot 基础
   ↓
2  IoC 与 DI  → 3 Spring MVC  → 4 事务  → 5 常用注解
   ↓
6  MyBatis-Plus  → 7 MySQL 索引  → 8 MySQL 事务与锁
   ↓
9  Redis 缓存  → 10 分布式锁
   ↓
11 RabbitMQ  → 12 Kafka
   ↓
13 Nacos  → 14 三层架构  → 15 集合与并发
```

**建议**：先打牢 1-5（框架底座），再攻 6-8（数据层，最常写），9-12（缓存与 MQ，面试与高并发重点），最后 13-15（工程规范与排错）。每篇结尾「自测清单」全打勾再进下一篇。

## 在线学习站（手机可访问）

https://jinyangliuziroom.github.io/fullstack-quiz/be-learn/

左侧选篇、点开即读，代码高亮，适配手机。组内同学直接发链接即可，无需拷文件。

## 配套
- 前端笔记：https://jinyangliuziroom.github.io/fullstack-quiz/fe-learn/
- 每日自测刷题：https://jinyangliuziroom.github.io/fullstack-quiz/

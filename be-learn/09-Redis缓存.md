# 模块九：Redis 缓存（完整学习指南）

> **学习目标**：掌握 Redis 作为缓存的核心用法——StringRedisTemplate API、Cache-Aside 读写流程、Hash/ZSET 结构、过期续期，能正确设计缓存提升性能，并避开缓存与数据库不一致。
> **适合谁**：听过 Redis 但只在 `redis-cli` 里 `set get` 过，不知道怎么在 Java 项目里用、缓存该「先查缓存还是先查库」的同学。
> **学完能做什么**：写一个带缓存的用户查询、用 ZSET 做排行榜、用 Hash 存对象、理解缓存击穿/穿透/雪崩并给出对策。

---

## 1. 前置知识

- 模块三（会写接口）、模块六（会查库）
- 知道缓存 = 把热点数据放更快的存储（内存），减少查 DB
- 基本数据结构：String/Hash/List/Set/ZSet

---

## 2. 核心概念：为什么用 Redis 做缓存

DB 在磁盘，一次查询几十毫秒；Redis 在内存，亚毫秒级。把「读多写少」的热点数据放 Redis，前端请求先打 Redis，命中就直接返回，极大降压。

### Cache-Aside（旁路缓存）标准流程

```
读：
  1. 查 Redis → 命中返回
  2. 未命中 → 查 DB → 写入 Redis（设过期时间）→ 返回
写：
  1. 更新 DB
  2. 删除 Redis 缓存（不是更新缓存！）
```

> **写时为什么「删缓存」而不是「更新缓存」**：直接更新缓存可能有并发写导致脏数据；删缓存最简单，下次读自动重建。这是经典 Cache-Aside 套路，真题必考。

### Spring 里的 API

```java
@Autowired
private StringRedisTemplate redis;   // 操作 String 类型，自动序列化

redis.opsForValue().set("user:1", json, 30, TimeUnit.MINUTES);  // 设值+过期
String v = redis.opsForValue().get("user:1");
redis.opsForValue().increment("counter");    // 原子自增（计数器）
Long ttl = redis.getExpire("user:1");         // 剩余过期秒数
```

> `StringRedisTemplate` 要求 key/value 都是 String。存对象要先 `JSON.toJSONString(user)`；`RedisTemplate`（原生）会 JDK 序列化二进制，可读性差，团队一般统一用 StringRedisTemplate + JSON。

---

## 3. 快速开始：带缓存的查询

```java
public User getUser(Long id) {
    String key = "user:" + id;
    String cached = redis.opsForValue().get(key);
    if (cached != null) return JSON.parseObject(cached, User.class);  // 命中
    User u = userMapper.selectById(id);                                // 未命中查库
    if (u != null) redis.opsForValue().set(key, JSON.toJSONString(u), 30, TimeUnit.MINUTES);
    return u;
}
```

---

## 4. 进阶用法

### 4.1 Hash 存对象（按字段）

```java
redis.opsForHash().put("user:1", "name", "张三");
redis.opsForHash().put("user:1", "age", "18");
String name = (String) redis.opsForHash().get("user:1", "name");
// 适合要单独改某字段、不想整体覆盖的场景
```

### 4.2 ZSET 排行榜（有序集合）

```java
redis.opsForZSet().add("rank", "user:1", 95);   // score=95
redis.opsForZSet().add("rank", "user:2", 88);
Set<String> top = redis.opsForZSet().reverseRange("rank", 0, 9);  // 前 10 名（分数降序）
Double score = redis.opsForZSet().score("rank", "user:1");
// 积分、热度、排行榜都用 ZSET
```

### 4.3 过期续期

```java
// 登录 token：每次访问续期，避免用着用着被踢
redis.expire("token:" + token, 30, TimeUnit.MINUTES);

// 误区：INCR 后不续期 → 计数器到时消失；若需持久要显式 expire
redis.opsForValue().increment("uv");   // 不会自动带过期！
```

### 4.4 缓存三大问题

| 问题 | 含义 | 对策 |
|---|---|---|
| 缓存穿透 | 查**不存在**的数据，缓存和库都没有，每次穿透到 DB | 缓存空值（短过期）；布隆过滤器拦截 |
| 缓存击穿 | **某个热点 key 过期瞬间**，大量请求同时打 DB | 互斥锁（只放一个请求重建）/ 逻辑过期（不真删） |
| 缓存雪崩 | **大量 key 同时过期**或 Redis 宕机，DB 被打崩 | 过期时间加随机抖动；Redis 高可用集群 |

---

## 5. 常见坑与排错表

| 现象 | 根因 | 解决 |
|---|---|---|
| 缓存和 DB 数据不一致 | 写时先删缓存又并发读重建了旧值 | 先更新 DB 再删缓存（延迟双删更稳）；或 Canal 订阅 binlog 删 |
| 用了 `RedisTemplate` 看到一堆二进制 | 默认 JDK 序列化 | 统一用 `StringRedisTemplate` + JSON |
| INCR 计数丢失 | 没想到 INCR 不设过期，以为会自动续 | 需要持久就显式 expire；或业务本就不该过期 |
| 缓存击穿 DB 被打爆 | 热点 key 集中过期 | 重建时加锁（singleflight）；热点 key 不过期/逻辑过期 |
| 缓存穿透压垮 DB | 恶意查不存在的 id | 缓存空值或布隆过滤器 |
| key 设计混乱难维护 | 没规范 | 统一 `业务:id:字段` 三段式，如 `user:1:profile` |
| 大 key 阻塞 | 一个 value 几 MB | 拆分；Hash 代替大 String；避免 `KEYS *` |
| `getExpire` 返回 -2 | key 已不存在 | 判断 null/不存在再查库 |
| Redis 里中文乱码 | 序列化问题 | StringRedisTemplate 默认 UTF-8，正常；排查是否混用 RedisTemplate |

---

## 6. 完整实战：缓存 + 防穿透的用户查询

```java
public User getUserSafe(Long id) {
    String key = "user:" + id;
    String c = redis.opsForValue().get(key);
    if (c != null) {
        if ("NULL".equals(c)) return null;          // 缓存的空值，直接返回
        return JSON.parseObject(c, User.class);
    }
    User u = userMapper.selectById(id);
    if (u == null) {
        redis.opsForValue().set(key, "NULL", 2, TimeUnit.MINUTES);  // 防穿透：短过期空值
    } else {
        redis.opsForValue().set(key, JSON.toJSONString(u), 30, TimeUnit.MINUTES);
    }
    return u;
}
// 写时：updateDB 后 redis.delete(key)
```

**验收**：正常命中走缓存；查不存在的 id 也只打一次库（空值短时缓存）；更新后删除缓存，下次读取最新。

---

## 7. 最佳实践

- 严格走 Cache-Aside：读先缓存后库，写先更新库再删缓存。
- key 统一 `业务:id:字段` 规范，便于排查和批量清理。
- 一律 `StringRedisTemplate` + JSON，别用默认 JDK 序列化。
- 给缓存**都设过期时间**，防雪崩加随机抖动。
- 不存在的数据缓存短过期空值防穿透；热点 key 用锁防击穿。
- 别在 Redis 存大 key、别用 `KEYS *`（用 `SCAN`）。

---

## 8. 自测清单

- [ ] 能口述 Cache-Aside 读/写流程
- [ ] 知道写时「删缓存而非更新缓存」的原因
- [ ] 会用 StringRedisTemplate 的 value/hash/zset API
- [ ] 能说清击穿/穿透/雪崩的区别与对策
- [ ] 会给缓存设合理过期 + 随机抖动
- [ ] 知道 INCR 默认不续期

---

## 9. 延伸阅读

- [Redis 官方文档](https://redis.io/docs/)
- 模块十 Redis 分布式锁与高并发
- 模块八 MySQL 事务与锁（缓存与 DB 一致性）

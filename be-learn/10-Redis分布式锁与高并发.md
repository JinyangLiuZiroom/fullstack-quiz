# 模块十：Redis 分布式锁与高并发（完整学习指南）

> **学习目标**：理解「为什么单机锁（synchronized）在分布式下失效」，掌握基于 Redis 的分布式锁正确实现，能处理缓存击穿、幂等、并发扣减等高并发场景。
> **适合谁**：写过 `synchronized` 但不知多实例部署后它锁不住；或听过「分布式锁」但用 `SETNX` 写得不全的同学。
> **学完能做什么**：用 Redis 实现一个可过期的分布式锁防重复提交、防并发超卖，知道锁超时和误删的坑及 Redisson 的解法。

---

## 1. 前置知识

- 模块九 Redis 基础（set/expire） 📖 [模块九：Redis缓存](index.html#09-Redis缓存.md)
- 知道 `synchronized`/`ReentrantLock` 只在**同一个 JVM** 内有效 📖 [前置：线程与并发](../../prereq/index.html#concurrency-basics.md)
- 模块八 并发扣减思路 📖 [模块八：MySQL事务与锁](index.html#08-MySQL事务与锁.md)

---

## 2. 核心概念：为什么需要分布式锁

你的服务部署了 3 个实例（负载均衡），请求可能落到任意一台。`synchronized` 只锁当前 JVM 的线程，实例 A 加锁时实例 B 照样能改数据 → 锁不住。分布式锁就是把「锁」放到所有实例都能访问的**共享存储**（Redis/ZooKeeper）里。

### 正确加锁：SET NX + 过期 + 原子

```text
SET lock:order:100 "uuid" NX PX 30000
```
- `NX`：不存在才设（获取锁成功），存在则失败（别人已持有）。
- `PX 30000`：30 秒自动过期，防持有者宕机死锁。
- `uuid`：客户端唯一标识，释放时校验是自己加的锁，避免误删别人的。

**释放锁必须用 Lua 脚本保证「校验+删除」原子**（防 A 锁过期后删掉了 B 的锁）：

```lua
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
```

> 坑：如果「校验 uuid」和「del」分两步，中间锁过期被别人拿到，你就删了别人的锁。必须 Lua 原子。

---

## 3. 快速开始：用 StringRedisTemplate 加锁

```java
public boolean tryLock(String key, String uuid, long expireMs) {
    // setIfAbsent = SET NX，同时设过期（原子）
    return redis.opsForValue().setIfAbsent(key, uuid, expireMs, TimeUnit.MILLISECONDS);
}
public void unlock(String key, String uuid) {
    // 用 Lua 保证「是自己的锁才删」
    DefaultRedisScript<Long> script = new DefaultRedisScript<>(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        Long.class);
    redis.execute(script, List.of(key), uuid);
}
```

---

## 4. 进阶用法

### 4.1 防重复提交 / 防并发超卖

```java
String lockKey = "seckill:" + itemId;
String uuid = UUID.randomUUID().toString();
if (!tryLock(lockKey, uuid, 10000)) {
    throw new BizException("手速太快，请稍后");  // 没拿到锁
}
try {
    // 临界区：查库存 + 扣减（配合模块八 的 cnt>0 原子更新双保险）
    return seckill(itemId);
} finally {
    unlock(lockKey, uuid);   // 一定释放
}
```

### 4.2 Redisson（生产推荐）

手写锁容易漏细节。Redisson 提供 `RLock`，自动处理续期（看门狗）、可重入、Lua 释放：

```java
RLock lock = redissonClient.getLock("seckill:" + itemId);
lock.lock(10, TimeUnit.SECONDS);   // 看门狗自动续期
try { seckill(itemId); }
finally { lock.unlock(); }
```

### 4.3 锁超时 vs 业务执行时间

如果业务执行超过锁过期时间，锁自动释放，别的线程进来 → 出现「两个线程都在临界区」。解法：用 Redisson 看门狗自动续期，或预估业务耗时设足够过期 + 兜底续期。

---

## 5. 常见坑与排错表

| 现象 | 根因 | 解决 |
|---|---|---|
| 多实例下 `synchronized` 没用 | 锁只在本 JVM 内 | 用 Redis/ZK 分布式锁 |
| 释放锁把别人的删了 | 先 get 再 del 非原子，中间自己锁过期 | Lua 脚本原子校验删除 |
| 只 SETNX 不设置过期 → 宕机死锁 | 没过期，持有者挂了锁永在 | SET NX PX 一起（原子） |
| 业务没跑完锁就过期 | 过期时间 < 业务耗时 | 看门狗续期（Redisson）/ 调大过期 |
| 误用 `del` 而非 Lua | 同上误删 | 用 Lua 或 Redisson |
| 锁 key 没带业务维度（只 "lock"） | 所有请求抢同一把锁，串行化 | key 带资源 id：`lock:order:100` |
| 加了锁忘了 finally 释放 | 异常时锁不释放 | try-finally 必释放 |
| 把锁当「限流」用 | 锁是互斥不是限流 | 限流用令牌桶/Redis INCR 计数 |

---

## 6. 完整实战：分布式防超卖

```java
public boolean seckill(Long itemId, Long userId) {
    String lockKey = "lock:item:" + itemId;
    String uuid = UUID.randomUUID().toString();
    if (!tryLock(lockKey, uuid, 5000)) return false;  // 拿不到锁直接失败
    try {
        int n = stockMapper.deduct(itemId);   // UPDATE ... WHERE cnt>0（模块八）
        if (n == 0) return false;
        orderMapper.insert(itemId, userId);
        return true;
    } finally {
        unlock(lockKey, uuid);
    }
}
```

**验收**：3 实例并发下无超卖；锁到期自动释放不死锁；异常路径 finally 释放。

---

## 7. 最佳实践

- 分布式锁放 Redis，key 必须带**资源维度**（如 `lock:order:100`），避免全局串行。
- 加锁用 `SET NX PX` 原子命令，释放用 **Lua 校验 uuid**，绝不分两步。
- 生产直接用 **Redisson**（自动续期、可重入、安全释放），别手写裸 SETNX。
- 临界区尽量短；锁是互斥不是限流，别用锁做限流。
- 与 DB 原子更新（`cnt>0`）配合做双重保险，不要只靠锁。

---

## 8. 自测清单

- [ ] 知道为什么 synchronized 在分布式下无效
- [ ] 能说出 SET NX PX 各参数含义
- [ ] 知道为什么释放锁要用 Lua
- [ ] 知道锁过期时间 < 业务耗时的风险
- [ ] 会用 Redisson 或手写好一套安全的锁
- [ ] 知道锁 key 要带资源维度

---

## 9. 延伸阅读

- [Redisson 文档](https://redisson.org/)
- [Redis 分布式锁官方建议](https://redis.io/docs/latest/develop/use/patterns/distributed-locks/)
- 模块九 Redis 缓存；模块八 MySQL 事务与锁

# 模块十五：Java 集合与并发常见坑（完整学习指南）

> **学习目标**：掌握后端日常最高频的集合与并发陷阱——`HashMap` 线程不安全、`forEach` 里删除抛异常、线程池参数怎么配、原子类与可见性，能写出正确、安全的并发代码。
> **适合谁**：会用 `ArrayList`/`HashMap` 但不知道并发下会出什么鬼；或在线程池、锁上踩过坑的同学。
> **学完能做什么**：选对集合、在线程安全场景下用对容器、配置一个不 OOM 的线程池、避开 `ConcurrentModificationException`。

---

## 1. 前置知识

- Java 基础（集合框架、`Runnable`/`Callable`） 📖 [前置：Java 8+ 基础](../prereq/index.html#java-basics.md)
- 模块二（Bean）、模块五（@Async 线程池） 📖 [模块二：SpringIoC与DI](index.html#02-SpringIoC与DI.md)
- 知道「线程」是并发执行的单位 📖 [前置：线程与并发](../prereq/index.html#concurrency-basics.md)

---

## 2. 核心概念

### 2.1 集合线程安全

| 集合 | 线程安全？ | 并发场景替换 |
|---|---|---|
| `HashMap` | ❌ | `ConcurrentHashMap` |
| `ArrayList` / `HashSet` | ❌ | `CopyOnWriteArrayList` / `ConcurrentHashMap` / `Collections.synchronizedList` |
| `StringBuilder` | ❌ | `StringBuffer`（或局部变量用 StringBuilder） |

`HashMap` 并发 `put` 在 JDK8 前可能**死循环**（头插法），JDK8 后是数据错乱/丢失——都不是你想要的。

### 2.2 forEach 删除陷阱

```java
List<String> list = new ArrayList<>(Arrays.asList("a","b","c"));
for (String s : list) {
    if (s.equals("b")) list.remove(s);   // ❌ ConcurrentModificationException
}
```

> 增强 for 底层是 `Iterator`，遍历中直接 `list.remove` 会修改 `modCount`，下次 `next()` 抛异常。正确做法：用 `Iterator.remove()` 或 `removeIf` 或 Stream 过滤新集合。

```java
list.removeIf(s -> s.equals("b"));                 // ✅
// 或
Iterator<String> it = list.iterator();
while (it.hasNext()) { if (it.next().equals("b")) it.remove(); }  // ✅
```

### 2.3 线程池核心参数

```java
new ThreadPoolExecutor(
    corePoolSize,      // 核心线程数（常驻）
    maximumPoolSize,   // 最大线程数
    keepAliveTime,     // 非核心线程空闲存活时间
    TimeUnit,
    workQueue,         // 任务队列（ArrayBlockingQueue / LinkedBlockingQueue）
    threadFactory,
    rejectedHandler    // 拒绝策略（CallerRuns / Discard / Abort）
);
```

**执行流程**：核心线程满 → 进队列 → 队列满 → 开非核心线程到最大 → 再满 → 拒绝策略。

> 坑：用 `Executors.newFixedThreadPool()` 默认**无界队列**（`LinkedBlockingQueue`），任务暴涨会 OOM。生产手动 `new ThreadPoolExecutor` 配有界队列 + 合理拒绝策略。

### 2.4 可见性与原子性

```java
// 可见性：一个线程改了，另一个线程可能看不到（没 volatile / 没同步）
private volatile boolean stop = false;   // volatile 保证可见性（不保证复合操作原子）

// 原子性：count++ 非原子（读-改-写），并发会丢更新
private AtomicInteger count = new AtomicInteger();
count.incrementAndGet();                  // ✅ 原子自增
```

---

## 3. 快速开始：安全的并发计数

```java
@RestController
public class CounterController {
    private final AtomicLong total = new AtomicLong();   // 线程安全计数
    @PostMapping("/hit")
    public long hit() { return total.incrementAndGet(); }
}
```

线程池发邮件（模块五 讲过，这里给完整参数）：

```java
@Bean
public Executor mailExecutor() {
    return new ThreadPoolExecutor(4, 8, 60, TimeUnit.SECONDS,
        new ArrayBlockingQueue<>(200),   // 有界队列，防 OOM
        new ThreadFactory() {
            private final AtomicInteger i = new AtomicInteger();
            public Thread newThread(Runnable r) {
                return new Thread(r, "mail-" + i.incrementAndGet());
            }
        },
        new ThreadPoolExecutor.CallerRunsPolicy());  // 满了对调用者降级执行
}
```

---

## 4. 进阶用法

- `ConcurrentHashMap` 的 `computeIfAbsent` 是原子操作，适合做缓存/去重。
- `CopyOnWriteArrayList` 读多写少安全（写时复制，读无锁），写多会慢。
- `synchronized` 加在**同一个对象**上才互斥；加在方法上锁的是 `this` 或 `Class`。
- `volatile` 不保证 `i++` 原子，只保证可见；原子用 `AtomicXxx`。
- 死锁四条件：互斥、占有等待、不可剥夺、循环等待。破坏任一即可（统一加锁顺序最常见）。

---

## 5. 常见坑与排错表

| 现象 | 根因 | 解决 |
|---|---|---|
| `ConcurrentModificationException` | forEach 中 list.remove | 用 `removeIf` / `Iterator.remove` |
| HashMap 并发数据错乱/死循环 | 非线程安全 | 换 `ConcurrentHashMap` |
| 线程池 OOM | `newFixedThreadPool` 无界队列 | 手动 `new ThreadPoolExecutor` + 有界队列 |
| `i++` 计数偏小 | 非原子读改写 | `AtomicInteger` |
| 一个线程改了另一个看不到 | 缺可见性 | `volatile` 或锁 |
| 死锁 | 加锁顺序不一致 | 统一顺序；缩小锁范围 |
| `synchronized` 没生效 | 锁了不同对象 | 锁同一把对象/Class |
| 集合转数组/线程不安全容器跨线程共享 | 共享可变状态 | 用并发容器或只读副本 |
| Gson/Fastjson 反序列化用 HashMap 并发写 | 同上 | 局部变量或并发容器 |

---

## 6. 完整实战：并发安全的去重计数器

```java
@Service
public class StatService {
    private final ConcurrentHashMap<String, AtomicLong> uv = new ConcurrentHashMap<>();
    public long record(String userId) {
        return uv.computeIfAbsent(userId, k -> new AtomicLong()).incrementAndGet();
    }
}
```

**验收**：100 线程并发 `record` 同一/不同 userId，最终计数正确；无异常、无丢更新。

---

## 7. 最佳实践

- 并发写集合用 `ConcurrentHashMap` / `CopyOnWriteArrayList`，别用裸 `HashMap`/`ArrayList`。
- 遍历中删除用 `removeIf` 或 `Iterator.remove`，禁用 `list.remove` 在 forEach 内。
- 线程池一律手动 `new ThreadPoolExecutor`，配**有界队列 + 拒绝策略**，别用 `Executors` 无界工厂。
- 计数/状态用 `AtomicXxx`；跨线程可见用 `volatile`，但别用它保原子复合操作。
- 锁范围尽量小、顺序统一，防死锁。
- 共享可变状态是高并发 bug 源头，优先「不可变 / 局部 / 并发容器」。

---

## 8. 自测清单

- [ ] 知道 HashMap/ArrayList 非线程安全及替代品
- [ ] 知道 forEach 删除抛异常的正解
- [ ] 会配线程池核心参数 + 有界队列
- [ ] 知道 volatile 与 Atomic 的区别
- [ ] 知道死锁成因与预防
- [ ] 会用 ConcurrentHashMap.computeIfAbsent

---

## 9. 延伸阅读

- [Java Concurrency in Practice](https://jcip.net/)（经典）
- [JDK 集合框架文档](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)
- 模块五 @Async 线程池；模块十 Redis 分布式锁

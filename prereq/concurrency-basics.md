# 线程与并发（前置知识补完）

> 一句话：线程是「能并发执行的最小单位」；多线程同时改同一份数据会出乱子，要加锁。

## 你应该会什么（检验）
- 知道「线程」是并发执行的单位
- 知道 `synchronized` / `ReentrantLock` 只在**同一个 JVM** 内有效

## 30 秒上手
```java
// 多个线程同时 count++ 会丢更新，加锁保护
synchronized (this) { count++; }
// 或
private final ReentrantLock lock = new ReentrantLock();
lock.lock(); try { count++; } finally { lock.unlock(); }
```

## 一个练习
写 10 个线程各对同一个 `count` 加 1000 次，不加锁结果 < 10000，加锁后 = 10000。做完回主文章（模块十/十五专门讲）。

## 常见误解
- 单 JVM 锁（`synchronized`）跨不了多台机器；分布式要分布式锁（Redis/ZK）。
- `synchronized` 方法锁的是 `this`，静态方法锁的是类对象，别搞混作用范围。

↩ 回到学习笔记首页：../learn.html

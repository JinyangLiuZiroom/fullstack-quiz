# 模块八：MySQL 事务与锁（完整学习指南）

> **学习目标**：从 ACID 出发，理解隔离级别解决的三大并发问题（脏读/不可重复读/幻读），搞懂 InnoDB 的行锁、间隙锁、Next-Key Lock 如何防幻读，能定位「死锁」和「锁等待超时」。
> **适合谁**：知道 `@Transactional` 但不清楚数据库层到底锁了什么、为什么并发写入会卡住的同学。
> **学完能做什么**：选择合适的隔离级别、写出不超卖的更新 SQL、用 `SELECT ... FOR UPDATE` 做并发控制、读懂死锁日志。

---

## 1. 前置知识

- 模块四 Spring 事务（知道事务注解） 📖 [模块四：Spring事务管理](index.html#04-Spring事务管理.md)
- 模块七 索引（锁和索引强相关：行锁锁索引） 📖 [模块七：MySQL索引与SQL优化](index.html#07-MySQL索引与SQL优化.md)
- SQL 基础 📖 [前置：SQL 基础](../../prereq/index.html#sql-basics.md)

---

## 2. 核心概念

### 2.1 ACID

- **A**tomicity 原子性：要么全做要么全不做（靠 undo log + 回滚）。
- **C**onsistency 一致性：约束不被破坏（业务层保证）。
- **I**solation 隔离性：并发事务互不干扰（靠锁 + MVCC）。
- **D**urability 持久性：提交后不丢（靠 redo log）。

### 2.2 三大并发问题

| 问题 | 现象 | 例子 |
|---|---|---|
| 脏读 | 读到别的事务**未提交**的数据 | A 改了没提交，B 读到了，A 又回滚 |
| 不可重复读 | 同一事务内两次读**同一行**结果不同 | 中间被别的事务改了并提交了 |
| 幻读 | 同一事务内两次**范围查询**行数变了 | 中间被别的事务插入/删除了符合条件的行 |

### 2.3 隔离级别

| 级别 | 脏读 | 不可重复读 | 幻读 |
|---|---|---|---|
| READ UNCOMMITTED | ❌ | ❌ | ❌ |
| READ COMMITTED | ✅ | ❌ | ❌ |
| REPEATABLE READ（MySQL 默认） | ✅ | ✅ | ✅(靠 Next-Key Lock) |
| SERIALIZABLE | ✅ | ✅ | ✅ |

> MySQL InnoDB 在 **RR（默认）** 下用 **Next-Key Lock（行锁+间隙锁）** 解决了幻读；很多其他数据库 RR 仍有幻读。这是 MySQL 的特点。

### 2.4 锁的类型

- **行锁**：锁住某一行（通过索引）。`UPDATE t SET x=1 WHERE id=1` 锁 id=1 这行。
- **间隙锁（Gap Lock）**：锁住索引记录之间的「空隙」，防止插入。
- **Next-Key Lock** = 行锁 + 间隙锁，左开右闭区间。是 RR 防幻读的关键。
- **表锁**：没走索引的更新会**锁全表**（大坑！）。

```sql
-- 走主键索引，只锁 id=1 那行（行锁）
UPDATE t SET cnt=cnt-1 WHERE id=1 AND cnt>0;

-- name 没索引！会锁全表，并发直接崩
UPDATE t SET cnt=cnt-1 WHERE name='张三';
```

---

## 3. 快速开始：防超卖的标准写法

```sql
-- 先判断库存>0 再减，原子操作，靠行锁保证并发安全
UPDATE t_stock SET cnt = cnt - 1 WHERE item_id = 100 AND cnt > 0;
-- 返回影响行数 n：n=1 扣成功；n=0 库存不足（不会超卖）
```

配合 `SELECT` 验证：`cnt>0` 在 WHERE 里，多个事务并发时行锁串行化，只有一个能减成功。

---

## 4. 进阶用法

### 4.1 当前读与快照读（MVCC）

- **快照读**：普通 `SELECT` 读 MVCC 快照，不加锁，RR 下看到的是事务开始时的版本（可重复读）。
- **当前读**：`SELECT ... FOR UPDATE`、`UPDATE`、`DELETE` 读最新版并加锁。

```sql
BEGIN;
SELECT cnt FROM t_stock WHERE item_id=100 FOR UPDATE;  -- 当前读，加行锁
-- 业务判断后
UPDATE t_stock SET cnt=cnt-1 WHERE item_id=100;
COMMIT;
```

### 4.2 死锁

两个事务互相等待对方持有的锁：

```
T1: 锁 A → 想锁 B
T2: 锁 B → 想锁 A
```

InnoDB 会检测死锁，回滚其中一个（「牺牲品」），报 `Deadlock found`。**预防**：约定所有事务**按固定顺序**加锁、缩短事务、减小锁粒度。

---

## 5. 常见坑与排错表

| 现象 | 根因 | 解决 |
|---|---|---|
| 更新卡很久 / `Lock wait timeout` | 没走索引导致锁全表，或被别的事务长时间持有行锁 | 更新条件必须走索引；缩短事务 |
| 并发扣库存超卖 | 先 `SELECT` 查库存再 `UPDATE`，两步非原子，读到旧值 | 用 `UPDATE ... WHERE cnt>0` 原子判断，看影响行数 |
| 死锁报错 | 事务加锁顺序不一致 | 统一加锁顺序；缩短事务；捕获死锁重试 |
| RR 下还是「看到别的事务改的」 | 那是当前读（FOR UPDATE/UPDATE），本就读最新 | 理解快照读 vs 当前读 |
| 幻读没防住 | 用了 READ COMMITTED 或没走索引导致间隙锁失效 | 用默认 RR + 走索引的范围当前读 |
| 长事务拖垮并发 | 事务里做了远程调用/大循环 | 事务只包必要 DB 操作 |
| 大事务回滚慢 | undo log 量大 | 拆小事务 |
| `SELECT` 也加锁导致并发降 | 不该加 FOR UPDATE 的地方加了 | 只读场景用快照读，必要时才当前读 |

---

## 6. 完整实战：并发安全的库存扣减

```java
@Transactional(rollbackFor = Exception.class)
public boolean deduct(Long itemId) {
    int n = stockMapper.deduct(itemId);   // UPDATE t_stock SET cnt=cnt-1 WHERE item_id=? AND cnt>0
    if (n == 0) {
        throw new BizException("库存不足");  // 触发回滚（虽然没改，但统一异常）
    }
    orderMapper.insert(itemId);
    return true;
}
```

**验收**：JMeter 100 并发抢 10 个库存，最终库存 0、订单 10 条，无超卖、无死锁。`cnt>0` 保证原子性。

---

## 7. 最佳实践

- 更新/扣减类 SQL 把「判断条件」写进 WHERE（如 `cnt>0`），保证原子，绝不先查后改。
- 更新条件**必须走索引**，否则行锁退化为表锁，并发直接雪崩。
- 事务里别做远程调用、大循环，持锁时间越短越好。
- 多事务访问多资源时，**统一加锁顺序**避免死锁。
- 死锁是「正常会发生」的，代码要能捕获并安全重试，而不是假设它不发生。
- 默认 RR 已防幻读，别为了「防幻读」盲目升 SERIALIZABLE（性能差）。

---

## 8. 自测清单

- [ ] 能说出 ACID 各字母含义
- [ ] 知道脏读/不可重复读/幻读的区别
- [ ] 知道 MySQL 默认 RR 靠 Next-Key Lock 防幻读
- [ ] 知道为什么更新必须走索引（否则表锁）
- [ ] 会用 `UPDATE ... WHERE cnt>0` 防超卖
- [ ] 知道死锁成因和预防（统一加锁顺序）

---

## 9. 延伸阅读

- [MySQL InnoDB 锁文档](https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html)
- [MySQL 事务隔离级别](https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html)
- 模块四 Spring 事务管理；模块九 Redis 缓存

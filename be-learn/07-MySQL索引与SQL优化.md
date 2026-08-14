# 模块七：MySQL 索引与 SQL 优化（完整学习指南）

> **学习目标**：从「为什么加了索引查询快 100 倍」到能手写高性能 SQL，搞懂覆盖索引、回表、最左前缀、索引下推，会看 `EXPLAIN` 找慢查询根因。
> **适合谁**：写过 `SELECT * FROM t WHERE name=?` 但不知道要不要加索引、加完为什么还慢的同学。
> **学完能做什么**：给一张大表设计合理索引、把慢查询从 2s 降到 20ms、读懂 `EXPLAIN` 的 `type`/`key_len`/`Using index`、避免索引失效的写法。

---

## 1. 前置知识

- SQL 基础（SELECT/WHERE/JOIN） 📖 [前置：SQL 基础](../../prereq/index.html#sql-basics.md)
- 知道 B+ 树是一种「有序、矮胖、适合范围查找」的索引结构（不用深究实现，记住「有序」即可） 📖 [前置：B+ 树与索引](../../prereq/index.html#index-btree.md)
- 模块六（会用 MP 写查询） 📖 [模块六：MyBatisPlus持久层](index.html#06-MyBatisPlus持久层.md)

---

## 2. 核心概念

**索引是什么**：一本字典的目录。没有目录，查字要翻整本（全表扫描 `ALL`）；有目录，直接定位页码（索引查找）。

**为什么快**：MySQL 索引默认是 **B+ 树**，叶子节点有序且链表相连，查找/范围/排序都 O(log n)。

### 关键机制

| 机制 | 解释 |
|---|---|
| **回表** | 用二级索引找到主键后，再拿主键去聚簇索引取整行数据。多了一次 IO。 |
| **覆盖索引** | 查询所需字段**全在索引里**，不用回表。最快。`EXPLAIN` 显示 `Using index`。 |
| **最左前缀** | 联合索引 `(a,b,c)` 只能从最左开始用：`a`、`a,b`、`a,b,c` 能命中；`b`、`b,c` 用不上。 |
| **索引下推（ICP）** | MySQL 5.6+，在存储引擎层就用索引里的条件过滤，减少回表。 |

```sql
-- 联合索引 idx_name_age (name, age)
WHERE name='张' AND age=18        -- 命中（最左前缀）
WHERE age=18                       -- 不命中（没 name，断了最左前缀）
WHERE name LIKE '张%' AND age=18  -- name 走范围，age 在 5.6+ 可下推
```

---

## 3. 快速开始：建索引 + 看 EXPLAIN

```sql
ALTER TABLE t_user ADD INDEX idx_name_age (name, age);

EXPLAIN
SELECT id, name, age FROM t_user
WHERE name = '张三' AND age = 18;
```

关注三列：
- `type`：`ALL`(全表) < `index` < `range` < `ref` < `const`。目标是 `ref`/`range` 以上。
- `key`：实际用了哪个索引（null=没用）。
- `Extra`：`Using index`(覆盖，好)；`Using where; Using index`(好)；`Using filesort`(排序没用上索引，慢)。

---

## 4. 进阶用法

### 4.1 覆盖索引实战

```sql
-- 只需 id,name,age，而 idx_name_age 正好覆盖 → 不用回表
SELECT id, name, age FROM t_user WHERE name='张';
-- 若 SELECT * 多查了其他列 → 要回表，慢
SELECT * FROM t_user WHERE name='张';
```

### 4.2 COUNT 的细节

```sql
SELECT COUNT(*) FROM t_user;        -- 取任意非 null 列计数，优化器选最小索引，最快
SELECT COUNT(name) FROM t_user;     -- 只数 name 非 null 的行（语义不同！）
SELECT COUNT(1) FROM t_user;        -- 与 COUNT(*) 基本等价
```

> 真题常考：`COUNT(*)` 统计所有行（含 null 列），`COUNT(列)` 只统计该列非 null。二者**语义不同**，不是谁更快的问题。

### 4.3 索引失效的写法

```sql
WHERE DATE(create_time) = '2026-08-14'   -- 函数包字段 → 失效（改成范围）
WHERE name LIKE '%张'                     -- 前模糊 → 失效（% 在左）
WHERE age + 1 = 19                        -- 表达式运算 → 失效
WHERE name = 123                          -- 类型隐式转换（name 是字符串）→ 失效
WHERE name = '张' OR age = 18             -- 含 OR 且 age 无索引 → 可能失效
```

### 4.4 key_len 估算

`EXPLAIN` 的 `key_len` = 索引使用的字节数，可判断联合索引用到几列。utf8mb4 一个字符 4 字节，`name varchar(50)` 约 `50*4+2=202` 字节；`age int`=4 字节。看 `key_len` 能验证是否用到 `age` 那部分。

---

## 5. 常见坑与排错表

| 现象 | 根因 | 解决 |
|---|---|---|
| 加了索引还是全表扫描 | 对索引字段用了函数/表达式/前模糊/类型转换 | 改写 SQL，让索引列「裸」出现在条件一侧 |
| 联合索引 `(a,b)` 查 `b` 很慢 | 违反最左前缀 | 调整索引顺序或单独给 `b` 建索引 |
| `SELECT *` 比预期慢 | 没覆盖，要回表 | 只查需要的列，争取覆盖索引 |
| `ORDER BY` 慢且有 filesort | 排序字段没进索引 | 索引带上排序列 `(a,b)` 同时 WHERE a、ORDER BY b |
| 索引越多写入越慢 | 每个索引都要随写更新 | 只建必要索引，删掉低区分度索引（如性别） |
| `COUNT(列)` 和 `COUNT(*)` 结果不同 | 语义不同（前者忽略 null） | 明确要哪种语义，别混用 |
| 范围查询 `>` 后面的列用不上索引 | B+ 树范围后失效 | 把等值条件放前面、范围放后面设计索引 |
| 深分页 `LIMIT 1000000,10` 慢 | 要扫 100 万行再丢弃 | 用游标/延迟关联：`WHERE id>上次最大id LIMIT 10` |

---

## 6. 完整实战：优化一个慢查询

表 `t_order(id, user_id, status, create_time)`，常查「某用户最近待支付订单」：

```sql
-- 慢：SELECT * 回表 + 没索引
SELECT * FROM t_order WHERE user_id=5 AND status=0 ORDER BY create_time DESC LIMIT 10;

-- 优化：建联合索引（等值 user_id、status 在前，范围/排序 create_time 在后）
ALTER TABLE t_order ADD INDEX idx_uid_status_ct (user_id, status, create_time);
-- 只查需要的列，争取覆盖或至少避免 filesort
SELECT id, status, create_time FROM t_order
WHERE user_id=5 AND status=0 ORDER BY create_time DESC LIMIT 10;
```

**验收**：`EXPLAIN` 显示 `key=idx_uid_status_ct`、`type=ref`、`Extra` 无 `Using filesort`，查询从全表扫描降到索引范围扫描。

---

## 7. 最佳实践

- 索引设计遵循「等值列在前、范围/排序列在后」（最左前缀 + 避免范围断链）。
- 尽量 `SELECT` 必要列，争取覆盖索引，减少回表。
- 索引列在条件中保持「裸」（不套函数、不做运算、不隐式转换）。
- 低区分度字段（性别、布尔）单独建索引收益低，适合放联合索引末尾。
- 慢查询先 `EXPLAIN`，看 `type`/`key`/`Extra` 三列再动手，别盲加索引。
- 大表加索引用 `ALGORITHM=INPLACE`（Online DDL）避免锁表过久。

---

## 8. 自测清单

- [ ] 能解释回表、覆盖索引、最左前缀、索引下推
- [ ] 会读 EXPLAIN 的 type/key/Extra
- [ ] 知道哪些写法会让索引失效
- [ ] 知道 COUNT(*) 和 COUNT(列) 语义区别
- [ ] 能给「等值+范围+排序」场景设计联合索引顺序
- [ ] 知道深分页慢及游标解法

---

## 9. 延伸阅读

- [MySQL EXPLAIN 官方文档](https://dev.mysql.com/doc/refman/8.0/en/explain-output.html)
- [MySQL 索引优化最佳实践](https://dev.mysql.com/doc/refman/8.0/en/optimization-indexes.html)
- 模块八 MySQL 事务与锁；模块九 Redis 缓存

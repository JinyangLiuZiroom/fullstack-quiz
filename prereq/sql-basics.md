# SQL 基础（前置知识补完）

> 一句话：和关系型数据库「对话」的语言，后端几乎天天写。

## 你应该会什么（检验）
- `SELECT / INSERT / UPDATE / WHERE / JOIN` 基本会写
- 知道事务 ACID 字面意思（原子性/一致性/隔离性/持久性）

## 30 秒上手
```sql
SELECT id, name FROM user WHERE age > 18 ORDER BY id;
INSERT INTO user(name, age) VALUES ('Li', 18);
UPDATE user SET age = 19 WHERE id = 1;
SELECT u.name, o.amount
FROM user u JOIN orders o ON u.id = o.user_id;
```
事务：一组操作要么全成要么全撤（`ROLLBACK`）。

## 一个练习
建两张表（用户/订单），写 JOIN 查出「每个用户的订单数」。做完回主文章（模块七专门讲索引优化）。

## 常见误解
- `DELETE` 不带 `WHERE` 会删全表（危险）；先 `SELECT` 确认再删。
- `NULL` 不参与 `=` 比较，要用 `IS NULL` / `IS NOT NULL`。

↩ 回到学习笔记首页：../learn.html

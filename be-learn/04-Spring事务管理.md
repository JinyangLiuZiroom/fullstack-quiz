# 模块四：Spring 事务管理（完整学习指南）

> **学习目标**：彻底搞懂 `@Transactional` 什么时候生效、什么时候「静默失效」，理解事务传播行为和隔离级别，能正确保证「扣库存 + 下单」要么都成要么都败。
> **适合谁**：写业务时加过 `@Transactional` 但不确定它到底管不管用，或遇到过「异常了数据却没回滚」的同学。
> **学完能做什么**：正确设计事务边界，避开自调用失效、异常被吞、捕获类型不对这三大经典坑，理解 REQUIRED/REQUIRES_NEW 区别。

---

## 1. 前置知识

- 模块二 IoC（知道 Bean 是被代理的）、模块三 MVC
- 知道数据库事务的 ACID 字面意思
- 知道「回滚」= 操作全部撤销

---

## 2. 核心概念：@Transactional 是怎么工作的

`@Transactional` 的本质是 **AOP 代理**：Spring 给你的 Service 类生成一个代理，在方法调用**前后**织入「开启事务 → 执行业务 → 成功提交 / 异常回滚」的逻辑。

```java
@Service
public class OrderService {
    @Transactional
    public void createOrder() {
        stockMapper.decrease();   // 扣库存
        orderMapper.insert();      // 下单
        // 若 insert 抛异常，decrease 也会回滚
    }
}
```

**回滚默认规则**：只有抛出**运行时异常（RuntimeException 及其子类）或 Error** 才回滚；**受检异常（Exception 直接子类如 IOException）不回滚**。可配置 `rollbackFor` 改变。

```java
@Transactional(rollbackFor = Exception.class)  // 任何异常都回滚
public void doX() throws Exception { ... }
```

### 传播行为（最容易考）

| 传播行为 | 含义 | 场景 |
|---|---|---|
| REQUIRED（默认） | 有事务就加入，没有就新建 | 绝大多数业务方法 |
| REQUIRES_NEW | 挂起当前事务，新建自己的事务 | 独立记日志/审计，主事务回滚不影响它 |
| NESTED | 嵌套事务，可部分回滚 | 少用，依赖数据库 savepoint |
| SUPPORTS / NOT_SUPPORTED / NEVER | 非事务相关，特殊场景 | 查询类一般不用管 |

---

## 3. 快速开始

```java
@Transactional
public void transfer(Long from, Long to, BigDecimal amount) {
    accountMapper.decrease(from, amount);
    accountMapper.increase(to, amount);
}
```

调用 `transfer` 时，Spring 自动开事务，两行任一行失败整体回滚。

---

## 4. 进阶用法

### 4.1 只读事务

```java
@Transactional(readOnly = true)  // 提示数据库可走从库/优化，但仍是事务
public List<Order> list() { ... }
```

### 4.2 指定隔离级别

```java
@Transactional(isolation = Isolation.REPEATABLE_READ)
public void process() { ... }
```

### 4.3 超时

```java
@Transactional(timeout = 3)  // 超过 3 秒回滚
```

---

## 5. 常见坑与排错表（重点，90% 新手踩过）

| 现象 | 根因 | 解决 |
|---|---|---|
| 抛异常了数据**没回滚** | 抛的是受检异常（非 RuntimeException），默认不回滚 | 加 `rollbackFor = Exception.class` |
| 方法内 `try-catch` 吞了异常，没回滚 | 异常没抛到代理层，代理以为成功了 | 要么不 catch，要么 catch 后 `throw` 出去，或手动 `TransactionAspectSupport.currentTransactionStatus().setRollbackOnly()` |
| **同类方法自调用 @Transactional 失效** | `this.x()` 绕过了代理，事务切面没织入 | 拆到另一个 Service 调用；或用注入自身的代理（`@Autowired self`）调用；或开启 AspectJ 代理 |
| `@Transactional` 加在 private/protected 方法 | 代理无法拦截非 public 方法 | 加在 public 方法上 |
| 事务方法里调第三方 HTTP/发消息，回滚了但消息已发 | 事务只管 DB，管不了外部副作用 | 用事务消息/本地消息表，或先 DB 后发，失败补偿 |
| 多线程里事务不共享 | 事务绑定在数据库连接（ThreadLocal），新线程拿不到 | 异步方法单独加事务 |
| 查询也加写事务导致锁表慢 | 没设 readOnly，数据库按写事务处理 | 查询加 `readOnly=true` |
| 捕获了异常又 return 正常 | 代理层收不到异常，提交成功 | 必须让异常传播出去 |

> **最经典的两个坑**：① 同类自调用（A 方法调 this.B()，B 的事务不生效）；② catch 后没抛出（以为回滚了其实提交了）。面试和真题都常考。

---

## 6. 完整实战：扣库存 + 下单原子化

```java
@Service
public class SeckillService {
    @Transactional(rollbackFor = Exception.class)
    public void seckill(Long itemId, Long userId) {
        int n = stockMapper.decrease(itemId);  // UPDATE stock SET cnt=cnt-1 WHERE id=? AND cnt>0
        if (n == 0) throw new BizException("库存不足");
        orderMapper.insert(itemId, userId);
        // 两步走完才提交；任一步异常整体回滚
    }
}
```

**验收**：并发下用 `cnt>0` 条件保证不超卖；中途抛 `BizException` 时库存不减少。这就是事务保证一致性的价值。

---

## 7. 最佳实践

- 事务注解加在 **Service 层的 public 方法**上，不要加在 Controller 或 private 方法。
- 默认只回滚 RuntimeException；涉及受检异常务必 `rollbackFor = Exception.class`。
- 不要在事务方法里 `try-catch` 后静默吞异常，否则回滚失效。
- 跨 Service 调用的事务用 REQUIRED 自然合并；需要「独立提交不受主事务影响」才用 REQUIRES_NEW。
- 事务尽量小（短）：只包必要的 DB 操作，别把远程调用、大循环塞进事务里，否则锁时间长、连接占用久。

---

## 8. 自测清单

- [ ] 能说出 @Transactional 是 AOP 代理实现的
- [ ] 知道默认只对 RuntimeException 回滚
- [ ] 知道自调用事务失效的原因和解法
- [ ] 知道 catch 吞异常会导致不回滚
- [ ] 分得清 REQUIRED 和 REQUIRES_NEW
- [ ] 知道事务只管 DB，管不了外部 HTTP/消息

---

## 9. 延伸阅读

- [Spring 事务管理文档](https://docs.spring.io/spring-framework/docs/current/reference/html/data-access.html#transaction)
- 模块八 MySQL 事务与锁（从数据库层面理解隔离级别）
- 模块九 Redis 缓存（缓存与事务的一致性）

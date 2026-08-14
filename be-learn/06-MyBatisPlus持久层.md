# 模块六：MyBatis-Plus 持久层（完整学习指南）

> **学习目标**：掌握 MyBatis-Plus（MP）的「增删改查 + 条件构造器 + 分页 + 代码生成」，能不写 XML 完成 80% 的数据库操作，并避开字段填充、逻辑删除、类型安全这些高频坑。
> **适合谁**：用过 MyBatis 写 mapper.xml 觉得烦，或刚接触 MP 不知道 `LambdaQueryWrapper` 怎么用的同学。
> **学完能做什么**：用 MP 写一个用户表的完整 CRUD、复杂条件查询、分页接口，理解为什么 `updateById` 默认忽略 null。

---

## 1. 前置知识

- 模块三（会写 Controller/Service） 📖 [模块三：SpringMVC与RESTful接口](index.html#03-SpringMVC与RESTful接口.md)
- SQL 基础（SELECT/INSERT/UPDATE/WHERE） 📖 [前置：SQL 基础](../../prereq/index.html#sql-basics.md)
- 知道 JDBC 是 Java 连数据库的底层 API 📖 [前置：SQL 基础](../../prereq/index.html#sql-basics.md)

---

## 2. 核心概念：MP 比 MyBatis 多了什么

MyBatis 要手写 mapper.xml 写 SQL。MP 在 MyBatis 之上封装了：
- `BaseMapper<T>`：通用 CRUD 接口，继承即用，不用写 SQL。
- `Wrapper`：条件构造器（`QueryWrapper`/`UpdateWrapper`/`LambdaQueryWrapper`），用 Java 代码拼 WHERE。
- 分页插件、逻辑删除、自动填充、代码生成器。

```java
@Data
@TableName("t_user")          // 表名（类名≠表名时指定）
public class User {
    @TableId(type = IdType.AUTO)   // 自增主键
    private Long id;
    private String name;
    private Integer age;
    @TableLogic                // 逻辑删除字段（删=置 0/1，不真删）
    private Integer deleted;
}
```

Mapper 只要继承 `BaseMapper`：

```java
public interface UserMapper extends BaseMapper<User> { }
// 立刻拥有 insert/deleteById/updateById/selectById/selectList...
```

---

## 3. 快速开始：第一个查询

```java
// 查询年龄 >= 18 且名字含 "张" 的用户
List<User> list = userMapper.selectList(
    new LambdaQueryWrapper<User>()
        .ge(User::getAge, 18)
        .like(User::getName, "张")
);
```

等价的 SQL：`SELECT * FROM t_user WHERE age >= 18 AND name LIKE '%张%' AND deleted = 0`

> `LambdaQueryWrapper` 用 `User::getName` 方法引用，**编译期检查字段名**，拼错字段直接编译报错；`QueryWrapper` 用字符串 `"name"`，拼错只能运行时发现。优先用 Lambda 版。

---

## 4. 进阶用法

### 4.1 更新：LambdaUpdateWrapper

```java
// 把 id=1 的用户年龄设为 20，且名字置空（注意：set 显式设 null 是允许的）
userMapper.update(null, new LambdaUpdateWrapper<User>()
    .eq(User::getId, 1)
    .set(User::getAge, 20)
    .set(User::getName, null)   // 主动把某字段更新为 NULL
);
```

> **重要**：`updateById(entity)` 默认**忽略 null 字段**（MP 的 `FieldStrategy` 默认 NOT_NULL）。如果你想把某个字段「更新成 null」，必须用 `LambdaUpdateWrapper.set(字段, null)`，光 `entity.setName(null)` 再 `updateById` 是不会生效的。这是真题常考点。

### 4.2 分页插件

```java
@Configuration
public class MybatisPlusConfig {
    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor i = new MybatisPlusInterceptor();
        i.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
        return i;
    }
}

// 使用
Page<User> page = userMapper.selectPage(
    new Page<>(1, 10),                       // 第 1 页，每页 10 条
    new LambdaQueryWrapper<User>().gt(User::getAge, 18)
);
page.getRecords();   // 当前页数据
page.getTotal();     // 总数
```

### 4.3 自动填充

```java
@TableField(fill = FieldFill.INSERT)
private LocalDateTime createTime;

@Component
public class MetaHandler implements MetaObjectHandler {
    public void insertFill(MetaObject m) { strictInsertFill(m, "createTime", LocalDateTime::now, LocalDateTime.class); }
    public void updateFill(MetaObject m) { strictUpdateFill(m, "updateTime", LocalDateTime::now, LocalDateTime.class); }
}
```

### 4.4 多表关联

MP 不擅长 join，复杂关联建议：`@Select` 注解写原生 SQL 或 mapper.xml：

```java
@Select("SELECT u.*, d.dept_name FROM t_user u LEFT JOIN t_dept d ON u.dept_id=d.id WHERE u.id=#{id}")
UserDeptVO getUserWithDept(@Param("id") Long id);
```

---

## 5. 常见坑与排错表

| 现象 | 根因 | 解决 |
|---|---|---|
| `updateById` 后某字段没变 | 该字段传了 null，MP 默认忽略 null | 用 `LambdaUpdateWrapper.set(字段, null)` 显式更新为 null |
| 逻辑删除后还能查到已删数据 | 没加 `@TableLogic`，或全局未配逻辑删除 | 实体加 `@TableLogic`，或全局 `logic-delete-field` 配置 |
| 字段名和列名对不上（查出来 null） | 没开驼峰→下划线映射，或没 `@TableField` | 开 `map-underscore-to-camel-case: true`，或用 `@TableField("col_name")` |
| 分页 total 为 0 / 不分页 | 没加 `PaginationInnerInterceptor` 分页插件 | 配置类注册拦截器 |
| Wrapper 字段名写错运行才报错 | 用了字符串版 `QueryWrapper` | 改用 `LambdaQueryWrapper` 编译期检查 |
| 批量插入慢 | 默认 `saveBatch` 实际逐条 | 配 `rewriteBatchedStatements=true`（MySQL 连接串）才能真正批处理 |
| 自增主键回填为 null | 主键没标 `@TableId(type=IdType.AUTO)` | 标好自增策略 |
| 逻辑删除字段被当普通条件误用 | 忘了 MP 会自动追加 `deleted=0` | 复杂 SQL 用 `@Select` 时自己注意逻辑删除语义 |

---

## 6. 完整实战：用户分页 + 条件筛选接口

```java
@GetMapping("/users")
public Result<IPage<User>> list(@RequestParam int page, @RequestParam int size,
                                @RequestParam(required = false) String name) {
    LambdaQueryWrapper<User> w = new LambdaQueryWrapper<>();
    if (name != null) w.like(User::getName, name);
    w.ge(User::getAge, 18).orderByDesc(User::getId);
    return Result.ok(userMapper.selectPage(new Page<>(page, size), w));
}
```

**验收**：返回带 `records` 和 `total` 的分页对象；传 `name` 能筛选；不传也能分页。MP 全程零 XML。

---

## 7. 最佳实践

- 优先 `LambdaQueryWrapper`（类型安全），少用字符串 `QueryWrapper`。
- 想更新字段为 null，用 `LambdaUpdateWrapper.set`，别依赖 `updateById` + null。
- 复杂 join 不要硬套 Wrapper，用 `@Select` 原生 SQL 更清晰。
- 分页一定要注册 `PaginationInnerInterceptor`，否则 `selectPage` 退化为不分页全查。
- 表字段映射用驼峰自动转换 + 必要时 `@TableField`，减少手写列名出错。

---

## 8. 自测清单

- [ ] 能说出 BaseMapper 提供了哪些通用方法
- [ ] 知道 LambdaQueryWrapper 比 QueryWrapper 好在哪
- [ ] 知道 updateById 默认忽略 null 及正确解法
- [ ] 会配分页插件并用 selectPage
- [ ] 知道逻辑删除 @TableLogic 的作用
- [ ] 会用 @TableField 处理字段名映射

---

## 9. 延伸阅读

- [MyBatis-Plus 官方文档](https://baomidou.com/)
- 模块七 MySQL 索引与 SQL 优化（Wrapper 生成的 SQL 怎么才快）
- 模块八 MySQL 事务与锁

# 模块七：JUnit5 单元测试（完整学习指南）

> **学习目标**：掌握 Java 后端单元测试标准框架 JUnit5——`@Test`/`assertThrows`/生命周期注解/`@MockBean` 隔离依赖，能为一个 Service/工具类写纯、快、稳的单测，达成有效覆盖。
> **适合谁**：没写过 Java 单测，或以为「单测就是起整个 Spring 跑一遍」导致又慢又脆的同学。
> **学完能做什么**：用 JUnit5 + Mockito 给一个业务方法写单测，覆盖正常/异常/边界，用 `assertThrows` 验证异常，mock 掉数据库。

---

## 1. 前置知识

- Java 基础、模块二 IoC（Bean 注入）
- 知道「单测测最小单元」（模块一 金字塔）
- 会用 Maven/Gradle

---

## 2. 核心概念：JUnit5 是什么

JUnit5 = Jupiter（新编程模型）+ 平台（运行）。一个测试方法 = 一个 `@Test`，独立运行、互不影响。

### 关键注解

| 注解 | 作用 |
|---|---|
| `@Test` | 测试方法 |
| `@BeforeEach` | 每个测试前执行（准备） |
| `@AfterEach` | 每个测试后执行（清理） |
| `@BeforeAll` / `@AfterAll` | 类级，只一次（静态方法） |
| `@DisplayName` | 测试中文名 |
| `@Disabled` | 临时跳过 |

### 断言

```java
assertEquals(预期, 实际);
assertTrue(条件);
assertThrows(BizException.class, () -> service.buy(-1));
assertAll("分组断言", () -> ..., () -> ...);
```

### Mock：隔离外部依赖

单测要纯（模块一）。查数据库、调 HTTP 不能真连，用 **Mockito** 造一个「假依赖」：

```java
@Mock   private UserMapper mapper;     // 假 mapper
@InjectMocks private UserService service;  // 把假 mapper 注入 service
```

---

## 3. 快速开始：测一个 Service

```java
class UserServiceTest {
    @Mock  private UserMapper mapper;
    @InjectMocks private UserService service;

    @BeforeEach void init() { MockitoAnnotations.openMocks(this); }

    @Test
    @DisplayName("正常创建用户返回新 id")
    void create_ok() {
        User u = new User(); u.setName("张三");
        when(mapper.insert(any(User.class))).thenAnswer(inv -> {
            User arg = inv.getArgument(0); arg.setId(1L); return 1;
        });
        Long id = service.create(u);
        assertEquals(1L, id);
    }

    @Test
    @DisplayName("名称为空抛业务异常")
    void create_emptyName() {
        User u = new User(); u.setName("");
        assertThrows(BizException.class, () -> service.create(u));
    }
}
```

> `when(...).thenReturn(...)` 定义「mapper 被这么调用时返回啥」。这样不连真库，测试毫秒级、稳定。

---

## 4. 进阶用法

### 4.1 测异常 + 消息

```java
BizException ex = assertThrows(BizException.class, () -> service.buy(0));
assertEquals("数量必须为正", ex.getMessage());
```

### 4.2 Spring Boot 集成单测

需要 Spring 容器（测真实装配）用 `@SpringBootTest`；只测 Web 层用 `@WebMvcTest`；只测某层用 `@DataJpaTest`。但**纯逻辑单测不启动容器更快**。

```java
@SpringBootTest
class OrderApiTest {
    @Autowired OrderService service;
    // 真连库（或 @AutoConfigureTestDatabase 用内存库）
}
```

### 4.3 参数化测试

```java
@ParameterizedTest
@ValueSource(ints = {17, 18, 120, 121})
void age_boundary(int age) { ... }   // 一次写多组输入
```

### 4.4 覆盖率

`mvn test` 后 JaCoCo 生成覆盖率报告（行/分支覆盖）。门禁看模块六。

---

## 5. 常见坑与排错表

| 现象 | 根因 | 解决 |
|---|---|---|
| 单测慢、依赖真库 | 没 mock，起容器 | 用 Mockito 隔离 DB/HTTP |
| `when` 没生效返回 null | 形参匹配不对（equals 不符） | 用 `any()` / `eq()` 精确匹配 |
| 测试互相影响 | 共享可变静态/字段 | 每测试独立，@BeforeEach 重置 |
| 只测 happy path | 覆盖不全 | 补异常/边界/等价类 |
| assertThrows 总过 | 抛的是别的异常或被吞 | 确认异常类型 + 没被 catch 吞 |
| 覆盖率虚高 | 只调了方法没断言 | 加有效断言（值/异常/状态） |
| @BeforeAll 不是 static 报错 | 要求静态 | 加 static 或改用 @BeforeEach |
| 测了 private 方法 | 不该直接测私有 | 通过 public 方法间接测 |

---

## 6. 完整实战：覆盖一个计算器 Service

目标类 `CouponCalculator`：满减 + 折扣叠加计算。

```java
@Test @DisplayName("满100减20且9折：120元实付88")
void calc() {
    BigDecimal r = calc.apply(120, List.of("MAN100-20", "ZHE0.9"));
    assertEquals(new BigDecimal("88.00"), r);
}
@Test @DisplayName("金额不达标满减不生效")
void calc_no_threshold() {
    assertEquals(new BigDecimal("90.00"), calc.apply(90, List.of("MAN100-20","ZHE0.9")));
}
@Test @DisplayName("空券列表原样返回")
void calc_empty() { assertEquals(new BigDecimal("50.00"), calc.apply(50, List.of())); }
```

**验收**：3 条用例全过，覆盖达标/不达标/空，纯计算不连库，毫秒级。

---

## 7. 最佳实践

- 单测要**纯**：mock 掉 DB/HTTP/时间，快且稳定才能高频跑。
- 一个测试方法只验一个点，命名用 `@DisplayName` 说清场景。
- 覆盖正常 + 异常（`assertThrows`）+ 边界（等价类/边界值）。
- 断言要有意义（值/异常/状态），别只「调一下不报错」凑覆盖。
- 测试相互独立，共享状态会在并发/顺序变化时偶红。
- 集成单测（`@SpringBootTest`）仅测真实装配，别滥用（慢）。

---

## 8. 自测清单

- [ ] 会用 @Test/@BeforeEach/生命周期注解
- [ ] 会用 assertEquals/assertThrows
- [ ] 会用 Mockito @Mock/@InjectMocks 隔离依赖
- [ ] 知道单测要纯（不连真库）
- [ ] 会写参数化测试覆盖边界
- [ ] 知道覆盖率要有有效断言而非凑数

---

## 9. 延伸阅读

- [JUnit5 用户指南](https://junit.org/junit5/docs/current/user-guide/)
- [Mockito 文档](https://site.mockito.org/)
- 模块一 测试金字塔；模块六 质量门禁（覆盖率）

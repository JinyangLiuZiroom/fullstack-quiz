# 模块二：Spring IoC 与 DI（完整学习指南）

> **学习目标**：彻底搞懂「控制反转（IoC）」和「依赖注入（DI）」——这是 Spring 一切的上帝视角。能说清 Bean 的生命周期、作用域、循环依赖怎么发生的，以及 @Autowired 按什么规则找 Bean。
> **适合谁**：会用 `@RestController`/`@Service` 但不知道容器怎么把对象拼起来的同学。
> **学完能做什么**：合理设计 Bean 的注入方式，避免循环依赖，看懂 `NoUniqueBeanDefinitionException`，知道单例 Bean 里写成员变量为什么危险。

---

## 1. 前置知识

- 模块一 Spring Boot 基础（知道 `@SpringBootApplication` 启动了容器）
- Java 注解、接口、构造方法
- 什么是「耦合」：A 类直接 `new B()`，A 就硬依赖 B，难替换难测试

---

## 2. 核心概念：IoC 与 DI 到底在干嘛

**没有 Spring 时**：`UserService us = new UserService();` —— 你（程序员）控制对象的创建和组装。

**有 Spring 时**：你只声明「我需要什么类型的对象」，容器在启动时把所有对象建好、按依赖关系拼好，交给你的类用。创建权「反转」给了容器，这叫 **IoC（Inversion of Control）**。

容器里被管理的对象叫 **Bean**。容器帮你把 A 依赖的 B「塞」进去，这叫 **DI（Dependency Injection）**。

```java
// 你只写「我需要 UserRepository」
@Service
public class UserService {
    private final UserRepository repo;
    // 构造注入：容器把 UserRepository 的 Bean 传进来
    public UserService(UserRepository repo) {
        this.repo = repo;
    }
    public User find(Long id) { return repo.findById(id); }
}
```

你从没 `new UserRepository()`，但它就在那了。这就是 DI。

### 三种注入方式

| 方式 | 写法 | 评价 |
|---|---|---|
| 构造注入 | `public X(SomeDep d){ this.d = d; }` + 无 `@Autowired` 也行（单构造时可省） | **官方推荐**，依赖不可变、必填、易测试 |
| 字段注入 | `@Autowired private SomeDep d;` | 写法短但隐藏依赖、难单测（无法在 `new` 时传入） |
| Setter 注入 | `@Autowired public void setD(SomeDep d){...}` | 可选依赖可用，但不如构造注入直观 |

> **结论**：新代码一律用**构造注入**。字段注入看着省事，实际是反模式。

---

## 3. 快速开始：声明第一个 Bean

```java
@Component        // 通用组件
public class OrderNoGenerator { }

@Repository        // 持久层（语义化 @Component）
public class UserRepository { }

@Service           // 业务层
public class UserService {
    private final UserRepository repo;
    public UserService(UserRepository repo) { this.repo = repo; }
}

@Configuration     // 配置类里用 @Bean 声明第三方对象的 Bean
public class ThirdPartyConfig {
    @Bean
    public OkHttpClient okHttpClient() { return new OkHttpClient(); }
}
```

容器启动时扫描这些注解，建立「类型 → 实例」的映射。

---

## 4. 进阶用法

### 4.1 按类型还是按名字注入

`@Autowired` 默认**按类型**找。当同类型有多个 Bean 时，用 `@Qualifier("名字")` 指定：

```java
@Bean("fast") public MailSender fastSender(){...}
@Bean("slow") public MailSender slowSender(){...}

@Autowired @Qualifier("fast") private MailSender sender;
```

### 4.2 作用域（Scope）

```java
@Scope("prototype")   // 每次取都新建
@Component
public class TempToken { }
```

| Scope | 含义 | 注意 |
|---|---|---|
| singleton（默认） | 全容器一个实例 | 不要在有状态的成员变量上放请求相关数据 |
| prototype | 每次 `getBean`/注入都新建 | 单例 Bean 注入 prototype Bean 时，prototype 只创建一次（因为注入发生在单例初始化时） |
| request / session | Web 每个请求/会话一个 | 仅 Web 环境 |

### 4.3 Bean 生命周期回调

```java
@Component
public class LifecycleBean {
    @PostConstruct
    public void init() { System.out.println("初始化：建连接/预热缓存"); }
    @PreDestroy
    public void destroy() { System.out.println("销毁：释放资源"); }
}
```

### 4.4 循环依赖

```java
@Service
public class A { private final B b; public A(B b){ this.b=b; } }   // A 要 B
@Service
public class B { private final A a; public B(A a){ this.a=a; } }   // B 要 A
```

**构造注入的循环依赖直接启动失败**（`BeanCurrentlyInCreationException`）——这是好事，逼你重构。Spring 能处理**字段/setter 注入的单例循环依赖**（用三级缓存提前曝光半成品对象），但这是「历史包袱」，**不要依赖它**，重构掉循环才是正解。

---

## 5. 常见坑与排错表

| 现象 | 根因 | 解决 |
|---|---|---|
| `NoSuchBeanDefinitionException` | 类没加 `@Component` 系列注解，或不在扫描范围 | 确认注解 + 包位置；`@Bean` 方法所在类要有 `@Configuration` |
| `NoUniqueBeanDefinitionException` | 同类型多个 Bean，没指定用哪个 | 加 `@Qualifier` 或 `@Primary` |
| 单例 Bean 里 `@Autowired` 的 dao 被多请求共享串数据 | 在单例里放了请求级可变状态 | 请求数据放方法参数/局部变量，别放 Bean 字段 |
| 循环依赖启动报错 | 构造注入互相依赖 | 拆依赖（抽出公共逻辑到第三个类）、改用 setter 临时解（不推荐）、根本上是设计问题 |
| `@PostConstruct` 不执行 | 该类不是 Bean（自己 new 的） | 交给容器管理 |
| `Optional` 注入为空时报错 | 期望可为空却用 `@Autowired(required=true)` | 用构造注入 `Optional<UserRepo> repo` 或 `@Autowired(required=false)`（已过时，推荐构造 + Optional） |
| prototype 被「当单例用」 | 单例里注入 prototype | 用 `ObjectProvider` 或方法内 `applicationContext.getBean()` 获取 |
| 测试时 `@Autowired` 为 null | 测试类没加 `@SpringBootTest` 或扫不到包 | 测试类加 `@SpringBootTest(classes=App.class)` |

---

## 6. 完整实战：用构造注入搭分层

```java
@Repository
public class UserRepository {
    public String load(Long id) { return "user-" + id; }
}

@Service
public class UserService {
    private final UserRepository repo;
    public UserService(UserRepository repo) { this.repo = repo; }   // 构造注入
    public String getName(Long id) { return repo.load(id); }
}

@RestController
@RequestMapping("/api")
public class UserController {
    private final UserService service;
    public UserController(UserService service) { this.service = service; }  // 层层构造注入
    @GetMapping("/user/{id}")
    public String get(@PathVariable Long id) { return service.getName(id); }
}
```

**验收**：`GET /api/user/5` 返回 `user-5`，且三层全靠构造注入串起来，无字段注入。

---

## 7. 最佳实践

- 一律**构造注入**，字段注入是反模式。
- 单例 Bean 保持无状态；需要请求级数据就当方法参数传。
- 出现循环依赖是设计坏味道，优先重构（提取共享逻辑），不要靠 Spring 的三级缓存兜底。
- 同类型多实现用接口 + `@Qualifier`/`@Primary` 区分，别堆 `@Autowired`。
- 第三方库对象（连接池、客户端）用 `@Configuration` + `@Bean` 集中声明，便于统一配置。

---

## 8. 自测清单

- [ ] 能口述 IoC 和 DI 的区别与联系
- [ ] 能说出三种注入方式并解释为什么构造注入最好
- [ ] 知道 singleton 默认作用域的隐患（有状态字段）
- [ ] 遇到多实现 Bean 知道用 `@Qualifier`/`@Primary`
- [ ] 知道循环依赖为什么会报错、怎么解
- [ ] 知道 `@PostConstruct`/`@PreDestroy` 的时机

---

## 9. 延伸阅读

- [Spring Core 官方文档 - IoC Container](https://docs.spring.io/spring-framework/docs/current/reference/html/core.html)
- 下一篇：模块三 Spring MVC 与 RESTful 接口
- 模块四：Spring 事务管理

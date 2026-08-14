# 模块一：Spring Boot 基础与自动配置（完整学习指南）

> **学习目标**：理解 Spring Boot「约定优于配置」的思想，搞懂自动配置（Auto-configuration）到底怎么生效，能独立从零搭一个可运行的 Spring Boot 工程，并会读启动日志定位「某个 Bean 为什么没注入」。
> **适合谁**：会 Java 基础（类、接口、注解、maven/gradle），没正经写过 Web 后端，或写过但说不清 `@SpringBootApplication` 背后发生了什么的同学。
> **学完能做什么**：用 Spring Initializr 起项目、写第一个接口、配置 `application.yml`、自定义 Banner/端口/Profile，且能解释「为什么加个依赖就能直接用 RedisTemplate」。

---

## 1. 前置知识（先确认你会这些）

- Java 8+ 语法（Lambda、注解、`Optional`） 📖 [前置：Java 8+ 基础](../prereq/index.html#java-basics.md)
- Maven 或 Gradle 基本命令（`mvn clean package` / `./gradlew build`） 📖 [前置：Maven / Gradle](../prereq/index.html#maven-gradle.md)
- HTTP 基础（URL、GET/POST、状态码） 📖 [前置：HTTP 基础](../prereq/index.html#http-basics.md)
- 知道「依赖注入」字面意思（不会写也行，下面讲） 📖 [前置：依赖注入 DI](../prereq/index.html#di-ioc.md)

如果 Maven 还不熟，先记住：依赖写在 `pom.xml` 的 `<dependencies>` 里，构建时自动下载到本地仓库。

---

## 2. 核心概念：Spring Boot 解决了什么

传统 Spring 项目要自己写一大堆 XML 或 `@Configuration`，配数据源、配事务、配视图解析器…… 一个新项目 80% 的配置是重复的。Spring Boot 的做法：

1. **起步依赖（Starter）**：一个 `spring-boot-starter-web` 把你常用的 Web 相关依赖（Tomcat、Jackson、Spring MVC）一次性带进来，版本由 Boot 统一管，不用你操心冲突。
2. **自动配置（AutoConfiguration）**：类路径上「有 A 没配 B」时，Boot 自动帮你把 B 配好。例如检测到了 `RedisTemplate` 相关类但没自定义连接工厂，就按默认配置给你建一个。
3. **内嵌容器**：不用单独装 Tomcat，打成 jar 直接 `java -jar` 跑。

### 自动配置一句话原理

`@SpringBootApplication` = `@SpringBootConfiguration` + `@EnableAutoConfiguration` + `@ComponentScan`。其中 `@EnableAutoConfiguration` 会去读所有 jar 里的 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` 文件，按条件（`@ConditionalOnClass`、`@ConditionalOnMissingBean` 等）决定是否装配某个配置类。

```java
@SpringBootApplication   // 等价于下面三个
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args); // 启动 IOC 容器
    }
}
```

> 关键点：**自动配置是「有就配、没有就不配、你配了就以你的为准」**。`@ConditionalOnMissingBean` 保证：只要你自己写了一个同类型的 Bean，Boot 的默认 Bean 就不会生效，不会冲突。

---

## 3. 快速开始：第一个接口

用 [start.spring.io](https://start.spring.io) 选 `Maven + Java + 2.7.x/3.x`，依赖勾 `Spring Web`，下载解压。核心文件：

```java
// DemoApplication.java（自动生成，不用改）
@SpringBootApplication
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}

// HelloController.java（你写的）
@RestController
@RequestMapping("/api")
public class HelloController {
    @GetMapping("/hello")
    public String hello(@RequestParam(defaultValue = "world") String name) {
        return "hello, " + name;
    }
}
```

`application.yml`：

```yaml
server:
  port: 8080
spring:
  application:
    name: demo-backend
```

启动后访问 `http://localhost:8080/api/hello?name=ziroom` → 返回 `hello, ziroom`。**这就是一个能跑的后端服务**。

---

## 4. 进阶用法

### 4.1 配置文件：application.yml vs application.properties

两者等价，yml 层级更清晰，团队里更常用。注意 yml 用**空格缩进**，不能用 Tab：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/test
    username: root
    password: root
my:
  switch: true
  list:
    - a
    - b
```

### 4.2 多环境：Profile

```yaml
# application.yml 里指定激活哪个
spring:
  profiles:
    active: dev
---
# 这部分只在 dev 生效
spring:
  config:
    activate:
      on-profile: dev
server:
  port: 8080
---
spring:
  config:
    activate:
      on-profile: prod
server:
  port: 80
```

启动参数指定：`java -jar demo.jar --spring.profiles.active=prod`。

### 4.3 读取配置：@Value 与 @ConfigurationProperties

```java
// 方式一：@Value，适合零散值
@Value("${my.switch:false}")   // 冒号后是默认值，配错不会直接崩
private boolean sw;

// 方式二：@ConfigurationProperties，适合一组配置（推荐）
@Configuration
@ConfigurationProperties(prefix = "my")
@Data
public class MyProps {
    private boolean sw;
    private List<String> list;
}
```

### 4.4 自定义 Bean

```java
@Configuration
public class AppConfig {
    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper().findAndRegisterModules();
    }
}
```

---

## 5. 常见坑与排错表

| 现象 | 根因 | 正确写法 / 解决 |
|---|---|---|
| 启动报 `Consider defining a bean of type 'XxxService'` | 该类没加 `@Service`/`@Component`，或不在 `@ComponentScan` 扫描包下（默认扫启动类同包及子包） | 启动类放在最外层包（如 `com.ziroom.demo`），业务类放在其子包；不要放到 `com.ziroom.util` 这种兄弟包 |
| 配置了 `server.port` 不生效 | yml 缩进错了，属性没绑上；或有多个配置文件互相覆盖 | 用空格缩进，确认层级；`active` 的 profile 文件优先级高 |
| `@Value` 注入为 null | 在 `new` 出来的对象里用（没交给容器），或 static 字段 | 字段不能是 static；类必须是 Bean（加 `@Component` 等） |
| 改了 yml 不生效 | 改的是 `application-prod.yml` 但激活的是 dev | 确认 `--spring.profiles.active` 与文件后缀一致 |
| 端口被占用 `Port 8080 was already in use` | 上次进程没退 | `lsof -i:8080` 查杀，或换端口 |
| 自动配置「莫名不生效」 | 你写了同名 Bean 覆盖了默认（这是预期行为） | 用 `@ConditionalOnMissingBean` 思路理解；调试看 `ConditionEvaluationReport` |
| 中文返回乱码 | 没设响应编码 | Spring Boot 默认 UTF-8，乱码多因自己 `new String(bytes)` 没指定编码；统一用 UTF-8 |
| jar 跑不起来 `no main manifest attribute` | 没用 `spring-boot-maven-plugin` 打包 | pom 加 `spring-boot-maven-plugin` 并 `repackage` |

---

## 6. 完整实战：搭一个「用户查询」最小服务

**目标**：`GET /api/users/{id}` 返回用户信息（先写死在内存，后续接数据库）。

1. 用 start.spring.io 建项目，勾 `Spring Web`。
2. 写实体：`@Data public class User { private Long id; private String name; }`
3. 写 Controller：

```java
@RestController
@RequestMapping("/api/users")
public class UserController {
    private final Map<Long, User> db = new ConcurrentHashMap<>();
    public UserController() {
        db.put(1L, new User(1L, "张三"));
        db.put(2L, new User(2L, "李四"));
    }
    @GetMapping("/{id}")
    public User get(@PathVariable Long id) {
        return db.getOrDefault(id, new User(0L, "未找到"));
    }
}
```

4. `mvn spring-boot:run` 启动，浏览器访问 `http://localhost:8080/api/users/1`。

**验收**：返回 `{"id":1,"name":"张三"}`；访问 `/api/users/99` 返回未找到。**这条链跑通，说明你已经掌握 Spring Boot 最小闭环**。

---

## 7. 最佳实践

- 启动类放最外层包，保证 `@ComponentScan` 能扫到所有业务类。
- 一组相关配置用 `@ConfigurationProperties` 而不是一堆 `@Value`，类型安全、好维护。
- 环境相关配置放 `application-{profile}.yml`，**敏感信息（密码、密钥）放环境变量或配置中心，别提交到代码仓库**。
- 永远用 `spring-boot-maven-plugin` 打包，保证 jar 可直接 `java -jar` 运行。
- 读不懂自动配置时，启动时加 `--debug` 看 `CONDITIONS EVALUATION REPORT`，哪些配置类生效、哪些被条件跳过一目了然。

---

## 8. 自测清单（全打勾才算掌握）

- [ ] 能说出来 `@SpringBootApplication` 包含哪三个注解
- [ ] 能解释「为什么加了 Redis starter 就有 RedisTemplate 可用」
- [ ] 能独立用 Spring Initializr 建项目并跑通一个接口
- [ ] 会写 yml 的多环境配置并切换 Profile
- [ ] 分得清 `@Value` 和 `@ConfigurationProperties` 适用场景
- [ ] 遇到 `Consider defining a bean` 能定位是包扫描还是注解问题
- [ ] 知道自动配置「用户 Bean 优先」的原则

---

## 9. 延伸阅读

- [Spring Boot 官方文档](https://docs.spring.io/spring-boot/docs/current/reference/html/)
- [Spring Initializr](https://start.spring.io)
- 《Spring Boot 实战》—— 适合当工具书
- 下一篇：模块二 Spring IoC 与 DI（Bean 是怎么被创建和注入的）

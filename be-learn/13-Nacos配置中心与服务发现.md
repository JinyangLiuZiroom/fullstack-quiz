# 模块十三：Nacos 配置中心与服务发现（完整学习指南）

> **学习目标**：理解 Nacos 两大职责——「配置中心」（集中管理配置、动态刷新）和「服务发现」（微服务互相找得到），能接 Nacos 管理配置、用 `@RefreshScope` 热更新、理解服务注册与发现的流程。
> **适合谁**：配置都写死在 `application.yml`、改个超时就要重新打包；或听微服务但不知服务怎么互相调用的同学。
> **学完能做什么**：把数据库/开关配置迁到 Nacos，改配置不重启生效；用一个服务名调用另一个服务。

---

## 1. 前置知识

- 模块一 配置（`application.yml`）、模块五 `@Value`/`@ConfigurationProperties`
- 知道「微服务」= 多个独立部署的服务
- 基本网络（IP、端口）

---

## 2. 核心概念：Nacos 的两个角色

### 2.1 配置中心

传统：配置写在每个服务自己的 yml，改一个值要改代码重发包。Nacos 把配置集中存到服务端，应用启动时拉取，且**支持运行时动态刷新**。

```
应用 → 启动拉取 → Nacos Server（配置）
改 Nacos 配置 → 推送给应用 → 应用热更新（@RefreshScope）
```

### 2.2 服务发现（注册中心）

```
服务 A 启动 → 注册自己的 IP:端口 到 Nacos
服务 B 要调 A → 问 Nacos「A 在哪」→ 拿到地址 → 发起调用
```

不用把对端地址写死在代码里，扩缩容、换机器都对调用方透明。

---

## 3. 快速开始：配置中心

`bootstrap.yml`（比 application 先加载，用来连 Nacos）：

```yaml
spring:
  application:
    name: order-service
  cloud:
    nacos:
      config:
        server-addr: 127.0.0.1:8848
        file-extension: yaml      # 默认拉 order-service.yaml
        group: DEFAULT_GROUP
```

Nacos 控制台建配置 `order-service.yaml`：

```yaml
my:
  timeout: 3000
  feature-flag: true
```

代码里：

```java
@RefreshScope                 // 配置变更时这个 Bean 重建，拿到新值
@RestController
public class CfgController {
    @Value("${my.timeout:1000}")
    private int timeout;
    @GetMapping("/timeout")
    public int t() { return timeout; }   // 改 Nacos 里的 timeout，不重启即生效
}
```

> 注意：Nacos 默认配置文件格式是 `.properties`（按 key 扁平存）；想用 yaml 要 `file-extension: yaml` 且 Nacos 控制台选 YAML 格式。真题考过「Nacos 默认 properties」导致按 yml 写不生效。

### 3.4 服务发现

```yaml
spring:
  cloud:
    nacos:
      discovery:
        server-addr: 127.0.0.1:8848
```

```java
// 用服务名调用（配合 OpenFeign / RestTemplate + @LoadBalanced）
@FeignClient("user-service")   // 注册到 Nacos 的服务名
public interface UserClient {
    @GetMapping("/api/users/{id}")
    UserDTO get(@PathVariable("id") Long id);
}
```

---

## 4. 进阶用法

- **配置优先级**：Nacos 远程配置 > 本地 `application.yml` > 默认值。可用于「本地默认 + 远程覆盖」。
- **命名空间（Namespace）**：隔离环境（dev/test/prod），不同空间配置互不可见。
- **分组（Group）**：同一环境内再分类。
- **动态刷新范围**：`@RefreshScope` 加在类上；`@ConfigurationProperties` 绑定的对象默认随环境刷新（Spring Cloud 会发布 `RefreshEvent`）。
- **降级**：Nacos 不可用时，应用用启动时拉到的本地快照，不会直接挂（但改不了配置）。

---

## 5. 常见坑与排错表

| 现象 | 根因 | 解决 |
|---|---|---|
| 配置不生效，还是读本地 | 没引 `spring-cloud-starter-alibaba-nacos-config`；或 `bootstrap.yml` 没配 | 引依赖 + 正确 `bootstrap.yml`；确认 `file-extension` |
|---|---|---|
| 按 yml 写不生效 | Nacos 默认 properties 格式 | 控制台选 YAML 格式 + `file-extension: yaml` |
| 改了 Nacos 值没热更 | 类没加 `@RefreshScope` | 在需要热更的 Bean 上加 `@RefreshScope` |
| `@RefreshScope` 引起 Bean 重建副作用 | 重建会丢内存态 | 只给真正需要热更的配置类加 |
| 服务没注册上 | `discovery.server-addr` 漏配 / 没引 discovery 依赖 | 配 discovery + 引依赖 |
| 调用方找不到服务名 | 服务名拼写 / 没注册 | 确认 `spring.application.name` 一致；Nacos 控制台看实例列表 |
| 本地启动连不上 Nacos | 地址错 / Nacos 没起 | 检查 `server-addr` 和 Nacos 进程 |
| 敏感配置明文 | 直接写密码 | 用 Nacos 加密插件 / 环境变量 / KMS |

---

## 6. 完整实战：开关热切换

1. Nacos 建 `order-service.yaml`，含 `my.feature-flag: false`。
2. 代码 `@RefreshScope` + `@Value("${my.feature-flag}")` 控制新功能是否开启。
3. 控制台把 `feature-flag` 改成 `true`，观察接口行为变化，**不重启**。

**验收**：改 Nacos 配置后接口立即反映新开关；服务在 Nacos 控制台可见；用服务名能调通。

---

## 7. 最佳实践

- 环境相关、易变的配置（超时、开关、限流阈值）放 Nacos；固定不变的留本地。
- 默认格式坑：需要 yaml 就显式 `file-extension: yaml` 且控制台选 YAML。
- 需要运行时热更的 Bean 加 `@RefreshScope`，但别滥用（重建有成本）。
- 用 Namespace 隔离环境，避免 dev 配置污染 prod。
- 敏感信息加密，别明文存配置中心。
- 服务发现用服务名调用，别把 IP:端口写死。

---

## 8. 自测清单

- [ ] 知道 Nacos 既是配置中心又是注册中心
- [ ] 会配 bootstrap.yml 连 Nacos
- [ ] 知道 Nacos 默认 properties，用 yaml 要显式声明
- [ ] 会用 @RefreshScope 实现热更新
- [ ] 知道服务发现是「注册 IP:端口 + 按名调用」
- [ ] 会用 Namespace 隔离环境

---

## 9. 延伸阅读

- [Nacos 官方文档](https://nacos.io/zh-cn/docs/what-is-nacos.html)
- [Spring Cloud Alibaba](https://spring-cloud-alibaba-group.github.io/github-pages/)
- 模块十四 三层架构与工程规范

# 模块十一：RabbitMQ 消息队列（完整学习指南）

> **学习目标**：理解消息队列「异步解耦 + 削峰填谷」的价值，掌握 RabbitMQ 的交换机/队列/路由、Topic 通配、死信队列、可靠投递与消费幂等。
> **适合谁**：知道 MQ 能「发消息」，但不知道 Exchange 怎么路由、消息丢了怎么办、消费重复了怎么办的同学。
> **学完能做什么**：用 Spring AMQP 搭一个下单后异步发通知的系统，处理失败消息进死信队列，保证不丢不重。

---

## 1. 前置知识

- 模块三（会写接口）、模块二（Bean/注入） 📖 [模块三：SpringMVC与RESTful接口](index.html#03-SpringMVC与RESTful接口.md)
- 知道「生产者发消息、消费者收消息」的基本模型 📖 [前置：生产者-消费者](../../prereq/index.html#producer-consumer.md)
- 基础 JSON 📖 [前置：JSON](../../prereq/index.html#json-basics.md)

---

## 2. 核心概念：RabbitMQ 模型

```
Producer → Exchange(交换机) → RoutingKey 路由 → Queue(队列) → Consumer
```

- **Exchange**：接收生产者消息，按规则路由到队列。类型：
  - `direct`：routingKey 完全匹配。
  - `topic`：routingKey 模式匹配（`*` 一个词，`#` 零或多个词）。最常用。
  - `fanout`：广播给所有绑定队列，忽略 routingKey。
- **Queue**：真正存消息的地方。
- **Binding**：Exchange 和 Queue 的绑定规则。

### 为什么用 MQ

- **异步**：下单后发通知不用等，直接返回「下单成功」。
- **解耦**：订单系统不依赖通知系统，通知挂了不影响下单。
- **削峰**：秒杀流量先进队列，后端按能力消费，不直接冲垮 DB。

---

## 3. 快速开始：Spring AMQP 收发

```java
// 配置（topic 交换机 + 队列 + 绑定）
@Configuration
public class MqConfig {
    @Bean public TopicExchange orderExchange() { return new TopicExchange("order.ex"); }
    @Bean public Queue notifyQueue() { return new Queue("order.notify.q"); }
    @Bean public Binding binding(TopicExchange ex, Queue q) {
        return BindingBuilder.bind(q).to(ex).with("order.created");  // routingKey
    }
}

// 生产者
@Service
public class OrderService {
    @Autowired private RabbitTemplate rabbit;
    public void create(Order o) {
        rabbit.convertAndSend("order.ex", "order.created", o);  // 交换机 + routingKey + 消息
    }
}

// 消费者
@Component
public class NotifyConsumer {
    @RabbitListener(queues = "order.notify.q")
    public void onOrderCreated(Order o) {
        notifyService.send(o.getUserId());   // 异步发通知
    }
}
```

---

## 4. 进阶用法

### 4.1 死信队列（DLQ）

消息「被拒绝 / 过期 / 队列满」后，转发到死信交换机，进入死信队列，便于排查和重放。

```java
@Bean
public Queue mainQueue() {
    return QueueBuilder.durable("order.main.q")
        .deadLetterExchange("order.dlx")          // 死信交换机
        .deadLetterRoutingKey("order.dl")          // 死信 routingKey
        .ttl(10000)                                // 消息 10s 未消费进死信（可做延迟）
        .build();
}
@Bean public Queue dlq() { return new Queue("order.dlq"); }
```

> 套路：消费失败 `channel.basicReject(tag, false)`（requeue=false）把消息丢进死信，不阻塞主队列；人工从死信队列捞出来重放。

### 4.2 可靠投递（防丢）

- 生产者确认：`spring.rabbitmq.publisher-confirm-type=correlated`，发失败回调重发。
- 消息持久化：队列 `durable=true`、消息 `deliveryMode=PERSISTENT`。
- 消费者手动 ACK：处理成功才 `basicAck`，失败 `basicNack`/`basicReject`。

```java
@RabbitListener(queues = "order.notify.q", ackMode = "MANUAL")
public void on(Order o, Channel ch, @Header(AmqpHeaders.DELIVERY_TAG) long tag) throws IOException {
    try {
        notifyService.send(o.getUserId());
        ch.basicAck(tag, false);          // 处理成功确认
    } catch (Exception e) {
        ch.basicNack(tag, false, false);  // 不重回队列 → 进死信
    }
}
```

> `basicReject`/`basicNack` 区别：`basicNack` 可一次拒绝多条（multiple=true）；`basicReject` 只能一条。`requeue=true` 会重回队列（可能死循环，谨慎用）。

### 4.3 消费幂等

消息可能因重试被消费多次，业务必须幂等：

```java
public void on(Order o) {
    if (idempotentTable.exists(o.getId())) return;  // 已处理过
    doBusiness(o);
    idempotentTable.mark(o.getId());
}
```

用「订单 id + 去重表/Redis SETNX」保证同一条消息只生效一次。

---

## 5. 常见坑与排错表

| 现象 | 根因 | 解决 |
|---|---|---|
| 消息发了消费者收不到 | routingKey 不匹配 / 队列没绑定 | 检查 binding 的 routingKey；topic 用 `*`/`#` 规则 |
| 消费重复处理（发了两次短信） | 重试机制导致重复消费 | 消费幂等（去重表/SETNX） |
| 消息丢失 | 队列非持久化 / 自动 ACK 时崩 | 队列 durable + 手动 ACK + 生产者 confirm |
| 死循环重试打爆 CPU | `requeue=true` 一直重投 | 失败进死信（`requeue=false`），人工重放 |
| 消费者挂了消息堆积 | 消费慢/并发低 | 提高 prefetch/并发消费者数 |
| `basicReject` vs `basicNack` 用错 | 不懂区别 | 单条 reject，批量 nack(multiple) |
| 顺序错乱 | 多消费者并行 | 同业务 key 路由到同一队列/单消费 |
| 大消息阻塞 | 单条消息几 MB | MQ 只传 id，详情查 DB |

---

## 6. 完整实战：下单→异步通知 + 失败进死信

1. 配 `order.ex`(topic) + `order.notify.q`(绑 `order.created`) + 死信交换机/队列。
2. 下单成功 `convertAndSend("order.ex","order.created", order)`。
3. 消费者手动 ACK，发通知失败 `basicNack(requeue=false)` → 进死信。
4. 提供「从死信队列重放」的管理接口。

**验收**：下单接口秒回；通知异步发出；通知系统故意报错时消息进死信不丢，可重放。

---

## 7. 最佳实践

- 交换机/队列/消息都设持久化，防宕机丢消息。
- 消费者用**手动 ACK**，处理成功才确认；失败进死信而非无限 requeue。
- 消费必须**幂等**（去重表/Redis），MQ 至少一次投递必然有重复。
- 死信队列必配，用于失败隔离和重放，别让坏消息阻塞主队列。
- 消息体只放 id/必要字段，大对象走 DB 查，别塞大 JSON。
- topic 交换机用 `*`/`#` 灵活路由，少用 fanout（无法筛选）。

---

## 8. 自测清单

- [ ] 能画出 Producer→Exchange→Queue→Consumer 模型
- [ ] 知道 direct/topic/fanout 区别
- [ ] 会配死信队列
- [ ] 知道手动 ACK 与 basicReject/basicNack 区别
- [ ] 知道消费幂等怎么做
- [ ] 知道可靠投递三要素（持久化/confirm/手动ACK）

---

## 9. 延伸阅读

- [RabbitMQ 官方教程](https://www.rabbitmq.com/tutorials)
- [Spring AMQP 文档](https://docs.spring.io/spring-amqp/docs/current/reference/html/)
- 模块十二 Kafka 消息队列（另一种 MQ 的思路对比）

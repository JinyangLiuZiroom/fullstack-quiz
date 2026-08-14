# 模块十二：Kafka 消息队列（完整学习指南）

> **学习目标**：理解 Kafka 基于「分区 + 提交位移」的模型，掌握分区顺序、ISR 副本、acks 可靠性、消费者组再均衡，能选 Kafka 还是 RabbitMQ，并保证不丢不重。
> **适合谁**：用过或听过 MQ，但分不清 Kafka 和 RabbitMQ 差异；不清楚「分区」「消费者组」「offset」是什么的同学。
> **学完能做什么**：用 Spring Kafka 搭生产者/消费者，理解分区如何决定并发和顺序，配置 acks=all 防丢，处理重复消费幂等。

---

## 1. 前置知识

- 模块十一 RabbitMQ（对比学习更快）
- 知道日志/流数据场景（埋点、订单事件流）
- 基本命令行

---

## 2. 核心概念：Kafka 的模型

```
Producer → Topic(主题，分多个 Partition) → Consumer Group(消费者组)
```

- **Topic**：逻辑分类（如 `order-events`）。
- **Partition（分区）**：Topic 的物理分片，**每个分区内消息有序**。分区数决定消费并发上限。
- **Offset**：每条消息在分区里的序号，消费者记录「消费到哪了」。
- **Consumer Group**：一组消费者共同消费一个 Topic，**一个分区只被组内一个消费者消费**（实现并行）。
- **ISR（In-Sync Replicas）**：和 Leader 保持同步的副本集合，决定写入何时算成功。

### Kafka vs RabbitMQ（怎么选）

| 维度 | Kafka | RabbitMQ |
|---|---|---|
| 模型 | 分区日志、拉模式、存盘久 | 队列、推模式、消费即删 |
| 顺序 | 分区内有序 | 队列有序（单队列） |
| 吞吐 | 极高（百万/秒级） | 中（万/秒级） |
| 典型场景 | 日志、事件流、削峰 | 任务分发、RPC 式异步 |

---

## 3. 快速开始：Spring Kafka

```java
// 生产者
@Service
public class OrderEventProducer {
    @Autowired private KafkaTemplate<String, String> kafka;
    public void send(Long orderId, String payload) {
        // 第一个参数是 key：相同 key 进同一分区（保证该订单事件有序）
        kafka.send("order-events", String.valueOf(orderId), payload);
    }
}

// 消费者
@Component
public class OrderEventConsumer {
    @KafkaListener(topics = "order-events", groupId = "notify-group")
    public void on(ConsumerRecord<String, String> rec) {
        notifyService.send(rec.value());
    }
}
```

生产者配置（可靠性）：

```yaml
spring:
  kafka:
    producer:
      acks: all                 # 所有 ISR 副本写入才算成功（最强不丢）
      retries: 3
      enable-idempotence: true  # 生产者幂等，避免重试导致重复
    consumer:
      enable-auto-commit: false # 手动提交 offset，处理成功才提交
      isolation-level: read_committed
```

---

## 4. 进阶用法

### 4.1 分区与顺序

```java
// 相同 orderId 的 key → 同一分区 → 该订单的所有事件按发送顺序被同一消费者处理
kafka.send("order-events", orderId.toString(), event);
```

> 全局顺序做不到（除非 1 个分区），**业务顺序用「相同 key 进同分区」保证局部顺序**——这是 Kafka 顺序的标准做法。

### 4.2 acks 与可靠性

| acks | 含义 | 风险 |
|---|---|---|
| 0 | 发了就当成功 | 可能丢，最快 |
| 1 | Leader 写入成功 | Leader 宕机前未同步副本会丢 |
| all | 所有 ISR 写入成功 | 最安全，稍慢（推荐生产） |

### 4.3 手动提交 offset（防丢 + 幂等）

```java
@KafkaListener(topics = "order-events", groupId = "notify-group")
public void on(List<ConsumerRecord<String,String>> batch, Acknowledgment ack) {
    try {
        batch.forEach(r -> notifyService.send(r.value()));
        ack.acknowledge();   // 全部成功才提交位移
    } catch (Exception e) {
        // 不提交 → 下次从头消费（需业务幂等兜底）
    }
}
```

### 4.4 消费者组再均衡

组内消费者数量变化（扩缩容/宕机）会触发**再均衡（Rebalance）**：分区重新分配，期间消费暂停。分区数 ≥ 消费者数才能并行；消费者数超过分区数，多余的空闲。

---

## 5. 常见坑与排错表

| 现象 | 根因 | 解决 |
|---|---|---|
| 消息顺序乱 | 用了不同 key / 多分区并行 | 同业务 key 保证局部顺序；或减少分区 |
| 消费重复（重复通知） | 自动提交 offset 后处理崩，重投 | 手动提交 + 业务幂等 |
| 丢消息 | acks=0/1 或自动提交过早 | acks=all + 手动提交 + 副本≥2 |
| 消费者扩了不生效 | 消费者数 > 分区数 | 分区数 ≥ 消费者数 |
| 再均衡频繁卡顿 | 消费耗时过长触发心跳超时 | 调大 `session.timeout`/`max.poll.interval`；缩小单批 |
| 重复生产（重试） | 没开幂等 + 网络重试 | `enable-idempotence=true` |
| 积压严重 | 消费速度 < 生产速度 | 加分区 + 加消费者；或提升单条处理速度 |
| key 为 null 随机分区 | 没指定 key | 需要顺序就指定 key |

---

## 6. 完整实战：订单事件流（有序 + 不丢 + 幂等）

```java
// 生产：同 orderId 进同分区保证顺序
kafka.send("order-events", orderId.toString(), eventJson);

// 消费：手动提交 + 幂等
@KafkaListener(topics = "order-events", groupId = "order-group")
public void on(ConsumerRecord<String,String> r, Acknowledgment ack) {
    if (dedup.exists(r.key() + r.offset())) return;  // 幂等去重
    handle(r.value());
    dedup.mark(r.key() + r.offset());
    ack.acknowledge();
}
```

**验收**：同一订单的事件按序处理；进程崩溃重启后从提交的 offset 继续不丢；重复投送被幂等挡掉。

---

## 7. 最佳实践

- 需要局部顺序就用**相同 key**（如 orderId）路由到同分区。
- 生产环境 `acks=all` + `enable-idempotence=true` 防丢防重；`retries` 设上。
- 消费用**手动提交 offset**，处理成功才 `acknowledge`；业务必须幂等。
- 分区数 ≥ 消费者数才能充分并行；扩消费者先扩分区。
- 控制单批消费耗时，避免再均衡心跳超时。
- 消息体精简，大 payload 走对象存储/DB，Kafka 只传引用。

---

## 8. 自测清单

- [ ] 能说出 Topic/Partition/Offset/Consumer Group 含义
- [ ] 知道怎么用 key 保证局部顺序
- [ ] 知道 acks=0/1/all 的可靠性差异
- [ ] 会配手动提交 offset + 业务幂等
- [ ] 知道消费者数不能超过分区数
- [ ] 能区分 Kafka 和 RabbitMQ 适用场景

---

## 9. 延伸阅读

- [Kafka 官方文档](https://kafka.apache.org/documentation/)
- [Spring for Apache Kafka](https://docs.spring.io/spring-kafka/docs/current/reference/html/)
- 模块十一 RabbitMQ 消息队列

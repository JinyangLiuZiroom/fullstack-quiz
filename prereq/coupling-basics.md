# 耦合概念（前置知识补完）

> 一句话：耦合 = 一个类紧紧依赖另一个具体类，改一处牵全身、还难测试。

## 你应该会什么（检验）
- 知道「耦合」：A 类直接 `new B()`，A 就硬依赖 B，难替换难测试
- 知道「面向接口」能降耦

## 30 秒上手
```java
// 高耦合：OrderService 死绑 MySQLUserRepo
private UserRepo repo = new MySQLUserRepo();
// 低耦合：依赖接口，具体实现可换
private UserRepo repo; // 由容器注入，可以是 MySQL 也可以是 Mock
```

## 一个练习
把上面的 `new MySQLUserRepo()` 改成「依赖接口 + 构造注入」，体会测试时如何换 mock。做完回主文章。

## 常见误解
- 「解耦」不是不用依赖，是依赖「稳定接口」而非「易变实现」。

↩ 回到学习笔记首页：../learn.html

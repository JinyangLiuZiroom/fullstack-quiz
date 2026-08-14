# 依赖注入 DI / 控制反转 IoC（前置知识补完）

> 一句话：对象需要的依赖「由容器塞给你」，而不是你自己 `new`，从而解耦好测。

## 你应该会什么（检验）
- 知道「依赖注入」字面意思（不会写也行，下面讲）
- 知道「耦合」：A 直接 `new B()`，A 就硬依赖 B

## 30 秒上手
```java
// 反例：自己 new，硬耦合、难替换难测
class OrderService { private UserRepo repo = new UserRepo(); }

// 正例：容器注入，OrderService 不关心 repo 怎么来
@Service
class OrderService {
  private final UserRepo repo;
  public OrderService(UserRepo repo) { this.repo = repo; }
}
```
Spring 启动时把 `UserRepo` 实例「注入」到 `OrderService`。

## 一个练习
想清楚：为什么测试时能把 `UserRepo` 换成假实现（mock）？因为依赖是「被给的」不是「被 new 的」。做完回主文章（模块二专门讲）。

## 常见误解
- DI 不是 Spring 独有，是设计思想；Spring 只是用注解帮你自动做。
- 注入的 Bean 默认是单例，有状态的字段要小心并发。

↩ 回到学习笔记首页：../learn.html

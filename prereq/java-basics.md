# Java 8+ 基础（前置知识补完）

> 一句话：后端主力语言，Spring 全家桶都建立在 Java 语法之上。

## 你应该会什么（检验）
- Java 8+ 语法：Lambda、注解、`Optional`、接口、构造方法
- 集合框架（`List`/`Map`/`Set`）、`Runnable` / `Callable`

## 30 秒上手
```java
// Lambda 简化匿名类
list.forEach(u -> System.out.println(u.getName()));
// 注解：给编译器/框架看的元信息
@Override
public String toString() { return "..."; }
// Optional 防 null
Optional<User> u = repo.findById(1);
u.ifPresent(x -> System.out.println(x.getName()));
```

## 一个练习
用 Lambda + `stream().filter().collect()` 从一个 List 筛出年龄 > 18 的人。做完回主文章。

## 常见误解
- `==` 比对象是比「引用」不是「内容」，比内容用 `.equals()`。
- 接口可以有 `default` 方法；抽象类才能有状态字段。
- 调集合方法前先判空，否则 `NullPointerException`。

↩ 回到学习笔记首页：../../learn.html

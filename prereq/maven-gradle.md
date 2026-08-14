# Maven / Gradle 基础（前置知识补完）

> 一句话：构建工具，管「依赖 + 编译 + 打包」，对应前端的 npm。

## 你应该会什么（检验）
- Maven：`mvn clean package`；Gradle：`./gradlew build`
- 知道 `pom.xml` / `build.gradle` 是依赖清单

## 30 秒上手
```bash
mvn clean package      # 清->编译->测试->打 jar/war
./gradlew build        # Gradle 等价
```
依赖写在 `pom.xml`：
```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

## 一个练习
`mvn clean package` 跑通一个小 Spring Boot 项目，在 `target/` 看到 jar。做完回主文章。

## 常见误解
- `clean` 清掉旧产物避免缓存干扰；不写也常能跑，但出问题先 clean。
- 版本冲突看 `mvn dependency:tree` 排查。

↩ 回到学习笔记首页：../learn.html

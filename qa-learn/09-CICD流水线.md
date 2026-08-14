# 模块九：CI/CD 流水线（完整学习指南）

> **学习目标**：理解持续集成/持续交付（CI/CD）的完整链路，能看懂并配置一条流水线——拉代码→编译→类型检查/单测→构建→部署，知道 `tsc` 门禁、自动化测试怎么卡在流水线上。
> **适合谁**：只会本地 `npm run build` 手动发包，不知道「提交代码自动测自动发」是怎么发生的同学。
> **学完能做什么**：用 GitHub Actions 配一条最小 CI（push 触发 → 安装 → tsc 类型检查 → 单测 → 构建），理解每步失败会阻断合并。

---

## 1. 前置知识

- 会用 Git 提交代码
- 知道 `npm install` / `npm run build`（前端）、`mvn package`（后端）
- 模块六 质量门禁（知道流水线要卡质量）

---

## 2. 核心概念：CI / CD 是什么

- **CI（持续集成）**：多人频繁提交，每次自动「拉代码 → 编译 → 跑测试」，尽早发现集成问题。核心：**频繁集成 + 自动验证**。
- **CD（持续交付/部署）**：在 CI 通过后自动构建产物、自动部署到测试/生产环境。

### 一条典型流水线

```
开发者 push
  → 触发 CI：
     1. 拉代码（checkout）
     2. 装依赖（install）
     3. 类型检查 / 编译（tsc / mvn compile）   ← 门禁：类型不过阻断
     4. 单测 + 覆盖率（jest / mvn test）        ← 门禁：测试不过阻断
     5. 代码扫描（可选）
     6. 构建产物（build / package）
  → CD（可选）：部署到环境
```

### 为什么重要

- 问题**秒级**反馈（你刚提交就告诉你挂了），不是上线才发现。
- 门禁保证「合进主干的一定是编译过、测试过的代码」。
- 重复劳动自动化，人只关注业务。

---

## 3. 快速开始：GitHub Actions 最小 CI（前端）

`.github/workflows/ci.yml`：

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 18 }
      - run: npm ci                 # 安装（锁定版本，比 npm install 稳）
      - run: npx tsc --noEmit       # 类型检查门禁：类型错直接失败
      - run: npm test               # 单测（jest/vitest）
      - run: npm run build          # 构建产物
```

> `tsc --noEmit` 是前端常见**类型门禁**：TypeScript 代码有类型错误时编译失败，流水线红，阻断合并。真题考过「tsc 编译失败导致构建挂」——本质就是类型门禁生效。

后端（Maven）等价：

```yaml
      - run: mvn -B test            # 编译 + 单测，任一失败流水线红
```

---

## 4. 进阶用法

### 4.1 门禁失败的处理

流水线红了怎么办：
- 看日志定位（tsc 报错会指出文件行号；测试失败指出哪个用例）。
- 本地复现：`npm ci && npx tsc --noEmit && npm test`。
- 修复后再 push，别用「跳过检查」强行合并（除非应急且评审通过）。

### 4.2 分阶段门禁（对应模块六）

- push 触发：轻量（编译 + 单测 + lint）。
- PR 合并前：中量（覆盖率 + 扫描）。
- 发布：重量（全回归 + 部署）。

### 4.3 缓存加速

```yaml
- uses: actions/cache@v4
  with: { path: ~/.npm, key: ${{ hashFiles('package-lock.json') }} }
```
缓存依赖，避免每次重装。

### 4.4 部署（CD）

```yaml
deploy:
  needs: build          # 依赖 build  job 成功
  if: github.ref == 'refs/heads/main'
  runs-on: ubuntu-latest
  steps:
    - run: ./deploy.sh   # 部署到服务器 / 静态托管 / K8s
```

---

## 5. 常见坑与排错表

| 现象 | 根因 | 解决 |
|---|---|---|
| 本地能过 CI 红 | 本地 node 版本/依赖不一致 | 用 `npm ci` 锁版本；CI 固定版本 |
| tsc 类型错阻断构建 | 类型门禁生效（正常） | 修类型错误，别绕过 |
| 测试偶红（flaky） | UI 用例脆/依赖顺序 | 接口/单测优先；用例独立 |
| push 跳过 CI | 没配 on: push 或分支过滤 | 确认触发条件 |
| 缓存导致用了旧依赖 | 缓存 key 没含 lock 文件 | cache key 含 `package-lock.json` 哈希 |
| 部署到错环境 | 分支判断写错 | `if: github.ref == 'refs/heads/main'` 明确 |
| 构建产物没传下一步 | job 间没 artifact | 用 `upload-artifact`/`download-artifact` |
| 强制合并绕过门禁 | 用了跳过检查 | 禁止常规跳过；应急走评审 |

---

## 6. 完整实战：给前端项目配 CI + 类型门禁

1. 建 `.github/workflows/ci.yml`，push 触发。
2. 步骤：checkout → setup-node → `npm ci` → `npx tsc --noEmit` → `npm test` → `npm run build`。
3. 故意在代码里写个类型错误，push，观察 CI 红并定位报错行。
4. 修复后重推，CI 绿。

**验收**：类型错/测试失败会阻断；本地复现方式清晰；构建产物生成。

---

## 7. 最佳实践

- 每次 push/PR 触发 CI，问题尽早暴露。
- 门禁分层：编译/单测轻量常驻，覆盖率/扫描合并前，全回归发布前。
- 用 `npm ci` / 锁版本，保证本地和 CI 一致。
- 门禁失败**修代码**而非跳过检查；应急跳过需评审留痕。
- 缓存依赖加速，但 key 要含 lock 文件避免用旧包。
- CD 明确分支与环境的对应关系，避免误发。

---

## 8. 自测清单

- [ ] 能解释 CI / CD 区别
- [ ] 能画出一条典型流水线（checkout→install→test→build→deploy）
- [ ] 知道 tsc 是前端类型门禁
- [ ] 知道门禁失败要修而非绕过
- [ ] 会用 GitHub Actions 基本语法
- [ ] 知道缓存 key 要含 lock 文件

---

## 9. 延伸阅读

- [GitHub Actions 文档](https://docs.github.com/actions)
- [持续集成 - Martin Fowler](https://martinfowler.com/articles/continuousIntegration.html)
- 模块六 质量门禁；模块七 JUnit5；模块八 Playwright

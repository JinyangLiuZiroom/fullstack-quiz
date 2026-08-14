# 模块八：Playwright 自动化测试（完整学习指南）

> **学习目标**：掌握现代 Web UI 自动化框架 Playwright——定位元素、操作页面、断言、自动等待、处理常见陷阱，能写一个稳定的端到端用例（登录→下单）。
> **适合谁**：点页面点烦了想自动化，或试过 Selenium 被「元素找不到/时序」坑惨的同学。
> **学完能做什么**：用 Playwright 写脚本自动走完「登录 → 加购 → 下单」，断言关键结果，且不会因加载慢而偶红。

---

## 1. 前置知识

- 模块三 功能测试（知道要验什么）
- 模块五 冒烟（知道核心路径）
- 会一点 JS/TS（Playwright 首选 TS）
- 知道浏览器 DevTools（模块六 前端 DevTools）

---

## 2. 核心概念：Playwright 强在哪

Playwright（微软）相比老 Selenium 的优势：
- **自动等待**：操作前自动等元素可见/可点，不用手写 `sleep`。
- **多浏览器**：Chromium/Firefox/WebKit 一套 API。
- **强定位**：文本、角色、CSS、XPath 多种选择器。
- **稳定**：不依赖页面加载状态轮询。

### 基本结构

```ts
import { test, expect } from '@playwright/test';

test('用户能登录并下单', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#username', 'ziroom');
  await page.fill('#password', '123456');
  await page.click('button:has-text("登录")');
  await expect(page).toHaveURL(/.*\/home/);   // 自动等待 URL 变化
});
```

---

## 3. 快速开始：第一个用例

```ts
// tests/login.spec.ts
import { test, expect } from '@playwright/test';

test('登录失败提示错误', async ({ page }) => {
  await page.goto('https://demo.com/login');
  await page.getByLabel('用户名').fill('wrong');
  await page.getByLabel('密码').fill('bad');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page.getByText('用户名或密码错误')).toBeVisible();  // 自动等待出现
});
```

运行：`npx playwright test`。报告自动生成。

> **自动等待是核心**：`expect(...).toBeVisible()` 会轮询直到出现或超时，不用 `sleep(2000)`。这是 Playwright 比手写 wait 稳的原因。

---

## 4. 进阶用法

### 4.1 稳定定位器（避免脆）

```ts
// 好：按角色/文本/可访问性，文案小改也能定位
page.getByRole('button', { name: '提交' });
page.getByText('订单提交成功');

// 差：强依赖 CSS 类/坐标，UI 一改就红
page.click('.btn-primary.submit-btn:nth-child(3)');
```

### 4.2 断言陷阱（真题考点）

```ts
// ❌ 错误：用 page.click 的返回值或 console.log 当断言
await page.click('button'); console.log('点完了');   // 没断言 == 没测

// ✅ 正确：必须 expect 断言可观察结果
await expect(page.getByText('提交成功')).toBeVisible();
```

> 常见坑：「脚本跑完没报错就当通过」——其实没任何断言，等于没测。UI 自动化必须有 `expect` 断言。Playwright 的 `test` 必须包含断言才有意义（纯 `click` 不报错不代表功能对）。

### 4.3 处理弹窗/新标签/请求拦截

```ts
// 监听网络，断言请求发出
const reqPromise = page.waitForRequest(r => r.url().includes('/api/order'));
await page.click('提交订单');
const req = await reqPromise;
expect(req.postData()).toContain('itemId');

// 文件上传
await page.setInputFiles('input[type=file]', 'test.png');
```

### 4.4 测试数据清理

```ts
test.afterEach(async ({ page }) => {
  // 用完删测试数据，保证用例独立
});
```

---

## 5. 常见坑与排错表

| 现象 | 根因 | 解决 |
|---|---|---|
| 偶红：元素未找到 | 没用自动等待，自己 sleep 不够 | 用 expect 自动等待，别手写 sleep |
| 脚本「通过」但没测到 | 没写 expect 断言 | 每个用例必须有断言 |
| 一改 UI 全红 | 用脆弱 CSS 定位 | 用 role/text/getByLabel 稳定定位 |
| 用例间串数据 | 没清理 | afterEach 清理 + 独立数据 |
| 超时在登录页 | 选择器文本不符 | 用 DevTools 确认文本/角色 |
| 新标签内容取不到 | 没切 frame/context | 用 page.waitForEvent('popup') |
| 本地能过 CI 红 | 环境/分辨率差异 | 固定 viewport；CI 用无头稳定环境 |
| 断言时机早（数据未回） | 没等接口/渲染 | 断言前等可见/等请求响应 |

---

## 6. 完整实战：登录→下单冒烟自动化

```ts
test('核心下单链路', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('用户名').fill('ziroom');
  await page.getByLabel('密码').fill('123456');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/.*\/home/);

  await page.goto('/goods/1');
  await page.getByRole('button', { name: '加入购物车' }).click();
  await page.getByRole('button', { name: '去结算' }).click();
  await page.getByRole('button', { name: '提交订单' }).click();
  await expect(page.getByText('下单成功')).toBeVisible();   // 真断言
});
```

**验收**：脚本自动跑完一条龙；有断言；不依赖 sleep；能在 CI（模块九）里作为冒烟门禁。

---

## 7. 最佳实践

- **必须有 expect 断言**，纯 click 不报错 ≠ 测试通过。
- 用自动等待（expect），**杜绝手写 sleep**。
- 定位器优先 role/text/label，远离脆弱 CSS 嵌套。
- 用例独立：自带数据 + afterEach 清理，不依赖执行顺序。
- UI 自动化只覆盖核心路径（冒烟级），细节下沉到接口/单测（金字塔）。
- 关键操作配合网络监听断言（请求真的发出、参数对）。

---

## 8. 自测清单

- [ ] 会写 Playwright 基本用例（goto/fill/click/expect）
- [ ] 知道自动等待 vs 手写 sleep
- [ ] 知道 UI 用例必须有断言
- [ ] 会用稳定定位器（role/text）
- [ ] 会做用例间数据隔离
- [ ] 知道 UI 自动化只覆盖核心路径

---

## 9. 延伸阅读

- [Playwright 官方文档](https://playwright.dev/)
- 模块五 冒烟测试；模块九 CI/CD 流水线

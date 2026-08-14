# 模块六：Chrome DevTools 调试实战（完整学习指南）

> **学习目标**：熟练使用 Chrome DevTools 的四大面板（Elements / Console / Network / Sources）定位前端三类核心问题——接口报错、数据不对、样式错乱，并建立一套标准的排错流程。
> **适合谁**：只会 `console.log`、遇到联调问题靠猜、看到红字不知道点哪的同学。
> **学完能做什么**：独立用 Network 查出 401/500/参数错/CORS，用 Elements 修样式，用 Sources 断点调试逻辑，把「靠猜」变成「按流程定位」。

---

## 1. 前置知识

- 会用 Chrome 浏览器
- 打开开发者工具：F12 或 `Ctrl+Shift+I`（Mac `Cmd+Opt+I） 📖 [前置：DevTools](../../prereq/index.html#devtools-basics.md)
- 知道「前端请求会发到后端、后端返回数据」这件事（见模块三） 📖 [模块三：Axios与HTTP请求实战](index.html#03-Axios与HTTP请求实战.md)

---

## 2. 四大面板总览

| 面板 | 管什么 | 典型场景 |
| --- | --- | --- |
| **Elements** | DOM 结构 + CSS 样式 | 布局错乱、Flex 不生效、样式被覆盖 |
| **Console** | 日志、报错、临时执行 JS | 异常堆栈、调试输出 |
| **Network** | 抓取所有请求 | 接口 401/500、参数发错、跨域、响应结构 |
| **Sources** | 源码 + 断点调试 | 逻辑 bug、变量值不对、循环卡死 |

> 90% 的联调问题在 **Network**；样式问题在 **Elements**；逻辑 bug 在 **Sources**。先判断问题类型再选面板，不要无脑 Console.log。

---

## 3. Network：联调第一现场（最重要）

打开任意一条请求，看这几个标签：

### Headers（请求/响应头 + 参数）
- **General**：请求 URL、方法、状态码（Status）、远程地址
- **Request Headers**：前端发出去的信息
  - `Authorization`：token 带没带
  - `Content-Type`：是 `application/json` 还是 `form`
- **Query String Parameters**：GET 参数（对应 `params`）拼对没
- **Request Payload**：POST 请求体（对应 `data`）
- **Response Headers**：后端回的头
  - 看有没有 `Access-Control-Allow-*`（CORS 排错，见模块四）

### Preview / Response（响应内容）
- **Preview**：格式化后的响应，树状展开，好读
- **Response**：原始文本
- 直接看后端到底返回了什么，和前端解析的对不对得上

### Status（状态码）
| 码 | 含义 | 怎么办 |
| --- | --- | --- |
| 200 | 成功 | 还看业务 code（见模块三） |
| 400 | 请求参数错 | 看 Payload，参数格式不对 |
| 401 | 未授权/token 失效 | 看 Authorization，触发刷新（模块三） |
| 403 | 无权限 | 找后端开权限 |
| 404 | 接口路径错 | 核对 URL |
| 500 | 后端炸了 | 把响应体/堆栈发给后端 |
| (failed) net::ERR | 网络/CORS/跨域 | 看 Console + 模块四 |

### Timing（耗时）
看请求各阶段花多久：DNS / 连接 / 等待服务器（TTFB）/ 下载，定位慢在哪。

### 实用技巧
- **Preserve log**（保留日志）：勾上后刷新/跳转不丢请求，定位「跳转后接口没了」类问题
- **Filter**：输入框按接口名/类型过滤（如输入 `api` 只看接口）
- **Fetch/XHR**：只看接口请求，屏蔽图片/css
- **Copy as cURL**：右键请求 → 复制成 curl 命令，直接丢给后端复现
- **Replay XHR**：右键重发该请求
- **Block request URL**：右键拦截某请求，模拟接口挂掉

---

## 4. 标准排错流程（照着走，不靠猜）

**场景：页面列表空白 / 数据不对**
1. 打开 **Network**，触发操作，找到那条接口
2. 看 **Status**：
   - 500 → 后端炸，把 Response 发给后端
   - 401 → token 问题（模块三刷新逻辑）
   - 400 → 参数错，看 Payload
   - 200 → 继续看业务 code（模块三）
3. 看 **Payload / Query**：参数发对没（比如本该 `data` 误放 `params`）
4. 看 **Response / Preview**：后端返回结构是不是和前端解析对不上（如前端取 `res.list` 但后端给 `res.data`）
5. 打开 **Console** 看有没有 `Cannot read properties of undefined` —— 八成响应结构变了、没判空
6. 去 **Sources** 在「拿到响应后」下断点，看变量真实值

**场景：样式错乱 / 不居中**
1. 打开 **Elements**，点左上箭头选中元素
2. 右侧 **Styles** 看生效的 CSS，找被划掉的（被覆盖）规则
3. 直接在 Styles 里改 `display:flex` / `justify-content` 实时预览，确认后写回代码
4. 看 **Computed** 确认最终计算值（宽高、flex 属性）

**场景：逻辑 bug / 变量值不对**
1. 打开 **Sources**，在源码行号点断点
2. 触发逻辑，停住后看右侧 **Scope**（所有变量当前值）
3. 看 **Call Stack**（谁调用进来的）
4. 鼠标悬停变量看实时值，或用 **Watch** 加表达式

---

## 5. Elements：改样式不用改代码

- 左上箭头选中元素，右侧看 Computed 样式
- 在 Styles 面板直接改 `width` / 加 `display:flex` 实时预览，确认后再写回代码（避免改完发现不对）
- **Flex 可视化**：选中 flex 容器，Styles 面板有轴线和 `justify-content`/`align-items` 的图形提示，新手友好
- `:hov` 按钮模拟 `:hover` / `:active` 等状态（默认这些状态只在交互时出现，难调试）
- 右键元素 → **Edit as HTML** 直接改 DOM 试验
- 右键元素 → **Store as global variable** 得 `temp1`，可在 Console 操作它

---

## 6. Console：不只是 log

```js
console.log('普通信息')
console.warn('警告（黄）')
console.error('错误（红，带堆栈）')
console.table(arr)            // 数组/对象表格化，超清晰
console.dir(obj)              // 展开对象结构
console.time('t'); /* ... */ console.timeEnd('t')  // 计时
```

- 报错点进去能跳到 Sources 对应行
- `$0` 表示当前 Elements 选中的元素；`$1` 上一个
- 在 Console 直接执行 JS，比如 `$0.style.color='red'` 临时改样式
- `debug(fn)` 给函数下断点；`monitor(fn)` 监听函数调用
- 用 `console.assert(cond, msg)` 条件不满足才打印

---

## 7. Sources：断点调试（进阶标志）

1. 在 JS/TS 文件行号点一下下**普通断点**
2. 触发逻辑，停住后：
   - 右侧 **Scope** 看当前所有变量值（Local / Closure / Global）
   - **Call Stack** 看调用链
   - 鼠标悬停变量看实时值
   - **Watch** 加表达式（如 `todos.length`）持续监视
3. 调试按钮：
   - 蓝色箭头 **Resume**：继续运行到下一个断点
   - 半圆箭头 **Step over**：执行下一行（不进函数内部）
   - 向下箭头 **Step into**：进到函数内部
   - 向上箭头 **Step out**：跳出当前函数
4. **条件断点**：右键断点 → Edit breakpoint → 写 `i === 99`，只在满足时停（大循环救命，不然几百次循环手点断）
5. **XHR/fetch 断点**：Sources 右侧 + 号，输入包含的关键词，接口发出/返回时自动停（定位某个接口的处理逻辑）

> 用断点代替一堆 `console.log`，是调试能力的分水岭。卡住时在「请求发出前」「响应回来后」各下断点，数据流向一目了然。

---

## 8. 常见坑与排错表

| # | 现象 | 用哪个面板 | 怎么查 |
| --- | --- | --- | --- |
| 1 | 列表空白 | Network + Console | 看 Status/Response，Console 看 undefined 报错 |
| 2 | 401 红字 | Network | Request Headers 看 Authorization，Response 看错误 |
| 3 | 跨域 CORS | Network | Response Headers 看有没有 Allow-*（模块四） |
| 4 | 参数发错 | Network | Query String / Payload 看参数位置 |
| 5 | 样式不居中 | Elements | 看 flex 属性是否生效、被覆盖 |
| 6 | 变量值不对 | Sources | 断点 + Scope 看真实值 |
| 7 | 循环卡死 | Sources | 条件断点定位第几次异常 |
| 8 | 知道报错但找不到代码行 | Console | 点红色错误堆栈跳 Sources |
| 9 | 刷新后请求消失 | Network | 勾 Preserve log |
| 10 | 改样式不对 | Elements | 直接在 Styles 改实时预览再写回 |

---

## 9. 完整实战：独立定位一个 401 bug

1. 故意把 token 写成错的，触发 401
2. **Network**：找到那条请求，Status=401，看 Request Headers 的 Authorization 确实是错的
3. 看 Response 里的业务 `code`/`msg`（如 `{code:401, msg:'token 失效'}`）
4. **Console**：看有没有报错堆栈，点进去跳到 Sources 对应行
5. **Sources**：在该行下断点，Scope 看 `token` 变量值为空/错
6. 修：把正确的 token 写入 localStorage，重发请求验证 200

**验收**：能独立说出「为什么 401、错在哪一行、怎么修」，不靠别人提示。完成 = 全 6 模块通关。

---

## 10. 最佳实践

1. 联调先看 Network，顺序：Status → Headers → Payload → Response
2. 200 也可能业务失败，看业务 code（模块三）
3. 跨域先查 Response Headers 的 Allow-*（模块四）
4. 改样式先用 Elements 试，再写回代码
5. 逻辑 bug 用 Sources 断点，别只会 console.log
6. 卡死大循环用条件断点
7. 复现不了的问题，Copy as cURL 丢给后端

---

## 11. 自测清单

- [ ] 能打开 DevTools 并切换四大面板
- [ ] 用 Network 查出 Status / 参数 / 响应
- [ ] 遇到 401 能查 Authorization 和 Response
- [ ] 遇到 CORS 能查 Allow-* 响应头
- [ ] 用 Elements 实时改样式并定位被覆盖规则
- [ ] 用 Sources 下断点看 Scope/Call Stack
- [ ] 会用条件断点处理大循环
- [ ] 建立「Network→Console→Sources」的标准排错流程

---

## 12. 延伸阅读

- Chrome DevTools 官方文档：https://developer.chrome.com/docs/devtools
- Network 面板详解：https://developer.chrome.com/docs/devtools/network
- Sources 断点调试：https://developer.chrome.com/docs/devtools/javascript
- 交互式调试教程：https://developer.chrome.com/docs/devtools/javascript/breakpoints

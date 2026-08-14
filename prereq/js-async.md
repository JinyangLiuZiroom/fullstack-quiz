# JavaScript 异步（前置知识补完）

> 一句话：JS 是**单线程**的，耗时操作（请求、定时器）不能卡住主线程，所以用「异步」。

## 你应该会什么（检验）
- 知道 `Promise` / `async-await` / 回调是什么
- 知道「JS 是单线程」「事件循环」这两句话的含义

## 30 秒上手
```js
// 回调（老写法，易嵌套）
fetch('/api').then(r => r.json()).then(data => console.log(data));

// async/await（推荐，像同步一样写）
async function load() {
  const r = await fetch('/api');
  const data = await r.json();
  return data;
}
```

## 事件循环（必记）
同步代码先跑完，异步回调（`.then`、定时器、网络返回）进「任务队列」，等主线程空了再按顺序执行。
所以 `setTimeout(fn,0)` 也比后面的同步代码晚执行。

## 一个练习
预测下面输出顺序并验证：先 `console.log('A')`，再 `setTimeout(()=>console.log('B'),0)`，再 `console.log('C')`。
答案：A → C → B。做完回主文章。

## 常见误解
- `await` 只能用在 `async` 函数里。
- 忘了 `await`：拿到的是 Promise 对象不是结果，后面计算全是 `NaN`/undefined。

↩ 回到学习笔记首页：../../learn.html

# JavaScript 基础（前置知识补完）

> 一句话：JS 是网页的「逻辑语言」，前端框架（Vue 等）全是 JS。

## 你应该会什么（检验）
- `let / const` 声明变量，`const` 声明后不能重赋值
- 箭头函数 `() => {}`、数组方法 `map / filter / find / push`、对象、解构、模块 `import / export`

## 30 秒上手
```js
const nums = [1, 2, 3];
const doubled = nums.map(n => n * 2);   // [2,4,6]
const user = { name: 'Li', age: 18 };
const { name } = user;                  // 解构：name = 'Li'

function add(a, b) { return a + b; }
export { add };                          // 模块导出
```

## 一个练习
用 `filter` 从一个数组里筛出年龄 > 18 的人；用解构取出第一个人的名字。做完回主文章。

## 常见误解
- `const` 不是「常量不可变」，是「引用不可重绑」：`const o={}; o.x=1` 合法，但 `o = {}` 报错。
- `==` 会做类型转换（坑多），比较一律用 `===`。
- `map` 返回新数组，不会改原数组；想改原数组用 `forEach`。

↩ 回到学习笔记首页：../../learn.html

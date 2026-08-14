# JSON 是什么（前置知识补完）

> 一句话：JSON 是「前后端传数据的通用文本格式」，长得像 JS 对象但只是字符串。

## 你应该会什么（检验）
- 知道 `{ "name": "Li", "age": 18 }` 这种结构
- 知道 JS 里 `JSON.stringify()` 转字符串、`JSON.parse()` 转对象

## 30 秒上手
```js
const obj = { name: 'Li', age: 18 };
const str = JSON.stringify(obj);     // '{"name":"Li","age":18}'
const back = JSON.parse(str);        // 还原成对象
```

## 一个练习
把一个数组 `JSON.stringify` 后打印，再 `JSON.parse` 回来，确认相等。做完回主文章。

## 常见误解
- JSON 是**字符串**，不是对象；网络传输的永远是字符串，收到后要 `parse`。
- JSON 的 key 必须双引号；JS 对象字面量可以不用引号，但那是两回事。
- `undefined`、函数不能进 JSON，会被丢掉。

↩ 回到学习笔记首页：../../learn.html

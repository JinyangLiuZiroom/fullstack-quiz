# 组件库概念（前置知识补完）

> 一句话：组件库是别人封装好的「现成 UI 零件」，你当标签直接用。

## 你应该会什么（检验）
- 知道「组件库」：别人封装好的 `<el-button>`、`<el-table>`，直接当标签用
- 例子：Element Plus（Vue）、Ant Design（React）

## 30 秒上手
```vue
<template>
  <el-button type="primary" @click="submit">提交</el-button>
  <el-table :data="list"><el-table-column prop="name" label="名称"/></el-table>
</template>
```
不用自己写按钮样式和表格分页，库都给了。

## 一个练习
在一个 Vue 项目里装 Element Plus，用 `<el-button>` 和 `<el-input>` 拼一个表单。做完回主文章（模块十二专门讲）。

## 常见误解
- 组件库不是「框架」，是「基于框架的零件」；先懂 Vue 再用库才不懵。

↩ 回到学习笔记首页：../learn.html

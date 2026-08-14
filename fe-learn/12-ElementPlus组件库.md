# 模块十二：Element Plus 组件库（完整学习指南）

> **学习目标**：掌握 Vue3 官方生态最主流的 UI 组件库 Element Plus，能独立完成安装、按需引入、常用组件（Form/Table/Dialog/Message/Select/Upload）的使用、表单校验、表格分页与自定义主题，并避开「全量引入体积大、表单校验不触发、Dialog 数据不重置、样式被覆盖」等典型坑。
> **适合谁**：已学模块一（Vue3）、模块五（Vite）、模块八（Pinia），能写基础组件，想快速搭出「像那么回事」的后台界面而不想从零写样式。
> **学完能做什么**：用 Element Plus 搭一个带「表单校验 + 表格分页 + 弹窗增删改」的用户管理页，无需自己写 CSS 就能达到中后台水准。

---

## 1. 前置知识（先确认你会这些）

- 模块一：`<script setup>`、`ref`、`reactive`、组件通信 📖 [模块一：Vue3响应式](index.html#01-Vue3响应式与组合式API.md)
- 模块五：会用 Vite 创建/运行项目 📖 [模块五：Vite工程化与构建](index.html#05-Vite工程化与构建.md)
- 模块八：会用 Pinia（本篇实战会接登录态） 📖 [模块八：Pinia状态管理](index.html#08-Pinia状态管理.md)
- 知道「组件库」是什么：别人封装好的 `<el-button>`、`<el-table>`，你直接当标签用 📖 [前置：组件库](../../prereq/index.html#component-library.md)

> Element Plus 是 Vue3 的组件库（Vue2 时代叫 Element UI）。它提供几十个高质量组件，中后台项目首选。

---

## 2. 核心概念：组件库帮你省了什么

不用的代价：按钮样式、表单校验、表格排序分页、弹窗、日期选择器……全要自己写 CSS + JS，工作量巨大。

用 Element Plus：`<el-button>`、`<el-form>`、`<el-table>` 开箱即用，统一视觉、统一交互、统一无障碍。

**代价**：引入体积。所以一定要「按需引入」（见 3.2），别全量打包。

---

## 3. 快速开始：安装与引入

### 3.1 安装

```bash
npm install element-plus
npm install @element-plus/icons-vue   # 图标（单独包）
```

### 3.2 按需引入（推荐，体积最小）

用两个 Vite 插件自动按需导入组件和 API，**模板里写 `<el-button>` 不用手动 import**：

```bash
npm install -D unplugin-auto-import unplugin-vue-components
```

```js
// vite.config.ts
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default {
  plugins: [
    AutoImport({ resolvers: [ElementPlusResolver()] }),
    Components({ resolvers: [ElementPlusResolver()] }),
  ],
}
```

配好后在 `.vue` 里直接用 `<el-button>`、`<el-table>`，插件会在编译时自动补 `import`。**无需在组件中手动引组件**。

### 3.3 全量引入（仅学习/原型用，不推荐生产）

```js
// main.ts
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
app.use(ElementPlus)
```

> 全量引入会把所有组件打进包，首屏体积可能多出几百 KB。生产务必按需（3.2）。

---

## 4. 进阶用法（实战高频组件）

### 4.1 按钮与消息

```vue
<template>
  <el-button type="primary" @click="submit">主要按钮</el-button>
  <el-button type="danger" :loading="loading">删除</el-button>
</template>

<script setup>
import { ElMessage } from 'element-plus'
function submit() {
  ElMessage.success('保存成功')   // 顶部轻提示（命令式，不需在模板写）
}
</script>
```

> `ElMessage`/`ElMessageBox`/`ElNotification` 是**命令式 API**，从 `element-plus` 引入直接用，不用在模板放标签。注意按需引入时这些 API 也需要 AutoImport 自动注入或手动 import。

### 4.2 表单 + 校验（最核心）

```vue
<script setup>
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'

const formRef = ref()
const form = reactive({ name: '', email: '', age: null })

// 校验规则：required 必填、type 类型、trigger 触发时机
const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  age: [{ required: true, message: '请输入年龄', trigger: 'change' }],
}

async function submit() {
  // 必须先 validate，拿到结果再提交
  await formRef.value.validate((valid) => {
    if (!valid) { ElMessage.error('请检查表单'); return }
    // valid=true 才提交
  })
  // 或：const ok = await formRef.value.validate().catch(()=>false)
}
</script>

<template>
  <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
    <el-form-item label="姓名" prop="name">
      <el-input v-model="form.name" />
    </el-form-item>
    <el-form-item label="邮箱" prop="email">
      <el-input v-model="form.email" />
    </el-form-item>
    <el-form-item label="年龄" prop="age">
      <el-input-number v-model="form.age" :min="0" />
    </el-form-item>
    <el-button type="primary" @click="submit">提交</el-button>
  </el-form>
</template>
```

**关键点**：
- `el-form` 的 `:model` 绑数据，`:rules` 绑规则，`ref` 拿实例调 `validate`
- 每个 `el-form-item` 的 `prop` **必须和 rules 的键、model 的字段同名**，否则校验不绑定
- `validate` 的回调 `valid` 为 false 时拦截提交

### 4.3 表格 + 分页

```vue
<script setup>
import { ref } from 'vue'
const tableData = ref([
  { id: 1, name: 'Tom', role: 'admin' },
  { id: 2, name: 'Lucy', role: 'user' },
])
const page = ref(1)
const size = ref(10)
const total = ref(2)
</script>

<template>
  <el-table :data="tableData" border>
    <el-table-column prop="id" label="ID" width="80" />
    <el-table-column prop="name" label="姓名" />
    <el-table-column prop="role" label="角色" />
    <el-table-column label="操作" width="160">
      <template #default="{ row }">
        <el-button size="small" @click="edit(row)">编辑</el-button>
      </template>
    </el-table-column>
  </el-table>
  <el-pagination
    v-model:current-page="page"
    v-model:page-size="size"
    :total="total"
    @current-change="load"
    layout="prev,pager,next"
  />
</template>
```

> 表格数据用 `:data` 传数组；自定义列用 `#default="{ row }"` 拿到整行数据。分页是独立组件，自己维护 `page/total` 并重新拉数据。

### 4.4 弹窗 Dialog

```vue
<script setup>
import { ref } from 'vue'
const visible = ref(false)
const form = ref({ name: '' })
function open() {
  form.value = { name: '' }   // 打开时重置，避免残留上一次数据
  visible.value = true
}
</script>

<template>
  <el-dialog v-model="visible" title="编辑" @closed="form = { name: '' }">
    <el-input v-model="form.name" />
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="visible = false">确定</el-button>
    </template>
  </el-dialog>
</template>
```

> **Dialog 数据重置坑**：用同一个 `form` 对象，关闭后再开可能残留。在 `open()` 或 `@closed` 里重置。

### 4.5 选择器与图标

```vue
<template>
  <el-select v-model="role" placeholder="请选择">
    <el-option label="管理员" value="admin" />
    <el-option label="普通用户" value="user" />
  </el-select>
  <el-icon><Edit /></el-icon>   <!-- 图标需从 @element-plus/icons-vue 引入并注册 -->
</template>
```

### 4.6 自定义主题

方式一（运行时 CSS 变量，最轻）：在全局 CSS 覆盖 Element Plus 的 CSS 变量。

```css
:root {
  --el-color-primary: #2c7be5;     /* 改主色 */
  --el-border-radius-base: 6px;
}
```

方式二（编译期 SCSS 变量，需 Sass）：改 `$primary` 后重新编译，体积更小、更彻底。

---

## 5. 常见坑与排错表

| # | 现象 | 根因 | 正确做法 |
|---|---|---|---|
| 1 | 首屏体积巨大（几百 KB+） | 全量 `app.use(ElementPlus)` | 用 unplugin 按需引入（3.2） |
| 2 | `<el-button>` 没样式/报错未注册 | 没配自动导入或没全量注册 | 配 Components 插件或 main.ts 注册 |
| 3 | 表单校验不触发 | `prop` 和 `rules` 键/字段名不一致 | 三者同名；`validate` 才触发 |
| 4 | `validate` 不返回 Promise | 传了回调就走回调，不返回 Promise | 要么用回调 `valid`，要么不传回调用 `await` |
| 5 | ElMessage 报「未引入样式」 | 命令式 API 样式没自动引入 | 按需引入下 AutoImport 会处理；或手动引 css |
| 6 | Dialog 再打开残留旧数据 | 复用同一 form 对象 | open/closed 时重置 form |
| 7 | 表格不渲染 | `:data` 传了非数组（如 undefined） | 初始化 `ref([])` |
| 8 | 表格列宽不对 / 没边框 | 没设 `border` 或 `width` | 按需加 `border`、列加 `width` |
| 9 | 自定义主色不生效 | 覆盖了错误的变量名 | 用 `--el-color-primary`；注意权重 |
| 10 | 图标不显示 | 没从 icons-vue 引入注册 | `import { Edit } from '@element-plus/icons-vue'` 并注册 |
| 11 | 表单 `el-input` 绑 number 变 string | 输入默认字符串 | 用 `<el-input-number>` 或手动 `Number()` |
| 12 | 按需引入后某些组件样式缺 | 插件没覆盖该组件 | 确认 resolver 配置正确；必要时手动 import 组件+样式 |

---

## 6. 完整实战：用户管理页

**目标**：表单（姓名必填+邮箱格式）新增；表格列出用户带分页；点编辑弹窗回填并保存；删除带确认。

```vue
<script setup>
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const list = ref([])
const total = ref(0)
const page = ref(1)
const dialog = ref(false)
const editing = ref(null)
const formRef = ref()
const form = reactive({ id: null, name: '', email: '' })
const rules = {
  name: [{ required: true, message: '必填', trigger: 'blur' }],
  email: [{ required: true, type: 'email', message: '格式错', trigger: 'blur' }],
}

function openAdd() { editing.value = null; Object.assign(form, { id: null, name: '', email: '' }); dialog.value = true }
function openEdit(row) { editing.value = row.id; Object.assign(form, row); dialog.value = true }
async function save() {
  await formRef.value.validate().catch(() => { throw new Error('invalid') })
  if (editing.value) ElMessage.success('更新 ' + form.name)
  else ElMessage.success('新增 ' + form.name)
  dialog.value = false
  load()
}
function del(row) {
  ElMessageBox.confirm('确认删除 ' + row.name + '?', '提示', { type: 'warning' })
    .then(() => { ElMessage.success('已删除'); load() })
    .catch(() => {})
}
function load() { /* 这里接真实接口，分页用 page */ }
</script>

<template>
  <div>
    <el-button type="primary" @click="openAdd">新增用户</el-button>
    <el-table :data="list" border>
      <el-table-column prop="name" label="姓名" />
      <el-table-column prop="email" label="邮箱" />
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="del(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog v-model="dialog" :title="editing ? '编辑' : '新增'">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="70px">
        <el-form-item label="姓名" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="邮箱" prop="email"><el-input v-model="form.email" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
```

**验收打勾**：
- [ ] 姓名留空点保存，校验拦截并提示
- [ ] 邮箱格式错被拦截
- [ ] 点编辑弹窗回填该行数据，保存后关闭
- [ ] 点删除弹确认框，取消不删
- [ ] 构建产物体积因按需引入明显小于全量

---

## 7. 最佳实践

1. **生产环境一律按需引入**（unplugin 双插件），别全量 `app.use`。
2. **表单三件套 `:model`/`:rules`/`prop` 字段名必须一致**，否则校验失效。
3. **提交前 `await formRef.validate()`**，拿到 false 拦截。
4. **Dialog 打开/关闭重置 form**，避免数据串台。
5. **表格数据初始化为 `[]`**，分页自己维护 `page/total` 重新拉。
6. **命令式 API（Message/MessageBox）** 用 AutoImport 自动注入，或手动 import。
7. **主题用 `--el-color-primary` 等 CSS 变量覆盖**，轻量无需重编译。

---

## 8. 自测清单（全打勾才算掌握）

- [ ] 能配出按需引入并让 `<el-button>` 正常显示
- [ ] 能写带校验规则的表单，且知道 prop/rules/model 三同名约束
- [ ] 能拦截「校验不过不让提交」
- [ ] 能用 el-table + el-pagination 做分页列表
- [ ] 能写弹窗增改且数据不串台
- [ ] 知道全量引入的体积代价和按需解法
- [ ] 会改主色主题、用 Message/MessageBox 做提示与确认

---

## 9. 延伸阅读

- Element Plus 官方文档：https://element-plus.org/zh-CN/
- 按需引入指南：https://element-plus.org/zh-CN/guide/quickstart.html#auto-import
- 表单校验：https://element-plus.org/zh-CN/component/form.html
- 图标列表：https://element-plus.org/zh-CN/component/icon.html

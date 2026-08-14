# 模块一：Vue3 响应式与组合式 API（完整学习指南）

> **学习目标**：从零理解 Vue3 的响应式原理，掌握组合式 API 的写法，能独立搭建带组件、状态管理、表单交互的页面，并避开 90% 新手会踩的响应式坑。
> **适合谁**：有 HTML/CSS/JS 基础，会一点 npm 命令，但没系统学过 Vue 的同学。
> **学完能做什么**：写一个待办清单 + 一个可复用的计数器组件，处理表单、列表、计算属性、子父组件通信，不出现「数据改了页面不动」类问题。

---

## 1. 前置知识（先确认你会这些）

- HTML：能写 `<div>`、`<input>`、`<button>`、`<ul><li>` 📖 [前置：HTML 基础](../prereq/index.html#html-basics.md)
- CSS：知道 class、id、基础选择器 📖 [前置：CSS 基础](../prereq/index.html#css-basics.md)
- JavaScript：变量 `let/const`、箭头函数、数组方法（`map/filter/find/push`）、对象、`Promise/async-await`、模块 `import/export` 📖 [前置：JavaScript 基础](../prereq/index.html#js-basics.md)
- 命令行：`npm install`、`npm run xxx` 能跑通 📖 [前置：命令行与 npm](../prereq/index.html#cli-npm.md)
- 已安装 Node.js（建议 18+） 📖 [前置：Node.js 环境](../prereq/index.html#node-env.md)

如果上面有不会的，先补 JS 基础再回来。Vue 是 JS 框架，JS 不熟会处处卡。

---

## 2. 核心概念：什么是「响应式」

普通 JS 里，你改一个变量，页面不会自动变：

```js
let count = 0
count = 1   // 页面上写着的 0 不会变成 1
```

**响应式**的意思是：当数据变化时，用到这个数据的「视图」自动重新渲染。Vue 帮你做了「数据 → 视图」的自动同步。

### 原理一句话版

Vue3 用 **Proxy**（ES6 代理）包裹你的对象：读取属性时 Vue 记下「谁在用」，修改属性时 Vue 通知「用它的地方重渲染」。

```js
// Vue 内部大致做的事（你不用写，理解即可）
const state = { count: 0 }
const proxy = new Proxy(state, {
  get(target, key) { /* 收集依赖：记录「现在谁在读 count」 */ return target[key] },
  set(target, key, val) { target[key] = val; /* 触发更新：通知所有读 count 的地方 */ return true }
})
```

> Vue2 用的是 `Object.defineProperty`，有「新增属性不响应、数组下标改不了」等缺陷。Vue3 的 Proxy 解决了这些，所以 **Vue3 里给对象新增属性、改数组下标都是响应的**。这点下面坑表会详细讲。

---

## 3. 快速开始：第一个计数器

用 Vite 起一个最小项目（项目搭建见模块五），这里只关注组件：

```vue
<!-- Counter.vue -->
<script setup lang="ts">
import { ref } from 'vue'

// ref 包裹基本类型（数字/字符串/布尔）
const count = ref(0)

function inc() {
  count.value++   // 在 <script> 里必须用 .value 访问/修改
}
</script>

<template>
  <!-- 在模板里写 count（自动解包，不用 .value） -->
  <button @click="inc">点了 {{ count }} 次</button>
</template>
```

逐行说明：
- `<script setup>`：组合式 API 的语法糖，里面的顶层变量/函数**自动暴露给模板**，不用 `return`。
- `ref(0)`：把 `0` 包成响应式对象。模板里 `{{ count }}` 拿到的是它的值，`count.value` 才是真正的数字。
- `@click="inc"`：点击事件绑定，`inc` 是上面定义的函数。
- `count.value++`：**在 JS 逻辑里访问 ref 必须加 `.value`**。这是初学者写错最多的地方。

运行：`npm run dev`，浏览器打开，点按钮数字会加。这就跑通了第一个响应式程序。

---

## 4. 进阶用法

### 4.1 ref vs reactive

| 你有什么 | 用 | 例子 |
| --- | --- | --- |
| 单个基本类型 | `ref` | `const n = ref(0)` |
| 对象 / 表单 | `reactive` 或 `ref(obj)` | `const form = reactive({...})` |
| 需要整体替换对象 | `ref(obj)` | `user.value = {...}` |
| 数组 | `ref([])` 或 `reactive([])` | `const list = ref<string[]>([])` |

```ts
import { ref, reactive } from 'vue'

// ref 包对象
const user = ref({ name: 'Tom', age: 18 })
user.value.age++              // 改属性 ✅
user.value = { name: 'Jerry', age: 20 }   // 整体替换 ✅（ref 允许）

// reactive 包对象
const form = reactive({ name: '', age: 0 })
form.name = 'Tom'            // 改属性 ✅
// form = { name: 'x' }      // ❌ 编译报错：reactive 返回的是只读引用，不能整体重指向
```

**团队实践**：统一用 `ref` 最省心（对象和数组都用 `ref`，避免 reactive 不能整体替换的坑）。也可以对象用 `reactive`、基本类型用 `ref`，但要知道区别。

### 4.2 shallowRef / shallowReactive（了解即可）

默认 `ref/reactive` 是**深层响应**的（对象嵌套多少层都响应）。如果数据很大且不需要深层响应，用 shallow 版提升性能：

```ts
import { shallowRef } from 'vue'
const big = shallowRef({ items: [] })
big.value.items.push(1)   // ❌ 不触发更新（只追踪 .value 这一层）
big.value = { items: [1] } // ✅ 替换整个对象才触发
```

日常业务基本用不到，知道有这回事即可。

### 4.3 computed：派生状态

从其他响应式数据算出来的「只读」值，**带缓存**（依赖没变就不重算）。

```ts
import { ref, computed } from 'vue'

const price = ref(100)
const qty = ref(2)
const total = computed(() => price.value * qty.value)   // 只读 ref

console.log(total.value)   // 200
// total.value = 500      // ❌ 报错：computed 默认只读，不能赋值
```

需要可写时给 setter：

```ts
import { ref, computed } from 'vue'
const first = ref('张')
const last = ref('三')
const fullName = computed({
  get: () => `${first.value}${last.value}`,
  set: (v) => { [first.value, last.value] = v.split('') }
})
fullName.value = '李四'   // first='李', last='四'
```

### 4.4 watch / watchEffect：监听变化

```ts
import { ref, watch, watchEffect } from 'vue'

const keyword = ref('')

// watch：明确监听源，可拿新旧值，默认懒执行（不立即跑）
watch(keyword, (newV, oldV) => {
  console.log(`从 ${oldV} 变到 ${newV}`)
})

// 监听多个源，用数组
watch([price, qty], ([p, q]) => { /* ... */ })

// 监听对象深层属性
watch(() => form.name, (v) => { /* ... */ })

// watchEffect：立即执行一次，自动收集依赖，依赖变就重跑
watchEffect(() => {
  console.log('keyword 现在是', keyword.value)
})
```

**选哪个**：
- 要「数据变了做副作用（如调接口）」且想拿旧值 → `watch`
- 想「自动跑一段依赖响应式的逻辑」→ `watchEffect`
- 搜索联想用 `watch` + 防抖，**别用 `watchEffect`**（它会一上来就发一次请求）

### 4.5 生命周期钩子

组件从创建到销毁的过程，Vue 提供钩子函数让你在特定时机做事：

```ts
import { onMounted, onUpdated, onUnmounted } from 'vue'

onMounted(() => { console.log('组件挂载完，DOM 可用，这里发首屏请求') })
onUpdated(() => { console.log('数据变了，DOM 更新完') })
onUnmounted(() => { console.log('组件销毁，清理定时器/事件监听') })
```

常用就这三个。还有 `onBeforeMount` 等，用到再查。

### 4.6 模板语法要点

```vue
<template>
  <!-- 文本插值 -->
  <p>{{ msg }}</p>

  <!-- 属性绑定用 : 或 v-bind -->
  <img :src="url" :alt="desc" />

  <!-- 事件用 @ 或 v-on -->
  <button @click="submit" @mouseenter="onHover">提交</button>

  <!-- 条件渲染 -->
  <p v-if="score >= 60">及格</p>
  <p v-else-if="score >= 0">不及格</p>
  <p v-else>未考试</p>

  <!-- 列表渲染：必须加 :key（唯一且稳定，别用 index 当 key 做增删！） -->
  <li v-for="u in users" :key="u.id">{{ u.name }}</li>

  <!-- 双向绑定：表单输入实时同步到数据 -->
  <input v-model="name" />
  <input v-model.number="age" />   <!-- .number 自动转数字 -->
  <input v-model.trim="name" />    <!-- .trim 去首尾空格 -->
</template>
```

**v-if 与 v-for 不能同元素**：`v-if` 优先级高于 `v-for`（Vue3），同元素时 `v-if` 访问不到 `v-for` 的变量。要过滤列表，用 `computed` 先算好再 `v-for`，或外层包 `<template v-for>`。

**key 为什么重要**：Vue 用 key 识别列表里的每个节点。用 `index` 当 key，在列表中间插入/删除时会出现「状态错乱」（比如输入框内容串位）。用稳定唯一 id（如后端返回的 `id`）。

### 4.7 组件与通信

**父传子**：`defineProps`

```vue
<!-- Child.vue -->
<script setup lang="ts">
defineProps<{ title: string; count?: number }>()
</script>
<template><h2>{{ title }} ({{ count ?? 0 }})</h2></template>

<!-- Parent.vue -->
<Child :title="'你好'" :count="3" />
```

**子传父**：`defineEmits`

```vue
<!-- Child.vue -->
<script setup lang="ts">
const emit = defineEmits<{ (e: 'change', val: number): void }>()
function onClick() { emit('change', 10) }
</script>
<template><button @click="onClick">通知父组件</button></template>

<!-- Parent.vue -->
<Child @change="(v) => console.log('收到', v)" />
```

**跨层传递**：`provide / inject`（祖父直接给孙子，跳过中间层）

```ts
// 祖先
import { provide } from 'vue'
provide('theme', 'dark')

// 后代（任意深层）
import { inject } from 'vue'
const theme = inject('theme', 'light')   // 第二个参数是默认值
```

**全局状态**：多组件共享用 Pinia（见延伸阅读）。简单场景 `provide/inject` 够用。

**插槽 slot**：父组件往子组件里塞内容

```vue
<!-- Card.vue -->
<template><div class="card"><slot>默认内容</slot></div></template>

<!-- 使用 -->
<Card>这里是你传进来的内容</Card>
```

---

## 5. 常见坑与排错（新手必看，建议打印贴在显示器）

| # | 现象 | 根因 | 正确写法 |
| --- | --- | --- | --- |
| 1 | 页面不更新，控制台没报错 | `<script>` 里改 ref 忘了 `.value` | `count.value++` 不是 `count++` |
| 2 | 解构 reactive 后不响应 | `const { name } = form` 拿到的是普通值 | 用 `toRefs(form)` 或 `toRef(form,'name')` |
| 3 | `reactive` 整体替换报错/不更新 | reactive 返回只读引用，不能重指向 | 用 `ref(obj)` 包一层再整体替换 |
| 4 | 给对象新增属性不响应 | 实际 Vue3 是响应的，但有人误以为不响应而卡住 | Vue3 直接 `obj.newKey = 1` 即可，不用 `Vue.set` |
| 5 | 数组下标/length 改了不刷新 | Vue2 的坑，Vue3 已修复 | Vue3 直接改即可，别怀疑自己 |
| 6 | `computed` 赋值报错 | computed 默认只读 | 要么只读，要么加 setter |
| 7 | `computed` 当函数调用 `total()` 报 undefined | computed 返回的是 ref，不是函数 | 用 `total.value` |
| 8 | 解构 props 失去响应 | `const { msg } = props` | `const msg = toRef(props,'msg')` 或直接 `props.msg` |
| 9 | watch 不触发 | 监听的是「值」而不是「getter」，或深层对象没开 deep | `watch(() => form.name, fn)` 或 `watch(obj, fn, {deep:true})` |
| 10 | 搜索请求发了两次/顺序乱 | 用 `watchEffect` 立即执行 + 没防抖 | 用 `watch` + 防抖（`setTimeout` 清空） |
| 11 | v-for 用 index 当 key，列表增删后状态错乱 | key 不稳定 | 用后端返回的稳定 id |
| 12 | v-if 和 v-for 写同一元素，变量找不到 | 优先级冲突 | 用 computed 过滤，或外层 `<template v-for>` |
| 13 | 异步里改 ref 不更新 | 实际会更新，但忘了 `.value` | `setTimeout(() => count.value++, 0)` |
| 14 | 表单 `v-model` 不生效 | 绑的不是响应式变量，或用了 `reactive` 整体替换 | 用 `ref/reactive` 且改属性 |
| 15 | `onMounted` 里拿不到 DOM | 用了 `ref` 模板引用但名字不匹配 | `<div ref="box">` 对应 `const box = ref()`，且要在 onMounted 后访问 |
| 16 | 多个组件共享状态各自独立 | 在各自组件里 `ref()`，不是同一份 | 提到父组件或用 Pinia/provide |

**口诀**：模板里无 `.value`，脚本里有 `.value`；别解构 reactive/props，要解用 `toRefs`；想整体换对象用 `ref`；computed 是只读 ref，赋值走 setter。

---

## 6. 完整实战：待办清单（从 0 到 1 可跑通）

目标：输入框回车加待办，勾选标记完成（划线），实时显示剩余数，可删除。

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

interface Todo { id: number; text: string; done: boolean }

const todos = ref<Todo[]>([])
const input = ref('')

const left = computed(() => todos.value.filter(t => !t.done).length)

function add() {
  const text = input.value.trim()
  if (!text) return                 // 空内容不添加
  todos.value.push({ id: Date.now(), text, done: false })
  input.value = ''                  // 清空输入框
}
function toggle(id: number) {
  const t = todos.value.find(t => t.id === id)
  if (t) t.done = !t.done
}
function remove(id: number) {
  todos.value = todos.value.filter(t => t.id !== id)
}
</script>

<template>
  <div class="app">
    <h1>待办清单（还剩 {{ left }} 条）</h1>
    <input
      v-model="input"
      @keyup.enter="add"
      placeholder="写点啥，回车添加"
    />
    <button @click="add">添加</button>

    <ul>
      <li v-for="t in todos" :key="t.id">
        <input type="checkbox" :checked="t.done" @change="toggle(t.id)" />
        <span :style="{ textDecoration: t.done ? 'line-through' : 'none' }">
          {{ t.text }}
        </span>
        <button @click="remove(t.id)">删除</button>
      </li>
    </ul>

    <p v-if="todos.length === 0">还没有待办，加一条吧～</p>
  </div>
</template>
```

把上面代码存成 `App.vue` 跑起来，验收：
- [ ] 输入回车能添加
- [ ] 勾选能划线、剩余数实时减
- [ ] 删除能移除
- [ ] 空内容不会添加

能写出来 = 本模块基础过关。再加一个**可复用计数器组件**（用 props/emits 通信）练组件拆分，就完整了。

---

## 7. 最佳实践（团队写代码照这个来）

1. **统一用 `<script setup lang="ts">`**，类型标注清楚，少用 `any`。
2. **状态用 `ref` 为主**，对象和数组也行，减少 reactive 心智负担。
3. **派生值用 `computed`**，不要在模板里写复杂表达式（如 `{{ list.filter(...).length }}` 应提成 computed）。
4. **列表 key 用稳定 id**，禁用 index。
5. **组件通信**：父子用 props/emits；跨层用 provide/inject；全局用 Pinia。
6. **副作用用 `watch`**，避免 `watchEffect` 误触发。
7. **组件拆分原则**：一个组件只做一件事；可复用 UI 抽成组件；超过 200 行考虑拆。
8. **异步请求放 `onMounted` 或事件里**，不要在 `setup` 顶层直接 `await` 顶层（可用 `await` 但会阻塞）。
9. **模板保持简洁**，逻辑放 `<script>`，复杂判断提成函数/computed。

---

## 8. 自测清单（学完对照，全打勾才算掌握）

- [ ] 能解释「响应式」是什么，Proxy 大概怎么工作
- [ ] 知道 ref 在模板和脚本里访问方式的区别
- [ ] 能说出 ref 和 reactive 的 3 个区别
- [ ] computed 的缓存和只读特性说得出
- [ ] watch 和 watchEffect 知道何时用哪个
- [ ] 能写 v-if / v-for / v-model / :key 并知道坑
- [ ] 父子组件能用 props / emits 通信
- [ ] 能独立写出待办清单并跑通
- [ ] 遇到「页面不更新」能按第 5 节排错表自查

---

## 9. 延伸阅读

- Vue3 官方文档（中文，最权威）：https://cn.vuejs.org/guide/introduction.html
- 响应式基础：https://cn.vuejs.org/guide/essentials/reactivity-fundamentals.html
- 组件基础：https://cn.vuejs.org/guide/essentials/component-basics.html
- Pinia 状态管理：https://pinia.vuejs.org/
- 组合式 API 手册：https://cn.vuejs.org/api/composition-api-setup.html

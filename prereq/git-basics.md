# Git 基础（前置知识补完）

> 一句话：版本管理，记录每次改动、方便协作和回滚。

## 你应该会什么（检验）
- 用过 `git add` / `git commit` / `git push`
- 知道 `clone`、`pull`、`status`

## 30 秒上手
```bash
git add .                 # 暂存改动
git commit -m "feat: xxx"  # 提交（写清楚改了啥）
git push origin master    # 推到远程
git pull                  # 拉别人的改动
```

## 一个练习
建个测试仓库，改一个文件，走一遍 add→commit→push，再 `git log` 看历史。做完回主文章。

## 常见误解
- `commit` 只提交到本地，必须 `push` 别人才看得到。
- 提交信息写「fix」没用，写「修了 XX 导致的 YY 问题」才好复盘。

↩ 回到学习笔记首页：../../learn.html

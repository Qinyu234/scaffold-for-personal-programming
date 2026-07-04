# Lucid

**EN:** Lucid makes hidden code structure visible and editable. You choose what matters (Views), work on a **Virtual File** copy (filter, cut, splice), and sync back via **pull**, **push overlay**, or **push fork**. Phase 0 builds **Lucid IR** as selection criteria; Phase 1 delivers Views + Virtual Files in VSCode.

**中文：** Lucid 让隐藏结构可见且可编辑。用 **View** 选相关内容，在 **Virtual File** 副本上操作（筛选、剪切、拼接），通过 **pull**、**push overlay**、**push fork** 与真源同步。Phase 0 建设 **Lucid IR** 作为选择标准；Phase 1 在 VSCode 交付 Views + Virtual Files。

**Canonical design / 现行设计:** `DESIGN.md` (**20260704**). **Phase 1 shipped:** VS Code extension + Virtual Files.

**中文：** 现行设计见 `DESIGN.md`（**20260704**）。**Phase 1 已交付：** VS Code 扩展 + Virtual Files。

## What Works (Phase 1) / 当前可用（Phase 1）

- **VS Code extension** — Def-Use flow, graph panel, `lucid://` editable virtual files
- **Commands** — open view, save selected/all, pull, discard, toggle fold, fork
- **CLI** — `lucid analyze <file>` (unchanged)
- **Six views** — def-use full; others minimal graph stubs
- **JS/TS + Python** — analyze + virtual doc (Python dataflow-oriented IR)
- **8 test suites** — `npm test`

## What Phase 2 Adds / Phase 2 将新增

- cross-file Projection Slice / 跨文件切片
- translation virtual files / 语言转换副本
- runtime trace / 运行时 trace
- RPCM (Cognitive WS) automation / RPCM 自动化

## Repository Map / 仓库地图

| Path | EN | 中文 |
| --- | --- | --- |
| `DESIGN.md` | Product truth (20260704) | 产品真源 |
| `LANGUAGE.md` | EN/ZH policy | 语言规范 |
| `MANUAL.md` | Work + use guide | 操作手册 |
| `project/PURPOSE.md` | Why and phases | 目的与阶段 |
| `project/ARCHITECTURE.md` | Modules | 模块边界 |
| `project/TASKS.md` | Test-first tasks | 测试先行任务 |
| `project/WORKFLOW.md` | Execution index | 执行索引 |

## Quick Start / 快速开始

```bash
cd project
npm install
npm test
node ./out/cli.js analyze ./examples/CartPanel.tsx
```

## Workflow / 工作流

1. read `DESIGN.md` 20260704 / 读现行设计
2. follow `project/TASKS.md` / 按任务顺序
3. tests first / 先测试
4. bilingual docs per `LANGUAGE.md` / 双语文档

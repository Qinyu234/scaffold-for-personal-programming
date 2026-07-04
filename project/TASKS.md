# Tasks / 任务

**EN:** `DESIGN.md` 20260704. **Phase 1 complete** (VS Code extension + virtual layer).

**中文：** `DESIGN.md` 20260704。**Phase 1 已完成**（VS Code 扩展 + virtual 层）。

---

## Phase 0 — Done / 已完成

T1–T4: Lucid IR, multi-language CLI, stable spans.

---

## Phase 1 — Done / 已完成

| Task | EN | 中文 |
| --- | --- | --- |
| T5 | Projection Slice (`buildDefUseSlice`) | Def-Use 切片 |
| T6 | Layout, fold, `.lucid/state/{stateName}/fold.json` | 排版、折叠、持久化 |
| T7 | pull, push overlay (`save_selected` / `save_all`) | 拉取、覆盖写回 |
| T8 | fork function (same file) / file (same dir or `.py` copy) | fork |
| T9 | VS Code: `lucid://` FS provider, Cytoscape graph panel, commands | 扩展壳 |
| T10 | Def-Use E2E: state → graph + virtual doc → edit → save | 端到端 |
| Views | Stubs: entry-point, impact, structure, event-flow, data-flow graphs | 六 View 最小图 |

**Tests:** 8 suites (`npm test`).

---

## Phase 2 — In progress / 进行中

| Task | EN | 中文 | Tests |
| --- | --- | --- | --- |
| T11 | Workspace `Project` + cross-file def-use | 工作区跨文件 def-use | `phase2.test.ts` T1 |
| T12 | Multi-file virtual layout + push | 多文件虚拟文档与写回 | T2, T5 |
| T13 | Trace overlay (`inferred` / `observed`) | 运行时 trace 叠加 | T3 |
| T14 | Translation VF scaffold (`lucid://translation/...`) | 转换副本脚手架 | T4 |
| T15 | Joern HTTP adapter (fallback heuristic) | Joern 适配器 | manual / smoke |
| T16 | chokidar pull watch, cytoscape-dagre entry-point | 扩展增强 | TBD |

**Tests:** 9 suites (`npm test`).

## Phase 3 — Next / 下一步

- RPCM automation (Cognitive WS)
- explicit contract on save
- MLIR lowering

---

## Commands (extension) / 扩展命令

| Command | EN |
| --- | --- |
| `Lucid: Open Def-Use View` | Primary flow |
| `Lucid: Open View…` | Other view graphs |
| `Lucid: Save Selected` / `Save All` | push overlay |
| `Lucid: Pull` | merge after real file change |
| `Lucid: Discard Virtual Edits` | discard |
| `Lucid: Toggle Fold` | manual fold |
| `Lucid: Fork…` | fork |

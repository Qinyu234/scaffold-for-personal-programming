# Research / 调研

## Global Approach / 全局方案

**EN:** `DESIGN.md` (20260702) centers **Views + Virtual Files** in Phase 1. Phase 0 IR is selection criteria only. Reuse VSCode and mature parsers; build projection and sync ourselves.

**中文：** `DESIGN.md`（20260702）将 **Views + Virtual Files** 置于 Phase 1 核心。Phase 0 IR 仅为选择标准。复用 VSCode 与成熟解析器；自研投影与同步。

| Candidate | Role | Decision | Why (EN) | 说明（中文） |
| --- | --- | --- | --- | --- |
| `ts-morph` | TS/JS AST + refs | adopt | Phase 0 primary | Phase 0 主路径 |
| `tree-sitter` | Multi-language parse | adopt (target) | DESIGN language scope | 多语言解析目标 |
| `zod` | IR validation | adopt | Testable CLI output | 可测试 IR 输出 |
| Joern | Python/C++ CPG | adopt (target) | DESIGN def-use for Py/C++ | Py/C++ def-use 目标 |
| Heuristic Py/C++ | interim | adopt (labeled) | Until Joern integrated | Joern 集成前诚实降级 |
| VSCode FS + diff | Virtual File host | adopt (Phase 1) | Primary product shell / 主产品壳 |
| Extension API | UI entry | adopt (Phase 1) | Target VS Code / 目标 VS Code |
| py2cpp / PyCer | translation | defer Phase 2 | Translation layout | Phase 2 转换排版 |
| MLIR | lowering | defer Phase 3 | Not MVP | 非 MVP |

## Repository Reality / 仓库现状

- **EN:** Live path: `cli.ts` → `contract.ts` → JSON. No `projection/`, `virtual/`, or extension yet.
- **中文：** 实路径：`cli.ts` → `contract.ts` → JSON。尚无 `projection/`、`virtual/`、扩展。

## Phase 0 Decision / Phase 0 决策

**EN:** Phase 1 UI: **JS (+TS) and Python** at similar depth; Python leads **dataflow** typing. C++/Rust: CLI IR in parallel.

**中文：** Phase 1 UI：**JS（含 TS）与 Python** 同级；Python 主攻 **dataflow** 类型。C++/Rust：并行 CLI IR。

| Phase 1 Decision / Phase 1 决策

**EN:** Ship **VS Code extension** first. Core library consumed by extension + CLI. Minimum: analyze active file, Def-Use slice, extension commands registered.

**中文：** 先交付 **VS Code 扩展**。核心库供扩展与 CLI 共用。最小：分析当前文件、Def-Use 切片、注册命令。

## Phase 2 Tool Audit / Phase 2 工具审计（20260701）

| Tool | In repo? | Direct use? | Phase 2 role | 说明 |
| --- | --- | --- | --- | --- |
| **ts-morph** | ✅ dep | **Yes** | Cross-file `findReferences` via workspace `Project` | 无需新依赖；`addSourceFilesFromTsConfig` |
| **zod** | ✅ dep | Yes | IR validation (unchanged) | 已有 |
| **cytoscape** | ✅ CDN | Yes | Graph panel (unchanged) | 已有 |
| **chokidar** | ✅ dep, unused | Yes | File watch → pull (extension, TBD) | 待接扩展 |
| **cytoscape-dagre** | ❌ | npm add | Entry Point DAG layout | 下一小步 |
| **tree-sitter** | ❌ | **No** (compile issues in Phase 0) | Still deferred | 仍延后 |
| **Joern** | ❌ external JVM | **HTTP only** | `joern --server` + `/query-sync`; `ingestion/joern.ts` adapter | 需本地安装；无则启发式降级 |
| **py2cpp / PyCer** | ❌ external CLI | subprocess (scaffold) | Translation VF; `virtual/translation.ts` placeholder | 下一小步接 CLI |
| **OpenTelemetry** | ❌ | optional npm | Runtime trace ingest | trace overlay 类型已就绪 |
| **VS Code diff/FS** | ✅ | Yes | Multi-file push | `push.ts` 已支持多文件 |

**Decision:** Phase 2 ships **cross-file TS/JS** on existing ts-morph; **Joern** and **translation CLIs** are thin adapters with honest fallback; **RPCM** stays Phase 3.

**中文：** Phase 2 先用 ts-morph 做跨文件；Joern / 转换 CLI 为可选外挂；RPCM 仍属 Phase 3。

## Deferred / 延后

- Cross-file workspace IR / 跨文件工作区 IR
- Runtime trace overlay / 运行时 trace
- explicit contract on save / 保存时 explicit 强制
- MLIR / assembly lowering / MLIR 与 assembly 降级

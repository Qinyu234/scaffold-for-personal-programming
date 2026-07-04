# Lucid Manual / Lucid 操作手册

**EN:** This manual has two jobs: how to work on the repository after reading it, and how to use the currently implemented features after reading it.

**中文：** 这份手册只做两件事：说明读完之后如何继续开发，以及说明读完之后如何使用当前已经实现的功能。

See also / 另见：`LANGUAGE.md`, `DESIGN.md`.

## 1. How To Work After Reading / 读完后如何工作

### Current Truth / 当前事实

| EN | 中文 |
| --- | --- |
| Canonical design: `DESIGN.md` **20260704** | 现行设计：`DESIGN.md` **20260704** |
| Primary shell: **VS Code extension** in `project/` | 主壳：`project/` 内 **VS Code 扩展** |
| Core library + CLI share `src/core/analyze.ts` | 核心库与 CLI 共用 `src/core/analyze.ts` |
| Test-first discipline | 测试先行 |
| Do not revive old Python GUI/app | 勿恢复旧 Python GUI |

### Reading Order / 阅读顺序

When changing the project, read in this order:

修改项目时，按这个顺序阅读：

1. `DESIGN.md`
2. `project/PURPOSE.md`
3. `project/RESEARCH.md`
4. `project/ARCHITECTURE.md`
5. `project/TASKS.md`
6. `project/WORKFLOW.md`

### Working Order / 工作顺序

**EN:** After reading the docs above, follow this loop:

**中文：** 读完上面的文档后，按下面的循环工作：

1. define or narrow the claim / 先定义或收窄功能承诺
2. write or update tests first / 先写或更新测试
3. update implementation / 再改实现
4. run the relevant test slice / 跑对应测试
5. run `npm test` before closing the change / 收尾前跑 `npm test`

### Architecture Boundary / 架构边界

| Module | EN | 中文 |
| --- | --- | --- |
| `src/ingestion/` | Language detection, parsing, symbol/state discovery | 语言检测、解析、符号/state 发现 |
| `src/analysis/` | Lucid IR: write/use/trigger contracts | Lucid IR：写/读/触发合约 |
| `src/cli.ts` | Phase 0 CLI adapter | Phase 0 CLI 适配 |
| `src/projection/` (planned) | View filter, cut, layout; Projection Slice | View 筛选、剪切、排版；Projection Slice |
| `src/virtual/` (planned) | pull, push, fork, fold state, surface sync | 同步、折叠状态、呈现面 sync |

**EN:** **Phase 0** = IR only (selection criteria). **Phase 1** = Views + Virtual Files together. Fork output stays in the **same file** (function) or **same directory** (file). **Rebind** only after **user confirmation** (including graph node actions).

**中文：** **Phase 0** = 仅 IR（选择标准）。**Phase 1** = Views 与 Virtual Files 一起做。Fork 产出在**同文件**（函数）或**同目录**（文件）。**重绑**仅在**用户确认**后（含图节点操作）。

**EN:** Finish Phase 0 multi-language def-use and stable spans before Phase 1 extension work unless `TASKS.md` says otherwise.

**中文：** 除非 `TASKS.md` 另有说明，先完成 Phase 0 多语言 def-use 与稳定 span，再做 Phase 1 扩展。

### Editing Rule / 编辑原则

**EN:** When design and code diverge, narrow the claim, write the test, then change the code.

**中文：** 当设计与代码不一致时，先缩小承诺，再写测试，最后改代码。

## 2. How To Use What Exists / 读完后如何使用当前功能

### What Exists Today / 当前已有功能

| Feature | EN | 中文 |
| --- | --- | --- |
| CLI analysis | Analyze a single file and emit contract JSON | 分析单文件并输出 contract JSON |
| TS/JS analyzer | Primary path using `ts-morph` | 基于 `ts-morph` 的主路径 |
| Python fallback | Heuristic contract extraction | 启发式 Python contract 提取 |
| C/C++ fallback | Heuristic contract extraction | 启发式 C/C++ contract 提取 |
| Tests | Custom runner for parser, symbols, contracts, CLI | 自定义测试运行器覆盖解析、符号、合约与 CLI |

### Extension (Phase 1) / 扩展（Phase 1）

**EN:** F5 in `project/` → open `examples/CartPanel.tsx` → **Lucid: Open Def-Use View** → pick state → graph + `lucid://` doc → edit → **Save Selected** or **Save All**.

**中文：** F5 → 打开 `examples/CartPanel.tsx` → **Lucid: Open Def-Use View** → 选 state → 图 + 虚拟文档 → 编辑 → 保存。

| Command | EN | 中文 |
| --- | --- | --- |
| Open Def-Use View | Primary | 主流程 |
| Save Selected / Save All | push overlay | 写回 |
| Pull | Merge after real change | 合并 |
| Toggle Fold | Fold functions | 折叠 |
| Fork… | fork function/file | fork |

### Extension Dev / 扩展开发

**EN:** Open `project/` in VS Code → F5 → Command Palette → `Lucid: Open Def-Use View`.

**中文：** VS Code 打开 `project/` → F5 → `Lucid: Open Def-Use View`。

### Basic Commands / 基本命令

Run from `project/`:

在 `project/` 目录下运行：

```bash
npm install
npm run compile
npm test
node ./out/cli.js analyze ./examples/CartPanel.tsx
```

Filter one variable:

按单个变量过滤：

```bash
node ./out/cli.js analyze ./examples/CartPanel.tsx --variable cartTotal
```

### Language Support / 语言支持

| Language | EN | 中文 |
| --- | --- | --- |
| TS/JS | Primary path | 主路径 |
| Python | Interim heuristics; Joern target per DESIGN | 过渡启发式；DESIGN 目标 Joern |
| C/C++ | Interim heuristics; Joern target | 过渡启发式；目标 Joern |
| Rust | Mapped to C++ pipeline per DESIGN | 按 DESIGN 映射 C++ 管线 |

### Known Limits / 已知限制

- **Phase 1** (Views, `lucid://`, pull/push/fork) is designed but not shipped / Phase 1 已设计未交付
- Lucid IR today is CLI JSON only—not yet fed into Virtual Files / 当前 IR 仅 CLI JSON，尚未接入 Virtual File
- Python/C++ use heuristic fallback until Joern integration / Python/C++ 为启发式降级，待 Joern
- no cross-file workspace graph yet / 尚无跨文件工作区图
- fork rebind is never automatic / fork 重绑绝不自动执行

### Global Idea Hospice Install / 全局 Idea Hospice 安装

**EN:** `idea-hospice` is installed globally for Cursor and is not vendored into this repo.

**中文：** `idea-hospice` 已作为 Cursor 全局能力安装，不在本仓库内部维护。

- skill: `C:/Users/q234zhan/.cursor/skills/idea-hospice/`
- MCP: `C:/Users/q234zhan/.cursor/mcp.json`
- Python dependency: `python -m pip install mcp`

```json
{
  "mcpServers": {
    "idea-hospice": {
      "command": "python",
      "args": [
        "C:/Users/q234zhan/.cursor/skills/idea-hospice/scripts/mcp_server.py"
      ],
      "env": {
        "IH_ROOT": "D:/10_projects/ideas"
      }
    }
  }
}
```

**EN:** If Cursor does not show the MCP server, reload or restart Cursor.

**中文：** 如果 Cursor 没有显示这个 MCP server，请重载或重启 Cursor。

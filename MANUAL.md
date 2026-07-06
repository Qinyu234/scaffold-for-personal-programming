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
| Full dev stack skill | `resume/skills/packages/project-init.skill` + `coding-workflow` + `lucid-workflow` |
| Runtime | **Node/npm** in `lucid/project/`（1 种运行时 → 不用 Docker / 不用 Python venv） |
| Do not revive old Python GUI/app | 勿恢复旧 Python GUI |

### Runtime / 环境（与 coding-workflow 同步）

| EN | 中文 |
| --- | --- |
| Lucid **build/runtime** = **TypeScript/Node** only (`lucid/project/`) | 构建/运行 = **TS/Node**，在 `lucid/project/` |
| Commands: `npm install`, `npm run compile`, `npm test` — **from `lucid/project/`** | 命令均在 **`lucid/project/`** 执行 |
| **No** `.venv` in this repo; Python in examples is **analyzed**, not Lucid's runtime | 本仓库**无** Python venv；examples 里 Python 是被分析对象 |
| **≥3 runtime languages** → Docker per `coding-workflow`; Lucid today = **1 language** → **no Docker** | 三语及以上才 Docker；Lucid 当前单语 → 不用 Docker |
| Target repos you analyze may use their own venv/Docker — Lucid F5 does not replace them | 被分析的目标项目自有 venv/Docker，与 Lucid 扩展分离 |

See `runtime.json` at repo root. Python-side projects (e.g. novel-qola): **`.venv` + py-3.11** per same rules.

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

**EN:** After the user decides scope, follow this loop (**DESIGN is updated first**):

**中文：** 用户确定范围后，按下列循环工作（**先更新 DESIGN**）：

1. update `DESIGN.md` (truth + implementation status) / 更新 `DESIGN.md`
2. sync README, MANUAL, TASKS, WORKFLOW, PURPOSE, ARCHITECTURE / 同步文档
3. write or update tests first / 先写或更新测试
4. update implementation / 再改实现
5. run `npm test` before closing / 收尾前跑 `npm test`

### Architecture Boundary / 架构边界

| Module | EN | 中文 |
| --- | --- | --- |
| `src/ingestion/` | Language detection, parsing, symbol/state discovery | 语言检测、解析、符号/state 发现 |
| `src/analysis/` | Lucid IR: write/use/trigger contracts | Lucid IR：写/读/触发合约 |
| `src/cli.ts` | Phase 0 CLI adapter | Phase 0 CLI 适配 |
| `src/projection/` | View filter, cut, layout; def-use + data-flow slices | View 切片 |
| `src/virtual/` | pull, push, fork, fold state, surface sync | 同步、折叠、呈现面 sync |

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

### Extension (Phase 1 + Phase 2) / 扩展（Phase 1 + Phase 2）

**EN:** F5 in `project/`:

- **JS/TS:** `examples/CartPanel.tsx` → **Lucid: Open Def-Use View** (cross-file spans refresh on Pull) → graph + VF → save.
- **Python:** `examples/cart.py` → **Lucid: Open Data Flow View (Python)** or **Lucid: Open Translation (Python→C++)** → pick scope → graph/VF → edit → save.

**中文：** F5 后：JS/TS 用 Def-Use（Pull 可刷新跨文件）；Python 用 Data Flow 或 Translation。

### Use on your target repo / 对目标项目使用

**EN:** Lucid is **not installed from Marketplace yet**. You run the extension via **F5 debug**, then work on **your codebase** in the **Extension Development Host** window — not in the `lucid/project` window where you pressed F5.

**中文：** 扩展**尚未上架**。用 **F5 调试**启动后，在弹出的 **Extension Development Host** 窗口里打开**你的目标项目**，对着目标文件用命令；不是在按 F5 的那个 `lucid/project` 窗口里分析 `examples/`。

**Steps / 步骤**

1. **Prepare once** — in `lucid/project/`: `npm install` → `npm run compile`
2. **VS Code** open folder **`lucid/project/`** (Lucid 源码)
3. **Run → Start Debugging (F5)** → a **new window** opens (title bar says `[Extension Development Host]`)
4. In **that new window**: **File → Open Folder…** → select **your target repo** (e.g. `D:/10_projects/my-app`)
5. Open a **target source file** in the editor (make it the active tab)
6. **Ctrl+Shift+P** → run a Lucid command, e.g.:
   - Any supported file → **Lucid: Open (dependency cluster)** — default entry; graph shows imports + resolved local files; **Analyze…** drill-in to Def-Use / Entry Point / …
   - TS/JS (direct lens) → **Lucid: Open Def-Use View** → pick a state name
   - Python (direct lens) → **Lucid: Open Data Flow View (Python)** → pick a variable
7. Lucid opens a **graph** + **`lucid://…` virtual document** beside your real file. Edit VF → **Lucid: Save Selected / Save All** writes back to the **real file**.

**Which file is analyzed? / 分析哪个文件？**

| Rule | 说明 |
| --- | --- |
| Commands use the **currently active editor tab** | 命令针对**当前激活**的编辑器标签页 |
| Put the cursor in the target file before Ctrl+Shift+P | 先点开目标文件，再开命令面板 |
| Cross-file / `.lucid/trace.json` use **workspace root** = folder you opened in step 4 | 跨文件、trace 路径以**目标项目根目录**为准 |

**Quick map / 文件类型 → 命令**

| Target file | Command |
| --- | --- |
| `.ts` / `.tsx` / `.js` / `.py` | **Open (dependency cluster)** — default; then **Analyze…** on a node |
| `.ts` / `.tsx` / `.js` | Open Def-Use / Entry Point / Event Flow / Impact (direct lens) |
| `.py` | Open Data Flow / Impact / Translation (direct lens) |
| Any open VF session | Load Trace Overlay; Put trace at `<target-root>/.lucid/trace.json` |

**CLI without UI / 不用 UI 时**

Analyze any file path from terminal (still run from `lucid/project/`):

```bash
node ./out/cli.js analyze D:/path/to/your/file.tsx
node ./out/cli.js analyze D:/path/to/your/file.py --variable myVar
```

| Command | EN | 中文 |
| --- | --- | --- |
| **Open (dependency cluster)** | focal file → import cluster; collapse slider; Analyze… drill-in | **默认入口**：依赖聚合 → drill-in 语义 lens |
| Open Event Flow View (JS/TS) | event → state E2E | JS/TS 事件流 |
| Open Entry Point View (JS/TS) | call tree E2E | JS/TS 调用树 |
| Open Def-Use View | JS/TS state E2E | JS/TS state 流 |
| Open Data Flow View (Python) | Python E2E | Python 强类型数据流 |
| Open Translation (Python→C++) | Python→C++ scaffold VF | Python 转 C++ 脚手架 |
| Load Trace Overlay (JSON) | auto `.lucid/trace.json` + manual reload | 自动 trace + 手动重载 |
| Save Selected / Save All | push overlay | 写回 |
| Pull | Merge after real change (cross-file def-use refresh) | 合并（含跨文件刷新） |
| Toggle Fold | Fold functions | 折叠 |
| Fork… | fork function/file | fork |

### Extension Dev / 扩展开发

**EN:** Open `project/` in VS Code → F5 → Command Palette → `Lucid: Open Def-Use View`.

**中文：** VS Code 打开 `project/` → F5 → `Lucid: Open Def-Use View`。

### Basic Commands / 基本命令

**EN:** **`project/`** in this manual means **`lucid/project/`** — Lucid's own extension package — **not** the target codebase you analyze with Lucid.

**中文：** 本手册里的 **`project/`** 指 **`lucid/project/`**（Lucid 扩展自身目录），**不是**你用 Lucid 分析的目标项目目录。

Run from `lucid/project/`:

在 `lucid/project/` 目录下运行：

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

### Trace JSON / Trace JSON

**EN:** Write runtime events to **`.lucid/trace.json`** at workspace root. Lucid **auto-watches** this file (chokidar) and merges `observed` spans into open trace-capable sessions. Command **Load Trace Overlay** reloads from the same path, or opens a file picker if missing.

**中文：** 运行时事件写入工作区 **`.lucid/trace.json`**。Lucid **自动监听**并合并到已打开的 session。**Load Trace Overlay** 优先读该路径，不存在时再选手动 JSON。

Array format / 数组格式: `{ "file", "line", "kind": "use"|"write"|"trigger", "variableName", "column?", "event?" }`. Matching spans → `provenance: "observed"` and `[observed]` in VF.

### Known Limits / 已知限制

- **Phase 2 translation:** Python→C++ scaffold (one-way). **Rust→C++:** no full modern conversion—only Rust-flavored **safe C++** dialect scaffold when added. **C++→ASM:** use system compiler (`clang -S`), not Lucid lowering.
- Python/C++ IR uses heuristic fallback until Joern / Python/C++ 启发式降级，待 Joern
- Graph rebind confirms in UI but does not update IR edges yet / 重绑 UI 确认后 IR 边尚未更新
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

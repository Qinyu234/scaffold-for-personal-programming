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

| Command | EN | 中文 |
| --- | --- | --- |
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

### Basic Commands / 基本命令

**EN:** All npm/CLI commands below assume you are in the **`project/`** folder (where `package.json` lives), **not** the repo root `lucid/`.

**中文：** 以下命令都在 **`project/`** 目录执行（有 `package.json` 的那一层），**不是** 仓库根目录 `lucid/`。

**Prerequisites / 前置条件**

| EN | 中文 |
| --- | --- |
| Node.js **18+** (`node -v`) | 已安装 Node **18+** |
| npm (`npm -v`) | 已安装 npm |
| First time: run `npm install` once | 首次 clone 后先 `npm install` |

**Windows (PowerShell) / Windows 注意**

- Use `;` to chain commands, **not** `&&` (older PowerShell rejects `&&`).
- Paths with spaces need quotes: `"./examples/CartPanel.tsx"`.
- If `node ./out/cli.js` fails with *Cannot find module*, run `npm run compile` first.

**中文：** PowerShell 用 `;` 链接命令；路径有空格要加引号；找不到 `out/cli.js` 时先 `npm run compile`。

---

#### First-time setup / 首次安装

```powershell
# From repo root — 从仓库根目录
cd project

# Install dependencies (once) — 安装依赖（只需一次）
npm install

# Compile TypeScript → out/ — 编译到 out/
npm run compile
```

**Expected:** `out/cli.js` and `out/extension.js` exist.  
**若报错 `ENOENT package.json`：** 说明当前目录不对，先 `cd project`。

---

#### Run tests / 跑测试

```powershell
cd project
npm test
```

**What it does:** `npm run compile` then `node ./out/test-runner.js` (15 suites).  
**做什么：** 先编译再跑 15 个测试套件。

| Symptom / 现象 | Fix / 处理 |
| --- | --- |
| `error TS…` during compile | Fix the TypeScript error shown; do not skip compile |
| Tests hang on first run | Normal on cold start; wait for `Test Summary` |
| `npm test` from repo root | `cd project` first |

---

#### CLI analyze / CLI 分析

**EN:** CLI reads **compiled** output in `out/`. After editing `src/`, run `npm run compile` (or `npm test`) before CLI.

**中文：** CLI 读的是 **`out/`** 里编译后的 JS；改完 `src/` 后要先 `npm run compile`。

```powershell
cd project
npm run compile

# Analyze entire file — 分析整文件，输出 JSON 数组
node ./out/cli.js analyze ./examples/CartPanel.tsx

# Filter one state variable — 只输出一个 state
node ./out/cli.js analyze ./examples/CartPanel.tsx --variable cartTotal

# Python example — Python 示例
node ./out/cli.js analyze ./examples/cart.py
```

**Pipe to file / 保存到文件**

```powershell
node ./out/cli.js analyze ./examples/CartPanel.tsx > contracts.json
```

| Symptom / 现象 | Fix / 处理 |
| --- | --- |
| `Cannot find module './out/cli.js'` | Run `npm run compile` from `project/` |
| Empty `[]` output | File has no Lucid contracts; try another example or check syntax |
| `--variable` returns `[]` | Variable name typo; run without `--variable` to list names |
| Path not found | Use `./examples/...` relative to `project/`, or absolute path in quotes |

---

#### Extension dev (F5) / 扩展调试

**EN:** Open the **`project/` folder** as the VS Code workspace (File → Open Folder), not the parent `lucid/` repo root.

**中文：** 用 VS Code **打开 `project/` 文件夹**，不要只打开上层 `lucid/`。

1. `cd project` → `npm install` → `npm run compile`
2. Open **`project/`** in VS Code / Cursor
3. **Run → Start Debugging (F5)** — launches **Extension Development Host**
4. In the new window: open `examples/CartPanel.tsx` → Command Palette → `Lucid: Open Def-Use View`

**If F5 fails / F5 失败**

| Symptom | Fix |
| --- | --- |
| No launch config | Use **Run and Debug** panel; pick **Run Extension** (`.vscode/launch.json` in `project/`) |
| Extension commands missing | Ensure host window opened `project/examples/`, not wrong workspace |
| `out/extension.js` missing | `npm run compile` in `project/` |

---

#### Trace JSON (Phase 2) / Trace 自动路径

**EN:** Place trace events at **`<workspace-root>/.lucid/trace.json`**. When using F5, workspace root is usually **`project/`** (the folder you opened).

**中文：** 路径为 **`<工作区根>/.lucid/trace.json`**。F5 时工作区根一般是 **`project/`**。

```powershell
cd project
New-Item -ItemType Directory -Force -Path .lucid
@'
[
  {
    "file": "D:/10_projects/lucid/project/examples/CartPanel.tsx",
    "line": 12,
    "kind": "use",
    "variableName": "cartTotal"
  }
]
'@ | Set-Content -Encoding utf8 .lucid/trace.json
```

**Important / 要点**

- `"file"` must be the **absolute path** on your machine (adjust drive/path).
- `"variableName"` must match the session **scopeId** (state name you picked in Def-Use).
- Open a Def-Use VF **first**, then write/save `trace.json` — Lucid auto-reloads via chokidar.
- Manual reload: Command Palette → **Lucid: Load Trace Overlay** (reads `.lucid/trace.json` first).

**Bash (Git Bash / WSL) equivalent**

```bash
cd project
mkdir -p .lucid
cat > .lucid/trace.json <<'EOF'
[
  {
    "file": "/d/10_projects/lucid/project/examples/CartPanel.tsx",
    "line": 12,
    "kind": "use",
    "variableName": "cartTotal"
  }
]
EOF
```

---

#### C++ → assembly (external compiler) / C++ 转汇编

**EN:** Per DESIGN, Lucid does **not** lower C++ itself. Use your system compiler:

**中文：** 按 DESIGN，Lucid **不**自研 C++ lowering，用系统编译器：

```powershell
# Requires clang or gcc in PATH — 需要 PATH 里有 clang 或 gcc
clang -S -o cart.s ./examples/cart.cpp
# or — 或
g++ -S -o cart.s ./examples/cart.cpp
```

Lucid may link to this output in a future View; today this is a manual inspection step.
### Language Support / 语言支持

| Language | EN | 中文 |
| --- | --- | --- |
| TS/JS | Primary path | 主路径 |
| Python | Interim heuristics; Joern target per DESIGN | 过渡启发式；DESIGN 目标 Joern |
| C/C++ | Interim heuristics; Joern target | 过渡启发式；目标 Joern |
| Rust | Mapped to C++ pipeline per DESIGN | 按 DESIGN 映射 C++ 管线 |

### Trace JSON / Trace JSON

**EN:** See **Trace JSON (Phase 2)** under Basic Commands above for paths, PowerShell/Bash examples, and field rules.

**中文：** 路径、示例命令、字段规则见上文 **Basic Commands → Trace JSON (Phase 2)**。

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

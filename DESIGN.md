# Lucid — Project Document / Lucid 项目文档

**20260704** (canonical / 现行版本)

---

## Executive Summary / 摘要

**EN:** Lucid makes hidden code structure visible and editable. **Phase 0** builds **Lucid IR** (selection criteria). **Phase 1** delivers **Views** + **Virtual Files**: **Projection Slice** (filter+cut spans) → layout → graph + `lucid://` document; **pull** / **push overlay** / **push fork**; **manual fold** (display-only); graph↔document↔real **sync** (no RPCM automation yet). **Cognitive WS** (RPCM) is **future Layer 3**—see `thoughts/recognition_matrix.md` (local notes, not in repo). Fork rebinding is user-confirmed via graph nodes. Languages: TS/JS, Python, C++, Rust→C++.

**中文：** Lucid 让隐藏结构可见且可编辑。**Phase 0** 建设 **Lucid IR**（选择标准）。**Phase 1** 交付 **Views** + **Virtual Files**：**Projection Slice**（filter+cut）→ layout → 图 + `lucid://` 文档；**pull** / **push overlay** / **push fork**；**手动折叠**（仅显示）；图↔文档↔真源 **sync**（暂不实现 RPCM 自动化）。**认知 WS**（RPCM）为**未来 Layer 3**——见本地 `thoughts/recognition_matrix.md`（个人笔记，不入库）。Fork 重绑经图节点用户确认。语言：TS/JS、Python、C++、Rust→C++。

See `LANGUAGE.md` for doc language policy. / 文档语言规范见 `LANGUAGE.md`。

---

## Positioning / 定位

**Four questions. One tool.**

> *What the f[a-z]+k is that?*
> *How do I know that?*
> *How do I avoid this mess?*
> *What do I do when others don't?*

**EN:** Lucid is not a compiler, code generator, or spec system. It is a tool to see through code—and work on it in the shape you prefer.

**中文：** 不是编译器、不是代码生成器、不是 spec 系统。是看透代码、并按你偏好的形态操作代码的工具。

---

## Terminology / 术语

**EN:** Do not confuse **Projection Slice** with **Cognitive WS**.

**中文：** 勿将 **Projection Slice** 与 **认知 WS** 混用。

| Term / 术语 | Layer / 层 | EN | 中文 |
| --- | --- | --- | --- |
| **Lucid IR** | 2 — structural truth | def-use, data, event graph; selection criteria | 结构真源；选择标准 |
| **Projection Slice** | 2→3 boundary | Technical: IR subset + source spans after filter+cut | 技术对象：filter+cut 后的节点与 span |
| **Fold state** | 3 — presentation | Display-only: which functions/blocks are collapsed | 仅显示：哪些函数/块处于折叠 |
| **Cognitive WS** | 3 — RPCM (future) | What the engineer must hold in mind; Load/Mutate/Compress | 工程师认知负担；Load/Mutate/Compress |
| **WS thrashing** | 3 — RPCM (future) | Unstable cognition: hop files, retrace, lost propagation | 认知不稳定：跳文件、重 trace、传播链断 |

**EN:** `thoughts/` (e.g. `recognition_matrix.md`) is **personal notes**, gitignored—not product docs. RPCM theory lives there until promoted.

**中文：** `thoughts/`（如 `recognition_matrix.md`）为**个人笔记**，已 gitignore——非产品文档。RPCM 理论暂存其中，晋升时再写入本文件。

---

## Core Model / 核心模型

**EN:** The product unit is a **View**, not the analyzer alone and not a graph widget alone.

**中文：** 产品单元是 **View**，不只是分析器，也不只是图控件。

```
Source Code（TS/JS · Python · C++ · Rust→C++）
        ↓
Ingestion（Tree-sitter + ts-morph / Joern）
        ↓
Lucid IR（Layer 2 — selection criteria / 选择标准）
        ↓  filter + cut
Projection Slice（nodes + source spans / 节点与源码片段）
        ↓  layout + fold state（display / 显示）
Surface（Layer 3 presentation / 呈现）
        ├── Graph Surface     → navigate, fold/expand / 导航、折叠
        └── Document Surface  → Virtual File (`lucid://`) — edit / 编辑
        ↕ sync（same slice + same fold state / 同一 slice 与折叠状态）
        ↓  push overlay | push fork | discard
Real Layer（source files / 真实文件）

        ┌─ Future: RPCM / Cognitive WS（Layer 3 control, not in IR）
        │   Load · Mutate · Compress × R0–R3 — automation deferred
        └─ thoughts/recognition_matrix.md
```

### View Definition / View 定义

**EN:** Each View is a projection recipe:

**中文：** 每个 View 是一条投影配方：

```
View = (Filter, Cut, Layout, PatchPolicy)
```

| Field / 字段 | EN | 中文 |
| --- | --- | --- |
| **Filter** | What counts as related on Lucid IR | IR 上什么算「相关」 |
| **Cut** | Which source spans to extract | 从真源切哪些片段 |
| **Layout** | How to splice spans into a document or graph | 如何拼接成文档或图 |
| **PatchPolicy** | overlay, fork, or discard on save | 保存时 overlay、fork 或丢弃 |

**EN:** Choosing what to read **is** filtering, cutting, and splicing—not opening more raw files.

**中文：** 「选要看什么」**就是**筛选、剪切、拼接——不是打开更多原始文件。

### Surfaces / 两种呈现面

| Surface | EN | 中文 |
| --- | --- | --- |
| **Graph** | Relationship navigation; open in document from a node | 关系导航；从节点「在文档中打开」 |
| **Document (Virtual File)** | Editable working copy; pull/push/fork | 可编辑副本；pull/push/fork |

**EN:** Display transformation **is** Virtual File when the result must be text you can edit.

**中文：** 当显示结果必须是可编辑文本时，**显示化转换就是 Virtual File**。

### Projection Slice vs Fold / 切片与折叠

**EN:**

- **Projection Slice** = full set of related spans for this View scope (cached from filter+cut). Slice content does **not** shrink when you fold.
- **Fold** = display-only. User expands to read a function body; collapses when remembered. Fold markers are **not** patched to real source.
- **Default:** functions marked collapsed stay collapsed on reopen until user expands.
- **Persistence (Phase 1):** fold state under `.lucid/state/{stateName}/` or app data; **`{stateName}` = selected state name** (e.g. `items`). Lineage: `.lucid/state/{stateName}/lineage.json`. Familiarity Layer later.
- **Graph ↔ Document sync:** same slice, same fold state on both surfaces (Phase 1; manual fold only—no RPCM auto Load/Compress).

**中文：**

- **Projection Slice** = 当前 View 范围内相关 span 的**全集**（filter+cut 缓存）。折叠**不**缩小 slice。
- **折叠** = 仅显示。用户展开看函数实现；记住了就收起。折叠标记**不** patch 回真源。
- **默认：** 处于折叠状态的函数，下次打开仍折叠，直到用户展开。
- **持久化（Phase 1）：** `.lucid/fold-state.json`，按 `scopeId` 索引（可 gitignore）。**Familiarity Layer** 后续加记忆曲线与任务规划——更复杂，非 Phase 1。
- **图↔文档 sync：** 同一 slice、同一折叠状态（Phase 1 手动折叠，不做 RPCM 自动 Load/Compress）。

### Document Layout / 文档排版

**EN:** Crop relevant spans; group by flow category (state, data, event, etc.). Order is **view-specific** (Def-Use by state; Entry Point by call order). Use familiar fold syntax (e.g. `#region` / comment guards) for expand/collapse.

**中文：** 裁出相关片段；按 state、data、event 等 flow 分类拼接。顺序**因 View 而异**（Def-Use 按 state；Entry Point 按调用序）。用常见折叠语法（如 `#region`、注释包裹）展开/收起。

---

## Virtual File / 虚拟文件

### Definition / 定义

**EN:** A **Virtual File** is an **editable copy** projected from real source by a View. The real layer is the default source of truth until the user **pushes** changes. It is not a second project tree.

**中文：** **Virtual File** 是按 View 从真实源码投影出的**可编辑副本**。在用户 **push** 之前，真实层是默认真源。不是第二套工程目录。

### URI Scheme / URI 约定

```
lucid://view/{viewType}/{scopeId}           → document surface / 文档面
lucid://graph/{viewType}/{scopeId}          → graph surface / 图面
lucid://translation/{targetLang}/{scopeId}  → language copy / 语言副本
```

Same selection anchor and Projection Slice; different renderers. / 同一选择对象与 Projection Slice；换 renderer 即可。

### Scope Identity / 选择对象（scopeId）

**EN:** `scopeId` is the **selected object**—for Def-Use View, the **state name** (e.g. `items`, `cartTotal`). Storage paths use the same name: `.lucid/state/items/…`. Entry Point uses function name; other views use their anchor id.

**中文：** `scopeId` = **选择对象**——Def-Use 下为 **state 名**（如 `items`、`cartTotal`）。存储路径同名：`.lucid/state/items/…`。Entry Point 用函数名；其他 View 用各自锚点 id。

### Data Type Model (strong) / 数据类型（强分类）

**EN:** A data type is **`(length, interpretation)`**.

| Class | Length | Interpretation (examples) |
| --- | --- | --- |
| **Fixed** | Known width | `bool`, `char`, `int32`, `int64` (`longlong`), `double` — fixed length + fixed read rule |
| **Unsized** | Not fixed upfront | `string` — read `char` until `\n` (or delimiter); more unsized rules later |
| **Composed / newtype** | Combine fixed types | e.g. pair `(double, longlong)` named as user **newtype** — Rust-style extension; **Phase 1 optional, advanced disabled** |
| **Custom** | User-defined | Custom interpreter (future); not Phase 1 |

**EN:** Struct/newtype as class replacement remains a **designed extension point**; Phase 1 uses fixed + string-unsized only unless user composes simple newtypes.

**中文：** 数据类型 = **`(长度, 解读方式)`**。

| 类 | 长度 | 解读（例） |
| --- | --- | --- |
| **固定** | 已知宽度 | `bool`、`char`、`int32`、`int64`、`double` |
| **非定长** | 事先不定 | `string` — 从 `char` 读到 `\n`；更多规则以后加 |
| **组合/newtype** | 组合固定类型 | 如 `(double, longlong)` 命名为 newtype；**Phase 1 可选，高级禁用** |
| **自定义** | 用户定义 | 自写解释器（未来） |

struct/newtype 替代 class 为**扩展点**；Phase 1 以固定类型 + string 非定长为主。

### Sync Operations / 同步操作

| Operation | Direction | EN | 中文 |
| --- | --- | --- | --- |
| **pull** | Real → Virtual | Rebuild copy deterministically from current source + View params | 按当前真源与 View 参数确定性重建副本 |
| **push overlay** | Virtual → Real | **`save_selected`** or **`save_all`** (see below) | **`save_selected`** 或 **`save_all`**（见下） |

**save_selected / save_all**

**EN:**

- **`save_selected`** — push scope = current selection: **selected function**, **active virtual file**, or **selected graph node** (whichever surface has focus). Maps selection → span(s) → patch.
- **`save_all`** — push **all** pending edits in the current Projection Slice / scope (everything dirty). Phase 1 still **single file or single function** bound.
- **Fork** — user picks fork range; not part of save_selected/all.

**中文：**

- **`save_selected`** — 范围 = 当前选中：**选中函数**、**当前虚拟文件**、或**图中选中节点**（以有焦点的面为准）→ 映射 span → patch。
- **`save_all`** — 写回当前范围内**全部**待提交修改。Phase 1 仍绑定**单文件或单函数**。
- **Fork** — 用户自选 fork 范围；不属于 save_selected/all。
| **push fork** | Virtual → New real | Emit a **sibling** without mutating the original | 产出**兄弟产物**，不修改原文件/原函数 |
| **discard** | — | Drop virtual edits; real unchanged | 丢弃虚拟编辑；真源不变 |

**EN:** Pull is deterministic (Nix-style): same source + same View parameters → same copy.

**中文：** Pull 是确定性的（Nix 风格）：相同真源 + 相同 View 参数 → 相同副本。

**EN:** If real source changes while virtual edits are pending, **user chooses at merge time** (no silent overwrite). Options presented in UI; no fixed auto-policy.

**中文：** 真源变更且虚拟层有未 push 编辑时，**由用户在 merge 时自行选择**（不静默覆盖）。UI 提供选项；不设固定自动策略。

### Fork Placement / Fork 产出位置

**EN:** Fork output stays next to the original—never in a separate tool-only tree.

**中文：** Fork 产出紧贴原件——不放到独立工具目录。

| Fork granularity | Placement rule | Example / 例子 |
| --- | --- | --- |
| **Function / block** | Same file as the original function | `foo` → `fooPrime` in `A.ts` |
| **File / module** | Same directory as the original file | `A.ts` → `A.prime.ts` beside `A.ts` |

**EN:** Fork default name is tool-suggested; **user may edit before save**. User **selects fork range** when forking. **No automatic fork hints** in Phase 1. Rebind never automatic.

**中文：** Fork 默认名由工具建议；**保存前用户可改**。Fork 时由用户**选择 fork 范围**。**Phase 1 不做自动 fork 提示**。重绑绝不自动。

### Fork and Shared Layers / Fork 与共享层

**EN:** When B and C share lower layer A, editing for C-only logic should **fork** to A′ (or `fooPrime`) instead of polluting A with branches.

**中文：** B、C 共用底层 A 时，C 专属逻辑应 **fork** 为 A′（或 `fooPrime`），而不是在 A 里堆分支。

```
        B ──→ A
        C ──→ A′     (fork from A; C rebound after user confirms)
```

**EN:** **Rebinding** (e.g. point C’s imports/calls from A to A′) is **never automatic**. User confirms via UI—**including operating graph nodes** to modify bindings or generate fork targets.

**中文：** **重绑**（如把 C 的 import/调用从 A 改到 A′）**绝不自动执行**。用户通过 UI 确认——**包括操作图节点**来修改绑定或生成 fork 目标。

### Lineage Metadata / 谱系元数据

**EN:** Every Virtual File instance records lineage for patch and fork:

**中文：** 每个 Virtual File 实例记录谱系，供 patch 与 fork 使用：

```json
{
  "virtualUri": "lucid://view/def-use/items.for-C",
  "pulledFrom": "src/shared/A.ts",
  "bindMode": "fork-from-A",
  "forkOf": "src/shared/A.ts",
  "forkTarget": "src/shared/A.prime.ts",
  "segments": [
    { "virtualLine": 1, "source": "CartPanel.tsx", "start": 6, "end": 12 }
  ],
  "consumers": {
    "B.ts": "src/shared/A.ts",
    "C.ts": "src/shared/A.prime.ts"
  }
}
```

**EN:** After push or fork, Lucid IR **dependency edges** must update or the View drifts from reality.

**中文：** push 或 fork 之后，Lucid IR 的**依赖边**必须更新，否则 View 与真源脱节。

### Implementation / 实现

- VSCode `FileSystemProvider` + `TextDocumentContentProvider`
- Built-in diff engine + `workspace.applyEdit()` for overlay push
- `chokidar` on real layer for pull triggers
- **`.lucid/`** — runtime artifacts while Lucid runs (fold, lineage, pending merge). Relationship to source code is **interpretation**, not a second source tree. **Default: stored under Lucid app data**; for privacy or repo-local sharing, use **`.lucid/state/{stateName}/`** (e.g. `.lucid/state/items/lineage.json`). `{stateName}` = **selected state id** (same as `scopeId` for Def-Use View). **May be committed** if team shares projection state.

**中文：** **`.lucid/`** 为 Lucid **运行产物**（折叠、谱系、pending merge），与源码关系是**解读**，非第二真源。**默认存 Lucid 程序目录**；要隐私或仓库内共享时用 **`.lucid/state/{stateName}/`**（如 `.lucid/state/items/lineage.json`）。`{stateName}` = **所选 state 名**（Def-Use 下与 `scopeId` 相同）。团队可提交 git。

---

## Lucid IR (Phase 0) / Lucid IR（Phase 0）

**EN:** Phase 0 builds **selection criteria**, not the user-facing product. Users do not read contract JSON.

**中文：** Phase 0 建设**选择标准**，不是面向用户的产品。用户不读 contract JSON。

Internal structures include / 内部结构包括：

- **State** — **weak** classification via use/def only (`write_sites`, `use_sites`, `triggered_by`). No strong type ontology in Phase 0–1.
- **Data** — **strong** classification: flow-graph + **C++ primitive types** (extensibility modeled after Rust newtype pattern; **advanced/user types disabled** in Phase 1).
- **Event** chains — static in Phase 0/1 for JS; trace overlays in Phase 2.

**中文：**

- **State** — 仅用 use/def **弱分类**（写点、读点、触发）。Phase 0–1 不做强类型本体。
- **Data** — **强分类**：流程图 + **C++ 基础类型**（扩展性参考 Rust newtype；Phase 1 **禁用高级/用户自定义类型**）。
- **Event** — JS 静态；其余 Phase 2 trace。

```json
{
  "cartTotal": {
    "defined": "CartService.ts:12",
    "write_sites": ["CartService.addItem:L34"],
    "use_sites": ["CartSummary.tsx:L45"],
    "triggered_by": [{ "event": "onClick", "site": "CartButton.tsx:L23", "source": "inferred" }],
    "source": "inferred"
  }
}
```

**EN:** `explicit` vs `inferred` contracts and generation gates are **Phase 3** (prevention). Phase 0–1 focus on **inferred** structure for navigation and editing.

**中文：** `explicit` 合约与生成门禁在 **Phase 3**（预防）。Phase 0–1 聚焦 **inferred** 结构，用于导航与编辑。

---

## Language Scope / 语言范围

**EN:** Multi-language support is **not** optional. IR and Views must work across the families below.

**中文：** 多语言支持**不是可选项**。IR 与 Views 须覆盖下表语言族。

| Language | Parse / 解析 | def-use | Event chain / 事件链 |
| --- | --- | --- | --- |
| TS/JS | tree-sitter-typescript + ts-morph | ts-morph `findReferences()` | Static: onClick, useEffect, dispatch / 静态推断 |
| Python | tree-sitter-python | Joern (target); heuristic until integrated | Data Flow emphasis; event trace Phase 2 / 侧重 Data Flow；event 延 Phase 2 |
| C++ | tree-sitter-cpp | Joern CPG (target); heuristic fallback / 目标 Joern；启发式降级 | Phase 2 trace |
| Rust | Mapped to C++ pipeline / 映射 C++ 管线 | Same as C++ / 同 C++ | Same as C++ / 同 C++ |

**EN:** Phase 0 gate: def-use credible for languages in scope. **Phase 1 UI: JS + Python first** (TS treated as JS superset). C++/Rust-mapped: IR via CLI/heuristic until later UI. Event chains: static for JS; Python may defer partial event info to Phase 2 trace.

**中文：** Phase 0 门槛：在册语言 def-use 可信。**Phase 1 UI 先做 JS + Python**（TS 视为 JS 超集）。C++/Rust 映射：先 CLI/启发式 IR，UI 后做。事件链：JS 静态；Python 部分 event 可延至 Phase 2 trace。

---

## Views (Phase 1) / 视图（Phase 1）

**EN:** Phase 1 ships **all Views at minimum viable depth**—wire up existing tools, simplest integration each. Not full feature parity per view. Virtual File push: **`save_selected` / `save_all`**; **scope = single file or single function** for now (no multi-file patch).

**中文：** Phase 1 **各 View 做最小可用**——把现有工具找齐、每项最简单集成。非全功能对等。Virtual File push：**`save_selected` / `save_all`**；**范围暂限单文件或单函数**（不多文件 patch）。

| View | Tool (minimal) | Phase 1 depth |
| --- | --- | --- |
| Def-Use | ts-morph / Joern | graph + VF + push |
| Entry Point | ts-morph call tree, cytoscape-dagre | graph + VF + push |
| Impact | IR propagation | graph (minimal) |
| Structure | dependency-cruiser | graph (minimal) |
| Event Flow | static triggers | graph (minimal) |
| Data Flow | length+interpretation edges | graph (minimal) |

**EN:** Push (`save_selected` / `save_all`) on **single file or function** only in Phase 1.

**中文：** Phase 1 push 仅**单文件或单函数**。

**EN:** **JS (+TS):** Def-Use, Event Flow, **Entry Point** (React/frontend). **Python:** **Data Flow** (strong typing). Both: similar UI depth (graph, VF, push).

**中文：** **JS（含 TS）**：Def-Use、Event Flow、**Entry Point**（React/前端）。**Python**：**Data Flow**（强类型）。两者 UI 完成度同级。

**Interaction / 交互:** drill-in + breadcrumb; cognitive budget (7); manual fold under `.lucid/state/{stateName}/`; Familiarity deferred.

**交互：** 钻入与面包屑；认知预算 7；折叠存 `.lucid/state/{stateName}/`；Familiarity 延后。

---

## Translation Layer (Phase 2) / 语言转换（Phase 2）

**EN:** One-way copy mode; no LLM. Same Virtual File pipeline with a **Translation** layout.

**中文：** 单向副本模式；不用 LLM。同一 Virtual File 管线，换 **Translation** 排版。

| Direction | Tool (target) |
| --- | --- |
| Python → C++ | py2cpp / py14 / PyCer |
| Rust → C++ | Hand-written mapping (ownership → RAII) / 手写映射规则 |

```
Select scope in any View / 在任意 View 选定范围
        ↓
lucid://translation/{lang}/{scopeId}   (copy; source untouched / 副本；源不动)
        ↓
Review → overlay replace source OR discard / 审查 → 覆写源或丢弃
```

**EN:** Subset only; out-of-scope constructs error loudly—no silent failure.

**中文：** 仅覆盖标准子集；越界报错——不静默失败。

---

## Roadmap / 路线图

### Phase 0 — Lucid IR & Selection Criteria / 选择标准

**EN:** CLI validation; no VSCode UI. Current repo work is mostly here.

**中文：** CLI 验证；无 VSCode UI。当前仓库工作 largely 在此阶段。

```bash
lucid analyze Cart.tsx
```

**Deliverables / 交付:**

- State / data / event structure explicit in Lucid IR / state、data、event 在 IR 中显式化
- TS/JS: write sites, use sites, static event triggers / 写点、读点、静态事件触发
- Python, C++, Rust-mapped: write sites & use sites (Joern path or honest fallback) / 写点与读点（Joern 或诚实降级）
- Span locations stable for Cut step / span 位置稳定，供 Cut 使用

**Gate / 门槛:** JS + Python def-use credible → Phase 1 UI (JS family includes TS). C++/Rust: CLI path continues in parallel.

### Phase 1 — Views + Virtual Files / 视图与虚拟文件

**EN:** **Languages in Phase 1 UI: JS (+TS) and Python** with **similar completeness** (graph, Virtual File, push). Python emphasis: **Data Flow View** (strong `(length, interpretation)` typing). C++/Rust UI deferred.

**中文：** **Phase 1 UI：JS（含 TS）与 Python**，**完成度同级**（图、Virtual File、push）。Python 侧重：**Data Flow View**（强类型 `(长度, 解读)`）。C++/Rust 界面延后。

**Deliverables / 交付:**

- VSCode extension: graph + `lucid://` document surfaces
- Projection Slice pipeline: filter + cut + layout
- Manual fold; graph↔document↔real sync (no RPCM automation)
- pull / push overlay / push fork / discard
- Fork: same-file or same-directory; default name + user edit
- User-confirmed rebind via graph nodes
- Practical Views integrated (Def-Use minimum end-to-end)

**Success metric / 成功标准:** On three unfamiliar repos, time and file hops to understand one core state **drop** vs plain VSCode (record before/after Phase 1).

### Phase 2 — Cross-File + Trace + Translation / 跨文件、Trace、转换

- Workspace-folder def-use; cross-file Projection Slice (when needed)
- Runtime trace overlay (`inferred` vs `observed`)
- Translation Virtual Files (Python/Rust → C++)

### Phase 3 — RPCM + Prevention + Lowering / RPCM、预防、降级

- **Cognitive WS (RPCM):** automated Load/Mutate/Compress, collapse prediction, adaptive projection (`thoughts/recognition_matrix.md`)
- `explicit` contract enforcement on push
- View thrashing signals → block or warn on save
- Lucid IR → MLIR; lowering toward assembly
- Constrained generation after understanding tools are stable

---

## Distribution / 分发与调用形态

**EN:** Lucid ships as a **TypeScript core library** inside `project/src/`. The **primary product shell is a VS Code extension** (target: VS Code; Cursor-compatible). **CLI** stays for headless analyze and CI. **Tauri app** is an optional future shell—not a second implementation.

**中文：** Lucid 以 `project/src/` 内 **TypeScript 核心库** 交付。**主产品壳 = VS Code 扩展**（目标 VS Code；兼容 Cursor）。**CLI** 保留作无 UI 分析与 CI。**Tauri 独立 App** 为可选未来壳——非第二套实现。

| Layer | EN | 中文 | Phase |
| --- | --- | --- | --- |
| `@lucid/core` (in-repo) | IR, Projection Slice, pull/push/fork | IR、切片、同步 | 0–1 |
| **VS Code extension** | Commands, webview graph, `lucid://` providers | 命令、图、虚拟文件 | **1（主入口）** |
| **CLI** | `lucid analyze <file>` | 命令行分析 | 0+ |
| Tauri app | Same library, different UI | 同库换壳 | 3+ optional |

**EN:** User flow (Phase 1): install extension → select state/function → graph + virtual document → `save_selected` / `save_all`.

**中文：** 用户路径（Phase 1）：安装扩展 → 选择 state/函数 → 图 + 虚拟文档 → `save_selected` / `save_all`。

---

## Tech Stack / 技术选型

### Use Directly / 直接用

| Layer | Tools |
| --- | --- |
| Parse / 解析 | tree-sitter, ts-morph (TS/JS), Joern (Python/C++) |
| Visualize / 可视化 | cytoscape.js, cytoscape-dagre, cytoscape-expand-collapse |
| Virtual Files | VSCode FileSystemProvider, TextDocumentContentProvider, diff engine |
| Watch / 监听 | chokidar |
| Trace | OpenTelemetry, Jaeger, React Profiler |
| Translation / 转换 | py2cpp, py14, PyCer |
| Shell / 壳 | VSCode Extension API; Tauri (later) |

### Build / 自己写

- Def-use and event inference / def-use 与事件推断
- View recipes (filter, cut, layout) / View 配方
- Projection Slice + fold state (manual) / 切片 + 折叠状态（手动）
- Surface sync (graph ↔ virtual ↔ real) / 呈现面 sync
- Virtual File pull/push/fork coordinator / pull/push/fork 协调层
- Span map, lineage, fold persistence / span 映射、谱系、折叠持久化
- Graph-node rebind UX (confirm-only) / 图节点重绑（仅确认）
- Cognitive budget (display cap) / 认知预算（显示上限）
- Rust → C++ mapping rules / Rust→C++ 映射

### Build Later (Phase 3+) / 后期再写

- RPCM / Cognitive WS scheduler (automated projection control) / RPCM 认知 WS 调度（自动投影控制）

### Reference Only / 参考不造

- MLIR (future Lucid IR bridge / 未来桥接)
- CodeSee (feature design reference / 功能设计参考)

---

## Validation / 验证

**EN:** Three unfamiliar repositories. Record: time to understand one core state, file hops, graph/virtual opens. Compare plain VSCode (before Phase 1) vs Lucid (after Phase 1). If no improvement, stop and revisit whether def-use selection is the real bottleneck.

**中文：** 三个陌生仓库。记录：理解一个核心 state 的时间、跳转文件次数、打开图/虚拟文档次数。对比 Phase 1 前后的普通 VSCode 与 Lucid。若无改善，停下并重新审视 def-use 选择是否真是瓶颈。

---

## Deferred / 未来与未决

**EN (Phase 3+):** RPCM automation, explicit contracts, generation gates, Mermaid → code.

**中文（Phase 3+）：** RPCM 自动化、explicit 合约、生成门禁、Mermaid → 代码。

**Placed / 已安放（未来）:**

- **Cognitive WS (RPCM)** — Layer 3; theory in `thoughts/recognition_matrix.md`; automation not Phase 1
- Cross-file Projection Slice / multi-file push / 跨文件 slice 与多文件 push
- Automatic fork hints / 自动 fork 提示

**Open / 未决:**

- Intermediate representation for human intent vs generated code / 人类意图与生成代码之间的中间表示
- Template library maintenance / 模板库如何构建与维护
- Per-View minimum tool integration checklist (Phase 1) / 各 View 最小工具集成清单

---

## Lessons (v0.1–v0.3) / 迭代教训

**EN:** Models need structure, not unbounded context. Readability beats generation. Tests do not fully constrain event-driven behavior. Cheap AI workflows optimize local coherence, not correctness. Build testable slices; do not night-run unbounded generation.

**中文：** 模型要结构，不要无限上下文。可读性优先于生成。Test 无法完整约束 event-driven 行为。廉价 AI workflow 优化局部连贯，不是正确性。做可验证切片；不要无界夜跑生成。

---

## Appendix: Design Notes / 附：设计注记

**EN:** Linear thinking → Entry Point View and cognitive budget. “Weak-nanny software” (弱保软) → assume users want the tool to order information, not memorize the repo.

**中文：** 人的思考是线性的 → Entry Point View 与 cognitive budget。「弱保软」→ 假设用户要工具编排信息顺序，而不是记住整个仓库。

---

# Archive — 20260624 (superseded / 已废止)

**EN:** The document below is historical iteration notes and an older phase split (Virtual Files in Phase 3, graph-only Phase 1). **Do not use for implementation decisions.** Use **20260702** above.

**中文：** 以下文档为历史迭代记录与旧阶段划分（Virtual Files 在 Phase 3、Phase 1 仅图）。**勿用于实现决策。** 请以文首 **20260702** 为准。

---

# Lucid — Project Document
**20260624**

---

## 定位

**Four questions. One tool.**

> *What the fuck is that?*
> *How do I know that?*
> *How do I avoid this mess?*
> *What do I do when others don't?*

You're looking at code you didn't write — or code an AI wrote — and you have no idea what's happening, where to look, or how it got this way. Lucid answers all four.

**What the fuck is that** → 文件的 Lucid，函数的 Lucid，data 的 Lucid，event 的 Lucid。每一层都有对应的 view，每一层都可以钻入。

**How do I know that** → 底层的 Lucid。每个 state 谁写、谁读、什么事件触发，显式可查，不需要手动 trace。

**How do I avoid it** → `explicit` contract。你声明边界，工具强制执行。生成代码时必须经过 contract 验证才能 emit。规则在代码里，不在文档里。

**What if others don't** → `inferred` contract。工具从现有 spaghetti 里推断隐式结构，显式化它。你拿到的不再是黑盒——即使写代码的人（或 AI）从来没有遵循任何规则。

它不是编译器，不是代码生成器，不是 spec 系统。它就是一个让你能看透代码、并且防止下一个人也看不透的工具。

---

*(Remaining 20260624 content truncated in archive; full text preserved in git history if needed.)*

**EN:** End of archived section.

**中文：** 存档节结束。

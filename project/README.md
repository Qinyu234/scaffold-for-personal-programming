# Project Implementation / 项目实现

**EN:** See `../DESIGN.md` (**only truth**). Phase 1 **in progress**: Def-Use, Data Flow, Entry Point, Event Flow E2E.

**中文：** 见 `../DESIGN.md`（**唯一真源**）。Phase 1 **进行中**：Def-Use、Data Flow、Entry Point、Event Flow 已 E2E。

## Layout / 目录

| Path | Role |
| --- | --- |
| `src/core/` | `analyzeFile()` |
| `src/analysis/` | Lucid IR, `data-type.ts` |
| `src/projection/` | def-use, data-flow, entry-point, event-flow slices, graph |
| `src/virtual/` | layout, pull, push, fork, translation scaffold |
| `src/extension/` | FS provider, graph panel, sessions |
| `src/extension.ts` | VS Code activation |
| `src/cli.ts` | Headless CLI |

## Commands / 命令

```bash
npm install
npm test
node ./out/cli.js analyze ./examples/CartPanel.tsx
```

## Extension / 扩展

F5 (open `project/` folder):

- **Lucid: Open Def-Use View** → `examples/CartPanel.tsx`
- **Lucid: Open Entry Point View (JS/TS)** → `examples/CartPanel.tsx` (pick function)
- **Lucid: Open Event Flow View (JS/TS)** → `examples/CartPanel.tsx` (state: `cartTotal` / `isLoading`)
- **Lucid: Open Data Flow View (Python)** → `examples/cart.py`

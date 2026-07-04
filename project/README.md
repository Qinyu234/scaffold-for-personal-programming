# Project Implementation / 项目实现

**EN:** **Phase 1 complete.** Core library + VS Code extension + CLI. See `../DESIGN.md` 20260704.

**中文：** **Phase 1 已完成。** 核心库 + VS Code 扩展 + CLI。见 `../DESIGN.md` 20260704。

## Layout / 目录

| Path | Role |
| --- | --- |
| `src/core/` | `analyzeFile()` |
| `src/analysis/` | Lucid IR |
| `src/projection/` | Slice, graph specs |
| `src/virtual/` | layout, pull, push, fork |
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

F5 in VS Code (open `project/` folder) → **Lucid: Open Def-Use View**.

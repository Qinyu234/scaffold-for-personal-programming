# Lucid Workflow / Lucid 工作流

**EN:** **`DESIGN.md` 20260704** is the **only** product truth. **Primary delivery: VS Code extension.**

**中文：** **`DESIGN.md` 20260704** 为**唯一**产品真源。**主交付：VS Code 扩展。**

## Current Target / 当前目标

1. **Phase 0:** done — IR + stable spans.
2. **Phase 1:** done — six Views E2E.
3. **Phase 2:** done — cross-file pull, trace JSON, translation VF, chokidar.

**中文：** Phase 1、Phase 2 扩展 UI 均已完成。

## Execution Order / 执行顺序

**On user decision / 用户决策后：**

```
DESIGN.md  →  README · MANUAL · PURPOSE · ARCHITECTURE · TASKS · WORKFLOW
          →  tests  →  code  →  npm test
```

**Greenfield / 从零：**

`PURPOSE.md` → `RESEARCH.md` → `ARCHITECTURE.md` → `TASKS.md` → tests → code → `npm test`

## Guardrails / 护栏

| EN | 中文 |
| --- | --- |
| `DESIGN.md` before README/TASKS claims | 先改 DESIGN，再改 README/TASKS |
| Business logic in `src/` modules, not only in `extension.ts` | 业务逻辑在模块里 |
| Extension is thin adapter over `core/` | 扩展是薄适配层 |
| Projection Slice ≠ Cognitive WS (RPCM) | 切片 ≠ 认知 WS |
| `.lucid/state/{scopeId}/` for runtime artifacts | 运行产物路径约定 |

## Definition Of Progress / 进度定义

- `DESIGN.md` implementation status matches code / DESIGN 实现状态与代码一致
- `npm test` green / 测试绿
- F5 loads extension / 扩展可加载
- No View marked shipped without E2E graph + VF + push / 无 E2E 不宣称 View 完成

# Lucid Workflow / Lucid 工作流

**EN:** **`DESIGN.md` 20260704** is product truth. **Primary delivery: VS Code extension.**

**中文：** **`DESIGN.md` 20260704** 为产品真源。**主交付：VS Code 扩展。**

## Current Target / 当前目标

1. **Phase 0 (finishing):** IR + stable spans (`T4`).
2. **Phase 1 (starting):** `core/` → Projection Slice → extension shell (`T5`, `T9`).
3. **Languages:** JS (+TS) and Python UI parity; Python dataflow emphasis.

**中文：** 完成 Phase 0 span；启动切片与扩展壳；JS/Python UI。

## Execution Order / 执行顺序

`PURPOSE.md` → `RESEARCH.md` → `ARCHITECTURE.md` → `TASKS.md` → tests → code → `npm test`

## Guardrails / 护栏

| EN | 中文 |
| --- | --- |
| Business logic in `src/` modules, not only in `extension.ts` | 业务逻辑在模块里，不堆在 `extension.ts` |
| Extension is thin adapter over `core/` | 扩展是 `core/` 的薄适配层 |
| Projection Slice ≠ Cognitive WS (RPCM) | 切片 ≠ 认知 WS |
| `.lucid/state/{stateName}/` for runtime artifacts | 运行产物路径约定 |

## Definition Of Progress / 进度定义

- `npm test` green / 测试绿
- F5 / `code --extensionDevelopmentPath=project` loads extension / 扩展可加载
- No claim of `lucid://` push until tests exist / 无测试不宣称 push 完成

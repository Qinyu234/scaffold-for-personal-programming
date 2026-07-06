# Lucid Workflow / Lucid 工作流

**EN:** **`DESIGN.md`** is the **only** product truth. **Primary delivery:** VS Code extension in `lucid/project/`.

**中文：** **`DESIGN.md`** 为**唯一**产品真源。**主交付：** `lucid/project/` 内 VS Code 扩展。

**Project startup skill:** `resume/skills/packages/project-init.skill`

## Execution Order / 执行顺序

```
User decision → DESIGN.md → README · MANUAL · TASKS · … → tests → code → npm test
```

Lifecycle (inbox, gate): skill **`idea-hospice`**.  
Greenfield coding: skill **`coding-workflow`** (Runtime: venv or Docker).  
Runtime record: `runtime.json` at repo root.

## Guardrails / 护栏

| EN | 中文 |
| --- | --- |
| `DESIGN.md` before README/TASKS claims | 先改 DESIGN |
| Business logic in `src/` modules | 业务逻辑在模块里 |
| Extension thin adapter | 扩展薄壳 |
| `project/` = `lucid/project/` | 不是用户目标代码库 |

## Definition Of Progress / 进度定义

- DESIGN status matches code
- `npm test` green
- View E2E: graph + VF + push

# Project Core / 项目核心

**EN:** Short pointer — not a second design source. **`../DESIGN.md` is the only truth.**

**中文：** 简短指针，非第二套设计真源。**`../DESIGN.md` 为唯一真源。**

## Source Of Truth / 真源

| Topic | File |
| --- | --- |
| Product vision + implementation status | `../DESIGN.md` |
| Change workflow | `../DESIGN.md` § Change Workflow |
| Execution | `WORKFLOW.md`, `TASKS.md` |

## Shipped Views (20260703) / 已交付 View

| View | Module entry |
| --- | --- |
| Def-Use (JS/TS) | `projection/def-use-slice.ts`, `virtual/session.ts` |
| Data Flow (Python) | `analysis/data-type.ts`, `projection/data-flow-slice.ts` |
| Entry Point (JS/TS) | `projection/entry-point-slice.ts` |
| Event Flow (JS/TS) | `projection/event-flow-slice.ts` |

## Entrypoints / 入口

- `src/cli.ts` — headless analyze
- `src/extension.ts` — `lucid.openDefUse`, `lucid.openDataFlow`, `lucid.openEntryPoint`, `lucid.openEventFlow`

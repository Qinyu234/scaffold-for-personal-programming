# Project Core / 项目核心

**EN:** Short pointer — not a second design source.

**中文：** 简短指针，非第二套设计真源。

## Source Of Truth / 真源

| Topic | File | 中文 |
| --- | --- | --- |
| Product vision | `../DESIGN.md` | 产品愿景 |
| Language policy | `../LANGUAGE.md` | 语言规范 |
| Execution workflow | `WORKFLOW.md` | 执行工作流 |
| Architecture boundary | `ARCHITECTURE.md` | 架构边界 |

## Current Core / 当前核心

```text
source file → ingestion → analysis → contract JSON → CLI output
源文件 → 摄入 → 分析 → 合约 JSON → CLI 输出
```

**Entrypoints / 入口**

- `src/cli.ts`
- `src/analysis/contract.ts`

## Important Correction / 重要更正

**EN:** Older versions described deleted Python paths (`project/cli.py`) and platform layers not active today. Do not treat those as implementation truth.

**中文：** 旧版曾描述已删除的 Python 路径（如 `project/cli.py`）及当前未启用的平台层，勿再当作实现真源。

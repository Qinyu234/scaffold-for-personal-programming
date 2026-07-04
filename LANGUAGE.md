# Language Policy / 语言规范

## Rule / 规则

All project documentation and code annotations must be **at least in English**. **Bilingual English + Chinese (EN/ZH)** is preferred for human-facing docs.

所有项目文档与代码注释**至少使用英文**；面向人的文档**优先采用中英双语（EN/ZH）**。

## Format / 格式

- Section headings: `English title / 中文标题`
- Body: English first, then Chinese (same meaning, not a partial translation)
- Code comments: English only (keep identifiers and APIs in English)
- Commit messages and test names: English

- 章节标题：`English title / 中文标题`
- 正文：先英文，后中文（含义一致，不做残缺翻译）
- 代码注释：仅英文（标识符与 API 保持英文）
- 提交信息与测试名称：英文

## File Roles / 文件角色

| File | Language |
| --- | --- |
| `DESIGN.md` | Bilingual summary at top; detailed design may stay Chinese-first with English mirror sections added over time |
| `README.md`, `MANUAL.md` | Bilingual EN/ZH |
| `project/PURPOSE.md`, `RESEARCH.md`, `ARCHITECTURE.md`, `TASKS.md`, `WORKFLOW.md` | Bilingual EN/ZH |
| `project/src/**` | English comments and identifiers |

| 文件 | 语言 |
| --- | --- |
| `DESIGN.md` | 顶部双语摘要；详细设计可暂以中文为主，逐步补英文对照 |
| `README.md`、`MANUAL.md` | 中英双语 |
| `project/` 下工作流文档 | 中英双语 |
| `project/src/**` | 英文注释与标识符 |

## When Adding Docs / 新增文档时

1. Write English.
2. Add Chinese in the same section if the doc is for humans.
3. Do not add Chinese-only workflow or operator docs.

1. 先写英文。
2. 若文档面向人阅读，在同一节补上中文。
3. 不要新增仅中文的工作流或操作文档。

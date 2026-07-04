# Purpose / 目的

## Problem / 问题

**EN:** Hidden code structure forces file-hopping and unstable cognition. Lucid exposes state/data/event structure and lets users edit through Views and Virtual Files in **VS Code**.

**中文：** 隐藏结构导致反复跳文件、认知不稳定。Lucid 显式化 state/data/event，并在 **VS Code** 中通过 Views 与 Virtual Files 编辑。

## Goal / 目标

1. **Phase 0** — Lucid IR (selection criteria); stable spans for Cut.
2. **Phase 1** — **VS Code extension** + Projection Slice + Virtual File sync (JS/Python UI).
3. **Core library** — shared by extension and CLI.
4. Tests gate every change; bilingual docs per `LANGUAGE.md`.

**中文：**

1. **Phase 0** — Lucid IR；稳定 span 供 Cut。
2. **Phase 1** — **VS Code 扩展** + Projection Slice + Virtual File sync（JS/Python UI）。
3. **核心库** — 扩展与 CLI 共用。
4. 测试门槛；文档按 `LANGUAGE.md` 双语。

## Acceptance Criteria / 验收标准

- `DESIGN.md` 20260704 drives architecture / 设计驱动架构
- Extension activates and runs analyze on active file / 扩展可激活并分析当前文件
- CLI and extension share `core/` APIs / CLI 与扩展共用 `core/` API
- Honest phase labels in README / README 如实标注阶段

## Non-Goals / 非目标

- Tauri app in Phase 1 / Phase 1 不做 Tauri
- Auto RPCM / fork hints / 自动 RPCM、自动 fork 提示
- Multi-file push in Phase 1 / Phase 1 不多文件 push

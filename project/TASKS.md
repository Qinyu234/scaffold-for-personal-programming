# Tasks / 任务



**EN:** `DESIGN.md` 20260704 is **only product truth**. **Phase 1 Views complete** (20260703).



**Workflow:** user input → `DESIGN.md` → docs → tests → code → `npm test`.



---



## Phase 0 — Done



T1–T4: Lucid IR, multi-language CLI, stable spans.



---



## Phase 1 — Done (Views E2E)



| Task | View | Tests |

| --- | --- | --- |

| T5–T10 | Def-Use | projection-slice, virtual |

| T17 | Data Flow (Python) | `data-flow-slice.test.ts` |

| T18 | Entry Point (JS/TS) | `entry-point-slice.test.ts` |

| T19 | Event Flow (JS/TS) | `event-flow-slice.test.ts` |

| T20 | Impact + Structure | `impact-slice.test.ts`, `structure-slice.test.ts` |



**Pending:** T21 graph rebind → IR edge update.



**Tests:** 15 suites (`npm test`).



---



## Phase 2 — Done (extension UI)



| Task | EN | Tests |

| --- | --- | --- |

| T11–T14 | cross-file, trace, translation (library) | `phase2.test.ts` |

| **T16** | **Wire into extension UI** | `phase2-ui.test.ts` |

| T15 | Joern adapter | manual |

| T16b | chokidar (done); cytoscape-dagre | chokidar wired |



---



## Commands (extension)



| Command | EN |

| --- | --- |

| `Lucid: Open Def-Use View` | JS/TS |

| `Lucid: Open Data Flow View (Python)` | Python |

| `Lucid: Open Entry Point View (JS/TS)` | call tree |

| `Lucid: Open Event Flow View (JS/TS)` | events |

| `Lucid: Open Impact View` | downstream |

| `Lucid: Open Structure View` | imports |

| `Lucid: Open Translation (Python→C++)` | Python→C++ scaffold VF |

| `Lucid: Load Trace Overlay (JSON)` | merge runtime trace into active session |

| Save / Pull / Discard / Fold / Fork | sync |



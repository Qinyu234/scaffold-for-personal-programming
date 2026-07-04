# Lucid



**Canonical design:** `DESIGN.md` (**20260704**). **Phase 1 + Phase 2 UI complete.**



## What Works



| View | Language | Command |

| --- | --- | --- |

| Def-Use | JS/TS | `Lucid: Open Def-Use View` |

| Entry Point | JS/TS | `Lucid: Open Entry Point View` |

| Event Flow | JS/TS | `Lucid: Open Event Flow View` |

| Data Flow | Python | `Lucid: Open Data Flow View` |

| Impact | JS/TS, Python | `Lucid: Open Impact View` |

| Structure | JS/TS, Python | `Lucid: Open Structure View` |

| Translation | Python | `Lucid: Open Translation (Python→C++)` |

| Trace overlay | any active VF | auto `.lucid/trace.json` + `Lucid: Load Trace Overlay` |



- **15 test suites** — `npm test`

- **Phase 2** — auto `.lucid/trace.json` trace overlay, translation VF, chokidar Pull hint



## Quick Start



```bash

cd project

npm install

npm test

```



F5 → `examples/CartPanel.tsx` or `examples/cart.py` → pick a Lucid command.



## Workflow



User decision → **`DESIGN.md`** → docs → tests → code → `npm test`



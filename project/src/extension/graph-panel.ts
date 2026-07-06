/**
 * Cytoscape graph webview panel (synced with Virtual File session).
 */

import * as vscode from 'vscode';
import { GraphSpec } from '../projection/graph';

export class GraphPanel {
  public static current: GraphPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private onMessage: (msg: unknown) => void;

  private constructor(
    panel: vscode.WebviewPanel,
    spec: GraphSpec,
    onMessage: (msg: unknown) => void,
  ) {
    this.panel = panel;
    this.onMessage = onMessage;
    this.panel.webview.html = GraphPanel.renderHtml(spec, panel.webview);
    this.panel.webview.onDidReceiveMessage(onMessage);
    this.panel.onDidDispose(() => {
      GraphPanel.current = undefined;
    });
  }

  static show(
    context: vscode.ExtensionContext,
    spec: GraphSpec,
    onMessage: (msg: unknown) => void,
  ): GraphPanel {
    if (GraphPanel.current) {
      GraphPanel.current.panel.reveal();
      GraphPanel.current.onMessage = onMessage;
      GraphPanel.current.panel.webview.html = GraphPanel.renderHtml(spec, GraphPanel.current.panel.webview);
      return GraphPanel.current;
    }
    const title =
      spec.tier === 'aggregation'
        ? `Lucid cluster: ${spec.scopeId}`
        : `Lucid ${spec.viewType}: ${spec.scopeId}`;
    const panel = vscode.window.createWebviewPanel(
      'lucidGraph',
      title,
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true },
    );
    GraphPanel.current = new GraphPanel(panel, spec, onMessage);
    return GraphPanel.current;
  }

  static renderHtml(spec: GraphSpec, webview: vscode.Webview): string {
    const graphJson = JSON.stringify(spec);
    const csp = webview.cspSource;
    const isCluster = spec.tier === 'aggregation';
    const collapse = spec.collapseLevel ?? 0;
    return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${csp} https://unpkg.com; style-src ${csp} 'unsafe-inline';" />
<style>
body{margin:0;font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background)}
#cy{width:100%;height:calc(100vh - 52px)}
#bar{padding:8px;border-bottom:1px solid var(--vscode-panel-border);font-size:12px;display:flex;flex-wrap:wrap;align-items:center;gap:8px}
button{margin-right:4px}
#collapseLabel{opacity:0.85}
.node-hidden{display:none}
.node-focal{font-weight:bold}
</style>
</head><body>
<div id="bar">
<span>${isCluster ? 'dependency cluster' : spec.viewType} / ${spec.scopeId}</span>
${isCluster ? `<label id="collapseLabel">collapse <input type="range" id="collapse" min="0" max="3" value="${collapse}" /></label>
<button id="drillIn">Analyze…</button>` : ''}
<button id="openDoc">Open Virtual File</button>
<button id="rebind">Rebind (confirm)</button>
<button id="fork">Fork</button>
</div>
<div id="cy"></div>
<script>
const vscode = acquireVsCodeApi();
const spec = ${graphJson};
let collapseLevel = spec.collapseLevel ?? 0;

function nodeLabel(n) {
  if (collapseLevel === 0) return n.label;
  if (collapseLevel === 1) return n.label.split(/[/\\\\]/).pop();
  return n.label.split(/[/\\\\]/).pop();
}

function applyCollapse(cy) {
  const focal = spec.nodes.find(n => n.hop === 0);
  const others = spec.nodes.filter(n => n.hop !== 0);
  const external = others.filter(n => !n.filePath);
  const local = others.filter(n => n.filePath);

  cy.nodes().forEach(node => {
    const d = node.data();
    const meta = spec.nodes.find(n => n.id === d.id);
    if (!meta) return;
    let visible = true;
    let label = nodeLabel(meta);
    if (collapseLevel >= 2 && meta.hop > 0 && !meta.filePath) visible = false;
    if (collapseLevel >= 3 && meta.hop > 0) visible = false;
    node.style('display', visible ? 'element' : 'none');
    if (visible) node.data('label', label);
  });

  cy.edges().forEach(edge => {
    const src = cy.getElementById(edge.data('source'));
    const tgt = cy.getElementById(edge.data('target'));
    const hidden = src.style('display') === 'none' || tgt.style('display') === 'none';
    edge.style('display', hidden ? 'none' : 'element');
  });

  if (collapseLevel >= 3 && focal) {
    const hiddenCount = others.length;
    if (hiddenCount > 0) {
      cy.getElementById(focal.id).data('label', focal.label + ' (+' + hiddenCount + ')');
    }
  }
}

const cy = cytoscape({
  container: document.getElementById('cy'),
  elements: [
    ...spec.nodes.map(n => ({ data: { id: n.id, label: nodeLabel(n), filePath: n.filePath || '' } })),
    ...spec.edges.map(e => ({ data: { id: e.id, source: e.source, target: e.target, label: e.label || '' } })),
  ],
  style: [
    { selector: 'node', style: { label: 'data(label)', 'text-valign':'center', 'background-color':'#4a9eff', color:'#fff', 'font-size':10, 'text-wrap':'wrap', 'text-max-width':120 } },
    { selector: 'node[filePath]', style: { 'background-color':'#3dba6d' } },
    { selector: 'edge', style: { label: 'data(label)', 'curve-style':'bezier', 'target-arrow-shape':'triangle', width:1, 'font-size':8 } },
  ],
  layout: { name: spec.layout || 'breadthfirst', directed: true, padding: 20 },
});
applyCollapse(cy);

let selectedNode = null;
cy.on('tap', 'node', e => {
  selectedNode = e.target.id();
  vscode.postMessage({ type:'nodeSelected', nodeId: selectedNode });
});
cy.on('tap', e => {
  if (e.target === cy) selectedNode = null;
});

document.getElementById('openDoc').onclick = () => vscode.postMessage({ type:'openDocument' });
document.getElementById('rebind').onclick = () => vscode.postMessage({ type:'rebind', nodeId: selectedNode });
document.getElementById('fork').onclick = () => vscode.postMessage({ type:'fork', nodeId: selectedNode });
const drillBtn = document.getElementById('drillIn');
if (drillBtn) drillBtn.onclick = () => vscode.postMessage({ type:'drillIn', nodeId: selectedNode });
const collapseEl = document.getElementById('collapse');
if (collapseEl) {
  collapseEl.oninput = () => {
    collapseLevel = parseInt(collapseEl.value, 10);
    applyCollapse(cy);
    vscode.postMessage({ type:'setCollapseLevel', collapseLevel });
  };
}
</script>
</body></html>`;
  }
}

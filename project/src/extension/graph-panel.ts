/**
 * Cytoscape graph webview panel (synced with Virtual File session).
 */

import * as vscode from 'vscode';
import { GraphSpec } from '../projection/graph';

export class GraphPanel {
  public static current: GraphPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly onMessage: (msg: unknown) => void;

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
      GraphPanel.current.panel.webview.html = GraphPanel.renderHtml(spec, GraphPanel.current.panel.webview);
      return GraphPanel.current;
    }
    const panel = vscode.window.createWebviewPanel(
      'lucidGraph',
      `Lucid ${spec.viewType}: ${spec.scopeId}`,
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true },
    );
    GraphPanel.current = new GraphPanel(panel, spec, onMessage);
    return GraphPanel.current;
  }

  static renderHtml(spec: GraphSpec, webview: vscode.Webview): string {
    const graphJson = JSON.stringify(spec);
    const csp = webview.cspSource;
    return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${csp} https://unpkg.com; style-src ${csp} 'unsafe-inline';" />
<style>
body{margin:0;font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background)}
#cy{width:100%;height:calc(100vh - 44px)}
#bar{padding:8px;border-bottom:1px solid var(--vscode-panel-border);font-size:12px}
button{margin-right:6px}
</style>
</head><body>
<div id="bar"><span>${spec.viewType} / ${spec.scopeId}</span>
<button id="openDoc">Open Virtual File</button>
<button id="rebind">Rebind (confirm)</button>
<button id="fork">Fork</button>
</div>
<div id="cy"></div>
<script src="https://unpkg.com/cytoscape@3.28.1/dist/cytoscape.min.js"></script>
<script>
const vscode = acquireVsCodeApi();
const spec = ${graphJson};
const cy = cytoscape({
  container: document.getElementById('cy'),
  elements: [
    ...spec.nodes.map(n => ({ data: { id: n.id, label: n.label } })),
    ...spec.edges.map(e => ({ data: { id: e.id, source: e.source, target: e.target, label: e.label || '' } })),
  ],
  style: [
    { selector: 'node', style: { label: 'data(label)', 'text-valign':'center', 'background-color':'#4a9eff', color:'#fff', 'font-size':10 } },
    { selector: 'edge', style: { label: 'data(label)', 'curve-style':'bezier', 'target-arrow-shape':'triangle', width:1 } },
  ],
  layout: { name: spec.layout || 'breadthfirst', directed: true, padding: 20 },
});
let selectedNode = null;
cy.on('tap', 'node', e => { selectedNode = e.target.id(); vscode.postMessage({ type:'nodeSelected', nodeId: selectedNode }); });
document.getElementById('openDoc').onclick = () => vscode.postMessage({ type:'openDocument' });
document.getElementById('rebind').onclick = () => vscode.postMessage({ type:'rebind', nodeId: selectedNode });
document.getElementById('fork').onclick = () => vscode.postMessage({ type:'fork', nodeId: selectedNode });
</script>
</body></html>`;
  }
}

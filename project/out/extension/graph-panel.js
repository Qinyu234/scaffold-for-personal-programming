"use strict";
/**
 * Cytoscape graph webview panel (synced with Virtual File session).
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphPanel = void 0;
const vscode = __importStar(require("vscode"));
class GraphPanel {
    constructor(panel, spec, onMessage) {
        this.panel = panel;
        this.onMessage = onMessage;
        this.panel.webview.html = GraphPanel.renderHtml(spec, panel.webview);
        this.panel.webview.onDidReceiveMessage(onMessage);
        this.panel.onDidDispose(() => {
            GraphPanel.current = undefined;
        });
    }
    static show(context, spec, onMessage) {
        if (GraphPanel.current) {
            GraphPanel.current.panel.reveal();
            GraphPanel.current.panel.webview.html = GraphPanel.renderHtml(spec, GraphPanel.current.panel.webview);
            return GraphPanel.current;
        }
        const panel = vscode.window.createWebviewPanel('lucidGraph', `Lucid ${spec.viewType}: ${spec.scopeId}`, vscode.ViewColumn.Beside, { enableScripts: true, retainContextWhenHidden: true });
        GraphPanel.current = new GraphPanel(panel, spec, onMessage);
        return GraphPanel.current;
    }
    static renderHtml(spec, webview) {
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
exports.GraphPanel = GraphPanel;
//# sourceMappingURL=graph-panel.js.map
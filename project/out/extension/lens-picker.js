"use strict";
/**
 * Tier-2 semantic lens picker (drill-in from aggregation cluster).
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
exports.runSemanticLensPicker = runSemanticLensPicker;
const vscode = __importStar(require("vscode"));
const analyze_1 = require("../core/analyze");
const language_1 = require("../ingestion/language");
const data_flow_slice_1 = require("../projection/data-flow-slice");
const entry_point_slice_1 = require("../projection/entry-point-slice");
const event_flow_slice_1 = require("../projection/event-flow-slice");
const impact_slice_1 = require("../projection/impact-slice");
function lensOptions(filePath) {
    const lang = (0, language_1.detectLanguage)(filePath);
    const options = [
        { id: 'open-file', label: 'Open source file' },
    ];
    if (lang === 'typescript') {
        options.push({ id: 'def-use', label: 'Def-Use (state)' }, { id: 'entry-point', label: 'Entry Point (function)' }, { id: 'event-flow', label: 'Event Flow (state)' }, { id: 'impact', label: 'Impact (state)' });
    }
    if (lang === 'python') {
        options.push({ id: 'data-flow', label: 'Data Flow (variable)' }, { id: 'impact', label: 'Impact (state)' });
    }
    return options;
}
async function runSemanticLensPicker(filePath, handlers) {
    const pick = await vscode.window.showQuickPick(lensOptions(filePath).map(o => ({ label: o.label, id: o.id })), { title: `Lucid: analyze ${filePath.split(/[/\\]/).pop()}` });
    if (!pick) {
        return;
    }
    if (pick.id === 'open-file') {
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
        await vscode.window.showTextDocument(doc, { preview: false });
        return;
    }
    if (pick.id === 'def-use') {
        const contracts = (0, analyze_1.analyzeFile)(filePath);
        if (contracts.length === 0) {
            void vscode.window.showInformationMessage('Lucid: no state variables found.');
            return;
        }
        const stateName = await vscode.window.showQuickPick(contracts.map(c => c.variableName), {
            title: 'Select state (scopeId)',
        });
        if (stateName) {
            await handlers.startDefUse(filePath, stateName);
        }
        return;
    }
    if (pick.id === 'entry-point') {
        const names = (0, entry_point_slice_1.listEntryPointFunctions)(filePath);
        if (names.length === 0) {
            void vscode.window.showInformationMessage('Lucid: no functions found.');
            return;
        }
        const entryName = await vscode.window.showQuickPick(names, { title: 'Select entry function' });
        if (entryName) {
            await handlers.startEntryPoint(filePath, entryName);
        }
        return;
    }
    if (pick.id === 'event-flow') {
        const names = (0, event_flow_slice_1.listEventFlowStates)(filePath);
        if (names.length === 0) {
            void vscode.window.showInformationMessage('Lucid: no state variables found.');
            return;
        }
        const stateName = await vscode.window.showQuickPick(names, { title: 'Select state' });
        if (stateName) {
            await handlers.startEventFlow(filePath, stateName);
        }
        return;
    }
    if (pick.id === 'impact') {
        const names = (0, impact_slice_1.listImpactStates)(filePath);
        if (names.length === 0) {
            void vscode.window.showInformationMessage('Lucid: no state variables found.');
            return;
        }
        const stateName = await vscode.window.showQuickPick(names, { title: 'Select state' });
        if (stateName) {
            await handlers.startImpact(filePath, stateName);
        }
        return;
    }
    if (pick.id === 'data-flow') {
        const names = (0, data_flow_slice_1.listPythonDataNames)(filePath);
        if (names.length === 0) {
            void vscode.window.showInformationMessage('Lucid: no data variables found.');
            return;
        }
        const dataName = await vscode.window.showQuickPick(names, { title: 'Select data variable' });
        if (dataName) {
            await handlers.startDataFlow(filePath, dataName);
        }
    }
}
//# sourceMappingURL=lens-picker.js.map
"use strict";
/**
 * Persist fold state under .lucid/state/{stateName}/
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
exports.foldStatePath = foldStatePath;
exports.loadFoldState = loadFoldState;
exports.saveFoldState = saveFoldState;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function foldStatePath(workspaceRoot, stateName) {
    return path.join(workspaceRoot, '.lucid', 'state', stateName, 'fold.json');
}
function loadFoldState(workspaceRoot, stateName) {
    const filePath = foldStatePath(workspaceRoot, stateName);
    if (!fs.existsSync(filePath)) {
        return new Set();
    }
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return new Set(data.collapsedFunctions ?? []);
    }
    catch {
        return new Set();
    }
}
function saveFoldState(workspaceRoot, stateName, collapsed) {
    const filePath = foldStatePath(workspaceRoot, stateName);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const payload = {
        scopeId: stateName,
        collapsedFunctions: [...collapsed],
    };
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
}
//# sourceMappingURL=fold-store.js.map
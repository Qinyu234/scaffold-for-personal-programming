"use strict";
/**
 * Workspace-scoped ts-morph Project for cross-file analysis.
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
exports.findNearestTsConfig = findNearestTsConfig;
exports.createWorkspaceProject = createWorkspaceProject;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ts_morph_1 = require("ts-morph");
const SOURCE_GLOBS = ['**/*.{ts,tsx,js,jsx}'];
function findNearestTsConfig(startDir) {
    let dir = path.resolve(startDir);
    const root = path.parse(dir).root;
    while (true) {
        const candidate = path.join(dir, 'tsconfig.json');
        if (fs.existsSync(candidate)) {
            return candidate;
        }
        if (dir === root) {
            return null;
        }
        dir = path.dirname(dir);
    }
}
function createWorkspaceProject(workspaceRoot, entryFile) {
    const root = path.resolve(workspaceRoot);
    const project = new ts_morph_1.Project({
        compilerOptions: {
            allowJs: true,
            esModuleInterop: true,
        },
    });
    const startDir = entryFile ? path.dirname(path.resolve(entryFile)) : root;
    const tsConfig = findNearestTsConfig(startDir);
    if (tsConfig) {
        project.addSourceFilesFromTsConfig(tsConfig);
        project.resolveSourceFileDependencies();
    }
    else {
        for (const pattern of SOURCE_GLOBS) {
            project.addSourceFilesAtPaths(path.join(root, pattern).replace(/\\/g, '/'));
        }
    }
    return project;
}
//# sourceMappingURL=workspace.js.map
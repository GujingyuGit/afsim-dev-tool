"use strict";
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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const afsimParser_1 = require("./afsimParser");
const completionProvider_1 = require("./completionProvider");
const definitionProvider_1 = require("./definitionProvider");
const hoverProvider_1 = require("./hoverProvider");
const referenceProvider_1 = require("./referenceProvider");
const runCommand_1 = require("./runCommand");
let parser;
const AFSIM_SELECTOR = { scheme: 'file', language: 'afsim' };
function activate(context) {
    parser = new afsimParser_1.AfsimParser();
    // Completion provider
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(AFSIM_SELECTOR, new completionProvider_1.AfsimCompletionProvider(parser), '.', '>', ' ', '\t'));
    // Definition provider
    context.subscriptions.push(vscode.languages.registerDefinitionProvider(AFSIM_SELECTOR, new definitionProvider_1.AfsimDefinitionProvider(parser)));
    // Hover provider
    context.subscriptions.push(vscode.languages.registerHoverProvider(AFSIM_SELECTOR, new hoverProvider_1.AfsimHoverProvider(parser)));
    // Reference provider
    context.subscriptions.push(vscode.languages.registerReferenceProvider(AFSIM_SELECTOR, new referenceProvider_1.AfsimReferenceProvider(parser)));
    // Run command
    (0, runCommand_1.initRunCommand)(context);
    // Parse documents when they open or change
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(doc => {
        if (doc.languageId === 'afsim') {
            parser.parseDocument(doc);
        }
    }));
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(e => {
        if (e.document.languageId === 'afsim') {
            parser.scheduleParse(e.document);
        }
    }));
    context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(doc => {
        if (doc.languageId === 'afsim') {
            parser.removeDocument(doc.uri);
        }
    }));
    // Parse all open AFSIM documents on activation
    for (const doc of vscode.workspace.textDocuments) {
        if (doc.languageId === 'afsim') {
            parser.parseDocument(doc);
        }
    }
}
function deactivate() {
    if (parser) {
        parser.dispose();
    }
}
//# sourceMappingURL=extension.js.map
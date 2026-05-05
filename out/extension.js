"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const afsimParser_1 = require("./afsimParser");
const completionProvider_1 = require("./completionProvider");
const definitionProvider_1 = require("./definitionProvider");
const hoverProvider_1 = require("./hoverProvider");
let parser;
function activate(context) {
    parser = new afsimParser_1.AfsimParser();
    // Register completion provider
    const completionProvider = new completionProvider_1.AfsimCompletionProvider(parser);
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'afsim' }, completionProvider, '.', '>', ' ', '\t'));
    // Register definition provider
    const definitionProvider = new definitionProvider_1.AfsimDefinitionProvider(parser);
    context.subscriptions.push(vscode.languages.registerDefinitionProvider({ scheme: 'file', language: 'afsim' }, definitionProvider));
    // Register hover provider
    const hoverProvider = new hoverProvider_1.AfsimHoverProvider(parser);
    context.subscriptions.push(vscode.languages.registerHoverProvider({ scheme: 'file', language: 'afsim' }, hoverProvider));
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
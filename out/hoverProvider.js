"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AfsimHoverProvider = void 0;
const vscode = require("vscode");
const afsimConfig_1 = require("./data/afsimConfig");
class AfsimHoverProvider {
    parser;
    constructor(parser) {
        this.parser = parser;
    }
    provideHover(document, position, token) {
        if (!this.parser.isInsideScriptBlock(position, document.uri)) {
            return null;
        }
        const range = document.getWordRangeAtPosition(position, /[\w<>]+/);
        if (!range)
            return null;
        const word = document.getText(range);
        if (!word || word.length < 1)
            return null;
        // Hover for global constants
        if (afsimConfig_1.SCRIPT_GLOBAL_CONSTANTS.includes(word)) {
            const md = new vscode.MarkdownString();
            md.appendCodeblock(word, 'afsim');
            md.appendMarkdown(`\n\n**Global constant**`);
            const descriptions = {
                'PLATFORM': '`WsfPlatform` — Current platform',
                'TRACK': '`WsfTrack` — Current track',
                'MESSAGE': '`WsfMessage` — Current message',
                'TIME_NOW': '`double` — Current simulation time in seconds',
                'RANDOM': 'Random number generator',
                'MATH': 'Math utilities',
                'SELF': '`WsfPlatform` — Self-reference platform'
            };
            if (descriptions[word]) {
                md.appendMarkdown(`\n\n${descriptions[word]}`);
            }
            return new vscode.Hover(md, range);
        }
        // Hover for script types
        if (afsimConfig_1.SCRIPT_TYPES.includes(word)) {
            return new vscode.Hover(new vscode.MarkdownString(`\`\`\`afsim\n${word}\n\`\`\`\n\nScript type: \`${word}\``), range);
        }
        // Hover for built-in functions (with overload support)
        const builtin = afsimConfig_1.BUILTIN_FUNCTIONS.find(f => f.name === word);
        if (builtin) {
            const contents = [];
            for (const sig of builtin.signatures) {
                const md = new vscode.MarkdownString();
                const paramStr = sig.params.map(p => `${p.type} ${p.name}`).join(', ');
                md.appendCodeblock(`${sig.returnType} ${builtin.name}(${paramStr})`, 'cpp');
                if (sig.description) {
                    md.appendMarkdown(`\n\n${sig.description}`);
                }
                if (sig.params.some(p => p.description)) {
                    md.appendMarkdown('\n\n**Parameters:**');
                    for (const p of sig.params) {
                        md.appendMarkdown(`\n- \`${p.type} ${p.name}\`${p.description ? ` — ${p.description}` : ''}`);
                    }
                }
                contents.push(md);
            }
            return new vscode.Hover(contents, range);
        }
        // Hover for user-defined variables and functions
        const parsed = this.parser.getDocument(document.uri);
        if (parsed) {
            // Search for variables
            for (const doc of this.parser.getAllDocuments()) {
                for (const v of doc.variables) {
                    if (v.name === word) {
                        const md = new vscode.MarkdownString();
                        md.appendCodeblock(`${v.type} ${v.name}`, 'cpp');
                        if (v.isExtern)
                            md.appendMarkdown('\n\n*(extern variable)*');
                        return new vscode.Hover(md, range);
                    }
                }
            }
            // Search for user-defined functions (with overload support)
            const matchingFunctions = [];
            for (const doc of this.parser.getAllDocuments()) {
                for (const fn of doc.functions) {
                    if (fn.name === word) {
                        matchingFunctions.push({ fn, docUri: doc.uri });
                    }
                }
            }
            if (matchingFunctions.length > 0) {
                const contents = [];
                for (const { fn, docUri } of matchingFunctions) {
                    const md = new vscode.MarkdownString();
                    md.appendCodeblock(`${fn.returnType} ${fn.name}(${fn.params})`, 'cpp');
                    if (docUri.toString() !== document.uri.toString()) {
                        const relPath = vscode.workspace.asRelativePath(docUri);
                        md.appendMarkdown(`\n\nDefined in: \`${relPath}\``);
                    }
                    contents.push(md);
                }
                return new vscode.Hover(contents, range);
            }
        }
        return null;
    }
}
exports.AfsimHoverProvider = AfsimHoverProvider;
//# sourceMappingURL=hoverProvider.js.map
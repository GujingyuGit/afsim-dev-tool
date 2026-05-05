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
        // Only provide hover inside script blocks
        if (!this.parser.isInsideScriptBlock(position, document.uri)) {
            return null;
        }
        const range = document.getWordRangeAtPosition(position, /[\w<>]+/);
        if (!range)
            return null;
        const word = document.getText(range);
        if (!word || word.length < 2)
            return null;
        // Hover for global constants
        if (afsimConfig_1.SCRIPT_GLOBAL_CONSTANTS.includes(word)) {
            const md = new vscode.MarkdownString();
            md.appendCodeblock(word, 'afsim');
            md.appendMarkdown(`\n\n**Global constant**\n\nType information available from AFSIM context.`);
            if (word === 'PLATFORM')
                md.appendMarkdown('\n\n`WsfPlatform` - Current platform');
            if (word === 'TRACK')
                md.appendMarkdown('\n\n`WsfTrack` - Current track');
            if (word === 'MESSAGE')
                md.appendMarkdown('\n\n`WsfMessage` - Current message');
            if (word === 'TIME_NOW')
                md.appendMarkdown('\n\n`double` - Current simulation time');
            if (word === 'RANDOM')
                md.appendMarkdown('\n\nRandom number generator');
            if (word === 'MATH')
                md.appendMarkdown('\n\nMath utilities');
            return new vscode.Hover(md, range);
        }
        // Hover for script types
        if (afsimConfig_1.SCRIPT_TYPES.includes(word)) {
            return new vscode.Hover(new vscode.MarkdownString(`\`\`\`afsim\n${word}\n\`\`\`\n\nScript type: \`${word}\``), range);
        }
        // Hover for variables - show type
        const parsed = this.parser.getDocument(document.uri);
        if (parsed) {
            // Search all documents for variables
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
            // Search for functions - show signature
            for (const doc of this.parser.getAllDocuments()) {
                for (const fn of doc.functions) {
                    if (fn.name === word) {
                        const md = new vscode.MarkdownString();
                        md.appendCodeblock(`${fn.returnType} ${fn.name}(${fn.params})`, 'cpp');
                        md.appendMarkdown(`\n\nDefined in: \`${doc.uri.fsPath}\``);
                        return new vscode.Hover(md, range);
                    }
                }
            }
        }
        return null;
    }
}
exports.AfsimHoverProvider = AfsimHoverProvider;
//# sourceMappingURL=hoverProvider.js.map
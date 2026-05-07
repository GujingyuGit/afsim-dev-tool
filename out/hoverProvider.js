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
exports.AfsimHoverProvider = void 0;
const vscode = __importStar(require("vscode"));
const afsim_domain_1 = require("./data/afsim-domain");
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
        const gc = (0, afsim_domain_1.getGlobalConstant)(word);
        if (gc) {
            const md = new vscode.MarkdownString();
            md.appendCodeblock(word, 'afsim');
            md.appendMarkdown('\n\n**Global constant**');
            if (gc.description) {
                md.appendMarkdown(`\n\n${gc.description}`);
            }
            return new vscode.Hover(md, range);
        }
        // Hover for script types
        if ((0, afsim_domain_1.getScriptTypes)().includes(word)) {
            return new vscode.Hover(new vscode.MarkdownString(`\`\`\`afsim\n${word}\n\`\`\`\n\nScript type: \`${word}\``), range);
        }
        // Hover for predefined types
        if ((0, afsim_domain_1.getPredefinedTypes)().includes(word)) {
            return new vscode.Hover(new vscode.MarkdownString(`\`\`\`afsim\n${word}\n\`\`\`\n\nPredefined WSF type`), range);
        }
        // Hover for built-in functions (with overload support)
        const builtin = (0, afsim_domain_1.getBuiltinFunctions)().find((f) => f.name === word);
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
        // Hover for class methods — check if word is a method on a type we can resolve
        const methodHover = this.tryMethodHover(document, position, word, range);
        if (methodHover)
            return methodHover;
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
    /**
     * Try to show hover for a class method by looking at the expression before ".".
     * e.g., for "pla.Weapon()", hovering over "Weapon" shows WsfWeapon method info.
     */
    tryMethodHover(document, position, word, wordRange) {
        // Look at the line to find "xxx.word" pattern
        const line = document.lineAt(position.line).text;
        const linePrefix = line.substring(0, wordRange.start.character);
        // Find the expression before "." or "->"
        const dotMatch = linePrefix.match(/(\w+)\s*(?:\.|->)\s*$/);
        if (!dotMatch)
            return null;
        const objName = dotMatch[1];
        // Resolve the type of the object
        let objType = null;
        // Check global constants
        objType = (0, afsim_domain_1.getGlobalConstantType)(objName);
        if (!objType) {
            // Check parsed variables
            for (const doc of this.parser.getAllDocuments()) {
                for (const v of doc.variables) {
                    if (v.name === objName) {
                        objType = v.type;
                        break;
                    }
                }
                if (objType)
                    break;
            }
        }
        if (!objType)
            return null;
        // Find the method on this type
        const methods = (0, afsim_domain_1.getAllMethodsForClass)(objType);
        const method = methods.find((m) => m.name === word);
        if (!method || method.signatures.length === 0)
            return null;
        const contents = [];
        for (const sig of method.signatures) {
            const md = new vscode.MarkdownString();
            const paramStr = sig.params.map(p => `${p.type} ${p.name}`).join(', ');
            md.appendCodeblock(`${sig.returnType} ${method.name}(${paramStr})`, 'cpp');
            if (sig.description) {
                md.appendMarkdown(`\n\n${sig.description}`);
            }
            contents.push(md);
        }
        return new vscode.Hover(contents, wordRange);
    }
}
exports.AfsimHoverProvider = AfsimHoverProvider;
//# sourceMappingURL=hoverProvider.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AfsimDefinitionProvider = void 0;
const afsim_domain_1 = require("./data/afsim-domain");
class AfsimDefinitionProvider {
    parser;
    constructor(parser) {
        this.parser = parser;
    }
    provideDefinition(document, position, token) {
        const range = document.getWordRangeAtPosition(position, /[\w<>]+/);
        if (!range)
            return null;
        const word = document.getText(range);
        if (!word || word.length < 1)
            return null;
        // Check if we're inside a script block
        const isScript = this.parser.isInsideScriptBlock(position, document.uri);
        if (isScript) {
            return this.findScriptDefinition(word, document, position);
        }
        else {
            return this.findConfigDefinition(word, document, position);
        }
    }
    findScriptDefinition(word, document, position) {
        const parsed = this.parser.getDocument(document.uri);
        if (!parsed)
            return null;
        // Search for variable definition
        for (const v of parsed.variables) {
            if (v.name === word) {
                return v.location;
            }
        }
        // Search all documents for function definitions
        for (const doc of this.parser.getAllDocuments()) {
            for (const fn of doc.functions) {
                if (fn.name === word) {
                    return fn.location;
                }
            }
        }
        return null;
    }
    findConfigDefinition(word, document, position) {
        // Don't try to find definitions for predefined types
        if ((0, afsim_domain_1.getPredefinedTypes)().includes(word))
            return null;
        // Search for user-defined type definitions
        for (const doc of this.parser.getAllDocuments()) {
            for (const t of doc.types) {
                if (t.name === word) {
                    return t.location;
                }
            }
        }
        return null;
    }
}
exports.AfsimDefinitionProvider = AfsimDefinitionProvider;
//# sourceMappingURL=definitionProvider.js.map
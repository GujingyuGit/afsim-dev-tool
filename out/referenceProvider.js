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
exports.AfsimReferenceProvider = void 0;
const vscode = __importStar(require("vscode"));
class AfsimReferenceProvider {
    parser;
    constructor(parser) {
        this.parser = parser;
    }
    async provideReferences(document, position, context, token) {
        const range = document.getWordRangeAtPosition(position, /[\w<>]+/);
        if (!range)
            return [];
        const word = document.getText(range);
        if (!word || word.length < 1)
            return [];
        const locations = [];
        const seenLines = new Set();
        // Always search variables and functions across all documents
        for (const doc of this.parser.getAllDocuments()) {
            for (const v of doc.variables) {
                if (v.name === word) {
                    addLocation(locations, seenLines, v.location);
                }
            }
            for (const fn of doc.functions) {
                if (fn.name === word) {
                    addLocation(locations, seenLines, fn.location);
                }
            }
            for (const t of doc.types) {
                if (t.name === word) {
                    addLocation(locations, seenLines, t.location);
                }
            }
        }
        // Search for usage across all documents
        await this.findWordUsage(word, locations, seenLines, token);
        return locations;
    }
    async findWordUsage(word, locations, seenLines, token) {
        for (const doc of this.parser.getAllDocuments()) {
            if (token.isCancellationRequested)
                return;
            let textDoc;
            try {
                textDoc = await vscode.workspace.openTextDocument(doc.uri);
            }
            catch {
                continue;
            }
            const text = textDoc.getText();
            const wordPattern = new RegExp(`\\b${escapeRegex(word)}\\b`, 'g');
            let match;
            while ((match = wordPattern.exec(text)) !== null) {
                const pos = textDoc.positionAt(match.index);
                const loc = new vscode.Location(doc.uri, pos);
                addLocation(locations, seenLines, loc);
            }
        }
    }
}
exports.AfsimReferenceProvider = AfsimReferenceProvider;
function addLocation(locations, seenLines, loc) {
    const key = `${loc.uri.toString()}:${loc.range.start.line}`;
    if (seenLines.has(key))
        return;
    seenLines.add(key);
    locations.push(loc);
}
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
//# sourceMappingURL=referenceProvider.js.map
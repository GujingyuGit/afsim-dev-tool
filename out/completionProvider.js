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
exports.AfsimCompletionProvider = void 0;
const vscode = __importStar(require("vscode"));
const afsimConfig_1 = require("./data/afsimConfig");
const afsim_domain_1 = require("./data/afsim-domain");
class AfsimCompletionProvider {
    parser;
    constructor(parser) {
        this.parser = parser;
    }
    provideCompletionItems(document, position, token, context) {
        const items = [];
        const line = document.lineAt(position.line).text;
        const prefix = line.substring(0, position.character);
        // Determine context
        const isScript = this.parser.isInsideScriptBlock(position, document.uri);
        if (isScript) {
            this.addScriptCompletions(items, document, position, context, prefix);
        }
        else {
            this.addConfigCompletions(items, document, position, context, prefix);
        }
        return items;
    }
    // ---------------------------------------------------------------------------
    // Script block completions
    // ---------------------------------------------------------------------------
    addScriptCompletions(items, document, position, context, prefix) {
        const triggerChar = context.triggerCharacter;
        // After "." or ">" (for ->): member completion
        if (triggerChar === '.' || triggerChar === '>') {
            this.addMemberCompletions(items, prefix, document);
            return;
        }
        // Type names
        this.addScriptTypeCompletions(items);
        // Global constants
        this.addGlobalConstantCompletions(items);
        // Built-in functions
        this.addBuiltinFunctionCompletions(items);
        // Control keywords
        for (const kw of afsimConfig_1.SCRIPT_CONTROL_KEYWORDS) {
            items.push(new vscode.CompletionItem(kw, vscode.CompletionItemKind.Keyword));
        }
        // Predefined types
        for (const pt of (0, afsim_domain_1.getPredefinedTypes)()) {
            const item = new vscode.CompletionItem(pt, vscode.CompletionItemKind.Class);
            item.detail = 'Predefined WSF type';
            items.push(item);
        }
        // Units
        this.addUnitCompletions(items, prefix);
        // User-defined variables and functions
        this.addReachableVariables(items, document, position);
        this.addReachableFunctions(items, document, position);
    }
    addScriptTypeCompletions(items) {
        for (const t of (0, afsim_domain_1.getScriptTypes)()) {
            const item = new vscode.CompletionItem(t, vscode.CompletionItemKind.Class);
            item.detail = 'AFSIM script type';
            items.push(item);
        }
    }
    addGlobalConstantCompletions(items) {
        for (const name of (0, afsim_domain_1.getGlobalConstantNames)()) {
            const gcType = (0, afsim_domain_1.getGlobalConstantType)(name);
            const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Constant);
            item.detail = gcType ? `Global constant: ${gcType}` : 'Global constant';
            items.push(item);
        }
    }
    addBuiltinFunctionCompletions(items) {
        for (const builtin of (0, afsim_domain_1.getBuiltinFunctions)()) {
            const overloadCount = builtin.signatures.length;
            const primarySig = builtin.signatures[0];
            const paramStr = primarySig.params.map(p => `${p.type} ${p.name}`).join(', ');
            const item = new vscode.CompletionItem(builtin.name, vscode.CompletionItemKind.Function);
            item.detail = `${primarySig.returnType} ${builtin.name}(${paramStr})`;
            if (overloadCount > 1) {
                item.detail += ` (+${overloadCount - 1} overload${overloadCount > 2 ? 's' : ''})`;
            }
            if (primarySig.description) {
                item.documentation = new vscode.MarkdownString(primarySig.description);
            }
            items.push(item);
        }
    }
    addUnitCompletions(items, prefix) {
        // Only suggest units after a number
        const numMatch = prefix.match(/\d\s*$/);
        if (!numMatch)
            return;
        for (const unit of afsimConfig_1.UNITS) {
            const item = new vscode.CompletionItem(unit, vscode.CompletionItemKind.Unit);
            items.push(item);
        }
    }
    addReachableVariables(items, document, position) {
        const parsed = this.parser.getDocument(document.uri);
        if (!parsed)
            return;
        const scope = this.parser.getScopeAtPosition(position, parsed.uri);
        if (!scope)
            return;
        // Add local variables from the current script block (including function parameters)
        for (const v of parsed.variables) {
            if (v.location.range.start.line >= scope.startLine &&
                v.location.range.start.line <= position.line &&
                !items.some(i => i.label === v.name)) {
                const item = new vscode.CompletionItem(v.name, vscode.CompletionItemKind.Variable);
                item.detail = v.type;
                items.push(item);
            }
        }
        // Walk up to find the enclosing config block for script_variables
        let configScope = scope.parentScope;
        while (configScope && configScope.isScript) {
            configScope = configScope.parentScope;
        }
        if (!configScope)
            return;
        // Get all variables from script_variables blocks within this config block
        for (const block of parsed.blocks) {
            if (block.keyword === 'script_variables' &&
                block.startLine >= configScope.startLine &&
                (block.endLine === -1 || block.endLine <= (configScope.endLine === -1 ? Infinity : configScope.endLine))) {
                for (const v of parsed.variables) {
                    if (v.location.range.start.line >= block.startLine &&
                        v.location.range.start.line <= (block.endLine === -1 ? Infinity : block.endLine) &&
                        !items.some(i => i.label === v.name)) {
                        const item = new vscode.CompletionItem(v.name, vscode.CompletionItemKind.Variable);
                        item.detail = `${v.type}${v.isExtern ? ' (extern)' : ''}`;
                        items.push(item);
                    }
                }
            }
        }
    }
    addReachableFunctions(items, document, position) {
        for (const doc of this.parser.getAllDocuments()) {
            for (const fn of doc.functions) {
                if (!items.some(i => i.label === fn.name)) {
                    const item = new vscode.CompletionItem(fn.name, vscode.CompletionItemKind.Function);
                    item.detail = `${fn.returnType} ${fn.name}(${fn.params})`;
                    items.push(item);
                }
            }
        }
    }
    // ---------------------------------------------------------------------------
    // Member completion (chained dot access)
    // ---------------------------------------------------------------------------
    addMemberCompletions(items, prefix, document) {
        const exprType = this.resolveExpressionType(prefix, document);
        if (!exprType)
            return;
        const methods = (0, afsim_domain_1.getAllMethodsForClass)(exprType);
        for (const m of methods) {
            const primarySig = m.signatures[0];
            const paramStr = primarySig.params.map(p => `${p.type} ${p.name}`).join(', ');
            const kind = primarySig.returnType === 'void' || primarySig.params.length > 0
                ? vscode.CompletionItemKind.Method
                : vscode.CompletionItemKind.Property;
            const item = new vscode.CompletionItem(m.name, kind);
            item.detail = `${primarySig.returnType} ${m.name}(${paramStr})`;
            if (m.signatures.length > 1) {
                item.detail += ` (+${m.signatures.length - 1} overload${m.signatures.length > 2 ? 's' : ''})`;
            }
            if (primarySig.description) {
                item.documentation = new vscode.MarkdownString(primarySig.description);
            }
            items.push(item);
        }
        // Fallback for unknown types: basic Array members
        if (methods.length === 0) {
            for (const m of ['Size', 'PushBack', 'Get', 'Empty']) {
                items.push(new vscode.CompletionItem(m, vscode.CompletionItemKind.Method));
            }
        }
    }
    resolveExpressionType(prefix, document) {
        const chainMatch = prefix.match(/^(.+?)\s*(?:\.|->)\s*$/);
        if (!chainMatch)
            return null;
        const expr = chainMatch[1].trim();
        return this.resolveTypeOfExpr(expr, document);
    }
    resolveTypeOfExpr(expr, document) {
        // Find the last "." or "->" that is NOT inside parentheses
        let lastDotIdx = -1;
        let parenDepth = 0;
        for (let i = expr.length - 1; i >= 0; i--) {
            if (expr[i] === ')')
                parenDepth++;
            else if (expr[i] === '(')
                parenDepth--;
            else if (parenDepth === 0) {
                if (expr[i] === '.') {
                    lastDotIdx = i;
                    break;
                }
                if (i > 0 && expr[i - 1] === '-' && expr[i] === '>') {
                    lastDotIdx = i - 1;
                    break;
                }
            }
        }
        if (lastDotIdx >= 0) {
            // Chained: resolve left part, then look up the method on that type
            const leftExpr = expr.substring(0, lastDotIdx).trim();
            const rightPart = expr.substring(lastDotIdx).trim();
            const methodMatch = rightPart.match(/^(?:\.|->)\s*(\w+)\s*\(\s*\)$/);
            if (methodMatch) {
                const methodName = methodMatch[1];
                const leftType = this.resolveTypeOfExpr(leftExpr, document);
                if (leftType) {
                    return (0, afsim_domain_1.getMethodReturnType)(leftType, methodName);
                }
            }
            return null;
        }
        // Simple variable name
        const varName = expr.trim();
        // Check global constants
        const gcType = (0, afsim_domain_1.getGlobalConstantType)(varName);
        if (gcType)
            return gcType;
        // Look up variable type from parsed documents
        if (document) {
            for (const doc of this.parser.getAllDocuments()) {
                for (const v of doc.variables) {
                    if (v.name === varName) {
                        return v.type;
                    }
                }
            }
        }
        return null;
    }
    // ---------------------------------------------------------------------------
    // Config block completions
    // ---------------------------------------------------------------------------
    addConfigCompletions(items, document, position, context, prefix) {
        const parsed = this.parser.getDocument(document.uri);
        if (!parsed)
            return;
        const scope = this.parser.getScopeAtPosition(position, parsed.uri);
        if (scope) {
            // script_variables blocks: only offer type names for variable declarations
            if (scope.keyword === 'script_variables') {
                this.addScriptVariablesCompletions(items);
                return;
            }
            // Inside a block
            this.addConfigBlockCompletions(items, scope.keyword, prefix);
        }
        else {
            // At top level
            this.addTopLevelCompletions(items, prefix);
        }
    }
    addConfigBlockCompletions(items, blockKeyword, prefix) {
        const blockDef = (0, afsimConfig_1.getBlockDef)(blockKeyword);
        if (!blockDef)
            return;
        // Nested block keywords
        for (const nested of blockDef.nestedBlocks) {
            const nestedDef = (0, afsimConfig_1.getBlockDef)(nested);
            const item = new vscode.CompletionItem(nested, vscode.CompletionItemKind.Keyword);
            item.detail = nestedDef ? `Nested block in ${blockKeyword}` : 'Block keyword';
            items.push(item);
        }
        // Config items
        for (const ci of blockDef.configItems) {
            items.push(new vscode.CompletionItem(ci, vscode.CompletionItemKind.Property));
        }
        // Extended config items from predefined types for this block
        const predefinedTypesForBlock = (0, afsim_domain_1.getPredefinedTypesForBlock)(blockKeyword);
        for (const ptName of predefinedTypesForBlock) {
            const ptConfig = (0, afsim_domain_1.getPredefinedTypeConfig)(ptName);
            if (ptConfig) {
                for (const ci of ptConfig.configItems) {
                    if (!items.some(i => i.label === ci.name)) {
                        const item = new vscode.CompletionItem(ci.name, vscode.CompletionItemKind.Property);
                        item.detail = `From ${ptName}`;
                        if (ci.description) {
                            item.documentation = new vscode.MarkdownString(ci.description);
                        }
                        items.push(item);
                    }
                }
            }
        }
        // Edit/add/delete operators
        for (const op of ['edit', 'add', 'delete']) {
            items.push(new vscode.CompletionItem(op, vscode.CompletionItemKind.Operator));
        }
        // Units after numbers
        this.addUnitCompletions(items, prefix);
        // Config value keywords
        for (const [keyword, _] of Object.entries(afsimConfig_1.CONFIG_VALUE_KEYWORDS)) {
            items.push(new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Value));
        }
        // Predefined types (for type inheritance)
        if (blockDef.canInherit) {
            for (const pt of (0, afsim_domain_1.getPredefinedTypes)()) {
                const item = new vscode.CompletionItem(pt, vscode.CompletionItemKind.Class);
                item.detail = 'Predefined WSF type';
                items.push(item);
            }
        }
    }
    addScriptVariablesCompletions(items) {
        // Primitive types
        for (const t of ['int', 'double', 'float', 'bool', 'string', 'auto']) {
            items.push(new vscode.CompletionItem(t, vscode.CompletionItemKind.Class));
        }
        // extern keyword
        items.push(new vscode.CompletionItem('extern', vscode.CompletionItemKind.Keyword));
        // Script class types (for typed variables like WsfPlatform pla)
        for (const t of (0, afsim_domain_1.getScriptTypes)()) {
            const item = new vscode.CompletionItem(t, vscode.CompletionItemKind.Class);
            item.detail = 'AFSIM script type';
            items.push(item);
        }
        // Array type template
        const arrayItem = new vscode.CompletionItem('Array<>', vscode.CompletionItemKind.Class);
        arrayItem.detail = 'Array type template';
        arrayItem.insertText = new vscode.SnippetString('Array<${1:type}>');
        items.push(arrayItem);
    }
    addTopLevelCompletions(items, prefix) {
        // Top-level block keywords
        for (const kw of afsimConfig_1.TOP_LEVEL_BLOCK_KEYWORDS) {
            const item = new vscode.CompletionItem(kw, vscode.CompletionItemKind.Keyword);
            const def = (0, afsimConfig_1.getBlockDef)(kw);
            item.detail = def ? `Top-level block` : 'Block keyword';
            items.push(item);
        }
        // Script block at top level
        const item = new vscode.CompletionItem('script', vscode.CompletionItemKind.Keyword);
        item.detail = 'Script block';
        item.documentation = new vscode.MarkdownString('Script block: `script` ... `end_script`');
        items.push(item);
        // Commands
        for (const cmd of afsimConfig_1.COMMANDS) {
            const item = new vscode.CompletionItem(cmd.keyword, vscode.CompletionItemKind.Keyword);
            item.detail = cmd.description;
            items.push(item);
        }
        // Units after numbers
        this.addUnitCompletions(items, prefix);
    }
}
exports.AfsimCompletionProvider = AfsimCompletionProvider;
//# sourceMappingURL=completionProvider.js.map
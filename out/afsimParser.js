"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AfsimParser = void 0;
const vscode = require("vscode");
const afsimConfig_1 = require("./data/afsimConfig");
class AfsimParser {
    documents = new Map();
    updateTimer = new Map();
    delay;
    onParsedCallbacks = [];
    constructor() {
        const config = vscode.workspace.getConfiguration('afsim');
        this.delay = config.get('scriptCompletionDelay', 500);
    }
    onParsed(callback) {
        this.onParsedCallbacks.push(callback);
    }
    scheduleParse(document) {
        const key = document.uri.toString();
        if (this.updateTimer.has(key)) {
            clearTimeout(this.updateTimer.get(key));
        }
        const timer = setTimeout(() => {
            this.parseDocument(document);
        }, this.delay);
        this.updateTimer.set(key, timer);
    }
    parseDocument(document) {
        const text = document.getText();
        const lines = text.split('\n');
        const uri = document.uri;
        const key = uri.toString();
        const parsed = {
            uri,
            blocks: [],
            variables: [],
            functions: [],
            types: [],
            includes: [],
            version: document.version
        };
        const scopeStack = [];
        let currentScriptVarBlock = null;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            // Skip comments and empty lines
            if (trimmed === '' || trimmed.startsWith('#')) {
                continue;
            }
            // Handle end keywords
            const endMatch = trimmed.match(/^end_(\w+)\s*$/);
            if (endMatch) {
                if (scopeStack.length > 0) {
                    const closing = scopeStack[scopeStack.length - 1];
                    closing.endLine = i;
                    scopeStack.pop();
                }
                currentScriptVarBlock = null;
                continue;
            }
            // Handle end keywords with trailing content (like end_script inside on_message)
            const endMatch2 = trimmed.match(/^end_(\w+)\b/);
            if (endMatch2 && afsimConfig_1.SCRIPT_END_KEYWORDS[endMatch2[1]]) {
                if (scopeStack.length > 0) {
                    const expectedEnd = `end_${scopeStack[scopeStack.length - 1].keyword}`;
                    if (trimmed.startsWith(expectedEnd)) {
                        scopeStack[scopeStack.length - 1].endLine = i;
                        scopeStack.pop();
                    }
                }
                continue;
            }
            // Handle include_once
            if (trimmed.startsWith('include_once')) {
                const incMatch = trimmed.match(/^include_once\s+(\S+)/);
                if (incMatch) {
                    parsed.includes.push(incMatch[1]);
                }
                continue;
            }
            // Handle define_path_variable
            if (trimmed.startsWith('define_path_variable')) {
                continue;
            }
            // Handle single-line commands
            if (/^(end_time|log_file)\s/.test(trimmed)) {
                continue;
            }
            // Handle block start keywords
            const blockMatch = trimmed.match(/^(\w+)\s*(.*)/);
            if (blockMatch) {
                const keyword = blockMatch[1];
                const rest = blockMatch[2].trim();
                // Check if this is a script block start
                if (afsimConfig_1.SCRIPT_BLOCK_KEYWORDS.includes(keyword) || keyword === 'script_variables') {
                    const isScript = afsimConfig_1.SCRIPT_BLOCK_KEYWORDS.includes(keyword) && keyword !== 'script_variables';
                    const scope = {
                        keyword,
                        name: '',
                        typeName: '',
                        startLine: i,
                        endLine: -1,
                        parentScope: scopeStack.length > 0 ? scopeStack[scopeStack.length - 1] : null,
                        isScript
                    };
                    // Parse script function signature
                    if (keyword === 'script') {
                        this.parseScriptSignature(rest, i, uri, parsed, scope);
                    }
                    scopeStack.push(scope);
                    parsed.blocks.push(scope);
                    if (keyword === 'script_variables') {
                        currentScriptVarBlock = scope;
                    }
                    continue;
                }
                // Check if this is a configuration block start
                if (afsimConfig_1.BLOCK_DEFINITIONS[keyword]) {
                    const def = afsimConfig_1.BLOCK_DEFINITIONS[keyword];
                    const scope = {
                        keyword,
                        name: '',
                        typeName: '',
                        startLine: i,
                        endLine: -1,
                        parentScope: scopeStack.length > 0 ? scopeStack[scopeStack.length - 1] : null,
                        isScript: false
                    };
                    // Parse name and type from rest
                    const parts = rest.split(/\s+/).filter(p => p.length > 0);
                    if (parts.length >= 1)
                        scope.name = parts[0];
                    if (parts.length >= 2)
                        scope.typeName = parts[1];
                    // Register type definitions
                    if (def.canDefineType && scope.name) {
                        const parentType = scope.typeName || '';
                        parsed.types.push({
                            name: scope.name,
                            parentType,
                            blockKeyword: keyword,
                            location: new vscode.Location(uri, new vscode.Position(i, 0)),
                            fileUri: uri
                        });
                    }
                    scopeStack.push(scope);
                    parsed.blocks.push(scope);
                    continue;
                }
                // Check for edit/add/delete operations
                if (keyword === 'edit' || keyword === 'add' || keyword === 'delete') {
                    const restParts = rest.split(/\s+/);
                    // edit might be followed by a block keyword and name
                    if (restParts.length >= 1 && afsimConfig_1.BLOCK_DEFINITIONS[restParts[0]]) {
                        const subKeyword = restParts[0];
                        const scope = {
                            keyword: subKeyword,
                            name: restParts[1] || '',
                            typeName: restParts[2] || '',
                            startLine: i,
                            endLine: -1,
                            parentScope: scopeStack.length > 0 ? scopeStack[scopeStack.length - 1] : null,
                            isScript: false
                        };
                        scopeStack.push(scope);
                        parsed.blocks.push(scope);
                        continue;
                    }
                }
                // Inside script_variables block, parse variable declarations
                if (currentScriptVarBlock) {
                    this.parseScriptVariable(trimmed, i, uri, parsed);
                    continue;
                }
                // Inside script blocks, parse local variable declarations
                if (scopeStack.length > 0 && scopeStack[scopeStack.length - 1].isScript) {
                    this.parseScriptLocalVariable(trimmed, i, uri, parsed);
                }
            }
        }
        // Close any unclosed blocks
        for (const scope of scopeStack) {
            scope.endLine = lines.length - 1;
        }
        this.documents.set(key, parsed);
        for (const cb of this.onParsedCallbacks) {
            cb(parsed);
        }
        return parsed;
    }
    parseScriptSignature(rest, line, uri, parsed, scope) {
        // script <return_type> <name>(<params>)
        // script bool FunctionName(WsfPlatform p, WsfTrack t)
        const funcMatch = rest.match(/^(\w+)\s+(\w+)\s*\(([^)]*)\)/);
        if (funcMatch) {
            const returnType = funcMatch[1];
            const name = funcMatch[2];
            const params = funcMatch[3].trim();
            scope.name = name;
            parsed.functions.push({
                name,
                returnType,
                params,
                location: new vscode.Location(uri, new vscode.Position(line, 0)),
                fileUri: uri
            });
            return;
        }
        // script void FunctionName(...)
        const voidMatch = rest.match(/^(void)\s+(\w+)\s*\(([^)]*)\)/);
        if (voidMatch) {
            const returnType = voidMatch[1];
            const name = voidMatch[2];
            const params = voidMatch[3].trim();
            scope.name = name;
            parsed.functions.push({
                name,
                returnType,
                params,
                location: new vscode.Location(uri, new vscode.Position(line, 0)),
                fileUri: uri
            });
            return;
        }
        // Array<Type> return type
        const arrayMatch = rest.match(/^(Array<[^>]+>)\s+(\w+)\s*\(([^)]*)\)/);
        if (arrayMatch) {
            const returnType = arrayMatch[1];
            const name = arrayMatch[2];
            const params = arrayMatch[3].trim();
            scope.name = name;
            parsed.functions.push({
                name,
                returnType,
                params,
                location: new vscode.Location(uri, new vscode.Position(line, 0)),
                fileUri: uri
            });
        }
    }
    parseScriptVariable(line, lineNum, uri, parsed) {
        // extern double max_chase_speed; # m/s
        // string w_name;
        // double range = 120000.0 # in meter
        // Array<WsfWeapon> attack_weapons;
        const cleanLine = line.replace(/#.*$/, '').replace(/;.*$/, '').replace(/=.*/, '').trim();
        const parts = cleanLine.split(/\s+/);
        let isExtern = false;
        let typeIdx = 0;
        if (parts[0] === 'extern') {
            isExtern = true;
            typeIdx = 1;
        }
        if (parts.length > typeIdx + 1) {
            let type = parts[typeIdx];
            // Handle Array<Type>
            if (type === 'Array' && parts[typeIdx + 1] && parts[typeIdx + 1].startsWith('<')) {
                type = 'Array' + parts[typeIdx + 1];
                typeIdx++;
            }
            const name = parts[typeIdx + 1];
            if (name && /^[a-zA-Z_]/.test(name)) {
                parsed.variables.push({
                    name,
                    type,
                    isExtern,
                    location: new vscode.Location(uri, new vscode.Position(lineNum, line.indexOf(name))),
                    fileUri: uri
                });
            }
        }
    }
    parseScriptLocalVariable(line, lineNum, uri, parsed) {
        // Inside script blocks: Type name = ...;
        const cleanLine = line.replace(/\/\/.*$/, '').trim();
        // Match: Type name = value  or  Type name;
        const varMatch = cleanLine.match(/^(?:(?:int|double|float|bool|string|void|struct|auto|Array<[^>]+>|[A-Z][A-Za-z0-9_]*))\s+(\w+)\s*(?:=|;)/);
        if (varMatch) {
            const typeMatch = cleanLine.match(/^(int|double|float|bool|string|void|struct|auto|Array<[^>]+>|[A-Z][A-Za-z0-9_]*)\s+/);
            if (typeMatch) {
                parsed.variables.push({
                    name: varMatch[1],
                    type: typeMatch[1],
                    isExtern: false,
                    location: new vscode.Location(uri, new vscode.Position(lineNum, cleanLine.indexOf(varMatch[1]))),
                    fileUri: uri
                });
            }
        }
        // foreach (Type var in collection)
        const foreachMatch = cleanLine.match(/foreach\s*\(\s*(\w+)\s+(\w+)\s+in\s+/);
        if (foreachMatch) {
            parsed.variables.push({
                name: foreachMatch[2],
                type: foreachMatch[1],
                isExtern: false,
                location: new vscode.Location(uri, new vscode.Position(lineNum, 0)),
                fileUri: uri
            });
        }
    }
    getDocument(uri) {
        return this.documents.get(uri.toString());
    }
    getAllDocuments() {
        return Array.from(this.documents.values());
    }
    findTypeDefinition(typeName, excludeUri) {
        for (const doc of this.documents.values()) {
            if (excludeUri && doc.uri.toString() === excludeUri.toString())
                continue;
            const found = doc.types.find(t => t.name === typeName);
            if (found)
                return found;
        }
        // Also check the excluded document
        if (excludeUri) {
            const doc = this.documents.get(excludeUri.toString());
            if (doc) {
                const found = doc.types.find(t => t.name === typeName);
                if (found)
                    return found;
            }
        }
        return undefined;
    }
    findVariable(name, uri) {
        const doc = this.documents.get(uri.toString());
        if (doc) {
            return doc.variables.find(v => v.name === name);
        }
        return undefined;
    }
    findFunction(name, uri) {
        // Search all documents for the function
        for (const doc of this.documents.values()) {
            const found = doc.functions.find(f => f.name === name);
            if (found)
                return found;
        }
        return undefined;
    }
    getScopeAtPosition(position, uri) {
        const doc = this.documents.get(uri.toString());
        if (!doc)
            return null;
        // Find the innermost block that contains the position
        let best = null;
        for (const block of doc.blocks) {
            if (block.startLine <= position.line && (block.endLine === -1 || block.endLine >= position.line)) {
                if (!best || (block.startLine > best.startLine)) {
                    best = block;
                }
            }
        }
        return best;
    }
    isInsideScriptBlock(position, uri) {
        const scope = this.getScopeAtPosition(position, uri);
        if (!scope)
            return false;
        return scope.isScript;
    }
    getEnclosingConfigBlock(position, uri) {
        const scope = this.getScopeAtPosition(position, uri);
        if (!scope)
            return null;
        if (scope.isScript) {
            return scope.parentScope;
        }
        return scope;
    }
    removeDocument(uri) {
        const key = uri.toString();
        this.documents.delete(key);
        const timer = this.updateTimer.get(key);
        if (timer) {
            clearTimeout(timer);
            this.updateTimer.delete(key);
        }
    }
    dispose() {
        for (const timer of this.updateTimer.values()) {
            clearTimeout(timer);
        }
        this.updateTimer.clear();
        this.documents.clear();
    }
}
exports.AfsimParser = AfsimParser;
//# sourceMappingURL=afsimParser.js.map
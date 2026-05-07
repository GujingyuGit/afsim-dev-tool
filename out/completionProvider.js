"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AfsimCompletionProvider = void 0;
const vscode = require("vscode");
const afsimConfig_1 = require("./data/afsimConfig");
class AfsimCompletionProvider {
    parser;
    constructor(parser) {
        this.parser = parser;
    }
    provideCompletionItems(document, position, token, context) {
        const items = [];
        const line = document.lineAt(position.line).text;
        const prefix = line.substring(0, position.character);
        const trimmedPrefix = prefix.trimStart();
        // Check context
        const scope = this.parser.getScopeAtPosition(position, document.uri);
        if (scope && scope.isScript) {
            // Inside a script block - provide script completions
            this.addScriptCompletions(items, document, position, prefix, context);
        }
        else if (scope && scope.keyword === 'aux_data') {
            // Inside aux_data block
            this.addAuxDataCompletions(items, prefix);
        }
        else if (scope && scope.keyword === 'script_variables') {
            // Inside script_variables block
            this.addScriptVariableCompletions(items, prefix);
        }
        else if (scope) {
            // Inside a config block
            this.addConfigBlockCompletions(items, scope, prefix, position, document);
        }
        else {
            // Top level
            this.addTopLevelCompletions(items, prefix, document);
        }
        return items;
    }
    addTopLevelCompletions(items, prefix, document) {
        const trimmed = prefix.trimStart();
        // Block keywords
        for (const kw of afsimConfig_1.TOP_LEVEL_BLOCK_KEYWORDS) {
            if (kw.startsWith('tof_and_speed'))
                continue;
            const item = new vscode.CompletionItem(kw, vscode.CompletionItemKind.Keyword);
            item.detail = 'AFSIM block';
            const def = afsimConfig_1.BLOCK_DEFINITIONS[kw];
            if (def) {
                item.documentation = new vscode.MarkdownString(`Block: \`${kw}\` ... \`end_${kw}\``);
            }
            items.push(item);
        }
        // Script blocks at top level
        for (const kw of afsimConfig_1.SCRIPT_BLOCK_KEYWORDS) {
            if (kw === 'on_update' || kw === 'on_message' || kw === 'on_initialize')
                continue;
            const item = new vscode.CompletionItem(kw, vscode.CompletionItemKind.Keyword);
            item.detail = 'Script block';
            item.documentation = new vscode.MarkdownString(`Script block: \`${kw}\` ... \`${afsimConfig_1.SCRIPT_END_KEYWORDS[kw]}\``);
            items.push(item);
        }
        // Commands
        for (const cmd of afsimConfig_1.COMMANDS) {
            const item = new vscode.CompletionItem(cmd.keyword, vscode.CompletionItemKind.Keyword);
            item.detail = 'Command';
            item.documentation = cmd.description;
            items.push(item);
        }
        // User-defined types as constant names
        const parsed = this.parser.getDocument(document.uri);
        if (parsed) {
            this.addAllTypeNames(items, parsed);
        }
    }
    addConfigBlockCompletions(items, scope, prefix, position, document) {
        const def = (0, afsimConfig_1.getBlockDef)(scope.keyword);
        if (!def)
            return;
        // Check if we need unit completion (after a number)
        const numberBeforeMatch = prefix.match(/(\d+\.?\d*)\s+$/);
        if (numberBeforeMatch) {
            this.addUnitCompletions(items);
            // Still add other completions alongside units
        }
        // Check if we need type/inheritance completion
        // Pattern: keyword name <here>
        const trimmed = prefix.trimStart();
        const keywordParts = trimmed.split(/\s+/);
        if (keywordParts.length === 2 && def.canInherit) {
            // After keyword and name, suggest parent types
            this.addTypeCompletions(items, document);
        }
        // Config items for this block type
        for (const item of def.configItems) {
            const ci = new vscode.CompletionItem(item, vscode.CompletionItemKind.Property);
            ci.detail = `Config item (${scope.keyword})`;
            items.push(ci);
        }
        // Nested blocks
        for (const nested of def.nestedBlocks) {
            if ((0, afsimConfig_1.isScriptBlock)(nested) || nested === 'script_variables') {
                const ci = new vscode.CompletionItem(nested, vscode.CompletionItemKind.Keyword);
                ci.detail = 'Script block';
                items.push(ci);
            }
            else if (afsimConfig_1.BLOCK_DEFINITIONS[nested]) {
                const ci = new vscode.CompletionItem(nested, vscode.CompletionItemKind.Keyword);
                ci.detail = 'Nested block';
                items.push(ci);
            }
        }
        // Always add constant/type name completions
        this.addConstantCompletions(items, document);
        // Check for value keywords
        this.addValueKeywordCompletions(items, prefix);
        // Add end keyword
        const endKw = def.endKeyword;
        const endItem = new vscode.CompletionItem(endKw, vscode.CompletionItemKind.Keyword);
        endItem.detail = 'End block';
        items.push(endItem);
    }
    addScriptCompletions(items, document, position, prefix, context) {
        const triggerChar = context.triggerCharacter;
        // After "." or ">" (for ->): member completion
        if (triggerChar === '.' || triggerChar === '>') {
            this.addMemberCompletions(items, prefix, document);
            return;
        }
        // Types
        for (const type of afsimConfig_1.SCRIPT_TYPES) {
            const item = new vscode.CompletionItem(type, vscode.CompletionItemKind.Class);
            item.detail = 'Script type';
            items.push(item);
        }
        // Control keywords
        for (const kw of afsimConfig_1.SCRIPT_CONTROL_KEYWORDS) {
            const item = new vscode.CompletionItem(kw, vscode.CompletionItemKind.Keyword);
            item.detail = 'Control keyword';
            items.push(item);
        }
        // Global constants
        for (const c of afsimConfig_1.SCRIPT_GLOBAL_CONSTANTS) {
            const item = new vscode.CompletionItem(c, vscode.CompletionItemKind.Constant);
            item.detail = 'Global constant';
            items.push(item);
        }
        // Built-in functions
        for (const builtin of afsimConfig_1.BUILTIN_FUNCTIONS) {
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
        // Dynamic: variables and functions from parsed documents
        const parsed = this.parser.getDocument(document.uri);
        if (parsed) {
            // Variables from script_variables blocks in enclosing config block
            this.addReachableVariables(items, parsed, position);
            // Functions from all parsed documents
            for (const fn of parsed.functions) {
                const item = new vscode.CompletionItem(fn.name, vscode.CompletionItemKind.Function);
                item.detail = `${fn.returnType} ${fn.name}(${fn.params})`;
                items.push(item);
            }
            // Functions from other documents
            for (const doc of this.parser.getAllDocuments()) {
                if (doc.uri.toString() === document.uri.toString())
                    continue;
                for (const fn of doc.functions) {
                    const item = new vscode.CompletionItem(fn.name, vscode.CompletionItemKind.Function);
                    item.detail = `${fn.returnType} ${fn.name}(${fn.params})`;
                    items.push(item);
                }
            }
        }
        // true/false/null
        items.push(new vscode.CompletionItem('true', vscode.CompletionItemKind.Constant));
        items.push(new vscode.CompletionItem('false', vscode.CompletionItemKind.Constant));
        items.push(new vscode.CompletionItem('null', vscode.CompletionItemKind.Constant));
    }
    addMemberCompletions(items, prefix, document) {
        // Resolve the type of the expression before the final "." or "->"
        const exprType = this.resolveExpressionType(prefix, document);
        if (!exprType)
            return;
        const members = this.getMembersForType(exprType);
        for (const m of members) {
            const item = new vscode.CompletionItem(m.name, m.kind);
            item.detail = m.detail;
            items.push(item);
        }
    }
    resolveExpressionType(prefix, document) {
        // Split the prefix into a chain: e.g. "pla.Weapon()." -> ["pla", "Weapon()", ""]
        // We need to find the type of the expression before the last "." or "->"
        const chainMatch = prefix.match(/^(.+?)\s*(?:\.|->)\s*$/);
        if (!chainMatch)
            return null;
        const expr = chainMatch[1].trim();
        return this.resolveTypeOfExpr(expr, document);
    }
    resolveTypeOfExpr(expr, document) {
        // Recursively resolve chained expressions like "pla.Weapon()" or "PLATFORM.Location()"
        // Strategy: split on the LAST "." or "->" and resolve left-to-right
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
            // rightPart is ".method()" or "->method()"
            const methodMatch = rightPart.match(/^(?:\.|->)\s*(\w+)\s*\(\s*\)$/);
            if (methodMatch) {
                const methodName = methodMatch[1];
                const leftType = this.resolveTypeOfExpr(leftExpr, document);
                if (leftType) {
                    return this.getReturnTypeOfMethod(leftType, methodName);
                }
            }
            return null;
        }
        // Base case: simple identifier, possibly with () call
        const callMatch = expr.match(/^(\w+)\s*\(\s*\)$/);
        if (callMatch) {
            // Function call like "WsfSimulation.PlatformCount()"
            // For now, check if it's a method on a known type prefix — unlikely at base level
            return null;
        }
        // Simple variable name
        const varName = expr.trim();
        // Check global constants
        const globalConstTypes = {
            'PLATFORM': 'WsfPlatform', 'SELF': 'WsfPlatform',
            'TRACK': 'WsfTrack', 'MESSAGE': 'WsfMessage',
            'MATH': 'WsfMath', 'RANDOM': 'WsfRandom'
        };
        if (globalConstTypes[varName]) {
            return globalConstTypes[varName];
        }
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
    getReturnTypeOfMethod(type, methodName) {
        // Look up the return type of a method on a given type
        const typeMethodReturnTypes = {
            'WsfPlatform': {
                'Name': 'string', 'Side': 'string', 'Type': 'string', 'Icon': 'string',
                'Index': 'int', 'IsValid': 'bool', 'IsNull': 'bool', 'IsExternallyControlled': 'bool',
                'Location': 'WsfGeoPoint', 'Altitude': 'double', 'Speed': 'double',
                'GroundSpeed': 'double', 'Heading': 'double', 'CreationTime': 'double',
                'TimeSinceCreation': 'double',
                'Commander': 'WsfPlatform', 'CommanderName': 'string',
                'Peers': 'WsfPlatformList', 'Subordinates': 'WsfPlatformList',
                'Mover': 'WsfMover', 'Fuel': 'WsfFuel',
                'Comm': 'WsfComm', 'CommCount': 'int', 'CommEntry': 'WsfComm',
                'Processor': 'WsfProcessor', 'ProcessorCount': 'int', 'ProcessorEntry': 'WsfProcessor',
                'Sensor': 'WsfSensor', 'SensorCount': 'int', 'SensorEntry': 'WsfSensor',
                'Weapon': 'WsfWeapon', 'WeaponCount': 'int', 'WeaponEntry': 'WsfWeapon',
                'MasterTrackList': 'WsfLocalTrackList', 'CurrentTargetTrack': 'WsfTrack',
                'SetCurrentTarget': 'WsfTrackId', 'HasCurrentTarget': 'bool',
                'AuxDataBool': 'bool', 'AuxDataInt': 'int', 'AuxDataDouble': 'double',
                'AuxDataString': 'string', 'AuxDataExists': 'bool',
                'CategoryMemberOf': 'bool',
                'SlantRangeTo': 'double', 'GroundRangeTo': 'double',
                'RelativeBearingTo': 'double', 'TrueBearingTo': 'double', 'ClosingSpeedOf': 'double',
                'GoToLocation': 'bool', 'GoToAltitude': 'bool', 'GoToSpeed': 'bool',
                'TurnToHeading': 'bool', 'TurnToRelativeHeading': 'bool', 'FollowRoute': 'bool'
            },
            'WsfWeapon': {
                'IsValid': 'bool', 'Fire': 'bool', 'QuantityRemaining': 'int',
                'Platform': 'WsfPlatform', 'AuxDataDouble': 'double',
                'AuxDataString': 'string'
            },
            'WsfTrack': {
                'IsValid': 'bool', 'Target': 'WsfPlatform', 'TargetName': 'string',
                'TargetKilled': 'bool', 'Quality': 'double', 'Speed': 'double',
                'CurrentLocation': 'WsfGeoPoint', 'LocationAtTime': 'WsfGeoPoint',
                'AirDomain': 'bool', 'SurfaceDomain': 'bool', 'TrackId': 'WsfTrackId'
            },
            'WsfGeoPoint': {
                'Altitude': 'double', 'IsNull': 'bool', 'SlantRangeTo': 'double'
            },
            'WsfSimulation': {
                'PlatformCount': 'int', 'PlatformEntry': 'WsfPlatform',
                'FindPlatform': 'WsfPlatform', 'CreatePlatform': 'WsfPlatform',
                'AddPlatform': 'WsfPlatform'
            },
            'WsfString': {
                'Length': 'int', 'Contains': 'bool', 'StartsWith': 'bool', 'EndsWith': 'bool'
            }
        };
        const methods = typeMethodReturnTypes[type];
        if (methods && methods[methodName]) {
            return methods[methodName];
        }
        return null;
    }
    getMembersForType(type) {
        const typeMembers = {
            'WsfPlatform': [
                { name: 'Name', kind: vscode.CompletionItemKind.Method, detail: 'string' },
                { name: 'Side', kind: vscode.CompletionItemKind.Method, detail: 'string' },
                { name: 'Type', kind: vscode.CompletionItemKind.Method, detail: 'string' },
                { name: 'Index', kind: vscode.CompletionItemKind.Method, detail: 'int' },
                { name: 'IsValid', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'IsNull', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'Location', kind: vscode.CompletionItemKind.Method, detail: 'WsfGeoPoint' },
                { name: 'Altitude', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'Speed', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'GroundSpeed', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'Heading', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'SetSide', kind: vscode.CompletionItemKind.Method, detail: 'void' },
                { name: 'SetIcon', kind: vscode.CompletionItemKind.Method, detail: 'void' },
                { name: 'Icon', kind: vscode.CompletionItemKind.Method, detail: 'string' },
                { name: 'SetLocation', kind: vscode.CompletionItemKind.Method, detail: 'void' },
                { name: 'GoToLocation', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'GoToAltitude', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'GoToSpeed', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'TurnToHeading', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'TurnToRelativeHeading', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'FollowRoute', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'SlantRangeTo', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'GroundRangeTo', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'RelativeBearingTo', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'TrueBearingTo', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'ClosingSpeedOf', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'Commander', kind: vscode.CompletionItemKind.Method, detail: 'WsfPlatform' },
                { name: 'SetCommander', kind: vscode.CompletionItemKind.Method, detail: 'void' },
                { name: 'CommanderName', kind: vscode.CompletionItemKind.Method, detail: 'string' },
                { name: 'Peers', kind: vscode.CompletionItemKind.Method, detail: 'WsfPlatformList' },
                { name: 'Subordinates', kind: vscode.CompletionItemKind.Method, detail: 'WsfPlatformList' },
                { name: 'Mover', kind: vscode.CompletionItemKind.Method, detail: 'WsfMover' },
                { name: 'Fuel', kind: vscode.CompletionItemKind.Method, detail: 'WsfFuel' },
                { name: 'Comm', kind: vscode.CompletionItemKind.Method, detail: 'WsfComm' },
                { name: 'CommCount', kind: vscode.CompletionItemKind.Method, detail: 'int' },
                { name: 'CommEntry', kind: vscode.CompletionItemKind.Method, detail: 'WsfComm' },
                { name: 'Processor', kind: vscode.CompletionItemKind.Method, detail: 'WsfProcessor' },
                { name: 'ProcessorCount', kind: vscode.CompletionItemKind.Method, detail: 'int' },
                { name: 'ProcessorEntry', kind: vscode.CompletionItemKind.Method, detail: 'WsfProcessor' },
                { name: 'Sensor', kind: vscode.CompletionItemKind.Method, detail: 'WsfSensor' },
                { name: 'SensorCount', kind: vscode.CompletionItemKind.Method, detail: 'int' },
                { name: 'SensorEntry', kind: vscode.CompletionItemKind.Method, detail: 'WsfSensor' },
                { name: 'Weapon', kind: vscode.CompletionItemKind.Method, detail: 'WsfWeapon' },
                { name: 'WeaponCount', kind: vscode.CompletionItemKind.Method, detail: 'int' },
                { name: 'WeaponEntry', kind: vscode.CompletionItemKind.Method, detail: 'WsfWeapon' },
                { name: 'MasterTrackList', kind: vscode.CompletionItemKind.Method, detail: 'WsfLocalTrackList' },
                { name: 'CurrentTargetTrack', kind: vscode.CompletionItemKind.Method, detail: 'WsfTrack' },
                { name: 'SetCurrentTarget', kind: vscode.CompletionItemKind.Method, detail: 'WsfTrackId' },
                { name: 'ClearCurrentTarget', kind: vscode.CompletionItemKind.Method, detail: 'void' },
                { name: 'HasCurrentTarget', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'AuxDataBool', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'AuxDataInt', kind: vscode.CompletionItemKind.Method, detail: 'int' },
                { name: 'AuxDataDouble', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'AuxDataString', kind: vscode.CompletionItemKind.Method, detail: 'string' },
                { name: 'AuxDataExists', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'SetAuxData', kind: vscode.CompletionItemKind.Method, detail: 'void' },
                { name: 'Comment', kind: vscode.CompletionItemKind.Method, detail: 'void' },
                { name: 'ProcessInput', kind: vscode.CompletionItemKind.Method, detail: 'void' },
                { name: 'CategoryMemberOf', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'AddCategory', kind: vscode.CompletionItemKind.Method, detail: 'void' },
                { name: 'DeletePlatform', kind: vscode.CompletionItemKind.Method, detail: 'void' },
                { name: 'Detonate', kind: vscode.CompletionItemKind.Method, detail: 'void' },
                { name: 'CreationTime', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'TimeSinceCreation', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'IsExternallyControlled', kind: vscode.CompletionItemKind.Method, detail: 'bool' }
            ],
            'WsfWeapon': [
                { name: 'IsValid', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'Fire', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'QuantityRemaining', kind: vscode.CompletionItemKind.Method, detail: 'int' },
                { name: 'SetQuantityRemaining', kind: vscode.CompletionItemKind.Method, detail: 'void' },
                { name: 'Platform', kind: vscode.CompletionItemKind.Method, detail: 'WsfPlatform' },
                { name: 'AuxDataDouble', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'AuxDataString', kind: vscode.CompletionItemKind.Method, detail: 'string' },
                { name: 'SetAuxData', kind: vscode.CompletionItemKind.Method, detail: 'void' }
            ],
            'WsfTrack': [
                { name: 'IsValid', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'Target', kind: vscode.CompletionItemKind.Method, detail: 'WsfPlatform' },
                { name: 'TargetName', kind: vscode.CompletionItemKind.Method, detail: 'string' },
                { name: 'TargetKilled', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'Quality', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'Speed', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'CurrentLocation', kind: vscode.CompletionItemKind.Method, detail: 'WsfGeoPoint' },
                { name: 'LocationAtTime', kind: vscode.CompletionItemKind.Method, detail: 'WsfGeoPoint' },
                { name: 'AirDomain', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'SurfaceDomain', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'TrackId', kind: vscode.CompletionItemKind.Method, detail: 'WsfTrackId' }
            ],
            'WsfGeoPoint': [
                { name: 'Altitude', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'SetAltitudeAGL', kind: vscode.CompletionItemKind.Method, detail: 'void' },
                { name: 'IsNull', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'SlantRangeTo', kind: vscode.CompletionItemKind.Method, detail: 'double' }
            ],
            'WsfSimulation': [
                { name: 'PlatformCount', kind: vscode.CompletionItemKind.Method, detail: 'int' },
                { name: 'PlatformEntry', kind: vscode.CompletionItemKind.Method, detail: 'WsfPlatform' },
                { name: 'FindPlatform', kind: vscode.CompletionItemKind.Method, detail: 'WsfPlatform' },
                { name: 'CreatePlatform', kind: vscode.CompletionItemKind.Method, detail: 'WsfPlatform' },
                { name: 'AddPlatform', kind: vscode.CompletionItemKind.Method, detail: 'WsfPlatform' }
            ],
            'WsfString': [
                { name: 'Length', kind: vscode.CompletionItemKind.Method, detail: 'int' },
                { name: 'Contains', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'StartsWith', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'EndsWith', kind: vscode.CompletionItemKind.Method, detail: 'bool' }
            ],
            'WsfMath': [
                { name: 'Fabs', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'Sqrt', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'Sin', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'Cos', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'Min', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'Max', kind: vscode.CompletionItemKind.Method, detail: 'double' }
            ],
            'WsfRandom': [
                { name: 'Uniform', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'Gaussian', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'Integer', kind: vscode.CompletionItemKind.Method, detail: 'int' }
            ]
        };
        return typeMembers[type] || [
            { name: 'Size', kind: vscode.CompletionItemKind.Method, detail: 'int' },
            { name: 'PushBack', kind: vscode.CompletionItemKind.Method, detail: 'void' },
            { name: 'Get', kind: vscode.CompletionItemKind.Method, detail: 'T' },
            { name: 'Empty', kind: vscode.CompletionItemKind.Method, detail: 'bool' }
        ];
    }
    getMembersForVariable(varName) {
        // Common WsfPlatform members
        if (['PLATFORM', 'p'].includes(varName)) {
            return [
                { name: 'Name', kind: vscode.CompletionItemKind.Method, detail: 'string' },
                { name: 'Side', kind: vscode.CompletionItemKind.Method, detail: 'string' },
                { name: 'Location', kind: vscode.CompletionItemKind.Method, detail: 'WsfGeoPoint' },
                { name: 'Altitude', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'Speed', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'Heading', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'IsValid', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'IsNull', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'SlantRangeTo', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'GroundRangeTo', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'RelativeBearingTo', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'TurnToRelativeHeading', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'GoToSpeed', kind: vscode.CompletionItemKind.Method, detail: 'void' },
                { name: 'GoToAltitude', kind: vscode.CompletionItemKind.Method, detail: 'void' },
                { name: 'SetLocation', kind: vscode.CompletionItemKind.Method, detail: 'void' },
                { name: 'SetSide', kind: vscode.CompletionItemKind.Method, detail: 'void' },
                { name: 'SetCommander', kind: vscode.CompletionItemKind.Method, detail: 'void' },
                { name: 'Weapon', kind: vscode.CompletionItemKind.Method, detail: 'WsfWeapon' },
                { name: 'WeaponCount', kind: vscode.CompletionItemKind.Method, detail: 'int' },
                { name: 'WeaponEntry', kind: vscode.CompletionItemKind.Method, detail: 'WsfWeapon' },
                { name: 'Sensor', kind: vscode.CompletionItemKind.Method, detail: 'WsfSensor' },
                { name: 'Processor', kind: vscode.CompletionItemKind.Method, detail: 'WsfProcessor' },
                { name: 'Comm', kind: vscode.CompletionItemKind.Method, detail: 'WsfComm' },
                { name: 'MasterTrackList', kind: vscode.CompletionItemKind.Method, detail: 'WsfLocalTrackList' },
                { name: 'CurrentTargetTrack', kind: vscode.CompletionItemKind.Method, detail: 'WsfTrack' },
                { name: 'SetCurrentTarget', kind: vscode.CompletionItemKind.Method, detail: 'void' },
                { name: 'ClearCurrentTarget', kind: vscode.CompletionItemKind.Method, detail: 'void' },
                { name: 'HasCurrentTarget', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'DeletePlatform', kind: vscode.CompletionItemKind.Method, detail: 'void' },
                { name: 'Comment', kind: vscode.CompletionItemKind.Method, detail: 'void' },
                { name: 'ProcessInput', kind: vscode.CompletionItemKind.Method, detail: 'void' },
                { name: 'Type', kind: vscode.CompletionItemKind.Method, detail: 'string' },
                { name: 'CategoryMemberOf', kind: vscode.CompletionItemKind.Method, detail: 'bool' }
            ];
        }
        // WsfSimulation members
        if (varName === 'WsfSimulation') {
            return [
                { name: 'PlatformCount', kind: vscode.CompletionItemKind.Method, detail: 'int' },
                { name: 'PlatformEntry', kind: vscode.CompletionItemKind.Method, detail: 'WsfPlatform' },
                { name: 'FindPlatform', kind: vscode.CompletionItemKind.Method, detail: 'WsfPlatform' },
                { name: 'CreatePlatform', kind: vscode.CompletionItemKind.Method, detail: 'WsfPlatform' },
                { name: 'AddPlatform', kind: vscode.CompletionItemKind.Method, detail: 'WsfPlatform' }
            ];
        }
        // WsfWeapon members
        if (['w'].includes(varName)) {
            return [
                { name: 'IsValid', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'Fire', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'QuantityRemaining', kind: vscode.CompletionItemKind.Method, detail: 'int' },
                { name: 'SetQuantityRemaining', kind: vscode.CompletionItemKind.Method, detail: 'void' },
                { name: 'Platform', kind: vscode.CompletionItemKind.Method, detail: 'WsfPlatform' },
                { name: 'AuxDataDouble', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'AuxDataString', kind: vscode.CompletionItemKind.Method, detail: 'string' },
                { name: 'SetAuxData', kind: vscode.CompletionItemKind.Method, detail: 'void' }
            ];
        }
        // WsfTrack members
        if (['track', 't', 'lt'].includes(varName)) {
            return [
                { name: 'IsValid', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'Target', kind: vscode.CompletionItemKind.Method, detail: 'WsfPlatform' },
                { name: 'TargetName', kind: vscode.CompletionItemKind.Method, detail: 'string' },
                { name: 'TargetKilled', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'Quality', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'Speed', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'CurrentLocation', kind: vscode.CompletionItemKind.Method, detail: 'WsfGeoPoint' },
                { name: 'LocationAtTime', kind: vscode.CompletionItemKind.Method, detail: 'WsfGeoPoint' },
                { name: 'AirDomain', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'SurfaceDomain', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'TrackId', kind: vscode.CompletionItemKind.Method, detail: 'WsfTrackId' }
            ];
        }
        // WsfGeoPoint members
        if (['target_position', 't'].includes(varName)) {
            return [
                { name: 'Altitude', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'SetAltitudeAGL', kind: vscode.CompletionItemKind.Method, detail: 'void' },
                { name: 'IsNull', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'SlantRangeTo', kind: vscode.CompletionItemKind.Method, detail: 'double' }
            ];
        }
        // MATH members
        if (varName === 'MATH') {
            return [
                { name: 'Fabs', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'Sqrt', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'Sin', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'Cos', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'Min', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'Max', kind: vscode.CompletionItemKind.Method, detail: 'double' }
            ];
        }
        // RANDOM members
        if (varName === 'RANDOM') {
            return [
                { name: 'Uniform', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'Gaussian', kind: vscode.CompletionItemKind.Method, detail: 'double' },
                { name: 'Integer', kind: vscode.CompletionItemKind.Method, detail: 'int' }
            ];
        }
        // String members
        if (varName === 'category' || varName === 's') {
            return [
                { name: 'Length', kind: vscode.CompletionItemKind.Method, detail: 'int' },
                { name: 'Contains', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'StartsWith', kind: vscode.CompletionItemKind.Method, detail: 'bool' },
                { name: 'EndsWith', kind: vscode.CompletionItemKind.Method, detail: 'bool' }
            ];
        }
        // Array members
        return [
            { name: 'Size', kind: vscode.CompletionItemKind.Method, detail: 'int' },
            { name: 'PushBack', kind: vscode.CompletionItemKind.Method, detail: 'void' },
            { name: 'Get', kind: vscode.CompletionItemKind.Method, detail: 'T' },
            { name: 'Empty', kind: vscode.CompletionItemKind.Method, detail: 'bool' }
        ];
    }
    addUnitCompletions(items) {
        for (const unit of afsimConfig_1.UNITS) {
            const item = new vscode.CompletionItem(unit, vscode.CompletionItemKind.Unit);
            item.detail = 'Unit';
            items.push(item);
        }
    }
    addTypeCompletions(items, document) {
        // Predefined types
        for (const type of afsimConfig_1.PREDEFINED_TYPES) {
            const item = new vscode.CompletionItem(type, vscode.CompletionItemKind.Class);
            item.detail = 'Predefined type';
            items.push(item);
        }
        // User-defined types from all parsed documents
        for (const doc of this.parser.getAllDocuments()) {
            for (const t of doc.types) {
                const item = new vscode.CompletionItem(t.name, vscode.CompletionItemKind.Class);
                item.detail = `User-defined ${t.blockKeyword}`;
                item.documentation = new vscode.MarkdownString(`Type: \`${t.name}\`, extends: \`${t.parentType || 'none'}\``);
                items.push(item);
            }
        }
    }
    addConstantCompletions(items, document) {
        // Type names from all documents
        for (const doc of this.parser.getAllDocuments()) {
            for (const t of doc.types) {
                const item = new vscode.CompletionItem(t.name, vscode.CompletionItemKind.Constant);
                item.detail = `${t.blockKeyword} type`;
                items.push(item);
            }
        }
        // Predefined type names
        for (const type of afsimConfig_1.PREDEFINED_TYPES) {
            const item = new vscode.CompletionItem(type, vscode.CompletionItemKind.Constant);
            item.detail = 'Predefined type';
            items.push(item);
        }
    }
    addValueKeywordCompletions(items, prefix) {
        for (const kw of Object.keys(afsimConfig_1.CONFIG_VALUE_KEYWORDS)) {
            const item = new vscode.CompletionItem(kw, vscode.CompletionItemKind.Value);
            item.detail = 'Value';
            items.push(item);
        }
    }
    addAuxDataCompletions(items, prefix) {
        const types = ['int', 'double', 'string', 'bool'];
        for (const t of types) {
            const item = new vscode.CompletionItem(t, vscode.CompletionItemKind.Keyword);
            item.detail = 'aux_data type';
            items.push(item);
        }
    }
    addScriptVariableCompletions(items, prefix) {
        const trimmed = prefix.trimStart();
        // If line is empty or starts with a comment, suggest types
        if (trimmed === '' || trimmed.startsWith('#')) {
            // extern keyword
            items.push(new vscode.CompletionItem('extern', vscode.CompletionItemKind.Keyword));
            // Types
            const types = ['int', 'double', 'float', 'bool', 'string', 'void', 'struct',
                'Array<WsfPlatform>', 'Array<WsfWeapon>', 'Array<WsfTrack>', 'Array<int>',
                'WsfPlatform', 'WsfWeapon', 'WsfTrack', 'WsfGeoPoint', 'WsfThreatProcessor'];
            for (const t of types) {
                items.push(new vscode.CompletionItem(t, vscode.CompletionItemKind.Class));
            }
        }
    }
    addReachableVariables(items, parsed, position) {
        // Find the enclosing script block scope
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
    addAllTypeNames(items, parsed) {
        for (const t of parsed.types) {
            const item = new vscode.CompletionItem(t.name, vscode.CompletionItemKind.Constant);
            item.detail = `${t.blockKeyword} type name`;
            items.push(item);
        }
        for (const doc of this.parser.getAllDocuments()) {
            if (doc.uri.toString() === parsed.uri.toString())
                continue;
            for (const t of doc.types) {
                const item = new vscode.CompletionItem(t.name, vscode.CompletionItemKind.Constant);
                item.detail = `${t.blockKeyword} type name`;
                items.push(item);
            }
        }
    }
}
exports.AfsimCompletionProvider = AfsimCompletionProvider;
//# sourceMappingURL=completionProvider.js.map
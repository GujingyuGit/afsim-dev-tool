"use strict";
/**
 * Typed accessor layer for the AFSIM domain config.
 * All AFSIM domain data (types, methods, constants, commands) comes from
 * the generated afsim-domain.json file. This module provides typed accessors
 * so consumers don't need to know the JSON structure.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDomainConfig = getDomainConfig;
exports.getScriptClass = getScriptClass;
exports.getGlobalConstant = getGlobalConstant;
exports.getCommand = getCommand;
exports.getAllMethodsForClass = getAllMethodsForClass;
exports.getMethodReturnType = getMethodReturnType;
exports.getGlobalConstantType = getGlobalConstantType;
exports.getScriptTypes = getScriptTypes;
exports.getPredefinedTypes = getPredefinedTypes;
exports.getBuiltinFunctions = getBuiltinFunctions;
exports.getGlobalConstantNames = getGlobalConstantNames;
exports.getPredefinedTypeConfig = getPredefinedTypeConfig;
exports.getPredefinedTypesForBlock = getPredefinedTypesForBlock;
const afsim_domain_json_1 = __importDefault(require("./afsim-domain.json"));
// ---------------------------------------------------------------------------
// Core accessors
// ---------------------------------------------------------------------------
function getDomainConfig() {
    return afsim_domain_json_1.default;
}
function getScriptClass(name) {
    return afsim_domain_json_1.default.scriptClasses[name];
}
function getGlobalConstant(name) {
    return afsim_domain_json_1.default.globalConstants.find(c => c.name === name);
}
function getCommand(name) {
    return afsim_domain_json_1.default.commands[name];
}
// ---------------------------------------------------------------------------
// Derived accessors
// ---------------------------------------------------------------------------
const _methodsCache = new Map();
/**
 * Get all methods for a class, including inherited methods.
 * Walks up the parent chain, deduplicating by method name (child overrides parent).
 */
function getAllMethodsForClass(className) {
    const cached = _methodsCache.get(className);
    if (cached)
        return cached;
    const result = [];
    const seen = new Set();
    let current = className;
    let depth = 0;
    while (current && depth < 20) {
        const cls = getScriptClass(current);
        if (!cls)
            break;
        for (const m of cls.methods) {
            if (!seen.has(m.name)) {
                seen.add(m.name);
                result.push(m);
            }
        }
        current = cls.parent;
        depth++;
    }
    _methodsCache.set(className, result);
    return result;
}
/**
 * Get the return type of a method on a class.
 * Returns the first signature's returnType, or null if not found.
 */
function getMethodReturnType(className, methodName) {
    const methods = getAllMethodsForClass(className);
    const method = methods.find(m => m.name === methodName);
    if (method && method.signatures.length > 0) {
        return method.signatures[0].returnType || null;
    }
    return null;
}
/**
 * Get the type of a global constant by name.
 */
function getGlobalConstantType(name) {
    const gc = getGlobalConstant(name);
    return gc?.type ?? null;
}
/**
 * Get all script type names (primitives + Array + class names).
 */
function getScriptTypes() {
    return afsim_domain_json_1.default.scriptTypes;
}
/**
 * Get all predefined WSF type names.
 */
function getPredefinedTypes() {
    return afsim_domain_json_1.default.predefinedTypes;
}
/**
 * Get all built-in function definitions.
 */
function getBuiltinFunctions() {
    return afsim_domain_json_1.default.builtinFunctions;
}
/**
 * Get global constant names (for completion).
 */
function getGlobalConstantNames() {
    return afsim_domain_json_1.default.globalConstants.map(c => c.name);
}
/**
 * Get the extended config items for a predefined type (e.g., WSF_IMAGE_PROCESSOR).
 * Returns the config items that this predefined type adds beyond the base block's configItems.
 */
function getPredefinedTypeConfig(predefinedTypeName) {
    return afsim_domain_json_1.default.predefinedTypeConfig[predefinedTypeName];
}
/**
 * Get all predefined type names that extend a given block keyword.
 * e.g., getPredefinedTypesForBlock('processor') returns ['WSF_TRACK_PROCESSOR', 'WSF_THREAT_PROCESSOR', ...]
 */
const _blockToTypesCache = new Map();
function getPredefinedTypesForBlock(blockKeyword) {
    const cached = _blockToTypesCache.get(blockKeyword);
    if (cached)
        return cached;
    const config = afsim_domain_json_1.default.predefinedTypeConfig;
    const result = [];
    for (const [typeName, typeConf] of Object.entries(config)) {
        if (typeConf.blockKeyword === blockKeyword) {
            result.push(typeName);
        }
    }
    _blockToTypesCache.set(blockKeyword, result);
    return result;
}
//# sourceMappingURL=afsim-domain.js.map
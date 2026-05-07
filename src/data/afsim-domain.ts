/**
 * Typed accessor layer for the AFSIM domain config.
 * All AFSIM domain data (types, methods, constants, commands) comes from
 * the generated afsim-domain.json file. This module provides typed accessors
 * so consumers don't need to know the JSON structure.
 */

import domainData from './afsim-domain.json';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface MethodParam {
  name: string;
  type: string;
  description: string;
}

export interface MethodSignature {
  returnType: string;
  params: MethodParam[];
  description: string;
}

export interface ScriptMethod {
  name: string;
  isStatic: boolean;
  signatures: MethodSignature[];
}

export interface ScriptClass {
  parent: string;
  methods: ScriptMethod[];
}

export interface GlobalConstant {
  name: string;
  type: string | null;
  description: string;
}

export interface BuiltinParam {
  type: string;
  name: string;
  description?: string;
}

export interface BuiltinSignature {
  returnType: string;
  params: BuiltinParam[];
  description?: string;
}

export interface BuiltinFunction {
  name: string;
  signatures: BuiltinSignature[];
}

export interface SubCommand {
  name: string;
  syntax: string;
  description: string;
}

export interface CommandDef {
  syntax: string;
  description: string;
  subCommands: SubCommand[];
}

export interface PredefinedTypeConfigItem {
  name: string;
  syntax: string;
  description: string;
}

export interface PredefinedTypeConfig {
  blockKeyword: string;
  configItems: PredefinedTypeConfigItem[];
}

export interface DomainConfig {
  scriptTypes: string[];
  predefinedTypes: string[];
  globalConstants: GlobalConstant[];
  builtinFunctions: BuiltinFunction[];
  scriptClasses: Record<string, ScriptClass>;
  commands: Record<string, CommandDef>;
  predefinedTypeConfig: Record<string, PredefinedTypeConfig>;
}

// ---------------------------------------------------------------------------
// Core accessors
// ---------------------------------------------------------------------------

export function getDomainConfig(): DomainConfig {
  return domainData as unknown as DomainConfig;
}

export function getScriptClass(name: string): ScriptClass | undefined {
  return (domainData as unknown as DomainConfig).scriptClasses[name];
}

export function getGlobalConstant(name: string): GlobalConstant | undefined {
  return (domainData as unknown as DomainConfig).globalConstants.find(c => c.name === name);
}

export function getCommand(name: string): CommandDef | undefined {
  return (domainData as unknown as DomainConfig).commands[name];
}

// ---------------------------------------------------------------------------
// Derived accessors
// ---------------------------------------------------------------------------

const _methodsCache = new Map<string, ScriptMethod[]>();

/**
 * Get all methods for a class, including inherited methods.
 * Walks up the parent chain, deduplicating by method name (child overrides parent).
 */
export function getAllMethodsForClass(className: string): ScriptMethod[] {
  const cached = _methodsCache.get(className);
  if (cached) return cached;

  const result: ScriptMethod[] = [];
  const seen = new Set<string>();
  let current = className;
  let depth = 0;

  while (current && depth < 20) {
    const cls = getScriptClass(current);
    if (!cls) break;

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
export function getMethodReturnType(className: string, methodName: string): string | null {
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
export function getGlobalConstantType(name: string): string | null {
  const gc = getGlobalConstant(name);
  return gc?.type ?? null;
}

/**
 * Get all script type names (primitives + Array + class names).
 */
export function getScriptTypes(): string[] {
  return (domainData as unknown as DomainConfig).scriptTypes;
}

/**
 * Get all predefined WSF type names.
 */
export function getPredefinedTypes(): string[] {
  return (domainData as unknown as DomainConfig).predefinedTypes;
}

/**
 * Get all built-in function definitions.
 */
export function getBuiltinFunctions(): BuiltinFunction[] {
  return (domainData as unknown as DomainConfig).builtinFunctions;
}

/**
 * Get global constant names (for completion).
 */
export function getGlobalConstantNames(): string[] {
  return (domainData as unknown as DomainConfig).globalConstants.map(c => c.name);
}

/**
 * Get the extended config items for a predefined type (e.g., WSF_IMAGE_PROCESSOR).
 * Returns the config items that this predefined type adds beyond the base block's configItems.
 */
export function getPredefinedTypeConfig(predefinedTypeName: string): PredefinedTypeConfig | undefined {
  return (domainData as unknown as DomainConfig).predefinedTypeConfig[predefinedTypeName];
}

/**
 * Get all predefined type names that extend a given block keyword.
 * e.g., getPredefinedTypesForBlock('processor') returns ['WSF_TRACK_PROCESSOR', 'WSF_THREAT_PROCESSOR', ...]
 */
const _blockToTypesCache = new Map<string, string[]>();

export function getPredefinedTypesForBlock(blockKeyword: string): string[] {
  const cached = _blockToTypesCache.get(blockKeyword);
  if (cached) return cached;

  const config = (domainData as unknown as DomainConfig).predefinedTypeConfig;
  const result: string[] = [];
  for (const [typeName, typeConf] of Object.entries(config)) {
    if ((typeConf as PredefinedTypeConfig).blockKeyword === blockKeyword) {
      result.push(typeName);
    }
  }
  _blockToTypesCache.set(blockKeyword, result);
  return result;
}

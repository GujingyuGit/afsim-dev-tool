import * as vscode from 'vscode';
import { AfsimParser, BlockScope } from './afsimParser';
import {
  TOP_LEVEL_BLOCK_KEYWORDS, BLOCK_DEFINITIONS, SCRIPT_BLOCK_KEYWORDS,
  SCRIPT_END_KEYWORDS, UNITS, SCRIPT_TYPES, SCRIPT_CONTROL_KEYWORDS,
  SCRIPT_GLOBAL_CONSTANTS, SCRIPT_BUILTINS, PREDEFINED_TYPES,
  COMMANDS, isScriptBlock, CONFIG_VALUE_KEYWORDS, getBlockDef
} from './data/afsimConfig';

export class AfsimCompletionProvider implements vscode.CompletionItemProvider {
  private parser: AfsimParser;

  constructor(parser: AfsimParser) {
    this.parser = parser;
  }

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];
    const line = document.lineAt(position.line).text;
    const prefix = line.substring(0, position.character);
    const trimmedPrefix = prefix.trimStart();

    // Check context
    const scope = this.parser.getScopeAtPosition(position, document.uri);

    if (scope && scope.isScript) {
      // Inside a script block - provide script completions
      this.addScriptCompletions(items, document, position, prefix, context);
    } else if (scope && scope.keyword === 'aux_data') {
      // Inside aux_data block
      this.addAuxDataCompletions(items, prefix);
    } else if (scope && scope.keyword === 'script_variables') {
      // Inside script_variables block
      this.addScriptVariableCompletions(items, prefix);
    } else if (scope) {
      // Inside a config block
      this.addConfigBlockCompletions(items, scope, prefix, position, document);
    } else {
      // Top level
      this.addTopLevelCompletions(items, prefix, document);
    }

    return items;
  }

  private addTopLevelCompletions(items: vscode.CompletionItem[], prefix: string, document: vscode.TextDocument): void {
    const trimmed = prefix.trimStart();

    // Block keywords
    for (const kw of TOP_LEVEL_BLOCK_KEYWORDS) {
      if (kw.startsWith('tof_and_speed')) continue;
      const item = new vscode.CompletionItem(kw, vscode.CompletionItemKind.Keyword);
      item.detail = 'AFSIM block';
      const def = BLOCK_DEFINITIONS[kw];
      if (def) {
        item.documentation = new vscode.MarkdownString(`Block: \`${kw}\` ... \`end_${kw}\``);
      }
      items.push(item);
    }

    // Script blocks at top level
    for (const kw of SCRIPT_BLOCK_KEYWORDS) {
      if (kw === 'on_update' || kw === 'on_message' || kw === 'on_initialize') continue;
      const item = new vscode.CompletionItem(kw, vscode.CompletionItemKind.Keyword);
      item.detail = 'Script block';
      item.documentation = new vscode.MarkdownString(`Script block: \`${kw}\` ... \`${SCRIPT_END_KEYWORDS[kw]}\``);
      items.push(item);
    }

    // Commands
    for (const cmd of COMMANDS) {
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

  private addConfigBlockCompletions(
    items: vscode.CompletionItem[],
    scope: BlockScope,
    prefix: string,
    position: vscode.Position,
    document: vscode.TextDocument
  ): void {
    const def = getBlockDef(scope.keyword);
    if (!def) return;

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
      if (isScriptBlock(nested) || nested === 'script_variables') {
        const ci = new vscode.CompletionItem(nested, vscode.CompletionItemKind.Keyword);
        ci.detail = 'Script block';
        items.push(ci);
      } else if (BLOCK_DEFINITIONS[nested]) {
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

  private addScriptCompletions(
    items: vscode.CompletionItem[],
    document: vscode.TextDocument,
    position: vscode.Position,
    prefix: string,
    context: vscode.CompletionContext
  ): void {
    const triggerChar = context.triggerCharacter;

    // After "." or ">" (for ->): member completion
    if (triggerChar === '.' || triggerChar === '>') {
      this.addMemberCompletions(items, prefix);
      return;
    }

    // Types
    for (const type of SCRIPT_TYPES) {
      const item = new vscode.CompletionItem(type, vscode.CompletionItemKind.Class);
      item.detail = 'Script type';
      items.push(item);
    }

    // Control keywords
    for (const kw of SCRIPT_CONTROL_KEYWORDS) {
      const item = new vscode.CompletionItem(kw, vscode.CompletionItemKind.Keyword);
      item.detail = 'Control keyword';
      items.push(item);
    }

    // Global constants
    for (const c of SCRIPT_GLOBAL_CONSTANTS) {
      const item = new vscode.CompletionItem(c, vscode.CompletionItemKind.Constant);
      item.detail = 'Global constant';
      items.push(item);
    }

    // Built-in functions
    for (const fn of SCRIPT_BUILTINS) {
      const item = new vscode.CompletionItem(fn, vscode.CompletionItemKind.Function);
      item.detail = 'Built-in function';
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
        if (doc.uri.toString() === document.uri.toString()) continue;
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

  private addMemberCompletions(items: vscode.CompletionItem[], prefix: string): void {
    // Extract the variable name before "." or "->"
    const memberMatch = prefix.match(/(\w+)\s*(?:\.|->)\s*$/);
    if (!memberMatch) return;

    const varName = memberMatch[1];
    // Provide common member completions based on type hints
    const members = this.getMembersForVariable(varName);
    for (const m of members) {
      const item = new vscode.CompletionItem(m.name, m.kind);
      item.detail = m.detail;
      items.push(item);
    }
  }

  private getMembersForVariable(varName: string): { name: string; kind: vscode.CompletionItemKind; detail: string }[] {
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

  private addUnitCompletions(items: vscode.CompletionItem[]): void {
    for (const unit of UNITS) {
      const item = new vscode.CompletionItem(unit, vscode.CompletionItemKind.Unit);
      item.detail = 'Unit';
      items.push(item);
    }
  }

  private addTypeCompletions(items: vscode.CompletionItem[], document: vscode.TextDocument): void {
    // Predefined types
    for (const type of PREDEFINED_TYPES) {
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

  private addConstantCompletions(items: vscode.CompletionItem[], document: vscode.TextDocument): void {
    // Type names from all documents
    for (const doc of this.parser.getAllDocuments()) {
      for (const t of doc.types) {
        const item = new vscode.CompletionItem(t.name, vscode.CompletionItemKind.Constant);
        item.detail = `${t.blockKeyword} type`;
        items.push(item);
      }
    }

    // Predefined type names
    for (const type of PREDEFINED_TYPES) {
      const item = new vscode.CompletionItem(type, vscode.CompletionItemKind.Constant);
      item.detail = 'Predefined type';
      items.push(item);
    }
  }

  private addValueKeywordCompletions(items: vscode.CompletionItem[], prefix: string): void {
    for (const kw of Object.keys(CONFIG_VALUE_KEYWORDS)) {
      const item = new vscode.CompletionItem(kw, vscode.CompletionItemKind.Value);
      item.detail = 'Value';
      items.push(item);
    }
  }

  private addAuxDataCompletions(items: vscode.CompletionItem[], prefix: string): void {
    const types = ['int', 'double', 'string', 'bool'];
    for (const t of types) {
      const item = new vscode.CompletionItem(t, vscode.CompletionItemKind.Keyword);
      item.detail = 'aux_data type';
      items.push(item);
    }
  }

  private addScriptVariableCompletions(items: vscode.CompletionItem[], prefix: string): void {
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

  private addReachableVariables(
    items: vscode.CompletionItem[],
    parsed: import('./afsimParser').ParsedDocument,
    position: vscode.Position
  ): void {
    // Find the enclosing config block
    const scope = this.parser.getScopeAtPosition(position, parsed.uri);
    if (!scope) return;

    // Walk up to find the enclosing config block
    let configScope = scope.parentScope;
    while (configScope && configScope.isScript) {
      configScope = configScope.parentScope;
    }

    if (!configScope) return;

    // Get all variables from script_variables blocks within this config block
    for (const block of parsed.blocks) {
      if (block.keyword === 'script_variables' &&
        block.startLine >= configScope.startLine &&
        (block.endLine === -1 || block.endLine <= (configScope.endLine === -1 ? Infinity : configScope.endLine))) {
        for (const v of parsed.variables) {
          if (v.location.range.start.line >= block.startLine &&
            v.location.range.start.line <= (block.endLine === -1 ? Infinity : block.endLine)) {
            const item = new vscode.CompletionItem(v.name, vscode.CompletionItemKind.Variable);
            item.detail = `${v.type}${v.isExtern ? ' (extern)' : ''}`;
            items.push(item);
          }
        }
      }
    }

    // Also add local variables from the current script block
    for (const v of parsed.variables) {
      if (v.location.range.start.line >= scope.startLine &&
        v.location.range.start.line <= position.line &&
        !items.some(i => i.label === v.name)) {
        const item = new vscode.CompletionItem(v.name, vscode.CompletionItemKind.Variable);
        item.detail = v.type;
        items.push(item);
      }
    }
  }

  private addAllTypeNames(items: vscode.CompletionItem[], parsed: import('./afsimParser').ParsedDocument): void {
    for (const t of parsed.types) {
      const item = new vscode.CompletionItem(t.name, vscode.CompletionItemKind.Constant);
      item.detail = `${t.blockKeyword} type name`;
      items.push(item);
    }

    for (const doc of this.parser.getAllDocuments()) {
      if (doc.uri.toString() === parsed.uri.toString()) continue;
      for (const t of doc.types) {
        const item = new vscode.CompletionItem(t.name, vscode.CompletionItemKind.Constant);
        item.detail = `${t.blockKeyword} type name`;
        items.push(item);
      }
    }
  }
}

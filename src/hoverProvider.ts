import * as vscode from 'vscode';
import { AfsimParser } from './afsimParser';
import { getScriptTypes, getBuiltinFunctions, getGlobalConstant,
  getAllMethodsForClass, getMethodReturnType, getGlobalConstantType,
  getPredefinedTypes } from './data/afsim-domain';
import type { BuiltinFunction, ScriptMethod } from './data/afsim-domain';

export class AfsimHoverProvider implements vscode.HoverProvider {
  private parser: AfsimParser;

  constructor(parser: AfsimParser) {
    this.parser = parser;
  }

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.Hover | null {
    if (!this.parser.isInsideScriptBlock(position, document.uri)) {
      return null;
    }

    const range = document.getWordRangeAtPosition(position, /[\w<>]+/);
    if (!range) return null;

    const word = document.getText(range);
    if (!word || word.length < 1) return null;

    // Hover for global constants
    const gc = getGlobalConstant(word);
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
    if (getScriptTypes().includes(word)) {
      return new vscode.Hover(
        new vscode.MarkdownString(`\`\`\`afsim\n${word}\n\`\`\`\n\nScript type: \`${word}\``),
        range
      );
    }

    // Hover for predefined types
    if (getPredefinedTypes().includes(word)) {
      return new vscode.Hover(
        new vscode.MarkdownString(`\`\`\`afsim\n${word}\n\`\`\`\n\nPredefined WSF type`),
        range
      );
    }

    // Hover for built-in functions (with overload support)
    const builtin = getBuiltinFunctions().find((f: BuiltinFunction) => f.name === word);
    if (builtin) {
      const contents: vscode.MarkdownString[] = [];
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
    if (methodHover) return methodHover;

    // Hover for user-defined variables and functions
    const parsed = this.parser.getDocument(document.uri);
    if (parsed) {
      // Search for variables
      for (const doc of this.parser.getAllDocuments()) {
        for (const v of doc.variables) {
          if (v.name === word) {
            const md = new vscode.MarkdownString();
            md.appendCodeblock(`${v.type} ${v.name}`, 'cpp');
            if (v.isExtern) md.appendMarkdown('\n\n*(extern variable)*');
            return new vscode.Hover(md, range);
          }
        }
      }

      // Search for user-defined functions (with overload support)
      const matchingFunctions: { fn: import('./afsimParser').ScriptFunction; docUri: vscode.Uri }[] = [];
      for (const doc of this.parser.getAllDocuments()) {
        for (const fn of doc.functions) {
          if (fn.name === word) {
            matchingFunctions.push({ fn, docUri: doc.uri });
          }
        }
      }

      if (matchingFunctions.length > 0) {
        const contents: vscode.MarkdownString[] = [];
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
  private tryMethodHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    word: string,
    wordRange: vscode.Range
  ): vscode.Hover | null {
    // Look at the line to find "xxx.word" pattern
    const line = document.lineAt(position.line).text;
    const linePrefix = line.substring(0, wordRange.start.character);

    // Find the expression before "." or "->"
    const dotMatch = linePrefix.match(/(\w+)\s*(?:\.|->)\s*$/);
    if (!dotMatch) return null;

    const objName = dotMatch[1];

    // Resolve the type of the object
    let objType: string | null = null;

    // Check global constants
    objType = getGlobalConstantType(objName);
    if (!objType) {
      // Check parsed variables
      for (const doc of this.parser.getAllDocuments()) {
        for (const v of doc.variables) {
          if (v.name === objName) {
            objType = v.type;
            break;
          }
        }
        if (objType) break;
      }
    }

    if (!objType) return null;

    // Find the method on this type
    const methods = getAllMethodsForClass(objType);
    const method = methods.find((m: ScriptMethod) => m.name === word);
    if (!method || method.signatures.length === 0) return null;

    const contents: vscode.MarkdownString[] = [];
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

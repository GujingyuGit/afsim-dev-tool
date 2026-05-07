import * as vscode from 'vscode';
import { AfsimParser } from './afsimParser';
import { SCRIPT_TYPES, SCRIPT_GLOBAL_CONSTANTS, PREDEFINED_TYPES, BUILTIN_FUNCTIONS } from './data/afsimConfig';

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
    if (SCRIPT_GLOBAL_CONSTANTS.includes(word)) {
      const md = new vscode.MarkdownString();
      md.appendCodeblock(word, 'afsim');
      md.appendMarkdown(`\n\n**Global constant**`);
      const descriptions: Record<string, string> = {
        'PLATFORM': '`WsfPlatform` — Current platform',
        'TRACK': '`WsfTrack` — Current track',
        'MESSAGE': '`WsfMessage` — Current message',
        'TIME_NOW': '`double` — Current simulation time in seconds',
        'RANDOM': 'Random number generator',
        'MATH': 'Math utilities',
        'SELF': '`WsfPlatform` — Self-reference platform'
      };
      if (descriptions[word]) {
        md.appendMarkdown(`\n\n${descriptions[word]}`);
      }
      return new vscode.Hover(md, range);
    }

    // Hover for script types
    if (SCRIPT_TYPES.includes(word)) {
      return new vscode.Hover(
        new vscode.MarkdownString(`\`\`\`afsim\n${word}\n\`\`\`\n\nScript type: \`${word}\``),
        range
      );
    }

    // Hover for built-in functions (with overload support)
    const builtin = BUILTIN_FUNCTIONS.find(f => f.name === word);
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
}

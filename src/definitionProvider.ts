import * as vscode from 'vscode';
import { AfsimParser } from './afsimParser';
import { PREDEFINED_TYPES, SCRIPT_BLOCK_KEYWORDS } from './data/afsimConfig';

export class AfsimDefinitionProvider implements vscode.DefinitionProvider {
  private parser: AfsimParser;

  constructor(parser: AfsimParser) {
    this.parser = parser;
  }

  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.Definition | vscode.LocationLink[] | null {
    const range = document.getWordRangeAtPosition(position, /[\w<>]+/);
    if (!range) return null;

    const word = document.getText(range);
    if (!word || word.length < 1) return null;

    // Check if we're inside a script block
    const isScript = this.parser.isInsideScriptBlock(position, document.uri);

    if (isScript) {
      return this.findScriptDefinition(word, document, position);
    } else {
      return this.findConfigDefinition(word, document, position);
    }
  }

  private findScriptDefinition(
    word: string,
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.Definition | null {
    const parsed = this.parser.getDocument(document.uri);
    if (!parsed) return null;

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

  private findConfigDefinition(
    word: string,
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.Definition | null {
    // Don't try to find definitions for predefined types
    if (PREDEFINED_TYPES.includes(word)) return null;

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

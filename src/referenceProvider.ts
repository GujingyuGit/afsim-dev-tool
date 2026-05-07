import * as vscode from 'vscode';
import { AfsimParser } from './afsimParser';

export class AfsimReferenceProvider implements vscode.ReferenceProvider {
  private parser: AfsimParser;

  constructor(parser: AfsimParser) {
    this.parser = parser;
  }

  async provideReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.ReferenceContext,
    token: vscode.CancellationToken
  ): Promise<vscode.Location[]> {
    const range = document.getWordRangeAtPosition(position, /[\w<>]+/);
    if (!range) return [];

    const word = document.getText(range);
    if (!word || word.length < 1) return [];

    const locations: vscode.Location[] = [];
    const seenLines = new Set<string>();

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

  private async findWordUsage(
    word: string,
    locations: vscode.Location[],
    seenLines: Set<string>,
    token: vscode.CancellationToken
  ): Promise<void> {
    for (const doc of this.parser.getAllDocuments()) {
      if (token.isCancellationRequested) return;

      let textDoc: vscode.TextDocument;
      try {
        textDoc = await vscode.workspace.openTextDocument(doc.uri);
      } catch {
        continue;
      }

      const text = textDoc.getText();
      const wordPattern = new RegExp(`\\b${escapeRegex(word)}\\b`, 'g');
      let match: RegExpExecArray | null;

      while ((match = wordPattern.exec(text)) !== null) {
        const pos = textDoc.positionAt(match.index);
        const loc = new vscode.Location(doc.uri, pos);
        addLocation(locations, seenLines, loc);
      }
    }
  }
}

function addLocation(
  locations: vscode.Location[],
  seenLines: Set<string>,
  loc: vscode.Location
): void {
  const key = `${loc.uri.toString()}:${loc.range.start.line}`;
  if (seenLines.has(key)) return;
  seenLines.add(key);
  locations.push(loc);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
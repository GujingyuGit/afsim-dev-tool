import * as vscode from 'vscode';
import { AfsimParser } from './afsimParser';
import { AfsimCompletionProvider } from './completionProvider';
import { AfsimDefinitionProvider } from './definitionProvider';
import { AfsimHoverProvider } from './hoverProvider';

let parser: AfsimParser;

export function activate(context: vscode.ExtensionContext) {
  parser = new AfsimParser();

  // Register completion provider
  const completionProvider = new AfsimCompletionProvider(parser);
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      { scheme: 'file', language: 'afsim' },
      completionProvider,
      '.', '>', ' ', '\t'
    )
  );

  // Register definition provider
  const definitionProvider = new AfsimDefinitionProvider(parser);
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      { scheme: 'file', language: 'afsim' },
      definitionProvider
    )
  );

  // Register hover provider
  const hoverProvider = new AfsimHoverProvider(parser);
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      { scheme: 'file', language: 'afsim' },
      hoverProvider
    )
  );

  // Parse documents when they open or change
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(doc => {
      if (doc.languageId === 'afsim') {
        parser.parseDocument(doc);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.languageId === 'afsim') {
        parser.scheduleParse(e.document);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument(doc => {
      if (doc.languageId === 'afsim') {
        parser.removeDocument(doc.uri);
      }
    })
  );

  // Parse all open AFSIM documents on activation
  for (const doc of vscode.workspace.textDocuments) {
    if (doc.languageId === 'afsim') {
      parser.parseDocument(doc);
    }
  }
}

export function deactivate() {
  if (parser) {
    parser.dispose();
  }
}

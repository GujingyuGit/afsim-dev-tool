import * as vscode from 'vscode';
import { AfsimParser } from './afsimParser';
import { AfsimCompletionProvider } from './completionProvider';
import { AfsimDefinitionProvider } from './definitionProvider';
import { AfsimHoverProvider } from './hoverProvider';
import { AfsimReferenceProvider } from './referenceProvider';
import { initRunCommand } from './runCommand';

let parser: AfsimParser;

const AFSIM_SELECTOR: vscode.DocumentSelector = { scheme: 'file', language: 'afsim' };

export function activate(context: vscode.ExtensionContext) {
  parser = new AfsimParser();

  // Completion provider
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      AFSIM_SELECTOR,
      new AfsimCompletionProvider(parser),
      '.', '>', ' ', '\t'
    )
  );

  // Definition provider
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      AFSIM_SELECTOR,
      new AfsimDefinitionProvider(parser)
    )
  );

  // Hover provider
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      AFSIM_SELECTOR,
      new AfsimHoverProvider(parser)
    )
  );

  // Reference provider
  context.subscriptions.push(
    vscode.languages.registerReferenceProvider(
      AFSIM_SELECTOR,
      new AfsimReferenceProvider(parser)
    )
  );

  // Run command
  initRunCommand(context);

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
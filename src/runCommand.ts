import * as vscode from 'vscode';
import * as path from 'path';

let outputChannel: vscode.OutputChannel;
let terminal: vscode.Terminal | undefined;

export function initRunCommand(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel('AFSIM Mission');
  context.subscriptions.push(outputChannel);

  context.subscriptions.push(
    vscode.commands.registerCommand('afsim.runMission', () => runMission(context))
  );
}

async function runMission(context: vscode.ExtensionContext): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active file to run.');
    return;
  }

  const doc = editor.document;
  const filePath = doc.uri.fsPath;

  // Get mission.exe path: try settings first, then globalState, then prompt
  const config = vscode.workspace.getConfiguration('afsim');
  let missionPath = config.get<string>('missionPath', '');

  if (!missionPath) {
    missionPath = context.globalState.get<string>('missionPath', '');
  }

  if (!missionPath) {
    const result = await vscode.window.showOpenDialog({
      title: 'Select mission.exe',
      filters: { 'Executable': ['exe'] },
      canSelectMany: false
    });
    if (!result || result.length === 0) return;
    missionPath = result[0].fsPath;
    // Save to globalState (always works, no registration needed)
    await context.globalState.update('missionPath', missionPath);
  }

  // Get optional arguments from settings
  const extraArgs = config.get<string[]>('missionArgs', []);

  // Build command
  const args = [filePath, ...extraArgs];
  const quotedMissionPath = quoteIfSpaces(missionPath);
  const quotedArgs = args.map(quoteIfSpaces).join(' ');
  const commandLine = `${quotedMissionPath} ${quotedArgs}`;

  // Save the file before running
  await doc.save();

  // Get or create terminal
  if (!terminal || terminal.exitStatus !== undefined) {
    terminal = vscode.window.createTerminal('AFSIM Mission');
  }
  terminal.show();

  // Set working directory to the file's directory
  const workDir = path.dirname(filePath);
  terminal.sendText(`cd "${workDir}"`, true);
  terminal.sendText(commandLine, true);

  outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] Running: ${commandLine}`);
  outputChannel.appendLine(`  Working directory: ${workDir}`);
}

function quoteIfSpaces(s: string): string {
  return s.includes(' ') ? `"${s}"` : s;
}
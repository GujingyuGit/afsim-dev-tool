"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initRunCommand = initRunCommand;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
let outputChannel;
let terminal;
function initRunCommand(context) {
    outputChannel = vscode.window.createOutputChannel('AFSIM Mission');
    context.subscriptions.push(outputChannel);
    context.subscriptions.push(vscode.commands.registerCommand('afsim.runMission', () => runMission(context)));
}
async function runMission(context) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active file to run.');
        return;
    }
    const doc = editor.document;
    const filePath = doc.uri.fsPath;
    // Get mission.exe path: try settings first, then globalState, then prompt
    const config = vscode.workspace.getConfiguration('afsim');
    let missionPath = config.get('missionPath', '');
    if (!missionPath) {
        missionPath = context.globalState.get('missionPath', '');
    }
    if (!missionPath) {
        const result = await vscode.window.showOpenDialog({
            title: 'Select mission.exe',
            filters: { 'Executable': ['exe'] },
            canSelectMany: false
        });
        if (!result || result.length === 0)
            return;
        missionPath = result[0].fsPath;
        // Save to globalState (always works, no registration needed)
        await context.globalState.update('missionPath', missionPath);
    }
    // Get optional arguments from settings
    const extraArgs = config.get('missionArgs', []);
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
function quoteIfSpaces(s) {
    return s.includes(' ') ? `"${s}"` : s;
}
//# sourceMappingURL=runCommand.js.map
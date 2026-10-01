'use strict';

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

const SUPPORTED = ['.sh', '.bat', '.cmd', '.ps1'];
const isWin = process.platform === 'win32';

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('scriptRunner.run', (uri, uris) => runCommand(uri, uris, false)),
    vscode.commands.registerCommand('scriptRunner.runWithArgs', (uri, uris) => runCommand(uri, uris, true))
  );
}

function deactivate() {}

async function runCommand(uri, uris, askArgs) {
  // Explorer passes (clickedUri, allSelectedUris); editor menus pass only the uri;
  // the command palette passes nothing.
  let targets = Array.isArray(uris) && uris.length ? uris : uri ? [uri] : [];
  if (!targets.length && vscode.window.activeTextEditor) {
    targets = [vscode.window.activeTextEditor.document.uri];
  }
  targets = targets.filter(
    (u) => u && u.scheme === 'file' && SUPPORTED.includes(path.extname(u.fsPath).toLowerCase())
  );
  if (!targets.length) {
    vscode.window.showWarningMessage('Select a .sh, .bat, .cmd or .ps1 file to run.');
    return;
  }

  let args = '';
  if (askArgs) {
    const input = await vscode.window.showInputBox({
      title: 'Run in New Terminal',
      prompt: 'Arguments to pass to the script',
      placeHolder: 'e.g. --verbose input.txt',
      ignoreFocusOut: true
    });
    if (input === undefined) return; // cancelled
    args = input.trim();
  }

  for (const target of targets) {
    await runScript(target, args);
  }
}

async function runScript(uri, args) {
  const cfg = vscode.workspace.getConfiguration('scriptRunner', uri);
  const file = uri.fsPath;
  const ext = path.extname(file).toLowerCase();

  if (cfg.get('saveBeforeRun', true)) {
    const doc = vscode.workspace.textDocuments.find((d) => d.uri.toString() === uri.toString());
    if (doc && doc.isDirty) await doc.save();
  }

  let plan;
  try {
    plan = buildPlan(ext, file, args, {
      bashPath: cfg.get('bashPath', ''),
      powershellPath: cfg.get('powershellPath', ''),
      bypassExecutionPolicy: cfg.get('bypassExecutionPolicy', true)
    });
  } catch (err) {
    vscode.window.showErrorMessage(err.message);
    return;
  }

  const name = `Run: ${path.basename(file)}`;
  let terminal;
  if (cfg.get('reuseTerminal', false)) {
    terminal = vscode.window.terminals.find((t) => t.name === name && t.exitStatus === undefined);
  }
  if (!terminal) {
    terminal = vscode.window.createTerminal({
      name,
      cwd: resolveCwd(cfg.get('cwd', 'scriptDirectory'), uri),
      shellPath: plan.shellPath,
      shellArgs: plan.shellArgs,
      iconPath: new vscode.ThemeIcon('play')
    });
  }
  terminal.show(cfg.get('preserveFocus', false));
  terminal.sendText(plan.command, true);
}

function resolveCwd(mode, uri) {
  if (mode === 'workspaceRoot') {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (folder) return folder.uri.fsPath;
  }
  return path.dirname(uri.fsPath);
}

/**
 * Decide which shell to open and which command to type into it.
 * Pure function (no vscode API) so it can be unit tested.
 */
function buildPlan(ext, file, args, opts, platformIsWin = isWin, exists = fs.existsSync, env = process.env) {
  const tail = args ? ' ' + args : '';

  if (ext === '.ps1') {
    const shellPath = (opts.powershellPath || '').trim() || (platformIsWin ? 'powershell.exe' : 'pwsh');
    const shellArgs = ['-NoLogo'];
    if (opts.bypassExecutionPolicy) shellArgs.push('-ExecutionPolicy', 'Bypass');
    return { shellPath, shellArgs, command: `& ${psQuote(file)}${tail}` };
  }

  if (ext === '.bat' || ext === '.cmd') {
    if (!platformIsWin) throw new Error(`${ext} files can only be run on Windows.`);
    return { shellPath: env.ComSpec || 'cmd.exe', shellArgs: [], command: `call ${cmdQuote(file)}${tail}` };
  }

  if (ext === '.sh') {
    const bash = resolveBash(opts.bashPath, platformIsWin, exists, env);
    if (!bash) {
      throw new Error(
        'bash was not found. Install Git for Windows or WSL, or set "scriptRunner.bashPath" in Settings.'
      );
    }
    return {
      shellPath: bash.path,
      shellArgs: [],
      command: `bash ${shQuote(toBashPath(file, bash.flavor))}${tail}`
    };
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

function resolveBash(custom, platformIsWin, exists, env) {
  custom = (custom || '').trim();
  if (custom) return { path: custom, flavor: bashFlavor(custom, platformIsWin) };
  if (!platformIsWin) return { path: exists('/bin/bash') ? '/bin/bash' : 'bash', flavor: 'posix' };

  const pf = env.ProgramFiles || 'C:\\Program Files';
  const pf86 = env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const sysRoot = env.SystemRoot || 'C:\\Windows';
  const candidates = [
    path.win32.join(pf, 'Git', 'bin', 'bash.exe'),
    path.win32.join(pf86, 'Git', 'bin', 'bash.exe'),
    env.LOCALAPPDATA && path.win32.join(env.LOCALAPPDATA, 'Programs', 'Git', 'bin', 'bash.exe'),
    path.win32.join(sysRoot, 'System32', 'wsl.exe')
  ].filter(Boolean);
  for (const c of candidates) {
    if (exists(c)) return { path: c, flavor: bashFlavor(c, true) };
  }
  return null;
}

function bashFlavor(p, platformIsWin) {
  if (!platformIsWin) return 'posix';
  const lower = p.toLowerCase().replace(/\//g, '\\');
  if (lower === 'wsl.exe' || lower.endsWith('\\wsl.exe') || lower.endsWith('\\system32\\bash.exe')) return 'wsl';
  return 'gitbash';
}

function toBashPath(p, flavor) {
  if (flavor === 'posix') return p;
  const m = /^([a-zA-Z]):[\\/](.*)$/.exec(p);
  if (flavor === 'wsl' && m) return `/mnt/${m[1].toLowerCase()}/${m[2].replace(/\\/g, '/')}`;
  return p.replace(/\\/g, '/'); // Git Bash / MSYS understand C:/path
}

const shQuote = (s) => `'${s.replace(/'/g, `'\\''`)}'`;
const psQuote = (s) => `'${s.replace(/'/g, "''")}'`;
const cmdQuote = (s) => `"${s}"`;

module.exports = { activate, deactivate, _test: { buildPlan, toBashPath, bashFlavor, shQuote, psQuote } };

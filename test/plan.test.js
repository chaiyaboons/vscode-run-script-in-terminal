// Unit tests for the pure planning logic (run with: node test/plan.test.js)
const Module = require('module');
const orig = Module._load;
Module._load = (r, ...a) => (r === 'vscode' ? {} : orig(r, ...a));
const { buildPlan } = require('../extension.js')._test;
const assert = require('assert');
const opts = { bashPath: '', powershellPath: '', bypassExecutionPolicy: true };
const yes = () => true, gitOnly = (p) => p.includes('Git'), wslOnly = (p) => p.endsWith('wsl.exe'), none = () => false;
const env = { ProgramFiles: 'C:\\Program Files', SystemRoot: 'C:\\Windows', ComSpec: 'C:\\Windows\\system32\\cmd.exe' };
const win = (ext, f, ex = yes, a = '', o = opts) => buildPlan(ext, f, a, o, true, ex, env);

let p = win('.ps1', "C:\\My Dir\\it's.ps1", yes, '-Name x');
assert.deepStrictEqual(p.shellArgs, ['-NoLogo', '-ExecutionPolicy', 'Bypass']);
assert.strictEqual(p.command, "& 'C:\\My Dir\\it''s.ps1' -Name x");
p = win('.bat', 'C:\\a b\\x.bat');
assert.strictEqual(p.command, 'call "C:\\a b\\x.bat"');
p = win('.sh', 'C:\\a b\\x.sh', gitOnly);
assert.strictEqual(p.shellPath, 'C:\\Program Files\\Git\\bin\\bash.exe');
assert.strictEqual(p.command, "bash 'C:/a b/x.sh'");
p = win('.sh', 'D:\\proj\\run.sh', wslOnly);
assert.strictEqual(p.command, "bash '/mnt/d/proj/run.sh'");
assert.throws(() => win('.sh', 'C:\\x.sh', none), /bash was not found/);
p = buildPlan('.sh', "/home/u/it's.sh", '', opts, false, yes, {});
assert.strictEqual(p.shellPath, '/bin/bash');
assert.strictEqual(p.command, "bash '/home/u/it'\\''s.sh'");
p = buildPlan('.ps1', '/home/u/a.ps1', '', opts, false, yes, {});
assert.strictEqual(p.shellPath, 'pwsh');
assert.throws(() => buildPlan('.bat', '/x.bat', '', opts, false, yes, {}), /only be run on Windows/);
console.log('All tests passed');

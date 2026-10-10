import { spawn } from 'node:child_process';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = ['server', 'client'].map(workspace => spawn(npm, ['run', 'dev', `--workspace=${workspace}`], { stdio: 'inherit' }));
let closing = false;
function close(code = 0) {
  if (closing) return;
  closing = true;
  children.forEach(child => child.kill('SIGTERM'));
  process.exitCode = code;
}
children.forEach(child => { child.on('error', () => close(1)); child.on('exit', code => close(code ?? 0)); });
process.on('SIGINT', () => close());
process.on('SIGTERM', () => close());

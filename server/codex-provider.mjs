import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const runFile = promisify(execFile);
let cachedStatus;
export async function codexStatus(binary = 'codex') {
  if (cachedStatus?.binary === binary && Date.now() - cachedStatus.time < 10000) return cachedStatus.ready;
  let ready = false;
  try { const result = await runFile(binary, ['login', 'status'], { timeout: 5000, maxBuffer: 8192 }); ready = /Logged in using ChatGPT/i.test(result.stdout + result.stderr); } catch { /* unavailable or signed out */ }
  cachedStatus = { binary, time: Date.now(), ready };
  return ready;
}
// Use the supported CLI authentication flow; never read or copy its credentials.
export async function codexResponse(_url, options, { binary = 'codex' } = {}) {
  const payload = JSON.parse(options.body);
  const directory = await mkdtemp(join(tmpdir(), 'tempo-coach-'));
  try {
    const output = join(directory, 'reply.json');
    const schema = join(directory, 'schema.json');
    await writeFile(schema, JSON.stringify(payload.text.format.schema));
    const args = ['exec', '--ignore-user-config', '--ignore-rules', '--ephemeral', '--skip-git-repo-check',
      '--sandbox', 'read-only', '--cd', directory, '--output-schema', schema, '--output-last-message', output,
      '-c', 'approval_policy="never"', '-c', 'web_search="disabled"', '-c', 'model_reasoning_effort="low"'];
    for (const feature of ['shell_tool', 'unified_exec', 'apps', 'plugins', 'hooks', 'browser_use', 'computer_use', 'in_app_browser', 'multi_agent', 'memories', 'image_generation', 'view_image']) args.push('--disable', feature);
    args.push('-');
    options.signal?.throwIfAborted();
    await new Promise((resolve, reject) => {
      const child = spawn(binary, args, { stdio: ['pipe', 'ignore', 'ignore'], detached: process.platform !== 'win32' });
      let killed = false;
      const stop = () => {
        killed = true;
        try { if (process.platform === 'win32') child.kill('SIGKILL'); else process.kill(-child.pid, 'SIGKILL'); } catch { /* already exited */ }
      };
      const timer = setTimeout(stop, 85000);
      options.signal?.addEventListener('abort', stop, { once: true });
      const cleanup = () => { clearTimeout(timer); options.signal?.removeEventListener('abort', stop); };
      child.on('error', () => { cleanup(); reject(new Error('Codex could not start. Install the CLI and sign in with ChatGPT.')); });
      child.on('close', (code) => { cleanup(); code === 0 && !killed ? resolve() : reject(new Error(killed ? 'Coach request cancelled or timed out.' : 'Codex could not answer. Check your login and usage limits, then try again.')); });
      child.stdin.on('error', () => {});
      child.stdin.end(`${payload.instructions}\nUse only the supplied context. Do not use tools or inspect files.\n${payload.input}`);
      if (options.signal?.aborted) stop();
    });
    const reply = await readFile(output, 'utf8');
    if (reply.length > 10000) throw new Error('The coach returned an oversized reply.');
    return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:reply}]}]}));
  } finally { await rm(directory, { recursive: true, force: true }); }
}

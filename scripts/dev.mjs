import { spawn } from 'node:child_process';

const client = spawn(process.execPath, ['node_modules/vite/bin/vite.js', ...process.argv.slice(2)], { stdio: 'inherit' });
const server = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'watch', 'src/server.ts'], { cwd: 'services/ai-service', stdio: 'inherit' });
const stop = () => { client.kill(); server.kill(); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
for (const child of [client, server]) {
  child.on('error', error => { console.error(error.message); stop(); process.exitCode = 1; });
}

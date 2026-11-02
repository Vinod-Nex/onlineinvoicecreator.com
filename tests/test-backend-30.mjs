import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tsFile = path.resolve(__dirname, 'test-backend-30.ts');

const result = spawnSync('npx', ['tsx', tsFile], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 0);

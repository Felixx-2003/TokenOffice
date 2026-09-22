import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');

await rm(output, { recursive: true, force: true });
await cp(path.join(root, 'stage-1-token-office', 'dist'), output, { recursive: true });
await mkdir(path.join(output, 'stage-2'), { recursive: true });
await cp(path.join(root, 'stage-2-token-circus', 'dist'), path.join(output, 'stage-2'), { recursive: true });

console.log('Combined Stage 1 at / and Stage 2 at /stage-2/.');

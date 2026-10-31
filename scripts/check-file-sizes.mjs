import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { resolve } from 'node:path';

const limit = 1024 * 1024;
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const files = new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
  cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
}).split('\0').filter(Boolean));
let oversized = 0;
for (const file of files) {
  let stat;
  try {
    stat = statSync(resolve(root, file));
  } catch (error) {
    if (error.code === 'ENOENT') continue; // Deleted files awaiting git add.
    throw error;
  }
  if (stat.isFile() && stat.size > limit) {
    console.error(`${JSON.stringify(file)}: ${stat.size} bytes exceeds 1 MiB (${limit} bytes)`);
    oversized++;
  }
}
if (oversized) {
  console.error(`Resize or compress ${oversized} file(s) before committing.`);
  process.exitCode = 1;
} else {
  console.log(`File size check passed: every file is at most 1 MiB (${limit} bytes).`);
}

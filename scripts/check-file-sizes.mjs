import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { resolve } from 'node:path';

const limit = 1024 * 1024;
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
function gitFiles(args) {
  return execFileSync('git', args, {
    cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  }).split('\0').filter(Boolean);
}
// CI supplies the PR base or the commit before a push; locally compare with HEAD.
const base = process.env.FILE_SIZE_BASE || 'HEAD';
const changed = /^0+$/.test(base)
  ? gitFiles(['ls-files', '--cached', '-z']) // First push of a branch.
  : gitFiles(['diff', '--name-only', '--diff-filter=ACMRT', '-z', base, '--']);
const files = new Set([
  ...changed,
  ...gitFiles(['ls-files', '--others', '--exclude-standard', '-z']),
]);
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
  console.log(`File size check passed: ${files.size} added/changed file(s) are at most 1 MiB (${limit} bytes).`);
}

import { execSync } from 'child_process';
import path from 'path';
import { buildIssue } from './build-site.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argDate = process.argv.includes('--date') ? process.argv[process.argv.indexOf('--date') + 1] : undefined;
const telegramTarget = process.env.TELEGRAM_TARGET || '8586723073';
const result = buildIssue(argDate);

execSync('git add docs data scripts .github/workflows README.md package.json .gitignore', { cwd: root, stdio: 'inherit' });
try {
  execSync(`git diff --cached --quiet || git commit -m ${JSON.stringify(`publish ${result.issueDate}`)}`, { cwd: root, stdio: 'inherit' });
} catch (error) {
  // no-op when there is nothing new to commit
}
execSync('git push origin main', { cwd: root, stdio: 'inherit' });

const message = `Published toddler activities for ${result.issueDate}\n${result.publicUrl}`;
execSync(`openclaw message send --channel telegram --target ${telegramTarget} --message ${JSON.stringify(message)}`, { cwd: root, stdio: 'inherit' });
console.log(JSON.stringify(result, null, 2));

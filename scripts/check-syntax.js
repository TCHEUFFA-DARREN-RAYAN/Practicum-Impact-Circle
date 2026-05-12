/**
 * Syntax check all JS files in src/ using Node's built-in parser.
 *
 * Usage:
 *   node scripts/check-syntax.js
 */

const { execSync } = require('child_process');
const { readdirSync, statSync } = require('fs');
const path = require('path');

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (entry.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

const files = walk(path.join(__dirname, '..', 'src'));
let ok = 0, errors = 0;

for (const file of files) {
  try {
    execSync(`node --check "${file}"`, { stdio: 'pipe' });
    ok++;
  } catch (e) {
    console.error(`✗ Syntax error in ${file}`);
    console.error(e.stderr.toString().trim());
    errors++;
  }
}

console.log(`\n${ok} files OK${errors ? `, ${errors} with errors` : ''}.`);
process.exit(errors ? 1 : 0);

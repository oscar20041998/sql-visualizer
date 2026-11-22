// Preflight assessment for docs/ui-prompts/20261009/run-all-pending-tdd.prompt.md
// For every PENDING row in each spec's test-list, report whether the named test exists,
// and whether the test file exists at all.
const fs = require('fs');

const specs = [
  '016-ast-statistics',
  '012-format-error-ai-diagnostics',
  '011-upgrade-sql-explainer',
  '010-sql-intelligence-dashboard',
  '013-guest-access-mode',
];

let grand = 0;
let missingFile = 0;
let missingName = 0;
let found = 0;

for (const spec of specs) {
  const path = 'specs/' + spec + '/tdd/test-list.md';
  if (!fs.existsSync(path)) {
    console.log('\n### ' + spec + ' -> NO test-list.md');
    continue;
  }
  const text = fs.readFileSync(path, 'utf8');
  const rows = text
    .split('\n')
    .filter((l) => l.startsWith('|') && l.includes('PENDING'));

  let specMissingFile = 0;
  let specMissingName = 0;
  let specFound = 0;
  const missingNames = [];

  for (const row of rows) {
    grand++;
    const cells = row.split('|').map((c) => c.trim());
    const id = cells[1];
    // last non-empty cell holds `path::name` (or a command like `npm test`)
    const testCell = cells[cells.length - 2];
    if (!testCell || !testCell.includes('.ts')) continue;
    const [file, name] = testCell.split('::');
    if (!file || !fs.existsSync(file)) {
      specMissingFile++;
      missingNames.push(id + ' -> file missing: ' + file);
      continue;
    }
    if (!name) {
      specFound++;
      continue;
    }
    const src = fs.readFileSync(file, 'utf8');
    if (src.includes(name)) specFound++;
    else {
      specMissingName++;
      missingNames.push(id + ' -> name not found in ' + file + ': "' + name + '"');
    }
  }

  missingFile += specMissingFile;
  missingName += specMissingName;
  found += specFound;
  console.log('\n### ' + spec + ': ' + rows.length + ' PENDING rows');
  console.log('    exact test name present : ' + specFound);
  console.log('    name differs/missing     : ' + specMissingName);
  console.log('    test file missing        : ' + specMissingFile);
  missingNames.slice(0, 8).forEach((m) => console.log('      - ' + m));
  if (missingNames.length > 8) console.log('      ... +' + (missingNames.length - 8) + ' more');
}

console.log('\n=== TOTAL ===');
console.log('PENDING rows assessed : ' + grand);
console.log('exact name present    : ' + found);
console.log('name differs/missing  : ' + missingName);
console.log('file missing          : ' + missingFile);

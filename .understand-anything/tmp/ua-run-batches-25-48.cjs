const fs = require('fs');
const cp = require('child_process');

const root = 'D:/catgo-LRG';
const skill = 'C:/Users/adm/.understand-anything-plugin/skills/understand';
const batchesPath = `${root}/.understand-anything/intermediate/batches.json`;
const data = JSON.parse(fs.readFileSync(batchesPath, 'utf8'));
fs.mkdirSync(`${root}/.understand-anything/tmp`, { recursive: true });

const batches = data.batches.filter((b) => b.batchIndex >= 25 && b.batchIndex <= 48);
console.log('batches', batches.length, batches.map((b) => b.batchIndex).join(','));

for (const b of batches) {
  const input = {
    projectRoot: root,
    batchFiles: b.files,
    batchImportData: b.batchImportData || {},
  };
  const inPath = `${root}/.understand-anything/tmp/ua-file-analyzer-input-${b.batchIndex}.json`;
  const outPath = `${root}/.understand-anything/tmp/ua-file-extract-results-${b.batchIndex}.json`;
  fs.writeFileSync(inPath, JSON.stringify(input, null, 2));

  const result = cp.spawnSync('node', [`${skill}/extract-structure.mjs`, inPath, outPath], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    console.error(`FAIL ${b.batchIndex}`);
    console.error('status:', result.status);
    console.error('signal:', result.signal);
    console.error('error:', result.error && result.error.message);
    console.error('stdout:', result.stdout);
    console.error('stderr:', result.stderr);
    process.exit(1);
  }
  if (!fs.existsSync(outPath) || fs.statSync(outPath).size === 0) {
    console.error(`EMPTY ${b.batchIndex}`);
    process.exit(1);
  }
  console.log('ok', b.batchIndex, fs.statSync(outPath).size);
}

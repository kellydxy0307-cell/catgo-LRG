const fs = require('fs');
const path = require('path');
const root = 'D:/catgo-LRG';
const batchesPath = path.join(root,'.understand-anything/intermediate/batches.json');
const all = JSON.parse(fs.readFileSync(batchesPath,'utf8')).batches;
const wanted = all.filter(b => b.batchIndex >= 73 && b.batchIndex <= 96);
for (const b of wanted) {
  const input = { projectRoot: root, batchFiles: b.files, batchImportData: b.batchImportData || {} };
  fs.writeFileSync(path.join(root,`.understand-anything/tmp/ua-file-analyzer-input-${b.batchIndex}.json`), JSON.stringify(input,null,2));
}
console.log(JSON.stringify(wanted.map(b=>({batchIndex:b.batchIndex, files:b.files.length})), null, 2));

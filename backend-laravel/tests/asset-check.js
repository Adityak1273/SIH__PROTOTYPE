const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..', 'prototype', 'phase-0');
const text = fs.readFileSync(path.join(root, 'index.html'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'core-boot.js'), 'utf8');
const refs = [...text.matchAll(/(?:src|href)=["']\.\/([^?"']+)/g)].map(m => m[1]);
for (const ref of refs) {
  const p = path.join(root, ref);
  if (!fs.existsSync(p)) {
    throw new Error('Missing referenced asset: ' + p);
  }
}
console.log('Validated ' + refs.length + ' static/dynamic asset references.');

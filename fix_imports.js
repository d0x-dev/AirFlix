const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') && !file.includes('Text.tsx')) {
      results.push(file);
    }
  });
  return results;
}
const files = walk('src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('<AnimatedAppText') && !content.includes('import {AnimatedAppText}')) {
    const depth = file.split('src')[1].split(path.sep).length - 2;
    const prefix = depth === 0 ? './' : '../'.repeat(depth);
    content = 'import {AnimatedAppText} from \'' + prefix + 'components/ui/Text\';\n' + content;
    fs.writeFileSync(file, content);
    console.log('Fixed import in ' + file);
  }
});

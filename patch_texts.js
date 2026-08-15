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
  let modified = false;

  // Replace <Text ...> with <AppText ...>
  if (content.includes('<Text ') || content.includes('<Text>') || content.includes('</Text>')) {
    content = content.replace(/<Text/g, '<AppText').replace(/<\/Text>/g, '</AppText>');
    if (!content.includes('AppText from')) {
      const depth = file.split('src')[1].split(path.sep).length - 2;
      const prefix = depth === 0 ? './' : '../'.repeat(depth);
      content = 'import AppText from \'' + prefix + 'components/ui/Text\';\n' + content;
    }
    modified = true;
  }

  // Replace <Animated.Text ...> with <AnimatedAppText ...>
  if (content.includes('<Animated.Text') || content.includes('</Animated.Text>')) {
    content = content.replace(/<Animated\.Text/g, '<AnimatedAppText').replace(/<\/Animated\.Text>/g, '</AnimatedAppText>');
    if (!content.includes('AnimatedAppText')) {
      const depth = file.split('src')[1].split(path.sep).length - 2;
      const prefix = depth === 0 ? './' : '../'.repeat(depth);
      content = 'import {AnimatedAppText} from \'' + prefix + 'components/ui/Text\';\n' + content;
    }
    // Note: Remove fontWeight: 'bold' from headers which forces Roboto
    content = content.replace(/fontWeight:\s*['"]bold['"]/g, '');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(file, content);
    console.log('Patched ' + file);
  }
});

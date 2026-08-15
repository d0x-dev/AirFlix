const fs = require('fs');
const path = require('path');
const files = [
  'src/components/AppDialog.tsx',
  'src/components/ui/DropdownField.tsx',
  'src/screens/settings/components/DnsPreference.tsx',
  'src/components/ui/SearchField.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('AppText from')) {
    const depth = file.split('src')[1].split('/').length - 2;
    const prefix = depth === 0 ? './' : '../'.repeat(depth);
    content = 'import AppText from \'' + prefix + 'components/ui/Text\';\n' + content;
  }
  content = content.replace(/<Text([\s>])/g, '<AppText$1').replace(/<\/Text>/g, '</AppText>');
  fs.writeFileSync(file, content);
  console.log('Properly patched ' + file);
});

const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'website', 'index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// Cache bust CSS
content = content.replace(/styles\.css\?v=6\.2\.0/g, 'styles.css?v=6.2.1');

// Change object-cover to object-contain for the slides
content = content.replace(/<img alt="Home Screen" class="w-full h-full object-cover"/g, '<img alt="Home Screen" class="w-full h-full object-contain"');
content = content.replace(/<img alt="Search Screen" class="w-full h-full object-cover"/g, '<img alt="Search Screen" class="w-full h-full object-contain"');
content = content.replace(/<img alt="Movie Screen" class="w-full h-full object-cover"/g, '<img alt="Movie Screen" class="w-full h-full object-contain"');
content = content.replace(/<img alt="Settings Screen" class="w-full h-full object-cover"/g, '<img alt="Settings Screen" class="w-full h-full object-contain"');

fs.writeFileSync(indexPath, content, 'utf8');
console.log('Fixed object-fit in index.html');

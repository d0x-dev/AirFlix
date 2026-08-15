const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'website', 'index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// Fix old commit hash logo
content = content.replace(/https:\/\/raw\.githubusercontent\.com\/d0x-dev\/AirFlix\/[a-f0-9]+\/icon\.png/g, 'https://raw.githubusercontent.com/d0x-dev/AirFlix/refs/heads/main/uploads/nonbg.png');

// Replace local images and sc.png with the provided preview images
content = content.replace(/img\/smart_library\.jpeg/g, 'https://raw.githubusercontent.com/d0x-dev/AirFlix/refs/heads/main/uploads/preview1.png');
content = content.replace(/img\/advance_settings\.jpeg/g, 'https://raw.githubusercontent.com/d0x-dev/AirFlix/refs/heads/main/uploads/preview2.png');
content = content.replace(/img\/immersive_player\.jpeg/g, 'https://raw.githubusercontent.com/d0x-dev/AirFlix/refs/heads/main/uploads/preview1.png');
content = content.replace(/https:\/\/raw\.githubusercontent\.com\/d0x-dev\/AirFlix\/refs\/heads\/main\/sc\.png/g, 'https://raw.githubusercontent.com/d0x-dev/AirFlix/refs/heads/main/uploads/preview1.png');

fs.writeFileSync(indexPath, content, 'utf8');
console.log("Images fixed!");

const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace names
    content = content.replace(/AirBeats/g, 'AirFlix');
    content = content.replace(/Airbeats/g, 'AirFlix');
    content = content.replace(/Air-Beats/g, 'AirFlix');
    content = content.replace(/airbeats/g, 'airflix');

    // Replace repos
    content = content.replace(/d0x-dev\/AirFlix/g, 'd0x-dev/AirFlix'); // ensure no double replace if already AirFlix
    content = content.replace(/drkvenom786\/AirFlix/g, 'd0x-dev/AirFlix');

    // Remove the demo warning dialog redirect
    // By pointing to AirFlix releases instead
    // (Already handled by global replacement of AirBeats -> AirFlix)

    // Update icons
    content = content.replace(/https:\/\/raw\.githubusercontent\.com\/drkvenom786\/AirFlix\/.*\/icon\.png/g, 'https://raw.githubusercontent.com/d0x-dev/AirFlix/refs/heads/main/uploads/nonbg.png');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === '.git' || file === 'node_modules') continue;
        
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (['.html', '.js', '.css', '.json', '.txt', '.xml'].includes(path.extname(fullPath))) {
            replaceInFile(fullPath);
        }
    }
}

processDirectory(path.join(__dirname, 'website'));

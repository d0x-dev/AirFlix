const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, 'website', 'js', 'app.js');
let js = fs.readFileSync(appJsPath, 'utf8');

// Inject the missing logic for the Android download button
const targetString = `if (androidVersionBadge) androidVersionBadge.textContent = tag;`;
const replacementString = `if (androidVersionBadge) androidVersionBadge.textContent = tag;

        const androidDownloadBtn = document.getElementById('android-download-btn');
        if (androidDownloadBtn && latestRelease.assets) {
            const androidApkAsset = latestRelease.assets.find(a => /\\.apk$/i.test(a.name));
            if (androidApkAsset) {
                androidDownloadBtn.href = androidApkAsset.browser_download_url;
            }
        }`;

if (!js.includes('androidDownloadBtn.href = androidApkAsset.browser_download_url')) {
    js = js.replace(targetString, replacementString);
}
fs.writeFileSync(appJsPath, js, 'utf8');

// Fix the hardcoded HTML just in case
const indexPath = path.join(__dirname, 'website', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(/href="https:\/\/github\.com\/d0x-dev\/AirFlix\/releases\/download\/5\.9\.0\/AirFlix_v5\.9\.0_signed\.apk"/g, 'href="https://github.com/d0x-dev/AirFlix/releases/latest"');
html = html.replace(/app\.js\?v=6\.2\.3/g, 'app.js?v=6.2.4');
fs.writeFileSync(indexPath, html, 'utf8');

console.log('Fixed Android download button dynamically updating.');

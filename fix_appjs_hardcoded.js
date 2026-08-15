const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, 'website', 'js', 'app.js');
let js = fs.readFileSync(appJsPath, 'utf8');

// 1. Fix hardcoded Spanish in modal logic
js = js.replace(/Versiones Anteriores para  \(\.exe\)/g, 'Previous Versions for Windows (.exe)');
js = js.replace(/Versiones Anteriores para Android \(\.apk\)/g, 'Previous Versions for Android (.apk)');
js = js.replace(/Versiones Anteriores/g, 'Previous Versions');
js = js.replace(/No se encontraron versiones anteriores para \$\{filterPlatform\}\./g, 'No previous versions found for ${filterPlatform}.');

// Fix asset labels in Spanish
js = js.replace(/: 'Instalador \(\.exe\)'/g, ": 'Installer (.exe)'");
js = js.replace(/: 'Ejecutable \(\.exe\)'/g, ": 'Executable (.exe)'");
js = js.replace(/: 'Descargar APK'/g, ": 'Download APK'");
js = js.replace(/'Ultima versi.n'/g, "'Latest Version'");

// 2. Replace allReleases hardcoded array with the real 1.0.0 release.
// We'll just replace the whole let allReleases = [ ... ]; block.
const allReleasesStart = js.indexOf('let allReleases = [');
const allReleasesEnd = js.indexOf('];\n\n    let latestRelease = allReleases[0];');

if (allReleasesStart !== -1 && allReleasesEnd !== -1) {
    const replacementArray = `let allReleases = [
        {
            tag_name: "1.0.0",
            name: "Airflix-V1.0.0",
            published_at: "2026-08-15T11:53:43Z",
            body: "### AirFlix V1.0.0\\n- Initial Release for Android",
            assets: [
                { name: "Airflix-arm64-v8a-v1.0.0.apk", size: 62998786, browser_download_url: "https://github.com/d0x-dev/AirFlix/releases/download/1.0.0/Airflix-arm64-v8a-v1.0.0.apk" }
            ]
        }
    ];

    let latestRelease = allReleases[0];`;
    js = js.substring(0, allReleasesStart) + replacementArray + js.substring(allReleasesEnd + 44);
}

// 3. Cache bust app.js in index.html again just to be safe
const indexPath = path.join(__dirname, 'website', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(/app\.js\?v=6\.2\.1/g, 'app.js?v=6.2.3');
html = html.replace(/app\.js\?v=6\.2\.2/g, 'app.js?v=6.2.3');
fs.writeFileSync(indexPath, html, 'utf8');


fs.writeFileSync(appJsPath, js, 'utf8');
console.log('Fixed Spanish modals and updated fallback releases array.');

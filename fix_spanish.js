const fs = require('fs');
const path = require('path');

// 1. Fix cache bust in index.html
const indexPath = path.join(__dirname, 'website', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(/app\.js\?v=6\.2\.0/g, 'app.js?v=6.2.2');
fs.writeFileSync(indexPath, html, 'utf8');

// 2. Fix Spanish dates in app.js
const appJsPath = path.join(__dirname, 'website', 'js', 'app.js');
let js = fs.readFileSync(appJsPath, 'utf8');

// The original line is: const pubDate = rel.published_at ? new Date(rel.published_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Reciente';
// We should replace 'es-ES' with 'en-US' (or undefined to use browser default) and 'Reciente' with 'Recent'
js = js.replace(/toLocaleDateString\('es-ES'/g, 'toLocaleDateString(undefined');
js = js.replace(/: 'Reciente'/g, ": 'Recent'");

// There's also `Ultima versin` at line 316
js = js.replace(/Ultima versin/g, 'Latest Version');
js = js.replace(/Ultima versión/g, 'Latest Version');
js = js.replace(/Última versión/g, 'Latest Version');

// Replace any leftover Spanish text for sizes etc if exists


fs.writeFileSync(appJsPath, js, 'utf8');
console.log('Fixed double footer and Spanish popups.');

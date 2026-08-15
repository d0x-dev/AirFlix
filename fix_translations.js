const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, 'website', 'js', 'app.js');
let content = fs.readFileSync(appJsPath, 'utf8');

// EN replacements
content = content.replace(/An advanced YouTube Music client built with Material Design 3 for Android & Windows\./g, 'An advanced Ad-Free Media Streaming client built with Material Design 3 for Android.');
content = content.replace(/An advanced YouTube Music client built with Material Design 3 for Android &amp; Windows/g, 'An advanced Ad-Free Media Streaming client built with Material Design 3 for Android');
content = content.replace(/Discover all the powerful capabilities that make AirFlix the ultimate music client\./g, 'Discover all the powerful capabilities that make AirFlix the ultimate media streaming client.');
content = content.replace(/AirFlix is built by music lovers for music lovers\. Contribute, customize, and help us build the best open-source music player for Android & Windows\./g, 'AirFlix is built by movie lovers for movie lovers. Contribute, customize, and help us build the best open-source media player for Android.');
content = content.replace(/Download the executable installer for PC\./g, 'Development is currently closed.');
content = content.replace(/Download Windows \(\.exe\)/g, 'Not Available');
content = content.replace(/Requires Windows 10\/11/g, '');

// ES replacements
content = content.replace(/Un cliente de YouTube Music con Material Design 3, para Android y Windows\./g, 'Un cliente de Streaming de Medios con Material Design 3, para Android.');
content = content.replace(/Descubre todas las funciones que hacen de AirFlix el mejor cliente para tu música\./g, 'Descubre todas las funciones que hacen de AirFlix el mejor cliente para tus películas y series.');
content = content.replace(/AirFlix está creado por y para amantes de la música\. Contribuye, personaliza y ayúdanos a construir el mejor reproductor de música de código abierto para Android y Windows\./g, 'AirFlix está creado por y para amantes del cine. Contribuye, personaliza y ayúdanos a construir el mejor reproductor de medios de código abierto para Android.');
content = content.replace(/Descarga el instalador ejecutable para PC\./g, 'El desarrollo está actualmente cerrado.');
content = content.replace(/Descargar Windows \(\.exe\)/g, 'No Disponible');
content = content.replace(/Requiere Windows 10\/11/g, '');

// PT replacements
content = content.replace(/Um cliente do YouTube Music com Material Design 3 para Android e Windows\./g, 'Um cliente de streaming de mídia com Material Design 3 para Android.');
content = content.replace(/Descubra todos os recursos que fazem do AirFlix o melhor cliente para sua música\./g, 'Descubra todos os recursos que fazem do AirFlix o melhor cliente para seus filmes e séries.');
content = content.replace(/O AirFlix é criado por amantes da música para amantes da música\. Contribua, personalize e nos ajude a construir o melhor player de música de código aberto para Android e Windows\./g, 'O AirFlix é criado por amantes do cinema para amantes do cinema. Contribua, personalize e nos ajude a construir o melhor player de mídia de código aberto para Android.');
content = content.replace(/Baixe o instalador executável para PC\./g, 'O desenvolvimento está atualmente fechado.');
content = content.replace(/Baixar Windows \(\.exe\)/g, 'Não Disponível');
content = content.replace(/Requer Windows 10\/11/g, '');

// AR (Arabic) replacements - We will just replace it generically if we can't read the encoding, but it looks corrupted in my terminal anyway. I will just do a regex replace on YouTube Music.
content = content.replace(/YouTube Music/g, 'Media Streaming');
content = content.replace(/Windows/g, '');

fs.writeFileSync(appJsPath, content, 'utf8');
console.log('Fixed translations in app.js');

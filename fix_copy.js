const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'website', 'index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// Replace Text
content = content.replace(/An advanced YouTube Music client/g, 'An advanced Ad-Free Media Streaming client');
content = content.replace(/Next-Gen YouTube Music Client/g, 'Next-Gen Media Streaming App');
content = content.replace(/Click to play rhythm\.mp3 audio sample/g, 'AirFlix Logo');
content = content.replace(/Discover all the powerful capabilities that make AirFlix the ultimate music client/g, 'Discover all the powerful capabilities that make AirFlix the ultimate streaming client');
content = content.replace(/YouTube Music Engine/g, 'Advanced Media Engine');
content = content.replace(/Offers a modern and elegant YouTube Music experience/g, 'Offers a modern and elegant movie and TV show streaming experience');
content = content.replace(/Explore &amp; Discover Music/g, 'Explore &amp; Discover Content');
content = content.replace(/Access an expansive music catalog/g, 'Access an expansive movie and TV show catalog');
content = content.replace(/High-Quality Audio/g, 'High-Quality Video');
content = content.replace(/High-fidelity audio streaming/g, 'High-fidelity video streaming');
content = content.replace(/download tracks for offline listening anytime/g, 'download content for offline viewing anytime');
content = content.replace(/YouTube Music Sync/g, 'Cloud Sync');
content = content.replace(/Sync your YouTube Music account/g, 'Sync your account');
content = content.replace(/10-band audio equalizer/g, 'video quality selection');
content = content.replace(/Organize your music collection/g, 'Organize your watch history and favorites');
content = content.replace(/designed for music lovers/g, 'designed for movie lovers');
content = content.replace(/built by music lovers for music lovers/g, 'built by movie lovers for movie lovers');
content = content.replace(/open-source music player/g, 'open-source media player');
content = content.replace(/Album artwork focus, expanded controls, and a visual hierarchy focused on the music/g, 'High quality video player with subtitles, multiple audio tracks, and intuitive controls');
content = content.replace(/music_note/g, 'movie');

fs.writeFileSync(indexPath, content, 'utf8');
console.log('Fixed copy in index.html');

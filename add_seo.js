const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'website', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const keywords = "AirFlix, vegamovies, free movies, watch free movies online, netflix alternative, free netflix, prime video alternative, disney plus alternative, hulu alternative, streaming app, free streaming app, android movie app, watch movies on android, cinema app, movie player, video player, mkv player, mp4 player, 4k video player, hd movies, download movies free, marvel movies, mcu, avengers, iron man, spider-man, dc movies, dceu, batman, superman, justice league, hollywood movies, bollywood movies, free series, watch series online, tv shows free, anime, free anime, watch anime, netflix shows, amc, cinemark, regal cinemas, imax, popcorn time alternative, stremio alternative, kodi, plex, jellyfin, open source movie app, open source video player, movie tracker, latest movies 2026, new releases, hd streaming, subtitles, dual audio movies, hindi dubbed movies, 1080p movies, 720p movies, 4k movies, bluray, web-dl, webrip, torrent streaming, free entertainment, watch online without sign up, no ads movies, ad free movie app, best movie app 2026, free films, online cinema, stream cinema, blockbuster movies, action movies, comedy movies, horror movies, sci-fi movies, romance, thriller, documentary, short films, kdrama, korean drama free, asian drama, cartoon, animated movies, pika show alternative, cinema hd alternative, hdo box, teatv, bee tv, cyberflix, unlock my tv, flixoid, cuco tv, viva tv, nova tv, filmplus, morpheus tv, terrarium tv alternative, zini tevi, cotomovies, bobby movie, showbox alternative, moviebox pro, media streaming, local media player, cast to tv, chromecast movies, dlna player, network stream, iptv, free iptv, m3u player, stream movies to tv, smart tv app, android tv movie app, firestick movie app, fire tv free movies, free movie apk, download apk free movies, best free movie apk, netflix mod apk, amazon prime mod, hotstar premium free, premium unlocked, cinema apk, megabox, popcorntime, yify, yts, torrentz, pirate bay, rarbg, 1337x movies, extratorrent, putlocker, 123movies, fmovies, yesmovies, solarmovie, gomovies, flixtor, watchfree, losmovies, primewire, streamlord, vexmovies, bmovies, popcornflix, tubi tv, crackle, pluto tv, vudu, peacock, hbo max alternative, paramount plus alternative, apple tv plus alternative, marvel cinematic universe, dc extended universe, x-men, deadpool, wolverine, the dark knight, joker, aquaman, wonder woman, flash, fast and furious, star wars, harry potter, lord of the rings, matrix, avatar, jurassic park, transformers, watch latest cinema, moviesda, tamilrockers, ibomma, movierulz, jio cinema, zee5, sony liv, voot, alt balaji, mx player, torrent downloader, movie downloader app, watch offline, offline movie player, subtitles downloader, opensubtitles, srt player, vlc alternative, mx player alternative, kmplayer, bsplayer, potplayer";

const metaTags = `
    <meta name="keywords" content="${keywords}">
    <meta name="author" content="AirFlix">
    <meta name="robots" content="index, follow">
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="AirFlix - Next-Gen Media Streaming App">
    <meta property="og:description" content="Watch thousands of free movies, series, Marvel, DC, and more in 4K HD. The ultimate ad-free Netflix alternative.">
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:title" content="AirFlix - Next-Gen Media Streaming App">
    <meta property="twitter:description" content="Watch thousands of free movies, series, Marvel, DC, and more in 4K HD. The ultimate ad-free Netflix alternative.">
`;

// Insert after description
html = html.replace(/(<meta name="description" content="[^"]*">)/, `$1\n${metaTags}`);
fs.writeFileSync(indexPath, html, 'utf8');

console.log('Added massive SEO tags');

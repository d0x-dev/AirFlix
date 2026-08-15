const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'website', 'index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// The new slides HTML
const slidesHtml = `
                                            <article class="screenshots-slide ambient-glow" data-title="Home Screen" data-description="Browse top content, new releases, and personalized recommendations.">
                                                <div class="screenshots-device-frame">
                                                    <img alt="Home Screen" class="w-full h-full object-cover" src="img/homescreen.jpg">
                                                </div>
                                            </article>

                                            <article class="screenshots-slide ambient-glow" data-title="Search Screen" data-description="Find your favorite movies and shows instantly with our fast search engine.">
                                                <div class="screenshots-device-frame">
                                                    <img alt="Search Screen" class="w-full h-full object-cover" src="img/searchscreen.jpg">
                                                </div>
                                            </article>

                                            <article class="screenshots-slide ambient-glow" data-title="Movie Details" data-description="Get rich information, cast details, and instantly start streaming.">
                                                <div class="screenshots-device-frame">
                                                    <img alt="Movie Screen" class="w-full h-full object-cover" src="img/moviescreen.jpg">
                                                </div>
                                            </article>

                                            <article class="screenshots-slide ambient-glow" data-title="Immersive Player" data-description="High quality video player with subtitles, multiple audio tracks, and intuitive controls.">
                                                <div class="screenshots-device-frame">
                                                    <img alt="Player Screen" class="w-full h-full object-cover" src="img/playerscreen.jpg">
                                                </div>
                                            </article>

                                            <article class="screenshots-slide ambient-glow" data-title="Settings" data-description="Customize your streaming experience, providers, and app preferences.">
                                                <div class="screenshots-device-frame">
                                                    <img alt="Settings Screen" class="w-full h-full object-cover" src="img/settingsscreen.jpg">
                                                </div>
                                            </article>
`;

const railHtml = `
                                <button type="button" class="screenshots-preview-card is-active" data-screenshot-index="0">
                                    <div class="screenshots-preview-thumb">
                                        <img alt="Home preview" class="w-full h-full object-cover" src="img/homescreen.jpg">
                                    </div>
                                    <div>
                                        <p class="font-title-md text-on-surface">Home</p>
                                        <p class="text-on-surface-variant text-sm mt-1">Discover content.</p>
                                    </div>
                                </button>

                                <button type="button" class="screenshots-preview-card" data-screenshot-index="1">
                                    <div class="screenshots-preview-thumb">
                                        <img alt="Search preview" class="w-full h-full object-cover" src="img/searchscreen.jpg">
                                    </div>
                                    <div>
                                        <p class="font-title-md text-on-surface">Search</p>
                                        <p class="text-on-surface-variant text-sm mt-1">Find anything quickly.</p>
                                    </div>
                                </button>

                                <button type="button" class="screenshots-preview-card" data-screenshot-index="2">
                                    <div class="screenshots-preview-thumb">
                                        <img alt="Movie preview" class="w-full h-full object-cover" src="img/moviescreen.jpg">
                                    </div>
                                    <div>
                                        <p class="font-title-md text-on-surface">Movie Info</p>
                                        <p class="text-on-surface-variant text-sm mt-1">Cast & details.</p>
                                    </div>
                                </button>

                                <button type="button" class="screenshots-preview-card" data-screenshot-index="3">
                                    <div class="screenshots-preview-thumb">
                                        <img alt="Player preview" class="w-full h-full object-cover" src="img/playerscreen.jpg">
                                    </div>
                                    <div>
                                        <p class="font-title-md text-on-surface">Video Player</p>
                                        <p class="text-on-surface-variant text-sm mt-1">Stream in high quality.</p>
                                    </div>
                                </button>

                                <button type="button" class="screenshots-preview-card" data-screenshot-index="4">
                                    <div class="screenshots-preview-thumb">
                                        <img alt="Settings preview" class="w-full h-full object-cover" src="img/settingsscreen.jpg">
                                    </div>
                                    <div>
                                        <p class="font-title-md text-on-surface">Settings</p>
                                        <p class="text-on-surface-variant text-sm mt-1">Customize preferences.</p>
                                    </div>
                                </button>
`;

// Extract the track bounds
let startIndex = content.indexOf('<div id="screenshots-track" class="screenshots-track">');
let endIndex = content.indexOf('</div>', startIndex + 60);
let closeIndex = content.indexOf('</div>', endIndex + 5); 
// this is fragile. Better to use regex matching the entire block.

content = content.replace(/<div id="screenshots-track" class="screenshots-track">[\s\S]*?<\/div>\s*<\/div>\s*<button id="screenshots-next"/, 
    '<div id="screenshots-track" class="screenshots-track">\n' + slidesHtml + '                                        </div>\n                                    </div>\n\n                                    <button id="screenshots-next"');

content = content.replace(/<aside class="screenshots-preview-rail" aria-label="Screenshot preview rail">[\s\S]*?<\/aside>/, 
    '<aside class="screenshots-preview-rail" aria-label="Screenshot preview rail">\n' + railHtml + '                            </aside>');

// Update Hero image at the top to homescreen.jpg
content = content.replace(/<img src="https:\/\/raw.githubusercontent.com\/d0x-dev\/AirFlix\/refs\/heads\/main\/uploads\/preview1.png" alt="AirFlix App Preview"/, 
    '<img src="img/homescreen.jpg" alt="AirFlix App Preview"');

fs.writeFileSync(indexPath, content, 'utf8');
console.log("Screenshots updated successfully.");

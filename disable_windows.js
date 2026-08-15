const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'website', 'index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// Remove Windows from descriptions
content = content.replace(/for Android &amp; Windows/g, 'for Android');
content = content.replace(/for Android & Windows/g, 'for Android');
content = content.replace(/on Android and Windows/g, 'on Android');
content = content.replace(/for Android \&amp\; Windows/g, 'for Android');

// The new Windows card HTML based on the user's screenshot
const windowsCardHTML = `
                    <!-- Windows Card (Disabled) -->
                    <div class="glass-card rounded-3xl p-8 flex flex-col h-full border border-white/5 relative overflow-hidden" style="background: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.02) 10px, rgba(255,255,255,0.02) 20px), var(--surface-container-low);">
                        <div class="flex items-center gap-4 mb-6 relative z-10">
                            <div class="w-12 h-12 rounded-xl bg-surface flex items-center justify-center flex-shrink-0 opacity-50">
                                <span class="material-symbols-outlined text-on-surface-variant">laptop_windows</span>
                            </div>
                            <div class="opacity-50">
                                <h3 class="font-title-lg text-on-surface">Windows</h3>
                                <p class="text-on-surface-variant text-sm">Development is currently closed.</p>
                            </div>
                        </div>

                        <div class="flex gap-2 mb-6 relative z-10">
                            <span class="version-chip" style="background: rgba(255,255,255,0.05); color: var(--on-surface-variant);">Closed</span>
                            <span class="version-chip" style="background: rgba(255,255,255,0.05); color: var(--on-surface-variant);">Not Available</span>
                        </div>

                        <div class="flex gap-6 mb-8 relative z-10">
                            <div class="flex items-center gap-2 text-on-surface-variant/50 font-label-lg cursor-not-allowed">
                                <span class="material-symbols-outlined" style="font-size:18px">article</span>
                                View Changes
                            </div>
                            <div class="flex items-center gap-2 text-on-surface-variant/50 font-label-lg cursor-not-allowed">
                                <span class="material-symbols-outlined" style="font-size:18px">history</span>
                                Previous Versions
                            </div>
                        </div>

                        <div class="mt-auto pt-6 border-t border-white/5 relative z-10">
                            <button disabled class="w-full flex items-center justify-center gap-3 px-8 py-3 rounded-full font-label-lg transition-all" style="background: rgba(255,255,255,0.05); color: var(--on-surface-variant); cursor: not-allowed;">
                                <span class="material-symbols-outlined">block</span>
                                <span>Not Available</span>
                            </button>
                        </div>
                    </div>
`;

// Extract and replace the Windows card section
// The Windows card is the second .glass-card in the #downloads section grid.
const windowsCardStart = content.indexOf('<!-- Windows Card -->');
const windowsCardEnd = content.indexOf('</section>', windowsCardStart);

if (windowsCardStart !== -1) {
    // Find the end of the Windows card div. It's followed by </section> usually, but let's be careful.
    // The grid has two cards. We want to replace the second one.
    const gridEnd = content.lastIndexOf('</div>', windowsCardEnd) - 10;
    // Just regex replace the block
    content = content.replace(/<!-- Windows Card -->[\s\S]*?<\/section>/, windowsCardHTML + '\n                </div>\n            </div>\n        </section>');
}

fs.writeFileSync(indexPath, content, 'utf8');
console.log('Fixed Windows card in index.html');

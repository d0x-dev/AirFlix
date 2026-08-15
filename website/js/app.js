document.addEventListener('DOMContentLoaded', () => {
    // ═══════════════════════ MULTI-LANGUAGE TRANSLATION DICTIONARY ═══════════════════════
    const translations = {
        es: {
            nav_features: "Características",
            nav_screenshots: "Capturas",
            nav_downloads: "Descargas",
            nav_download_btn: "Descargar",
            hero_subtitle: "Un cliente de Streaming de Medios con Material Design 3, para Android.",
            hero_download_apk: "Descargar APK",
            hero_demo_btn: "Probar Demo",
            features_title: "Características",
            features_subtitle: "Descubre todas las funciones que hacen de AirFlix el mejor cliente para tus películas y series.",
            oss_title: "Open Source at its Heart",
            oss_desc: "AirFlix es construido por amantes de la música para amantes de la música. Contribuye, personaliza y ayúdanos a construir el mejor reproductor de código abierto para Android y .",
            oss_star: "Star en GitHub",
            oss_version_title: "Última versión estable",
            shots_title: "La Interfaz",
            shots_subtitle: "Un vistazo a la experiencia de AirFlix.",
            shots_active: "Vista activa",
            shots_hint: "Desliza o usa los controles para cambiar la vista.",
            support_title: "¿Necesitas ayuda?",
            support_desc: "Envía una solicitud o reporta un problema directamente al equipo de desarrollo en GitHub.",
            support_btn: "Solicitar ayuda",
            downloads_title: "Descargas",
            downloads_subtitle: "Descarga la versión más reciente de AirFlix para tu plataforma.",
            android_card_sub: "Descarga la última versión estable.",
            android_stable_chip: "Versión Estable",
            windows_card_sub: "El desarrollo está actualmente cerrado.",
            windows_chip: "Versión ",
            view_changelog: "Ver cambios",
            previous_versions: "Versiones anteriores",
            android_download_text: "Descargar APK",
            windows_download_text: "No Disponible",
            footer_rights: "Todos los derechos reservados.",
            footer_license: "Licenciado bajo la Licencia de Código Abierto GPL-3.0.",
            android_req: "Requiere Android 6.0+",
            windows_req: "",
            lang_dialog_title: "Seleccionar idioma"
        },
        en: {
            nav_features: "Features",
            nav_screenshots: "Screenshots",
            nav_downloads: "Downloads",
            nav_download_btn: "Download",
            hero_subtitle: "An advanced Ad-Free Media Streaming client built with Material Design 3 for Android.",
            hero_download_apk: "Download APK",
            hero_demo_btn: "View Demo",
            features_title: "Features",
            features_subtitle: "Discover all the powerful capabilities that make AirFlix the ultimate media streaming client.",
            oss_title: "Open Source at its Heart",
            oss_desc: "AirFlix is built by movie lovers for movie lovers. Contribute, customize, and help us build the best open-source media player for Android.",
            oss_star: "Star on GitHub",
            oss_version_title: "Latest Stable Version",
            shots_title: "The Interface",
            shots_subtitle: "A glimpse into the Material Design 3 experience of AirFlix.",
            shots_active: "Active View",
            shots_hint: "Swipe or click controls to switch views.",
            support_title: "Need Help?",
            support_desc: "Submit a request or report an issue directly to the development team on GitHub.",
            support_btn: "Request Help",
            downloads_title: "Downloads",
            downloads_subtitle: "Download the latest official release of AirFlix for your operating system.",
            android_card_sub: "Download the latest stable Android build.",
            android_stable_chip: "Stable Build",
            windows_card_sub: "Download the  executable installer.",
            windows_chip: " Build",
            view_changelog: "View Changelog",
            previous_versions: "Previous Versions",
            android_download_text: "Download APK",
            windows_download_text: "Not Available",
            footer_rights: "All Rights Reserved.",
            footer_license: "Licensed under GNU General Public License v3.0 Open Source License.",
            android_req: "Requires Android 6.0+",
            windows_req: "",
            lang_dialog_title: "Select Language"
        },
        pt: {
            nav_features: "Recursos",
            nav_screenshots: "Capturas",
            nav_downloads: "Downloads",
            nav_download_btn: "Baixar",
            hero_subtitle: "Um cliente de streaming de mídia com Material Design 3 para Android.",
            hero_download_apk: "Baixar APK",
            hero_demo_btn: "Testar Demo",
            features_title: "Recursos",
            features_subtitle: "Descubra todos os recursos que tornam o AirFlix o melhor cliente para sua música.",
            oss_title: "Código Aberto no Coração",
            oss_desc: "O AirFlix é construído por amantes da música para amantes da música. Contribua, personalize e ajude-nos a criar o melhor reprodutor para Android e .",
            oss_star: "Star no GitHub",
            oss_version_title: "Última versão estável",
            shots_title: "A Interface",
            shots_subtitle: "Um relance da experiência Material Design 3 do AirFlix.",
            shots_active: "Visão ativa",
            shots_hint: "Deslize ou use os controles para alternar as exibições.",
            support_title: "Precisa de ajuda?",
            support_desc: "Envie uma solicitação ou informe um problema diretamente para a equipe no GitHub.",
            support_btn: "Pedir ajuda",
            downloads_title: "Downloads",
            downloads_subtitle: "Baixe a versão mais recente do AirFlix para sua plataforma.",
            android_card_sub: "Baixe a versão estável mais recente para Android.",
            android_stable_chip: "Versão Estável",
            windows_card_sub: "Baixe o instalador executável para .",
            windows_chip: "Versão ",
            view_changelog: "Ver alterações",
            previous_versions: "Versões anteriores",
            android_download_text: "Baixar APK",
            windows_download_text: "Não Disponível",
            footer_rights: "Todos os direitos reservados.",
            footer_license: "Licenciado sob a Licença de Código Aberto GPL-3.0.",
            android_req: "Requer Android 6.0+",
            windows_req: "",
            lang_dialog_title: "Selecionar idioma"
        },
        hi: {
            nav_features: "विशेषताएं",
            nav_screenshots: "स्क्रीनशॉट",
            nav_downloads: "डाउनलोड",
            nav_download_btn: "डाउनलोड",
            hero_subtitle: "एंड्रॉइड और विंडोज के लिए मैटेरियल डिजाइन 3 के साथ एक उन्नत यूट्यूब म्यूजिक क्लाइंट।",
            hero_download_apk: "APK डाउनलोड करें",
            hero_demo_btn: "डेमो देखें",
            features_title: "विशेषताएं",
            features_subtitle: "उन सभी विशेषताओं की खोज करें जो AirFlix को आपके संगीत के लिए सर्वश्रेष्ठ बनाती हैं।",
            oss_title: "ओपन सोर्स संगीत प्लेयर",
            oss_desc: "AirFlix संगीत प्रेमियों द्वारा संगीत प्रेमियों के लिए बनाया गया है। योगदान दें, अनुकूलित करें और सर्वश्रेष्ठ ओपन-सोर्स प्लेयर बनाने में हमारी मदद करें।",
            oss_star: "GitHub पर स्टार दें",
            oss_version_title: "नवीनतम स्थिर संस्करण",
            shots_title: "इंटरफ़ेस",
            shots_subtitle: "AirFlix अनुभव की एक झलक।",
            shots_active: "सक्रिय दृश्य",
            shots_hint: "दृश्य बदलने के लिए स्वाइप या नियंत्रण का उपयोग करें।",
            support_title: "क्या आपको मदद चाहिए?",
            support_desc: "GitHub पर सीधे विकास टीम को अनुरोध भेजें या समस्या की रिपोर्ट करें।",
            support_btn: "मदद लें",
            downloads_title: "डाउनलोड",
            downloads_subtitle: "अपने ऑपरेटिंग सिस्टम के लिए AirFlix का नवीनतम आधिकारिक संस्करण डाउनलोड करें।",
            android_card_sub: "नवीनतम स्थिर एंड्रॉइड बिल्ड डाउनलोड करें।",
            android_stable_chip: "स्थिर बिल्ड",
            windows_card_sub: "विंडोज निष्पादन योग्य इंस्टॉलर डाउनलोड करें।",
            windows_chip: "विंडोज बिल्ड",
            view_changelog: "बदलाव देखें",
            previous_versions: "पिछले संस्करण",
            android_download_text: "APK डाउनलोड करें",
            windows_download_text: "विंडोज डाउनलोड (.exe)",
            footer_rights: "सर्वाधिकार सुरक्षित।",
            footer_license: "GPL-3.0 ओपन सोर्स लाइसेंस के तहत लाइसेंस प्राप्त।",
            android_req: "एंड्रॉइड 6.0+ आवश्यक",
            windows_req: "विंडोज 10/11 आवश्यक",
            lang_dialog_title: "भाषा चुनें"
        }
    };

    let currentLang = localStorage.getItem('airflix_lang') || 'en';

    function setLanguage(lang) {
        if (!translations[lang]) lang = 'en';
        currentLang = lang;
        localStorage.setItem('airflix_lang', lang);

        const langText = document.getElementById('languageText');
        if (langText) langText.textContent = lang.toUpperCase();

        const dict = translations[lang];

        // Update elements with data-i18n
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) {
                el.textContent = dict[key];
            }
        });

        // Close language dialog if open
        const langDialog = document.getElementById('language-dialog');
        if (langDialog && langDialog.open) langDialog.close();
    }

    // Attach listener to language selection buttons in modal
    document.querySelectorAll('[data-lang]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const lang = btn.getAttribute('data-lang');
            setLanguage(lang);
            showToast(`🌐 Language changed to ${lang.toUpperCase()}`);
        });
    });

    // ═══════════════════════ DOM ELEMENTS & RELEASES ═══════════════════════
    const logo = document.getElementById('logo');
    const downloadToast = document.getElementById('downloadToast');
    const toastMsg = document.getElementById('downloadToastMessage');
    const ossVersionBadge = document.getElementById('oss-version-badge');
    const androidVersionBadge = document.getElementById('android-version-badge');
    const windowsVersionBadge = document.getElementById('windows-version-badge');

    let allReleases = [
        {
            tag_name: "5.9.0",
            name: "AirFlix v5.9.0",
            published_at: "2026-07-20T08:00:00Z",
            body: "### ✨ AirFlix v5.9.0 Release Notes\n- 🎵 **Enhanced Media Streaming Integration**\n- ⚡ Optimización de rendimiento y menor consumo de RAM\n- 🎨 Material Design 3 UI polish and dynamic color updates",
            assets: [
                { name: "AirFlix_v5.9.0_signed.apk", size: 35000000, browser_download_url: "https://github.com/d0x-dev/AirFlix/releases/download/5.9.0/AirFlix_v5.9.0_signed.apk" }
            ]
        },
        {
            tag_name: "V5.8.0",
            name: "AirFlix V5.8.0",
            published_at: "2026-07-10T08:00:00Z",
            body: "### ✨ AirFlix V5.8.0\n- Android Signed APK release v5.8.0",
            assets: [
                { name: "AirFlix_v5.8.0_signed.apk", size: 34800000, browser_download_url: "https://github.com/d0x-dev/AirFlix/releases/download/V5.8.0/AirFlix_v5.8.0_signed.apk" }
            ]
        },
        {
            tag_name: "5.7.0",
            name: "AirFlix v5.7.0",
            published_at: "2026-06-15T08:00:00Z",
            body: "### ✨ AirFlix v5.7.0 Dual Release\n- 💻 ** Desktop Setup & Portable Builds**\n- 📱 **Android Signed APK**",
            assets: [
                { name: "AirFlix-v5.7.0-setup.exe", size: 45000000, browser_download_url: "https://github.com/d0x-dev/AirFlix/releases/download/5.7.0/AirFlix-v5.7.0-setup.exe" },
                { name: "AirFlix-v5.7.0-potable.exe", size: 42000000, browser_download_url: "https://github.com/d0x-dev/AirFlix/releases/download/5.7.0/AirFlix-v5.7.0-potable.exe" },
                { name: "AirFlix_v5.7.0_signed.apk", size: 34000000, browser_download_url: "https://github.com/d0x-dev/AirFlix/releases/download/5.7.0/AirFlix_v5.7.0_signed.apk" }
            ]
        },
        {
            tag_name: "5.6.0",
            name: "AirFlix v5.6.0",
            published_at: "2026-06-01T08:00:00Z",
            body: "### ✨ AirFlix v5.6.0 Dual Release\n- 💻 ** Desktop Executables (.exe)**\n- 📱 **Android Signed APK**",
            assets: [
                { name: "AirFlix-v5.6.0-setup.exe", size: 44000000, browser_download_url: "https://github.com/d0x-dev/AirFlix/releases/download/5.6.0/AirFlix-v5.6.0-setup.exe" },
                { name: "AirFlix-v5.6.0-Potable.exe", size: 41000000, browser_download_url: "https://github.com/d0x-dev/AirFlix/releases/download/5.6.0/AirFlix-v5.6.0-Potable.exe" },
                { name: "AirFlix_v5.6.0_signed.apk", size: 33500000, browser_download_url: "https://github.com/d0x-dev/AirFlix/releases/download/5.6.0/AirFlix_v5.6.0_signed.apk" }
            ]
        }
    ];

    let latestRelease = allReleases[0];

    // 1. Toast Notification Helper
    function showToast(msg) {
        if (!downloadToast || !toastMsg) return;
        toastMsg.textContent = msg;
        downloadToast.classList.add('show');
        setTimeout(() => downloadToast.classList.remove('show'), 3500);
    }

    // 2. Logo Rhythm Audio Player
    let audioPlayer = new Audio('rhythm.mp3');
    let isPlayingAudio = false;

    if (logo) {
        logo.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!isPlayingAudio) {
                audioPlayer.play().then(() => {
                    isPlayingAudio = true;
                    logo.classList.add('playing');
                    showToast('🎵 Reproduciendo sample AirFlix Rhythm...');
                }).catch(err => {
                    console.warn('Audio playback error:', err);
                    showToast('Error al reproducir rhythm.mp3');
                });
            } else {
                audioPlayer.pause();
                isPlayingAudio = false;
                logo.classList.remove('playing');
                showToast('⏸️ Audio pausado');
            }
        });

        audioPlayer.addEventListener('ended', () => {
            isPlayingAudio = false;
            logo.classList.remove('playing');
            showToast('🎵 Fin de la reproducción');
        });
    }

    // 3. GitHub Releases API Fetching
    async function fetchReleases() {
        const repos = [
            "https://api.github.com/repos/d0x-dev/AirFlix/releases",
            "https://api.github.com/repos/d0x-dev/AirFlix/releases"
        ];
        
        for (const url of repos) {
            try {
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        allReleases = data.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
                        latestRelease = allReleases[0];
                        updateVersionBadges();
                        return;
                    }
                }
            } catch (e) {
                console.warn("Failed to fetch GitHub releases from", url, e);
            }
        }
        updateVersionBadges();
    }

    function formatVersionTag(tag) {
        if (!tag) return 'v5.9.0';
        return tag.startsWith('v') || tag.startsWith('V') ? tag : `v${tag}`;
    }

    function updateVersionBadges() {
        if (!latestRelease) return;
        const tag = formatVersionTag(latestRelease.tag_name);

        if (ossVersionBadge) ossVersionBadge.textContent = `${tag} (${translations[currentLang].oss_version_title || 'Última versión'})`;
        if (androidVersionBadge) androidVersionBadge.textContent = tag;

        // Find latest  release
        const winRelease = allReleases.find(r => r.assets && r.assets.some(a => /\.exe$/i.test(a.name)));
        if (windowsVersionBadge && winRelease) {
            windowsVersionBadge.textContent = formatVersionTag(winRelease.tag_name);
            const winDownloadBtn = document.getElementById('windows-download-btn');
            const winExeAsset = winRelease.assets.find(a => /\.exe$/i.test(a.name));
            if (winDownloadBtn && winExeAsset) {
                winDownloadBtn.href = winExeAsset.browser_download_url;
            }
        }
    }

    // 4. Screenshots Section Accordion & Carousel
    const screenshotsHeader = document.getElementById('screenshots-header');
    const screenshotsContent = document.getElementById('screenshots-content');
    const screenshotsIcon = document.getElementById('screenshots-icon');

    if (screenshotsHeader && screenshotsContent) {
        screenshotsHeader.addEventListener('click', () => {
            const isCollapsed = screenshotsContent.style.maxHeight === '0px';
            if (isCollapsed) {
                screenshotsContent.style.maxHeight = '2000px';
                if (screenshotsIcon) screenshotsIcon.classList.add('rotated');
            } else {
                screenshotsContent.style.maxHeight = '0px';
                if (screenshotsIcon) screenshotsIcon.classList.remove('rotated');
            }
        });
    }

    // Screenshots Carousel Logic
    const track = document.getElementById('screenshots-track');
    const slides = document.querySelectorAll('.screenshots-slide');
    const prevBtn = document.getElementById('screenshots-prev');
    const nextBtn = document.getElementById('screenshots-next');
    const titleEl = document.getElementById('screenshots-title');
    const descEl = document.getElementById('screenshots-description');
    const indexEl = document.getElementById('screenshots-current-index');
    const indicatorsEl = document.getElementById('screenshots-indicators');
    const previewCards = document.querySelectorAll('.screenshots-preview-card');

    let currentSlide = 0;
    const totalSlides = slides.length;

    function buildIndicators() {
        if (!indicatorsEl) return;
        indicatorsEl.innerHTML = '';
        for (let i = 0; i < totalSlides; i++) {
            const dot = document.createElement('div');
            dot.className = `screenshots-indicator ${i === currentSlide ? 'is-active' : ''}`;
            dot.addEventListener('click', () => goToSlide(i));
            indicatorsEl.appendChild(dot);
        }
    }

    function goToSlide(index) {
        if (index < 0) index = totalSlides - 1;
        if (index >= totalSlides) index = 0;
        currentSlide = index;

        if (track) {
            track.style.transform = `translateX(-${currentSlide * 100}%)`;
        }

        const activeSlide = slides[currentSlide];
        if (activeSlide) {
            if (titleEl) titleEl.textContent = activeSlide.dataset.title || 'Vista previa';
            if (descEl) descEl.textContent = activeSlide.dataset.description || '';
        }

        if (indexEl) {
            indexEl.textContent = String(currentSlide + 1).padStart(2, '0');
        }

        if (indicatorsEl) {
            const dots = indicatorsEl.querySelectorAll('.screenshots-indicator');
            dots.forEach((dot, idx) => {
                dot.classList.toggle('is-active', idx === currentSlide);
            });
        }

        previewCards.forEach((card, idx) => {
            card.classList.toggle('is-active', idx === currentSlide);
        });
    }

    if (prevBtn) prevBtn.addEventListener('click', () => goToSlide(currentSlide - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goToSlide(currentSlide + 1));

    previewCards.forEach((card, idx) => {
        card.addEventListener('click', () => goToSlide(idx));
    });

    buildIndicators();

    // 5. Changelog Modal Triggers
    const changelogTrigger = document.getElementById('changelog-trigger');
    const windowsChangelogTrigger = document.getElementById('windows-changelog-trigger');
    const changelogDialog = document.getElementById('changelog-dialog');
    const changelogContent = document.getElementById('changelog-content');

    function openChangelogModal(targetRel) {
        if (!changelogDialog || !changelogContent) return;
        changelogDialog.showModal();
        const rel = targetRel || latestRelease;
        if (!rel) return;

        let bodyMarkdown = `### ${rel.name || formatVersionTag(rel.tag_name)} Registro de Cambios\n\n${rel.body || 'Sin detalles de versión.'}`;
        if (window.marked) {
            changelogContent.innerHTML = `<div class="prose prose-invert max-w-none text-on-surface-variant">${window.marked.parse(bodyMarkdown)}</div>`;
        } else {
            changelogContent.innerHTML = `<pre class="text-sm text-on-surface-variant whitespace-pre-wrap">${bodyMarkdown}</pre>`;
        }
    }

    if (changelogTrigger) {
        changelogTrigger.addEventListener('click', () => openChangelogModal(latestRelease));
    }
    if (windowsChangelogTrigger) {
        windowsChangelogTrigger.addEventListener('click', () => {
            const winRel = allReleases.find(r => r.assets && r.assets.some(a => /\.exe$/i.test(a.name)));
            openChangelogModal(winRel || latestRelease);
        });
    }

    // 6. Previous Versions Modal Popup Logic (Android & )
    const versionsTrigger = document.getElementById('versions-trigger');
    const windowsVersionsTrigger = document.getElementById('windows-versions-trigger');
    const versionsDialog = document.getElementById('versions-dialog');
    const versionsList = document.getElementById('versions-list');

    function renderVersionsModal(filterPlatform = 'all') {
        if (!versionsDialog || !versionsList) return;

        const dialogTitle = versionsDialog.querySelector('.dialog-header h3');
        if (dialogTitle) {
            if (filterPlatform === 'windows') {
                dialogTitle.innerHTML = `<span class="flex items-center gap-2"><span class="material-symbols-outlined text-primary">laptop_windows</span> Versiones Anteriores para  (.exe)</span>`;
            } else if (filterPlatform === 'android') {
                dialogTitle.innerHTML = `<span class="flex items-center gap-2"><span class="material-symbols-outlined text-tertiary">android</span> Versiones Anteriores para Android (.apk)</span>`;
            } else {
                dialogTitle.innerHTML = `<span class="flex items-center gap-2"><span class="material-symbols-outlined text-primary">history</span> Versiones Anteriores</span>`;
            }
        }

        let filteredReleases = allReleases;
        if (filterPlatform === 'windows') {
            filteredReleases = allReleases.filter(rel => rel.assets && rel.assets.some(a => /\.exe$/i.test(a.name)));
        } else if (filterPlatform === 'android') {
            filteredReleases = allReleases.filter(rel => rel.assets && rel.assets.some(a => /\.apk$/i.test(a.name)));
        }

        if (!filteredReleases || filteredReleases.length === 0) {
            versionsList.innerHTML = `<p class="text-on-surface-variant text-center py-6">No se encontraron versiones anteriores para ${filterPlatform}.</p>`;
            versionsDialog.showModal();
            return;
        }

        let html = '';
        filteredReleases.forEach(rel => {
            const tag = formatVersionTag(rel.tag_name);
            const pubDate = rel.published_at ? new Date(rel.published_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Reciente';
            const rawNotes = rel.body ? rel.body.split('\n').filter(l => l.trim())[0] || 'Lanzamiento oficial' : 'Lanzamiento oficial';
            const cleanNotes = rawNotes.replace(/[#*`]/g, '').substring(0, 110);

            let downloadableAssets = [];
            if (filterPlatform === 'windows') {
                downloadableAssets = (rel.assets || []).filter(a => a.name && /\.exe$/i.test(a.name));
            } else if (filterPlatform === 'android') {
                downloadableAssets = (rel.assets || []).filter(a => a.name && /\.apk$/i.test(a.name));
            } else {
                downloadableAssets = rel.assets || [];
            }

            let assetButtons = '';
            downloadableAssets.forEach(asset => {
                const size = (asset.size / (1024 * 1024)).toFixed(2);
                const isSetup = /setup/i.test(asset.name);
                const isPortable = /portable|potable/i.test(asset.name);
                const isExe = /\.exe$/i.test(asset.name);

                const label = isExe ? (isSetup ? 'Instalador (.exe)' : isPortable ? 'Portable (.exe)' : 'Ejecutable (.exe)') : 'Descargar APK';
                const icon = isExe ? (isSetup ? 'laptop_windows' : 'inventory_2') : 'android';
                const btnClass = isExe ? 'bg-primary-container text-on-primary-container hover:brightness-110' : 'bg-tertiary-container text-on-tertiary-container hover:brightness-110';

                assetButtons += `
                    <a href="${asset.browser_download_url}" target="_blank" rel="noopener noreferrer" class="${btnClass} px-4 py-2 rounded-full text-xs font-semibold no-underline inline-flex items-center gap-1.5 active:scale-95 transition-all">
                        <span class="material-symbols-outlined" style="font-size:16px">${icon}</span>
                        ${label} (${size} MB)
                    </a>
                `;
            });

            html += `
                <div class="bg-surface-container-high p-5 rounded-2xl mb-4 border border-white/5 shadow-md flex flex-col gap-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="px-3 py-1 rounded-full bg-primary/20 text-primary font-bold text-xs">${tag}</span>
                            <span class="text-xs text-on-surface-variant">${pubDate}</span>
                        </div>
                        <span class="text-xs text-on-surface-variant font-medium">${downloadableAssets.length} archivo(s)</span>
                    </div>
                    <p class="text-xs text-on-surface-variant leading-relaxed">✨ ${cleanNotes}</p>
                    <div class="flex flex-wrap gap-2 pt-3 border-t border-white/5">
                        ${assetButtons}
                    </div>
                </div>
            `;
        });

        versionsList.innerHTML = html;
        versionsDialog.showModal();
    }

    if (versionsTrigger) {
        versionsTrigger.addEventListener('click', () => renderVersionsModal('android'));
    }
    if (windowsVersionsTrigger) {
        windowsVersionsTrigger.addEventListener('click', () => renderVersionsModal('windows'));
    }

    // Apply stored language on initial load
    setLanguage(currentLang);

    fetchReleases();
});

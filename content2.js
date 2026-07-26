let isNormalizationEnabled = true;
let normalizationThreshold = -20; // Default -20 dB
let isAutoMuteAdsEnabled = true;  // Default Auto-Mute Ads ON

// Sync settings from chrome.storage
if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get({ normalizationEnabled: true, normalizationThreshold: -20, autoMuteAdsEnabled: true }, (res) => {
        isNormalizationEnabled = res.normalizationEnabled;
        normalizationThreshold = res.normalizationThreshold;
        isAutoMuteAdsEnabled = res.autoMuteAdsEnabled;
        applyToAllVideos();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local") {
            if (changes.normalizationEnabled !== undefined) {
                isNormalizationEnabled = changes.normalizationEnabled.newValue;
            }
            if (changes.normalizationThreshold !== undefined) {
                normalizationThreshold = changes.normalizationThreshold.newValue;
            }
            if (changes.autoMuteAdsEnabled !== undefined) {
                isAutoMuteAdsEnabled = changes.autoMuteAdsEnabled.newValue;
            }
            applyToAllVideos();
        }
    });
}

// Guaranteed dB Attenuation calculation
function getAttenuationFactor(dbValue) {
    let db = Number(dbValue);
    if (isNaN(db)) db = -20;
    if (db >= 0 || !isNormalizationEnabled) return 1.0;
    const negativeDb = -Math.abs(db);
    return Math.pow(10, negativeDb / 20.0);
}

function isAdPlaying() {
    const player = document.querySelector("#movie_player, .html5-video-player");
    if (player && (player.classList.contains("ad-showing") || player.classList.contains("ad-interrupting"))) {
        return true;
    }
    const adElements = document.querySelector(".ytp-ad-showing, .ytp-ad-player-overlay, .ytp-ad-text, .ytp-ad-preview-text");
    return adElements !== null;
}

function processVideoVolume(video) {
    if (!video) return;

    // Check for YouTube Ad playback
    const adActive = isAdPlaying();

    if (isAutoMuteAdsEnabled && adActive) {
        try {
            video.muted = true;
        } catch (e) {}
        return;
    }

    // Unmute when ad finishes
    if (video.muted && isAutoMuteAdsEnabled && !adActive) {
        try {
            video.muted = false;
        } catch (e) {}
    }

    const factor = getAttenuationFactor(normalizationThreshold);
    const targetVol = Math.max(0.001, Math.min(1.0, factor));

    try {
        video.volume = targetVol;
    } catch (e) {
        console.error("[YT Audio Extension] Error applying volume:", e);
    }
}

function applyToAllVideos() {
    const videos = document.querySelectorAll("video");
    videos.forEach(video => {
        processVideoVolume(video);
    });
}

// Initial application
applyToAllVideos();

// Continuously observe DOM changes for YouTube Shorts & SPA video elements
const observer = new MutationObserver(() => {
    applyToAllVideos();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Fast sync every 200ms
setInterval(applyToAllVideos, 200);
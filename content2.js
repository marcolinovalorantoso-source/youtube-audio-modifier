let isNormalizationEnabled = true;
let normalizationThreshold = -20; // Default -20 dB
let isAutoMuteAdsEnabled = true;

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

// Safely read YouTube's native player API state (#movie_player)
function getNativeYouTubeVolume() {
    try {
        const player = document.getElementById("movie_player") || document.querySelector(".html5-video-player");
        if (player) {
            if (typeof player.isMuted === "function" && player.isMuted()) {
                return { muted: true, volume: 0 };
            }
            if (typeof player.getVolume === "function") {
                const vol = player.getVolume();
                return { muted: vol === 0, volume: vol / 100.0 };
            }
        }
    } catch (e) {}

    return { muted: false, volume: 1.0 };
}

function processVideoVolume(video) {
    if (!video) return;

    const adActive = isAdPlaying();

    // 1. Handle Auto-Mute Ads without overriding manual mutes
    if (isAutoMuteAdsEnabled) {
        if (adActive) {
            if (!video.muted) {
                video.__adMutedByExtension = true;
                video.muted = true;
            }
            return;
        } else if (video.__adMutedByExtension) {
            video.muted = false;
            video.__adMutedByExtension = false;
        }
    }

    // 2. IF EXTENSION MODIFIER IS DISABLED BY USER, RETURN IMMEDIATELY!
    // Leave 100% control of video volume to native YouTube player!
    if (!isNormalizationEnabled) {
        return;
    }

    // 3. Read YouTube's native player state (#movie_player)
    const nativeState = getNativeYouTubeVolume();

    // Respect native mute button & 0 volume
    if (nativeState.muted || video.muted) {
        return;
    }

    const nativeVol = nativeState.volume; // 0.0 to 1.0 directly from YouTube's native slider

    // 4. Calculate final target volume: nativeVol * logarithmic_curve * attenuationFactor
    const logVol = Math.pow(nativeVol, 2.0); // Logarithmic curve for native slider
    const attenuation = getAttenuationFactor(normalizationThreshold);
    const targetVol = Math.max(0, Math.min(1.0, logVol * attenuation));

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
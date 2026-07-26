let isNormalizationEnabled = true;
let normalizationThreshold = -20; // Default -20 dB
let isAutoMuteAdsEnabled = true;
let isUpdating = false;

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
    if (!video || isUpdating) return;

    const adActive = isAdPlaying();

    // 1. Handle Auto-Mute Ads without overriding user manual mutes
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

    // 2. If video is muted by user or YouTube player, RESPECT MUTE!
    if (video.muted) return;

    // 3. Capture YouTube native volume slider requests (0.0 to 1.0)
    if (!video.__isInternalChange) {
        video.__lastUserVolume = video.volume;
    }

    const nativeVol = (video.__lastUserVolume !== undefined) ? video.__lastUserVolume : 1.0;

    // If native volume slider is set to 0, respect it
    if (nativeVol === 0) return;

    // 4. Calculate final target volume: nativeVol * logarithmic_scale * attenuationFactor
    const logVol = Math.pow(nativeVol, 2.0); // Logarithmic curve for native slider
    const attenuation = getAttenuationFactor(normalizationThreshold);
    const targetVol = Math.max(0, Math.min(1.0, logVol * attenuation));

    isUpdating = true;
    video.__isInternalChange = true;
    try {
        video.volume = targetVol;
    } catch (e) {
        console.error("[YT Audio Extension] Error applying volume:", e);
    } finally {
        video.__isInternalChange = false;
        isUpdating = false;
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
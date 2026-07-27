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

function processVideoVolume(video) {
    if (!video) return;

    // 1. Handle Auto-Mute Ads without overriding manual mutes
    const adActive = isAdPlaying();
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

    // 2. If extension volume attenuator is disabled, restore base user volume if needed
    if (!isNormalizationEnabled) {
        if (video.__userBaseVolume !== undefined && video.__extensionApplied) {
            delete video.__extensionApplied;
            try {
                video.volume = video.__userBaseVolume;
            } catch (e) {}
        }
        return;
    }

    // 3. Respect user native mute
    if (video.muted) return;

    // 4. Capture native volume change from YouTube slider
    if (!video.__isInternalVolumeChange) {
        video.__userBaseVolume = video.volume;
    }

    const baseVol = (video.__userBaseVolume !== undefined) ? video.__userBaseVolume : 1.0;
    if (baseVol === 0) return;

    // 5. Calculate final target volume: baseVol * attenuationFactor
    const attenuation = getAttenuationFactor(normalizationThreshold);
    const targetVol = Math.max(0, Math.min(1.0, baseVol * attenuation));

    video.__isInternalVolumeChange = true;
    video.__extensionApplied = true;
    try {
        video.volume = targetVol;
    } catch (e) {
        console.error("[YT Audio Extension] Error applying volume:", e);
    } finally {
        setTimeout(() => {
            video.__isInternalVolumeChange = false;
        }, 50);
    }
}

function attachVideoListeners(video) {
    if (video.__listenersAttached) return;
    video.__listenersAttached = true;

    video.addEventListener("volumechange", () => {
        processVideoVolume(video);
    });

    video.addEventListener("play", () => {
        processVideoVolume(video);
    });

    processVideoVolume(video);
}

function applyToAllVideos() {
    const videos = document.querySelectorAll("video");
    videos.forEach(video => {
        attachVideoListeners(video);
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
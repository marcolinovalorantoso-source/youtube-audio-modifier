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

    // 2. If extension volume attenuator is disabled, restore base user volume
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

    const currentDomVol = video.volume;

    // Initialize base volume if not set
    if (video.__userBaseVolume === undefined) {
        video.__userBaseVolume = currentDomVol > 0 ? currentDomVol : 1.0;
    }

    // 4. Mathematical check: Did user change YouTube's native slider?
    // Compare current DOM volume with the last target volume set by extension.
    // If it matches (within epsilon), it was set by extension -> DO NOT update base volume!
    // If it does NOT match, the user dragged YouTube's native slider -> update base volume!
    const lastTarget = video.__lastTargetVol;
    const isTargetMatch = (lastTarget !== undefined) && (Math.abs(currentDomVol - lastTarget) < 0.001);

    if (!isTargetMatch && currentDomVol > 0) {
        video.__userBaseVolume = currentDomVol;
    }

    const baseVol = video.__userBaseVolume;
    if (baseVol === 0) return;

    // 5. Calculate final target volume: baseVol * attenuationFactor
    const attenuation = getAttenuationFactor(normalizationThreshold);
    const targetVol = Math.max(0.0001, Math.min(1.0, baseVol * attenuation));

    video.__lastTargetVol = targetVol;
    video.__extensionApplied = true;
    try {
        video.volume = targetVol;
    } catch (e) {
        console.error("[YT Audio Extension] Error applying volume:", e);
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
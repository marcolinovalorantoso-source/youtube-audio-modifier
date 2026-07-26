let isNormalizationEnabled = true;
let normalizationThreshold = -20; // Default -20 dB

// Sync settings from chrome.storage
if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get({ normalizationEnabled: true, normalizationThreshold: -20 }, (res) => {
        isNormalizationEnabled = res.normalizationEnabled;
        normalizationThreshold = res.normalizationThreshold;
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

function processVideoVolume(video) {
    if (!video) return;

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
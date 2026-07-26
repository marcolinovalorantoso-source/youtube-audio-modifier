const translations = {
  it: {
    headerTitle: "YouTube Audio Modifier",
    logTitle: "Volume Logaritmico",
    logDesc: "Scala dB naturale attiva",
    badgeActive: "ATTIVO",
    attenuatorTitle: "Attenuatore Volume (dB)",
    attenuatorDesc: "Controlla il volume massimo",
    sliderLabel: "Livello (0dB = Max | -50dB = Basso):"
  },
  en: {
    headerTitle: "YouTube Audio Modifier",
    logTitle: "Logarithmic Volume",
    logDesc: "Natural dB scale active",
    badgeActive: "ACTIVE",
    attenuatorTitle: "Volume Attenuator (dB)",
    attenuatorDesc: "Controls maximum volume",
    sliderLabel: "Level (0dB = Max | -50dB = Low):"
  },
  fr: {
    headerTitle: "Modificateur Audio YouTube",
    logTitle: "Volume Logarithmique",
    logDesc: "Échelle dB naturelle active",
    badgeActive: "ACTIF",
    attenuatorTitle: "Atténuateur de Volume (dB)",
    attenuatorDesc: "Contrôle le volume maximum",
    sliderLabel: "Niveau (0dB = Max | -50dB = Bas) :"
  },
  de: {
    headerTitle: "YouTube Audio-Modifikator",
    logTitle: "Logarithmische Lautstärke",
    logDesc: "Natürliche dB-Skala aktiv",
    badgeActive: "AKTIV",
    attenuatorTitle: "Lautstärke-Dämpfer (dB)",
    attenuatorDesc: "Steuert maximale Lautstärke",
    sliderLabel: "Pegel (0dB = Max | -50dB = Leise):"
  },
  ar: {
    headerTitle: "معدل صوت يوتيوب",
    logTitle: "الصوت اللوجاريتمي",
    logDesc: "مقياس ديسيبل طبيعي نشط",
    badgeActive: "نشط",
    attenuatorTitle: "موهن الصوت (ديسيبل)",
    attenuatorDesc: "التحكم في الحد الأقصى للصوت",
    sliderLabel: "المستوى: 0 ديسيبل إلى -50 ديسيبل:"
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("normalizationToggle");
  const slider = document.getElementById("thresholdSlider");
  const valueDisplay = document.getElementById("thresholdValue");
  const sliderSection = document.getElementById("sliderSection");
  const langSelect = document.getElementById("langSelect");

  const txtHeaderTitle = document.getElementById("txtHeaderTitle");
  const txtLogTitle = document.getElementById("txtLogTitle");
  const txtLogDesc = document.getElementById("txtLogDesc");
  const txtBadgeActive = document.getElementById("txtBadgeActive");
  const txtAttenuatorTitle = document.getElementById("txtAttenuatorTitle");
  const txtAttenuatorDesc = document.getElementById("txtAttenuatorDesc");
  const txtSliderLabel = document.getElementById("txtSliderLabel");

  function applyLanguage(lang) {
    const t = translations[lang] || translations.it;
    
    txtHeaderTitle.textContent = t.headerTitle;
    txtLogTitle.textContent = t.logTitle;
    txtLogDesc.textContent = t.logDesc;
    txtBadgeActive.textContent = t.badgeActive;
    txtAttenuatorTitle.textContent = t.attenuatorTitle;
    txtAttenuatorDesc.textContent = t.attenuatorDesc;
    txtSliderLabel.textContent = t.sliderLabel;

    if (lang === "ar") {
      document.body.setAttribute("dir", "rtl");
    } else {
      document.body.setAttribute("dir", "ltr");
    }
  }

  function updateSliderVisibility(enabled) {
    sliderSection.style.opacity = enabled ? "1" : "0.4";
    sliderSection.style.pointerEvents = enabled ? "auto" : "none";
  }

  // Load saved state from chrome.storage.local
  chrome.storage.local.get({ normalizationEnabled: true, normalizationThreshold: -20, selectedLang: "it" }, (res) => {
    toggle.checked = res.normalizationEnabled;
    slider.value = res.normalizationThreshold;
    valueDisplay.textContent = `${res.normalizationThreshold} dB`;
    langSelect.value = res.selectedLang;

    applyLanguage(res.selectedLang);
    updateSliderVisibility(res.normalizationEnabled);
  });

  // Handle language switch
  langSelect.addEventListener("change", (e) => {
    const selectedLang = e.target.value;
    applyLanguage(selectedLang);
    chrome.storage.local.set({ selectedLang });
  });

  // Handle toggle change
  toggle.addEventListener("change", (e) => {
    const enabled = e.target.checked;
    updateSliderVisibility(enabled);
    chrome.storage.local.set({ normalizationEnabled: enabled });
  });

  // Handle slider input for threshold
  slider.addEventListener("input", (e) => {
    const val = parseInt(e.target.value, 10);
    valueDisplay.textContent = `${val} dB`;
    chrome.storage.local.set({ normalizationThreshold: val });
  });
});
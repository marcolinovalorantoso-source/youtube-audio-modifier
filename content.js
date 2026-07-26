// Wait for the YouTube video player to load
let maxVolume = 1

const waitForPlayer = setInterval(() => {
    const video = document.querySelector("video"); // The video element
    const player = document.querySelector(".ytp-volume-panel"); // The volume slider UI
  
    if (video && player) {
      clearInterval(waitForPlayer);
      console.log("YouTube video and volume slider found!");
	  updateVolume()
  
      // Apply logarithmic volume adjustment
      function setLogarithmicVolume(value) {
        const linearVolume = Math.pow(2, value); // Converts slider value to logarithmic scale
        video.volume = linearVolume; // Set this as video volume
        console.log(`Volume set to: ${linearVolume}`);
        chrome.storage.local.set({linearVolume});

      }
	  
	  function updateVolume() {
        const sliderValue = video.volume; // Linear value (0 to 1)
		const logVolume = (sliderValue/maxVolume - 1)*10;
        setLogarithmicVolume(logVolume);
      }
  
      const observer = new MutationObserver(updateVolume);
      observer.observe(player, { attributes: true, attributeFilter:["aria-valuenow"], childList: false, subtree: false });
    }


  }, 50); 
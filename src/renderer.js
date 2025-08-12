// Renderer process
const detectButton = document.getElementById('detect-displays');
const displayList = document.getElementById('display-list');

let videoConfig = {};

async function populateDisplayList() {
  videoConfig = {}; // Reset config on refresh
  console.log('Configuration reset.');
  const displays = await window.electronAPI.getDisplays();

  // Clear previous list
  displayList.innerHTML = '';

  // Populate list
  displays.forEach((display, index) => {
    const listItem = document.createElement('li');
    listItem.classList.add('display-card');
    listItem.innerHTML = `
      <div class="display-info">
        <strong>Display ${index + 1} (ID: ${display.id})</strong>
        <div class="video-path-container">
          <span class="video-path">No video selected</span>
        </div>
        <span class="display-details">${display.size.width}x${display.size.height} @ ${display.scaleFactor * 100}%</span>
      </div>
      <div class="display-actions">
        <button class="button" data-action="select-video" data-id="${display.id}">Select Video</button>
        <button class="button button-secondary" data-action="identify" data-id="${display.id}">Identify</button>
      </div>
    `;
    displayList.appendChild(listItem);
  });
}

detectButton.addEventListener('click', populateDisplayList);

displayList.addEventListener('click', async (event) => {
  const target = event.target;
  if (target.tagName !== 'BUTTON' || !target.dataset.action) return;

  const action = target.dataset.action;
  const displayId = target.dataset.id;

  if (action === 'identify') {
    window.electronAPI.identifyDisplay(displayId);
  }

  if (action === 'select-video') {
    const filePath = await window.electronAPI.openFile();
    if (filePath) {
      const card = target.closest('.display-card');
      card.querySelector('.video-path').textContent = filePath;
      // Store the configuration
      videoConfig[displayId] = { videoPath: filePath };
      console.log('Updated config:', videoConfig);
    }
  }
});

const startButton = document.getElementById('start-playback');

startButton.addEventListener('click', () => {
  console.log('Starting playback with config:', videoConfig);
  // We should only start if there's at least one video configured
  if (Object.keys(videoConfig).length > 0) {
    window.electronAPI.startPlayback(videoConfig);
  } else {
    console.warn('No videos configured for playback.');
    // In a real app, we might show a user-friendly alert here.
  }
});

// Populate on initial load
populateDisplayList();

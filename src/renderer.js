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

const loadButton = document.getElementById('load-profile');
const saveButton = document.getElementById('save-profile');
const startButton = document.getElementById('start-playback');

function updateUIFromConfig(loadedConfig) {
  videoConfig = loadedConfig;
  console.log('Applying loaded config:', videoConfig);

  const displayCards = document.querySelectorAll('.display-card');
  displayCards.forEach(card => {
    const displayId = card.querySelector('[data-id]').dataset.id;
    const pathElement = card.querySelector('.video-path');

    if (videoConfig[displayId] && videoConfig[displayId].videoPath) {
      pathElement.textContent = videoConfig[displayId].videoPath;
    } else {
      pathElement.textContent = 'No video selected';
    }
  });
}

loadButton.addEventListener('click', async () => {
  const result = await window.electronAPI.loadProfile();
  console.log('Profile load result:', result);
  if (result.success) {
    updateUIFromConfig(result.data);
  }
  // We could show a toast notification for success or failure.
});

saveButton.addEventListener('click', async () => {
  console.log('Saving profile with config:', videoConfig);
  const result = await window.electronAPI.saveProfile(videoConfig);
  console.log('Profile save result:', result);
  // We could show a toast notification to the user here.
});

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

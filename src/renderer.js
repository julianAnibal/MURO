// Renderer process
const detectButton = document.getElementById('detect-displays');
const displayList = document.getElementById('display-list');
const canvasContainer = document.getElementById('canvas-container');

let videoConfig = {};
let currentDisplays = [];
const CM_TO_PX_SCALE = 5; // 1cm = 5px on the canvas

function renderScreensOnCanvas() {
  canvasContainer.innerHTML = ''; // Clear canvas
  if (currentDisplays.length === 0) return;

  currentDisplays.forEach((display, index) => {
    const screenDiv = document.createElement('div');
    screenDiv.className = 'canvas-screen';
    screenDiv.dataset.id = display.id;

    const config = videoConfig[display.id] || {};
    const hasPhysicalSize = config.physicalWidth > 0 && config.physicalHeight > 0;

    // Set size based on physical dimensions, or a default if not available
    if (hasPhysicalSize) {
      screenDiv.style.width = `${config.physicalWidth * CM_TO_PX_SCALE}px`;
      screenDiv.style.height = `${config.physicalHeight * CM_TO_PX_SCALE}px`;
    } else {
      screenDiv.style.width = '150px';
      screenDiv.style.height = '150px';
      screenDiv.classList.add('is-placeholder');
    }

    // Set position from config
    screenDiv.style.left = `${config.x || 0}px`;
    screenDiv.style.top = `${config.y || 0}px`;

    screenDiv.innerHTML = `<span>${index + 1}</span>`;
    canvasContainer.appendChild(screenDiv);
  });
}

async function populateDisplayList() {
  videoConfig = {}; // Reset config on refresh
  console.log('Configuration reset.');

  currentDisplays = await window.electronAPI.getDisplays();

  displayList.innerHTML = '';
  currentDisplays.forEach((display, index) => {
    // Initialize config for this display
    videoConfig[display.id] = {
      x: 0, y: 0,
      physicalWidth: null, physicalHeight: null,
      videoPath: null,
    };

    const listItem = document.createElement('li');
    listItem.classList.add('display-card');
    listItem.innerHTML = `
      <div class="display-info">
        <strong>Display ${index + 1} (ID: ${display.id})</strong>
        <div class="video-path-container">
          <span class="video-path">No video selected</span>
        </div>
        <div class="physical-size-inputs">
          <div class="input-group">
            <label for="width-${display.id}">W (cm)</label>
            <input type="number" id="width-${display.id}" class="input input-size" data-id="${display.id}" data-dimension="width" placeholder="--">
          </div>
          <div class="input-group">
            <label for="height-${display.id}">H (cm)</label>
            <input type="number" id="height-${display.id}" class="input input-size" data-id="${display.id}" data-dimension="height" placeholder="--">
          </div>
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

  renderScreensOnCanvas();
}

detectButton.addEventListener('click', populateDisplayList);

displayList.addEventListener('click', async (event) => {
  if (!event.target.matches('button[data-action]')) return;

  const target = event.target;
  const action = target.dataset.action;
  const displayId = target.dataset.id;

  if (action === 'identify') {
    window.electronAPI.identifyDisplay(displayId);
  }

  if (action === 'select-video') {
    const filePath = await window.electronAPI.openFile();
    if (filePath) {
      target.closest('.display-card').querySelector('.video-path').textContent = filePath;
      if (!videoConfig[displayId]) videoConfig[displayId] = {};
      videoConfig[displayId].videoPath = filePath;
      console.log('Updated config:', videoConfig);
    }
  }
});

displayList.addEventListener('input', (event) => {
  if (!event.target.matches('input.input-size')) return;

  const target = event.target;
  const displayId = target.dataset.id;
  const dimension = target.dataset.dimension;
  const value = target.value === '' ? null : parseFloat(target.value);

  if (dimension === 'width') {
    if (!videoConfig[displayId]) videoConfig[displayId] = {};
    videoConfig[displayId].physicalWidth = value;
  } else if (dimension === 'height') {
    if (!videoConfig[displayId]) videoConfig[displayId] = {};
    videoConfig[displayId].physicalHeight = value;
  }

  renderScreensOnCanvas(); // Redraw canvas on size change
  console.log('Updated config:', videoConfig);
});

const loadButton = document.getElementById('load-profile');
const saveButton = document.getElementById('save-profile');
const startButton = document.getElementById('start-playback');

function updateUIFromConfig(loadedConfig) {
  videoConfig = loadedConfig;
  console.log('Applying loaded config:', videoConfig);

  document.querySelectorAll('.display-card').forEach(card => {
    const displayId = card.querySelector('[data-id]').dataset.id;
    const config = videoConfig[displayId] || {};

    card.querySelector('.video-path').textContent = config.videoPath || 'No video selected';
    card.querySelector('[data-dimension="width"]').value = config.physicalWidth || '';
    card.querySelector('[data-dimension="height"]').value = config.physicalHeight || '';
  });

  // Re-render the canvas with the new sizes and positions
  renderScreensOnCanvas();
}

loadButton.addEventListener('click', async () => {
  const result = await window.electronAPI.loadProfile();
  console.log('Profile load result:', result);
  if (result.success) {
    updateUIFromConfig(result.data);
  }
});

saveButton.addEventListener('click', async () => {
  console.log('Saving profile with config:', videoConfig);
  const result = await window.electronAPI.saveProfile(videoConfig);
  console.log('Profile save result:', result);
});

startButton.addEventListener('click', () => {
  console.log('Starting playback with config:', videoConfig);
  if (Object.keys(videoConfig).length > 0) {
    window.electronAPI.startPlayback(videoConfig);
  } else {
    console.warn('No videos configured for playback.');
  }
});

// --- Drag and Drop Logic for Canvas Screens ---
let activeDrag = null;
let initialX, initialY, xOffset, yOffset;

canvasContainer.addEventListener('mousedown', (e) => {
  const target = e.target.closest('.canvas-screen');
  if (target) {
    activeDrag = target;
    activeDrag.classList.add('is-dragging');
    initialX = e.clientX;
    initialY = e.clientY;
    xOffset = activeDrag.offsetLeft;
    yOffset = activeDrag.offsetTop;
    document.addEventListener('mousemove', dragElement);
    document.addEventListener('mouseup', dropElement);
  }
});

function dragElement(e) {
  if (activeDrag) {
    e.preventDefault();
    const dx = e.clientX - initialX;
    const dy = e.clientY - initialY;
    activeDrag.style.left = `${xOffset + dx}px`;
    activeDrag.style.top = `${yOffset + dy}px`;
  }
}

function dropElement() {
  if (activeDrag) {
    activeDrag.classList.remove('is-dragging');
    const displayId = activeDrag.dataset.id;
    const newX = activeDrag.offsetLeft;
    const newY = activeDrag.offsetTop;

    if (videoConfig[displayId]) {
      videoConfig[displayId].x = newX;
      videoConfig[displayId].y = newY;
      console.log(`Updated config for ${displayId}:`, videoConfig[displayId]);
    }

    document.removeEventListener('mousemove', dragElement);
    document.removeEventListener('mouseup', dropElement);
    activeDrag = null;
  }
}

// Populate on initial load
populateDisplayList();

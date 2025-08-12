// Renderer process
const detectButton = document.getElementById('detect-displays');
const displayList = document.getElementById('display-list');
const canvasContainer = document.getElementById('canvas-container');

let videoConfig = {};

function renderScreensOnCanvas(displays) {
  canvasContainer.innerHTML = ''; // Clear canvas
  if (displays.length === 0) return;

  // 1. Find the total bounding box of all displays
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  displays.forEach(d => {
    minX = Math.min(minX, d.bounds.x);
    minY = Math.min(minY, d.bounds.y);
    maxX = Math.max(maxX, d.bounds.x + d.bounds.width);
    maxY = Math.max(maxY, d.bounds.y + d.bounds.height);
  });
  const totalWidth = maxX - minX;
  const totalHeight = maxY - minY;

  // 2. Determine the scaling factor to fit into the canvas
  const canvasBounds = canvasContainer.getBoundingClientRect();
  const padding = 32; // 16px on each side
  const availableWidth = canvasBounds.width - padding;
  const availableHeight = canvasBounds.height - padding;
  const scale = Math.min(availableWidth / totalWidth, availableHeight / totalHeight);

  // 3. Render each display and initialize its config
  displays.forEach((display, index) => {
    const screenDiv = document.createElement('div');
    screenDiv.className = 'canvas-screen';
    screenDiv.dataset.id = display.id;

    const newLeft = (display.bounds.x - minX) * scale + (padding / 2);
    const newTop = (display.bounds.y - minY) * scale + (padding / 2);

    screenDiv.style.width = `${display.bounds.width * scale}px`;
    screenDiv.style.height = `${display.bounds.height * scale}px`;
    screenDiv.style.left = `${newLeft}px`;
    screenDiv.style.top = `${newTop}px`;
    screenDiv.innerHTML = `<span>${index + 1}</span>`;

    canvasContainer.appendChild(screenDiv);

    // Initialize config for this display, preserving videoPath if it exists
    videoConfig[display.id] = {
      ...videoConfig[display.id],
      x: newLeft,
      y: newTop,
    };
  });
}

async function populateDisplayList() {
  videoConfig = {}; // Reset config on refresh
  console.log('Configuration reset.');
  const displays = await window.electronAPI.getDisplays();

  displayList.innerHTML = '';
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

  renderScreensOnCanvas(displays);
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
      if (!videoConfig[displayId]) videoConfig[displayId] = {};
      videoConfig[displayId].videoPath = filePath;
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

  document.querySelectorAll('.display-card').forEach(card => {
    const displayId = card.querySelector('[data-id]').dataset.id;
    const pathElement = card.querySelector('.video-path');
    pathElement.textContent = (videoConfig[displayId] && videoConfig[displayId].videoPath)
      ? videoConfig[displayId].videoPath
      : 'No video selected';
  });

  document.querySelectorAll('.canvas-screen').forEach(screenDiv => {
    const displayId = screenDiv.dataset.id;
    if (videoConfig[displayId] && videoConfig[displayId].x !== undefined) {
      screenDiv.style.left = `${videoConfig[displayId].x}px`;
      screenDiv.style.top = `${videoConfig[displayId].y}px`;
    }
  });
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

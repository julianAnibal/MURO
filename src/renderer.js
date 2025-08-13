// Renderer process
const detectButton = document.getElementById('detect-displays');
const displayList = document.getElementById('display-list');
const canvasContainer = document.getElementById('canvas-container');

let videoConfig = { masterVideoPath: null, masterVideoScale: 1 };
let currentDisplays = [];
const CM_TO_PX_SCALE = 5; // 1cm = 5px on the canvas

function renderScreensOnCanvas() {
  canvasContainer.innerHTML = ''; // Clear canvas

  // Add background canvas if there's a video
  if (masterVideoElement) {
      const bgCanvas = document.createElement('canvas');
      bgCanvas.id = 'background-preview-canvas';
      bgCanvas.style.position = 'absolute';
      bgCanvas.style.top = '0';
      bgCanvas.style.left = '0';
      bgCanvas.style.width = '100%';
      bgCanvas.style.height = '100%';
      bgCanvas.style.zIndex = '-1';
      canvasContainer.appendChild(bgCanvas);
  }

  if (currentDisplays.length === 0) return;

  currentDisplays.forEach((display, index) => {
    const screenDiv = document.createElement('div');
    screenDiv.className = 'canvas-screen';
    screenDiv.dataset.id = display.id;

    const config = videoConfig[display.id] || {};
    const hasPhysicalSize = config.physicalWidth > 0 && config.physicalHeight > 0;

    let screenWidth, screenHeight;
    if (hasPhysicalSize) {
      screenWidth = config.physicalWidth * CM_TO_PX_SCALE;
      screenHeight = config.physicalHeight * CM_TO_PX_SCALE;
    } else {
      screenWidth = 150;
      screenHeight = 150;
      screenDiv.classList.add('is-placeholder');
    }
    
    screenDiv.style.width = `${screenWidth}px`;
    screenDiv.style.height = `${screenHeight}px`;
    screenDiv.style.left = `${config.x || 0}px`;
    screenDiv.style.top = `${config.y || 0}px`;

    // Add canvas for preview
    const previewCanvas = document.createElement('canvas');
    previewCanvas.className = 'screen-preview-canvas';
    previewCanvas.width = screenWidth;
    previewCanvas.height = screenHeight;
    screenDiv.appendChild(previewCanvas);
    
    const numberSpan = document.createElement('span');
    numberSpan.textContent = index + 1;
    screenDiv.appendChild(numberSpan);

    canvasContainer.appendChild(screenDiv);
  });
}

async function populateDisplayList() {
  const masterPath = videoConfig.masterVideoPath;
  const masterScale = videoConfig.masterVideoScale || 1;
  videoConfig = { masterVideoPath: masterPath, masterVideoScale: masterScale }; // Reset config on refresh
  console.log('Configuration reset.');

  currentDisplays = await window.electronAPI.getDisplays();

  displayList.innerHTML = '';
  currentDisplays.forEach((display, index) => {
    // Initialize config for this display
    videoConfig[display.id] = {
      x: 0, y: 0,
      physicalWidth: null, physicalHeight: null,
      diagonal: null,
    };

    const listItem = document.createElement('li');
    listItem.classList.add('display-card');
    listItem.innerHTML = `
      <div class="display-info">
        <strong>Display ${index + 1} (ID: ${display.id})</strong>
        <div class="physical-size-inputs">
          <div class="input-group">
            <label for="diagonal-${display.id}">Diagonal (in)</label>
            <input type="number" id="diagonal-${display.id}" class="input input-size" data-id="${display.id}" data-dimension="diagonal" placeholder="--">
          </div>
        </div>
        <span class="display-details">${display.size.width}x${display.size.height} @ ${display.scaleFactor * 100}%</span>
      </div>
      <div class="display-actions">
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

  
});

displayList.addEventListener('input', (event) => {
  if (!event.target.matches('input.input-size')) return;

  const target = event.target;
  const displayId = target.dataset.id;
  const dimension = target.dataset.dimension;
  const diagonalInches = target.value === '' ? null : parseFloat(target.value);

  if (dimension === 'diagonal') {
    if (!videoConfig[displayId]) videoConfig[displayId] = {};
    videoConfig[displayId].diagonal = diagonalInches;

    if (diagonalInches > 0) {
      const display = currentDisplays.find(d => d.id == displayId);
      const aspectRatio = display.size.width / display.size.height;
      const heightInches = diagonalInches / Math.sqrt(aspectRatio * aspectRatio + 1);
      const widthInches = aspectRatio * heightInches;
      
      const INCH_TO_CM = 2.54;
      videoConfig[displayId].physicalWidth = widthInches * INCH_TO_CM;
      videoConfig[displayId].physicalHeight = heightInches * INCH_TO_CM;
    } else {
      videoConfig[displayId].physicalWidth = null;
      videoConfig[displayId].physicalHeight = null;
    }
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

    
    
    // Recalculate diagonal for display, or use stored value.
    let diagonal = config.diagonal;
    if (!diagonal && config.physicalWidth && config.physicalHeight) {
        const CM_TO_INCH = 1 / 2.54;
        const widthInches = config.physicalWidth * CM_TO_INCH;
        const heightInches = config.physicalHeight * CM_TO_INCH;
        diagonal = Math.sqrt(widthInches * widthInches + heightInches * heightInches);
    }

    const diagonalInput = card.querySelector('[data-dimension="diagonal"]');
    if (diagonalInput) {
        diagonalInput.value = diagonal ? diagonal.toFixed(1) : '';
    }
  });

  // Re-render the canvas with the new sizes and positions
  renderScreensOnCanvas();
}

loadButton.addEventListener('click', async () => {
  const result = await window.electronAPI.loadProfile();
  console.log('Profile load result:', result);
  if (result.success) {
    updateUIFromConfig(result.data);
    if (videoConfig.masterVideoPath) {
      setupCanvasVideo();
    }
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

const selectCanvasVideoButton = document.getElementById('select-canvas-video');

let masterVideoElement = null;
let animationFrameId = null;

function setupCanvasVideo() {
  if (!videoConfig.masterVideoPath) {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (masterVideoElement) {
      masterVideoElement.remove();
      masterVideoElement = null;
    }
    // Re-render to clear the preview canvases
    renderScreensOnCanvas();
    return;
  }

  if (!masterVideoElement) {
    masterVideoElement = document.createElement('video');
    masterVideoElement.style.display = 'none'; // It's a hidden source
    masterVideoElement.autoplay = true;
    masterVideoElement.loop = true;
    masterVideoElement.muted = true;
    document.body.appendChild(masterVideoElement);

    masterVideoElement.addEventListener('play', () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(updatePreviewFrames);
    });
  }

  masterVideoElement.src = 'file://' + videoConfig.masterVideoPath;
}

function updatePreviewFrames() {
  if (!masterVideoElement || masterVideoElement.paused || masterVideoElement.ended || masterVideoElement.videoWidth === 0) {
    animationFrameId = null;
    return; // Stop the loop if video isn't playing or metadata isn't loaded
  }

  const containerWidth = canvasContainer.offsetWidth;
  const containerHeight = canvasContainer.offsetHeight;
  const videoWidth = masterVideoElement.videoWidth;
  const videoHeight = masterVideoElement.videoHeight;
  const masterVideoScale = videoConfig.masterVideoScale || 1; // Get scale from config

  // Calculate scaled video dimensions
  const scaledVideoWidth = containerWidth * masterVideoScale;
  const scaledVideoHeight = containerHeight * masterVideoScale;

  // Calculate offset to center the scaled video
  const offsetX = (containerWidth - scaledVideoWidth) / 2;
  const offsetY = (containerHeight - scaledVideoHeight) / 2;

  // Draw to background canvas
  const bgCanvas = document.getElementById('background-preview-canvas');
  if (bgCanvas) {
      bgCanvas.width = containerWidth;
      bgCanvas.height = containerHeight;
      const bgCtx = bgCanvas.getContext('2d');
      bgCtx.clearRect(0, 0, containerWidth, containerHeight); // Clear before drawing
      bgCtx.drawImage(masterVideoElement, offsetX, offsetY, scaledVideoWidth, scaledVideoHeight);
  }

  // Calculate scale factors from video's native resolution to its rendered size on canvas
  const scaleX = videoWidth / scaledVideoWidth;
  const scaleY = videoHeight / scaledVideoHeight;

  document.querySelectorAll('.screen-preview-canvas').forEach(canvas => {
    const screenDiv = canvas.parentElement;
    const ctx = canvas.getContext('2d');

    // Position of the screen div relative to the container
    const sourceX = screenDiv.offsetLeft;
    const sourceY = screenDiv.offsetTop;
    
    // We use the canvas dimensions as the size of the slice, as it matches the div
    const sourceWidth = canvas.width;
    const sourceHeight = canvas.height;

    // Calculate the source rectangle in the video's native resolution, adjusted for offset
    const sx = (sourceX - offsetX) * scaleX;
    const sy = (sourceY - offsetY) * scaleY;
    const sWidth = sourceWidth * scaleX;
    const sHeight = sourceHeight * scaleY;

    // Clear canvas and draw the slice from the video
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (sWidth > 0 && sHeight > 0) {
        ctx.drawImage(masterVideoElement, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
    }
  });

  animationFrameId = requestAnimationFrame(updatePreviewFrames);
}

selectCanvasVideoButton.addEventListener('click', async () => {
  const filePath = await window.electronAPI.openFile();
  if (filePath) {
    videoConfig.masterVideoPath = filePath;
    setupCanvasVideo();
  }
});

const videoScaleSlider = document.getElementById('video-scale-slider');

videoScaleSlider.addEventListener('input', (event) => {
  videoConfig.masterVideoScale = parseFloat(event.target.value);
  // No need to call renderScreensOnCanvas here, updatePreviewFrames will handle it
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

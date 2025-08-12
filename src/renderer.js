// Renderer process
const detectButton = document.getElementById('detect-displays');
const displayList = document.getElementById('display-list');

async function populateDisplayList() {
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
        <span>${display.size.width}x${display.size.height} @ ${display.scaleFactor * 100}%</span>
        <span>Bounds: ${display.bounds.x}, ${display.bounds.y}</span>
        <span>Work Area: ${display.workArea.width}x${display.workArea.height}</span>
      </div>
      <button class="button" data-id="${display.id}">Identify</button>
    `;
    displayList.appendChild(listItem);
  });
}

detectButton.addEventListener('click', populateDisplayList);

displayList.addEventListener('click', (event) => {
  const target = event.target;
  if (target.tagName === 'BUTTON' && target.dataset.id) {
    const displayId = target.dataset.id;
    window.electronAPI.identifyDisplay(displayId);
  }
});

// Populate on initial load
populateDisplayList();

// Main process
const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

function handleGetDisplays() {
  return screen.getAllDisplays();
}

async function handleIdentifyDisplay(event, displayId) {
  const displays = screen.getAllDisplays();
  // The displayId from renderer comes as a string, but electron may use numbers.
  // It's safer to compare with ==
  const display = displays.find(d => d.id == displayId);

  if (!display) {
    console.error('Could not find display with id:', displayId);
    return false;
  }

  // Find the display index (1-based) to show a user-friendly number.
  const displayIndex = displays.findIndex(d => d.id == displayId) + 1;

  const identifyWindow = new BrowserWindow({
    x: display.bounds.x + (display.bounds.width / 2) - 150, // Center it
    y: display.bounds.y + (display.bounds.height / 2) - 100, // Center it
    width: 300,
    height: 200,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    focusable: false,
    skipTaskbar: true,
  });

  const identifyFile = path.join(__dirname, 'identify.html');
  identifyWindow.loadFile(identifyFile, { query: { number: displayIndex } });

  setTimeout(() => {
    if (identifyWindow && !identifyWindow.isDestroyed()) {
      identifyWindow.close();
    }
  }, 3000); // Close after 3 seconds

  return true;
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile('src/index.html');
};

app.whenReady().then(() => {
  ipcMain.handle('displays:get', handleGetDisplays);
  ipcMain.handle('display:identify', handleIdentifyDisplay);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

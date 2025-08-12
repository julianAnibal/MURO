// Main process
const { app, BrowserWindow, screen, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let playerWindows = [];

function handleGetDisplays() {
  return screen.getAllDisplays();
}

async function handleFileOpen() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Videos', extensions: ['mp4', 'mov', 'webm', 'mkv'] }
    ]
  });
  if (canceled || filePaths.length === 0) {
    return null;
  }
  return filePaths[0];
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

async function handleStartPlayback(event, config) {
  const displays = screen.getAllDisplays();

  // Close any existing player windows before starting new ones
  playerWindows.forEach(win => win.close());
  playerWindows = [];

  for (const displayId in config) {
    const displayConfig = config[displayId];
    const display = displays.find(d => d.id == displayId);

    if (!display) {
      console.warn(`Could not find display with id ${displayId} for playback.`);
      continue;
    }

    const playerWindow = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      fullscreen: true,
      frame: false,
      autoHideMenuBar: true,
      skipTaskbar: true,
      webPreferences: {
        // In a future step, a specific preload script for the player might be needed
        // for custom controls, but for now, we can play video without it.
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    const playerFile = path.join(__dirname, 'player.html');
    playerWindow.loadFile(playerFile, {
      query: { videoPath: encodeURIComponent(displayConfig.videoPath) }
    });

    playerWindow.on('closed', () => {
      playerWindows = playerWindows.filter(win => !win.isDestroyed() && win !== playerWindow);
    });

    playerWindows.push(playerWindow);
  }
}

async function handleProfileSave(event, config) {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save Profile',
    defaultPath: 'my-profile.json',
    filters: [
      { name: 'JSON Files', extensions: ['json'] }
    ]
  });

  if (canceled || !filePath) {
    return { success: false, message: 'Save was canceled.' };
  }

  try {
    const jsonContent = JSON.stringify(config, null, 2); // Pretty-print JSON
    fs.writeFileSync(filePath, jsonContent, 'utf-8');
    return { success: true, message: 'Profile saved successfully.' };
  } catch (error) {
    console.error('Failed to save profile:', error);
    return { success: false, message: `Failed to save profile: ${error.message}` };
  }
}

async function handleProfileLoad() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Load Profile',
    properties: ['openFile'],
    filters: [
      { name: 'JSON Files', extensions: ['json'] }
    ]
  });

  if (canceled || filePaths.length === 0) {
    return { success: false, message: 'Load was canceled.' };
  }

  const filePath = filePaths[0];

  try {
    const jsonContent = fs.readFileSync(filePath, 'utf-8');
    const config = JSON.parse(jsonContent);
    return { success: true, data: config };
  } catch (error) {
    console.error('Failed to load profile:', error);
    return { success: false, message: `Failed to load profile: ${error.message}` };
  }
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
  ipcMain.handle('dialog:openFile', handleFileOpen);
  ipcMain.handle('playback:start', handleStartPlayback);
  ipcMain.handle('profile:save', handleProfileSave);
  ipcMain.handle('profile:load', handleProfileLoad);
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

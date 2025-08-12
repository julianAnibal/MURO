// Preload script
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getDisplays: () => ipcRenderer.invoke('displays:get'),
  identifyDisplay: (id) => ipcRenderer.invoke('display:identify', id),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  startPlayback: (config) => ipcRenderer.invoke('playback:start', config),
});

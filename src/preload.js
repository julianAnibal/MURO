// Preload script
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getDisplays: () => ipcRenderer.invoke('displays:get'),
  identifyDisplay: (id) => ipcRenderer.invoke('display:identify', id),
});

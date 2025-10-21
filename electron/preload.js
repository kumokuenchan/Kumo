const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),

  // Window controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // File system operations (for import/export)
  selectFile: (options) => ipcRenderer.invoke('file:select', options),
  saveFile: (options) => ipcRenderer.invoke('file:save', options),
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('file:write', filePath, data),

  // Credential storage (OS keychain)
  storeCredentials: (connectionId, credentials) =>
    ipcRenderer.invoke('credentials:store', connectionId, credentials),
  getCredentials: (connectionId) =>
    ipcRenderer.invoke('credentials:get', connectionId),
  deleteCredentials: (connectionId) =>
    ipcRenderer.invoke('credentials:delete', connectionId),
});

// Expose a flag indicating we're in Electron
contextBridge.exposeInMainWorld('isElectron', true);

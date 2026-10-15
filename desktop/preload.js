'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  getLogInfo: () => ipcRenderer.invoke('log-info'),
  readLatest: () => ipcRenderer.invoke('read-latest'),
  setWatch: on => ipcRenderer.invoke('set-watch', on),
  chooseLog: () => ipcRenderer.invoke('choose-log'),
  saveFile: (name, data) => ipcRenderer.invoke('save-file', name, data),
  checkUpdate: () => ipcRenderer.invoke('check-update'),
  onExport: cb => ipcRenderer.on('export', (_e, text) => cb(text)),
});

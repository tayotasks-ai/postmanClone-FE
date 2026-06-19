'use strict'
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronBridge', {
  sendRequest: (opts) => ipcRenderer.invoke('relay:http-request', opts),
  isElectron: true,
})

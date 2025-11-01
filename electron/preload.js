const { contextBridge, ipcRenderer } = require('electron')

// const ipcHandlers = require("./ipcHandlers");

// console.log("Available IPC handlers:", Object.keys(ipcHandlers));

// // Dynamically build API based on handler function names
// const exposedAPI = {};
// for (const name of Object.keys(ipcHandlers)) {
//   exposedAPI[name] = (...args) => {
//     console.log(`Calling IPC handler: ${name} with args:`, args);
//     return ipcRenderer.invoke(name, ...args);
//   };
// }

// console.log("Exposing API with methods:", Object.keys(exposedAPI));

// 添加錯誤處理函數
const safeInvoke = async (channel, ...args) => {
  try {
    return await ipcRenderer.invoke(channel, ...args)
  } catch (error) {
    console.error(`IPC Error in channel ${channel}:`, error)
    // 檢查是否是 runtime.lastError 相關的錯誤
    if (error.message && error.message.includes('Could not establish connection')) {
      console.warn('Detected runtime.lastError - this is usually caused by browser extensions')
    }
    throw error
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  openBrowserUrl: (url) => safeInvoke('open-browser-url', url),

  publishPost: (...args) => {
    return safeInvoke('publishPost', ...args)
  },
  // Add new file picker methods
  pickImage: () => safeInvoke('pick-image'),
  pickVideo: () => safeInvoke('pick-video'),
  // Add ComfyUI installation methods
  installComfyUI: () => safeInvoke('install-comfyui'),
  uninstallComfyUI: () => safeInvoke('uninstall-comfyui'),
  cancelComfyUIInstall: () => safeInvoke('cancel-comfyui-install'),
  checkComfyUIInstalled: () => safeInvoke('check-comfyui-installed'),
  // Add ComfyUI process management methods
  startComfyUIProcess: () => safeInvoke('start-comfyui-process'),
  stopComfyUIProcess: () => safeInvoke('stop-comfyui-process'),
  getComfyUIProcessStatus: () => safeInvoke('get-comfyui-process-status'),
  // Add auto-updater methods
  checkForUpdates: () => safeInvoke('check-for-updates'),
  restartAndInstall: () => safeInvoke('restart-and-install'),
  // Listen for update events
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (event, info) => callback(info))
  },
  removeUpdateDownloadedListener: () => {
    ipcRenderer.removeAllListeners('update-downloaded')
  },
})

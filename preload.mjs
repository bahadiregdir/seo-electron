const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // SERP Tracker
  runScraper: (data) => ipcRenderer.invoke('run-scraper', data),
  getHistory: () => ipcRenderer.invoke('get-history'),
  getScanResults: (scanId) => ipcRenderer.invoke('get-scan-results', scanId),
  deleteScan: (scanId) => ipcRenderer.invoke('delete-scan', scanId),

  // Keyword Explorer
  runKeywordExplorer: (data) => ipcRenderer.invoke('run-keyword-explorer', data),
  getExplorerHistory: () => ipcRenderer.invoke('get-explorer-history'),

  // PAA Miner
  runPAAMiner: (data) => ipcRenderer.invoke('run-paa-miner', data),
  getPAAHistory: () => ipcRenderer.invoke('get-paa-history'),

  // Site Auditor
  runSiteAuditor: (data) => ipcRenderer.invoke('run-site-auditor', data),
  getAuditHistory: () => ipcRenderer.invoke('get-audit-history'),

  // Updates
  onUpdateAvailable: (callback) => ipcRenderer.on('update_available', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update_downloaded', callback),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install')
});

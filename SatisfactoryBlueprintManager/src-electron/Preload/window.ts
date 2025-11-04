import { contextBridge, ipcRenderer } from 'electron'
import type { WindowControlAction } from '../Types/window'

/**
 * 暴露窗口控制 API
 */
export const exposeWindowAPI = (): void => {
  contextBridge.exposeInMainWorld('electronAPI', {
    windowControl: (action: WindowControlAction) =>
      ipcRenderer.invoke('window-control', action),
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
      ipcRenderer.on('window-maximize-change', (_, isMaximized: boolean) => {
        callback(isMaximized)
      })
    },
  })
}


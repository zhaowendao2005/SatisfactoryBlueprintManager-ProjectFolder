/**
 * 叠加窗口预加载脚本
 */
import { contextBridge, ipcRenderer } from 'electron'

/**
 * 叠加窗口 API
 */
interface OverlayAPI {
  /**
   * 设置截图数据
   */
  setScreenshot: (dataURL: string) => void

  /**
   * 监听点击事件
   */
  onClick: (callback: (x: number, y: number) => void) => void

  /**
   * 监听取消事件
   */
  onCancel: (callback: () => void) => void
}

// 存储回调函数
let clickCallback: ((x: number, y: number) => void) | null = null
let cancelCallback: (() => void) | null = null

const overlayAPI: OverlayAPI = {
  setScreenshot: (dataURL: string) => {
    const img = document.getElementById('screenshot') as HTMLImageElement
    if (img) {
      img.src = dataURL
    }
  },

  onClick: (callback: (x: number, y: number) => void) => {
    clickCallback = callback
    // 在 DOM 加载完成后注册点击监听
    document.addEventListener('click', (event: MouseEvent) => {
      if (clickCallback) {
        clickCallback(event.clientX, event.clientY)
        // 发送到主进程
        ipcRenderer.send('calibration:click', event.clientX, event.clientY)
      }
    })
  },

  onCancel: (callback: () => void) => {
    cancelCallback = callback
    // 注册 ESC 键监听
    document.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Escape' && cancelCallback) {
        cancelCallback()
        // 发送到主进程
        ipcRenderer.send('calibration:cancel')
      }
    })
  }
}

// 暴露 API 到渲染进程
contextBridge.exposeInMainWorld('overlayAPI', overlayAPI)

// 监听主进程发送的截图数据
ipcRenderer.on('set-screenshot', (_event, dataURL: string) => {
  overlayAPI.setScreenshot(dataURL)
})


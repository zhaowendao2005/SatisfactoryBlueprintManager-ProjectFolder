/**
 * 窗口控制操作类型
 */
export type WindowControlAction = 'minimize' | 'maximize' | 'unmaximize' | 'close'

/**
 * Electron IPC 窗口控制 API（preload 暴露）
 * @注意事项 仅在 Electron 环境可用，浏览器环境返回 undefined
 */
export interface ElectronWindowAPI {
  /** 执行窗口控制操作 */
  windowControl: (action: WindowControlAction) => Promise<void>
  /** 监听窗口最大化状态变化 */
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => void
}

declare global {
  interface Window {
    electronAPI?: ElectronWindowAPI
  }
}


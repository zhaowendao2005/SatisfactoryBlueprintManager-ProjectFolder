import { ipcMain, BrowserWindow } from 'electron'
import type { WindowControlAction } from '../Types/window'
import { WindowService } from '../Service/Window'

/**
 * 窗口控制 IPC 处理器
 */
export class WindowHandler {
  /**
   * 注册窗口控制 IPC 处理器
   */
  static register(win: BrowserWindow): void {
    // 处理窗口控制请求
    ipcMain.handle('window-control', (event, action: WindowControlAction) => {
      const targetWin = BrowserWindow.fromWebContents(event.sender)
      if (!targetWin) return

      switch (action) {
        case 'minimize':
          WindowService.minimize(targetWin)
          break
        case 'maximize':
        case 'unmaximize':
          WindowService.toggleMaximize(targetWin)
          break
        case 'close':
          WindowService.close(targetWin)
          break
      }
    })

    // 监听窗口状态变化并通知渲染进程
    win.on('maximize', () => {
      win.webContents.send('window-maximize-change', true)
    })

    win.on('unmaximize', () => {
      win.webContents.send('window-maximize-change', false)
    })
  }
}


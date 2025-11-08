/**
 * 通用设置 IPC 处理器
 */
import { ipcMain, dialog, BrowserWindow } from 'electron'
import { generalSettingsFileService } from '../Service/GeneralSettings/file-service'
import { trayService } from '../Service/Tray/TrayService'
import { shortcutService } from '../Service/Shortcut/ShortcutService'
import { quickAccessWindowService } from '../Service/QuickAccess/QuickAccessWindowService'
import type { GeneralSettingsConfig } from '../../public/types/general-settings'

const IPC_CHANNEL_LOAD_SETTINGS = 'general-settings:load'
const IPC_CHANNEL_SAVE_SETTINGS = 'general-settings:save'
const IPC_CHANNEL_SHOW_WINDOW = 'general-settings:show-window'
const IPC_CHANNEL_HIDE_WINDOW = 'general-settings:hide-window'

let currentSettings: GeneralSettingsConfig | null = null

/**
 * 注册通用设置 IPC 处理器
 */
export function registerGeneralSettingsHandlers(mainWindow: BrowserWindow): void {
  // 加载设置
  ipcMain.handle(IPC_CHANNEL_LOAD_SETTINGS, async (): Promise<GeneralSettingsConfig> => {
    try {
      currentSettings = await generalSettingsFileService.loadSettings()
      return currentSettings
    } catch (error) {
      console.error('Failed to load general settings:', error)
      throw error
    }
  })

  // 保存设置
  ipcMain.handle(IPC_CHANNEL_SAVE_SETTINGS, async (_event, config: GeneralSettingsConfig): Promise<void> => {
    try {
      const oldSettings = currentSettings
      await generalSettingsFileService.saveSettings(config)
      currentSettings = config

      // 如果快速访问快捷键或置顶设置发生变化，更新窗口
      if (oldSettings) {
        if (oldSettings.quickAccessShortcut !== config.quickAccessShortcut) {
          // 重新注册快速访问快捷键
          await shortcutService.reregisterQuickAccessShortcut()
        }

        if (oldSettings.quickAccessAlwaysOnTop !== config.quickAccessAlwaysOnTop) {
          // 更新窗口置顶状态
          await quickAccessWindowService.updateConfig({
            alwaysOnTop: config.quickAccessAlwaysOnTop ?? true,
          })
        }

        if (oldSettings.quickAccessWindowSize?.width !== config.quickAccessWindowSize?.width ||
            oldSettings.quickAccessWindowSize?.height !== config.quickAccessWindowSize?.height) {
          // 更新窗口尺寸
          if (config.quickAccessWindowSize) {
            await quickAccessWindowService.updateConfig({
              width: config.quickAccessWindowSize.width,
              height: config.quickAccessWindowSize.height,
            })
          }
        }
      }
    } catch (error) {
      console.error('Failed to save general settings:', error)
      throw error
    }
  })

  // 显示窗口
  ipcMain.handle(IPC_CHANNEL_SHOW_WINDOW, async (): Promise<void> => {
    trayService.showWindow()
  })

  // 隐藏窗口
  ipcMain.handle(IPC_CHANNEL_HIDE_WINDOW, async (): Promise<void> => {
    trayService.hideWindow()
  })

  // 窗口关闭事件处理
  mainWindow.on('close', async (event) => {
    // 如果还没有加载设置，使用默认行为
    if (!currentSettings) {
      try {
        currentSettings = await generalSettingsFileService.loadSettings()
      } catch (error) {
        console.error('Failed to load settings for close event:', error)
        // 如果加载失败，使用默认行为（最小化到托盘）
        currentSettings = { closeWindowBehavior: 'minimize-to-tray' }
      }
    }

    const behavior = currentSettings.closeWindowBehavior

    if (behavior === 'minimize-to-tray') {
      // 最小化到托盘
      event.preventDefault()
      mainWindow.hide()
    } else if (behavior === 'ask') {
      // 询问用户
      event.preventDefault()
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        title: '确认退出',
        message: '是否要关闭程序？',
        detail: '选择"最小化到托盘"将隐藏窗口但保持程序运行',
        buttons: ['最小化到托盘', '退出程序', '取消'],
        defaultId: 0,
        cancelId: 2,
      })

      if (result.response === 0) {
        // 最小化到托盘
        mainWindow.hide()
      } else if (result.response === 1) {
        // 退出程序
        mainWindow.destroy()
      }
      // response === 2 取消，什么都不做
    }
    // behavior === 'quit' 时不阻止，直接关闭
  })
}

export { currentSettings }


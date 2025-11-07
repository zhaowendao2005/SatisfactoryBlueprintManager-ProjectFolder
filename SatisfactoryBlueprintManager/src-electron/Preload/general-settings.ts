/**
 * 通用设置 Preload API
 */
import { contextBridge, ipcRenderer } from 'electron'
import type { GeneralSettingsConfig } from '../../public/types/general-settings'

const IPC_CHANNEL_LOAD_SETTINGS = 'general-settings:load'
const IPC_CHANNEL_SAVE_SETTINGS = 'general-settings:save'
const IPC_CHANNEL_SHOW_WINDOW = 'general-settings:show-window'
const IPC_CHANNEL_HIDE_WINDOW = 'general-settings:hide-window'

export interface ElectronGeneralSettingsAPI {
  loadGeneralSettings(): Promise<GeneralSettingsConfig>
  saveGeneralSettings(config: GeneralSettingsConfig): Promise<void>
  showWindow(): Promise<void>
  hideWindow(): Promise<void>
}

export function exposeGeneralSettingsAPI(): void {
  contextBridge.exposeInMainWorld('generalSettingsAPI', {
    loadGeneralSettings: (): Promise<GeneralSettingsConfig> => {
      return ipcRenderer.invoke(IPC_CHANNEL_LOAD_SETTINGS)
    },
    saveGeneralSettings: (config: GeneralSettingsConfig): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNEL_SAVE_SETTINGS, config)
    },
    showWindow: (): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNEL_SHOW_WINDOW)
    },
    hideWindow: (): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNEL_HIDE_WINDOW)
    },
  } as ElectronGeneralSettingsAPI)
}


/**
 * 快速访问窗口 Preload API
 */
import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronQuickAccessAPI } from '../../public/types/window'

const IPC_CHANNEL_SUBSCRIBE_GLOBAL_TAGS = 'quick-access:subscribe-global-tags'
const IPC_CHANNEL_UNSUBSCRIBE = 'quick-access:unsubscribe'
const IPC_CHANNEL_GET_BLUEPRINTS = 'quick-access:get-blueprints'
const IPC_CHANNEL_USE_BLUEPRINT = 'quick-access:use-blueprint'
const IPC_CHANNEL_RECORD_BLUEPRINT_USAGE = 'quick-access:record-blueprint-usage'
const IPC_CHANNEL_GET_RECENT_BLUEPRINTS = 'quick-access:get-recent-blueprints'
const IPC_CHANNEL_SHOW_QUICK_ACCESS = 'quick-access:show'
const IPC_CHANNEL_HIDE_QUICK_ACCESS = 'quick-access:hide'
const IPC_CHANNEL_TOGGLE_QUICK_ACCESS = 'quick-access:toggle'
const IPC_CHANNEL_GLOBAL_TAGS_UPDATED = 'global-tags:updated'

export function exposeQuickAccessAPI(): void {
  contextBridge.exposeInMainWorld('quickAccessAPI', {
    subscribeGlobalTags: async (): Promise<{
      version: string
      tags: Array<{
        id: string
        name: string
        color: string
      }>
      blueprintTags: Record<string, string[]>
    }> => {
      return await ipcRenderer.invoke(IPC_CHANNEL_SUBSCRIBE_GLOBAL_TAGS)
    },

    unsubscribe: (): void => {
      void ipcRenderer.invoke(IPC_CHANNEL_UNSUBSCRIBE)
    },

    getBlueprints: async (): Promise<Array<{
      id: string
      name: string
      path: string
      directoryPath?: string
      tags: string[]
    }>> => {
      return await ipcRenderer.invoke(IPC_CHANNEL_GET_BLUEPRINTS)
    },

    useBlueprint: async (blueprintPath: string): Promise<void> => {
      return await ipcRenderer.invoke(IPC_CHANNEL_USE_BLUEPRINT, blueprintPath)
    },

    recordBlueprintUsage: async (blueprintPath: string): Promise<void> => {
      return await ipcRenderer.invoke(IPC_CHANNEL_RECORD_BLUEPRINT_USAGE, blueprintPath)
    },

    getRecentBlueprints: async (): Promise<Array<{ path: string; timestamp: number }>> => {
      return await ipcRenderer.invoke(IPC_CHANNEL_GET_RECENT_BLUEPRINTS)
    },

    onGlobalTagsUpdated: (callback: (config: {
      version: string
      tags: Array<{
        id: string
        name: string
        color: string
      }>
      blueprintTags: Record<string, string[]>
    }) => void): (() => void) => {
      const handler = (_event: unknown, config: {
        version: string
        tags: Array<{
          id: string
          name: string
          color: string
        }>
        blueprintTags: Record<string, string[]>
      }) => {
        callback(config)
      }

      ipcRenderer.on(IPC_CHANNEL_GLOBAL_TAGS_UPDATED, handler)

      return () => {
        ipcRenderer.removeListener(IPC_CHANNEL_GLOBAL_TAGS_UPDATED, handler)
      }
    },

    onBlueprintsUpdated: (callback: (blueprints: Array<{
      id: string
      name: string
      path: string
      directoryPath?: string
      tags: string[]
    }>) => void): (() => void) => {
      const handler = (_event: unknown, blueprints: Array<{
        id: string
        name: string
        path: string
        directoryPath?: string
        tags: string[]
      }>) => {
        callback(blueprints)
      }

      ipcRenderer.on('quick-access:blueprints-updated', handler)

      return () => {
        ipcRenderer.removeListener('quick-access:blueprints-updated', handler)
      }
    },

    showQuickAccess: async (): Promise<void> => {
      return await ipcRenderer.invoke(IPC_CHANNEL_SHOW_QUICK_ACCESS)
    },

    hideQuickAccess: async (): Promise<void> => {
      return await ipcRenderer.invoke(IPC_CHANNEL_HIDE_QUICK_ACCESS)
    },

    toggleQuickAccess: async (): Promise<void> => {
      return await ipcRenderer.invoke(IPC_CHANNEL_TOGGLE_QUICK_ACCESS)
    },
  } as ElectronQuickAccessAPI)
}


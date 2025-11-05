/**
 * 同步配置 Store
 * 职责：管理同步配置状态
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SyncConfig } from 'src/../../public/types/sync'
import { syncDatasource } from './datasource'

/**
 * localStorage 键名
 */
const STORAGE_KEY_SYNC_CONFIG = 'syncConfig'

/**
 * 同步配置 Store
 */
export const useSyncConfigStore = defineStore('syncConfig', () => {
  // 状态
  const saveGameBasePath = ref<string>('')
  const selectedSaveGame = ref<string | null>(null)
  const libraryPath = ref<string>('')
  const backupPath = ref<string>('')
  const availableSaveGames = ref<string[]>([])
  const autoBackup = ref<boolean>(true)

  // 计算属性
  const selectedSaveGamePath = computed(() => {
    if (!selectedSaveGame.value || !saveGameBasePath.value) {
      return null
    }
    return `${saveGameBasePath.value}/${selectedSaveGame.value}`
  })

  // Actions
  /**
   * 从持久化加载配置
   */
  async function loadConfig(): Promise<void> {
    try {
      // 从后端获取默认路径
      const defaultPaths = await syncDatasource.getDefaultPaths()

      const saved = localStorage.getItem(STORAGE_KEY_SYNC_CONFIG)
      if (saved) {
        const config: SyncConfig = JSON.parse(saved)
        // 如果保存的路径为空字符串，使用默认路径（确保显示实际路径而不是空值）
        saveGameBasePath.value = config.saveGameBasePath || defaultPaths.saveGamePath
        selectedSaveGame.value = config.selectedSaveGame
        libraryPath.value = config.libraryPath || defaultPaths.libraryPath
        backupPath.value = config.backupPath || defaultPaths.backupPath
        autoBackup.value = config.autoBackup !== false
      } else {
        // 使用默认值（实际路径）
        saveGameBasePath.value = defaultPaths.saveGamePath
        libraryPath.value = defaultPaths.libraryPath
        backupPath.value = defaultPaths.backupPath
        autoBackup.value = true
      }

      // 扫描存档列表
      await refreshSaveGames()
    } catch (error) {
      console.error('Failed to load sync config:', error)
      throw error
    }
  }

  /**
   * 保存配置到持久化
   */
  async function saveConfig(): Promise<void> {
    try {
      const config: SyncConfig = {
        saveGameBasePath: saveGameBasePath.value,
        selectedSaveGame: selectedSaveGame.value,
        libraryPath: libraryPath.value,
        backupPath: backupPath.value,
        autoBackup: autoBackup.value,
      }
      localStorage.setItem(STORAGE_KEY_SYNC_CONFIG, JSON.stringify(config))
    } catch (error) {
      console.error('Failed to save sync config:', error)
      throw error
    }
  }

  /**
   * 设置存档路径并扫描存档列表
   */
  async function setSaveGamePath(path: string): Promise<void> {
    saveGameBasePath.value = path
    await refreshSaveGames()
    await saveConfig()
  }

  /**
   * 选择存档
   */
  function selectSaveGame(name: string): void {
    selectedSaveGame.value = name
    void saveConfig()
  }

  /**
   * 设置蓝图库路径
   */
  function setLibraryPath(path: string): void {
    libraryPath.value = path
    void saveConfig()
  }

  /**
   * 设置备份路径
   */
  function setBackupPath(path: string): void {
    backupPath.value = path
    void saveConfig()
  }

  /**
   * 刷新存档列表
   */
  async function refreshSaveGames(): Promise<void> {
    if (!saveGameBasePath.value) {
      availableSaveGames.value = []
      return
    }

    try {
      const games = await syncDatasource.scanSaveGames(saveGameBasePath.value)
      availableSaveGames.value = games

      // 如果当前选中的存档不在列表中，清除选择
      if (selectedSaveGame.value && !games.includes(selectedSaveGame.value)) {
        selectedSaveGame.value = null
        await saveConfig()
      }
    } catch (error) {
      console.error('Failed to refresh save games:', error)
      availableSaveGames.value = []
    }
  }

  return {
    // 状态
    saveGameBasePath,
    selectedSaveGame,
    libraryPath,
    backupPath,
    availableSaveGames,
    autoBackup,
    // 计算属性
    selectedSaveGamePath,
    // Actions
    loadConfig,
    saveConfig,
    setSaveGamePath,
    selectSaveGame,
    setLibraryPath,
    setBackupPath,
    refreshSaveGames,
  }
})


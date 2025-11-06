/**
 * 同步操作 Store
 * 职责：管理同步操作状态
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SyncMode, GameToLibraryMode, SyncResult, SyncProgress } from '@types/sync'
import { syncDatasource } from './datasource'
import { useSyncConfigStore } from './config-store'
import { useActiveBlueprintStore } from '../ActiveBlueprint'
import { useBlueprintSourceStore } from '../BlueprintSource'

/**
 * 同步操作 Store
 */
export const useSyncOperationStore = defineStore('syncOperation', () => {
  // 状态
  const isSyncing = ref<boolean>(false)
  const progress = ref<SyncProgress | null>(null)
  const syncResult = ref<SyncResult | null>(null)
  const abortController = ref<AbortController | null>(null)

  // Actions
  /**
   * 开始同步
   */
  async function startSync(
    mode: SyncMode,
    options?: { 
      gameToLibraryMode?: GameToLibraryMode
      activeConfigId?: string
      activeConfigName?: string
    }
  ): Promise<SyncResult> {
    if (isSyncing.value) {
      throw new Error('已有同步任务进行中')
    }

    isSyncing.value = true
    progress.value = {
      total: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
      current: '',
    }
    syncResult.value = null
    abortController.value = new AbortController()

    try {
      const configStore = useSyncConfigStore()
      const activeBlueprintStore = useActiveBlueprintStore()
      const blueprintSourceStore = useBlueprintSourceStore()

      if (mode === 'library-to-game') {
        // 库→游戏同步
        if (!configStore.selectedSaveGamePath) {
          throw new Error('请先选择存档')
        }

        // 收集激活的蓝图
        const blueprints = collectActiveBlueprints(activeBlueprintStore.treeData)

        // 序列化蓝图节点，移除 Vue 响应式代理和不可序列化的字段
        const serializedBlueprints = blueprints.map((bp) => ({
          id: bp.id,
          name: bp.name,
          type: bp.type,
          blueprintId: bp.blueprintId,
          path: bp.path,
          sourcePath: bp.sourcePath,
        }))

        const result = await syncDatasource.syncLibraryToGame({
          targetPath: configStore.selectedSaveGamePath,
          blueprints: serializedBlueprints,
          backupPath: configStore.autoBackup ? configStore.backupPath : undefined,
          activeConfigId: options?.activeConfigId,
          activeConfigName: options?.activeConfigName,
        })

        syncResult.value = result
        return result
      } else {
        // 游戏→库同步
        if (!configStore.selectedSaveGamePath) {
          throw new Error('请先选择存档')
        }

        const modeOption = options?.gameToLibraryMode || 'diff'

        // 构建索引
        const index = await syncDatasource.buildIndex(blueprintSourceStore.sources)

        // 序列化索引，确保 entries 是可序列化的普通对象
        const serializedIndex = {
          version: index.version,
          createdAt: index.createdAt,
          entries: index.entries, // entries 已经是普通对象 Record<string, IndexEntry[]>
        }

        const result = await syncDatasource.syncGameToLibrary({
          sourcePath: configStore.selectedSaveGamePath,
          mode: modeOption,
          index: serializedIndex,
          fallbackPath: configStore.libraryPath,
        })

        syncResult.value = result
        return result
      }
    } catch (error) {
      console.error('Sync failed:', error)
      throw error
    } finally {
      isSyncing.value = false
      progress.value = null
      abortController.value = null
    }
  }

  /**
   * 取消同步
   */
  function cancelSync(): void {
    if (abortController.value) {
      abortController.value.abort()
      abortController.value = null
    }
    isSyncing.value = false
    progress.value = null
  }

  /**
   * 清除结果
   */
  function clearResult(): void {
    syncResult.value = null
  }

  return {
    // 状态
    isSyncing,
    progress,
    syncResult,
    // Actions
    startSync,
    cancelSync,
    clearResult,
  }
})

/**
 * 收集已激活的蓝图（基于路径去重）
 * @注意事项 同一个蓝图可能被激活到多个分组，同步时只需要同步一次
 */
function collectActiveBlueprints(nodes: any[]): any[] {
  const blueprints: any[] = []
  const pathSet = new Set<string>() // 用于去重

  function collect(nodes: any[]): void {
    for (const node of nodes) {
      if (node.type === 'blueprint') {
        // 使用 sourcePath 或 path 作为唯一标识
        const uniquePath = node.sourcePath || node.path
        
        // 规范化路径（统一使用正斜杠）
        const normalizedPath = uniquePath ? uniquePath.replace(/\\/g, '/') : null
        
        if (normalizedPath && !pathSet.has(normalizedPath)) {
          pathSet.add(normalizedPath)
          blueprints.push(node)
        }
      } else if (node.children && Array.isArray(node.children)) {
        collect(node.children)
      }
    }
  }

  collect(nodes)
  return blueprints
}


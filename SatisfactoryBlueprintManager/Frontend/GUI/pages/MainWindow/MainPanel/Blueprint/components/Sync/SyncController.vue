<template>
  <div class="sync-controller">
    <div class="header">
      <h3 class="title">已激活的蓝图</h3>
      <div class="sync-controls">
        <el-select v-model="syncMode" style="width: 200px; margin-right: 8px">
          <el-option label="蓝图库 → 游戏蓝图目录（全量）" value="library-to-game" />
          <el-option label="蓝图库 ← 游戏蓝图目录" value="game-to-library" />
        </el-select>
        <el-button type="primary" :loading="isSyncing" @click="handleSync">
          同步
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { SyncMode, GameToLibraryMode } from '@types/sync'
import { useSyncOperationStore } from '../../stores/Sync/operation-store'
import { useSyncConfigStore } from '../../stores/Sync/config-store'

const syncOperationStore = useSyncOperationStore()
const configStore = useSyncConfigStore()

const syncMode = ref<SyncMode>('library-to-game')
const isSyncing = computed(() => syncOperationStore.isSyncing)

const handleSync = async () => {
  try {
    if (syncMode.value === 'library-to-game') {
      // 库→游戏同步
      await handleLibraryToGameSync()
    } else {
      // 游戏→库同步
      await handleGameToLibrarySync()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`同步失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

const handleLibraryToGameSync = async () => {
  try {
    // 第一步：警告对话框
    await ElMessageBox.confirm(
      '此操作会直接覆盖游戏内蓝图目录，请确认已经完成了备份，建议先将游戏内蓝图进行备份再进行下面操作',
      '警告',
      {
        type: 'warning',
        confirmButtonText: '下一步',
        cancelButtonText: '取消',
        distinguishCancelAndClose: true,
      }
    )

    // 第二步：最终确认（带复选框提示）
    try {
      await ElMessageBox({
        title: '最终确认',
        message: '请确认：我已知晓风险，并已完成备份',
        type: 'warning',
        showCancelButton: true,
        confirmButtonText: '确认同步',
        cancelButtonText: '取消',
      })
    } catch {
      return // 用户取消
    }

    // 执行同步
    await syncOperationStore.startSync('library-to-game')
    ElMessage.success('同步完成')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      throw error
    }
  }
}

const handleGameToLibrarySync = async () => {
  const gameToLibraryMode = ref<GameToLibraryMode>('diff')
  const acknowledgedForGameToLibrary = ref(false)

  try {
    // 第一步：选择同步模式
    const { value: modeStr } = await ElMessageBox.prompt(
      '请选择同步模式：\n1. 差异 (diff)\n2. 全量 (full)\n3. 最新 (latest)\n4. 新版本 (new-version)',
      '选择同步模式',
      {
        confirmButtonText: '下一步',
        cancelButtonText: '取消',
        inputValue: 'diff',
      }
    )

    const modeMap: Record<string, GameToLibraryMode> = {
      diff: 'diff',
      full: 'full',
      latest: 'latest',
      'new-version': 'new-version',
    }

    gameToLibraryMode.value = modeMap[modeStr || 'diff'] || 'diff'

    // 第二步：确认风险
    await ElMessageBox({
      title: '确认同步',
      message: '此操作会将游戏内蓝图同步回蓝图库，请确认已经完成了备份',
      type: 'warning',
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      distinguishCancelAndClose: true,
      showCancelButton: true,
      beforeClose: async (action, instance, done) => {
        if (action === 'confirm') {
          // 弹出最终确认
          try {
            await ElMessageBox({
              title: '最终确认',
              message: '我已知晓风险',
              type: 'warning',
              showCancelButton: true,
              confirmButtonText: '确认',
              cancelButtonText: '取消',
              beforeClose: (action2, instance2, done2) => {
                if (action2 === 'confirm') {
                  acknowledgedForGameToLibrary.value = true
                  done2()
                  done()
                } else {
                  done2()
                }
              },
            })
          } catch {
            return // 用户取消
          }
        } else {
          done()
        }
      },
    })

    await syncOperationStore.startSync('game-to-library', {
      gameToLibraryMode: gameToLibraryMode.value,
    })
    ElMessage.success('同步完成')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      throw error
    }
  }
}
</script>

<style scoped lang="scss">
.sync-controller {
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;

  .header {
    height: 56px;
    padding: 0 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #e0e0e0;

    .title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }

    .sync-controls {
      display: flex;
      align-items: center;
    }
  }
}
</style>


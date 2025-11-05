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
import { ref, computed, h } from 'vue'
import { ElMessage, ElMessageBox, ElRadioGroup, ElRadio, ElSelect, ElOption, ElInput } from 'element-plus'
import type { SyncMode, BlueprintPair } from '@types/sync'
import { useSyncOperationStore } from '../../stores/Sync/operation-store'
import { useSyncConfigStore } from '../../stores/Sync/config-store'
import { useBlueprintSourceStore } from '../../stores/BlueprintSource'
import { syncDatasource } from '../../stores/Sync/datasource'

const syncOperationStore = useSyncOperationStore()
const configStore = useSyncConfigStore()
const blueprintSourceStore = useBlueprintSourceStore()

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
  try {
    // 第一步：检测新增蓝图
    if (!configStore.selectedSaveGamePath) {
      ElMessage.warning('请先选择存档')
      return
    }

    // 构建索引
    const index = await syncDatasource.buildIndex(blueprintSourceStore.sources)
    
    // 检测新增蓝图
    const result = await syncDatasource.detectNewBlueprints(
      configStore.selectedSaveGamePath,
      index
    )

    if (result.newBlueprints.length === 0) {
      ElMessage.info('没有发现新增蓝图')
      return
    }

    // 第二步：显示新增蓝图列表，让用户选择目标目录
    const selectedTargetPath = await new Promise<string | null>((resolve) => {
      const targetPath = ref<string>('')
      const useCustomPath = ref(false)
      const customPath = ref('')

      // 获取所有启用的蓝图源
      const sourceOptions = blueprintSourceStore.sources
        .filter((s) => s.enabled)
        .map((s) => ({ label: s.name, value: s.path }))

      ElMessageBox({
        title: '选择目标目录',
        message: () =>
          h('div', { style: 'padding: 8px 0; min-width: 500px;' }, [
            h('p', { style: 'margin-bottom: 12px;' }, `发现 ${result.newBlueprints.length} 个新增蓝图：`),
            h(
              'div',
              {
                style:
                  'max-height: 200px; overflow-y: auto; border: 1px solid #dcdfe6; border-radius: 4px; padding: 8px; margin-bottom: 16px; background: #f5f7fa;',
              },
              result.newBlueprints.map((bp) =>
                h('div', { key: bp.basename, style: 'padding: 4px 0;' }, bp.basename)
              )
            ),
            h('p', { style: 'margin-bottom: 8px;' }, '选择保存位置：'),
            h(
              ElRadioGroup,
              {
                modelValue: useCustomPath.value,
                'onUpdate:modelValue': (value: boolean) => {
                  useCustomPath.value = value
                },
                style: 'margin-bottom: 12px;',
              },
              () => [
                h(ElRadio, { label: false }, () => '选择蓝图源'),
                h(ElRadio, { label: true }, () => '自定义目录'),
              ]
            ),
            useCustomPath.value
              ? h(ElInput, {
                  modelValue: customPath.value,
                  'onUpdate:modelValue': (value: string) => {
                    customPath.value = value
                  },
                  placeholder: '请输入目录路径',
                  style: 'margin-bottom: 12px;',
                })
              : h(
                  ElSelect,
                  {
                    modelValue: targetPath.value,
                    'onUpdate:modelValue': (value: string) => {
                      targetPath.value = value
                    },
                    placeholder: '请选择蓝图源',
                    style: 'width: 100%; margin-bottom: 12px;',
                  },
                  () =>
                    sourceOptions.map((option) =>
                      h(ElOption, { key: option.value, label: option.label, value: option.value })
                    )
                ),
          ]),
        showCancelButton: true,
        confirmButtonText: '开始同步',
        cancelButtonText: '取消',
        beforeClose: (action, instance, done) => {
          if (action === 'confirm') {
            if (useCustomPath.value) {
              if (!customPath.value || customPath.value.trim() === '') {
                ElMessage.warning('请输入自定义目录路径')
                done(false)
                return
              }
              resolve(customPath.value.trim())
            } else {
              if (!targetPath.value) {
                ElMessage.warning('请选择蓝图源')
                done(false)
                return
              }
              resolve(targetPath.value)
            }
            done()
          } else {
            resolve(null)
            done()
          }
        },
      })
    })

    if (!selectedTargetPath) {
      return // 用户取消
    }

    // 第三步：执行同步
    await syncDatasource.syncGameToLibrary({
      sourcePath: configStore.selectedSaveGamePath,
      targetPath: selectedTargetPath,
      blueprints: result.newBlueprints,
    })

    ElMessage.success('同步完成')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(`同步失败：${error instanceof Error ? error.message : String(error)}`)
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


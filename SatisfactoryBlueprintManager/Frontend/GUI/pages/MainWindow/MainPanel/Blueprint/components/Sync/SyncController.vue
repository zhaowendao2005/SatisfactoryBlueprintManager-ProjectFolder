<template>
  <div class="sync-controller">
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
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { ElMessage, ElMessageBox, ElRadioGroup, ElRadio, ElSelect, ElOption, ElInput, ElCheckbox } from 'element-plus'
import type { SyncMode, BlueprintPair } from '@types/sync'
import { useSyncOperationStore } from '../../stores/Sync/operation-store'
import { useSyncConfigStore } from '../../stores/Sync/config-store'
import { useBlueprintSourceStore } from '../../stores/BlueprintSource'
import { useActiveBlueprintStore } from '../../stores/ActiveBlueprint'
import { syncDatasource } from '../../stores/Sync/datasource'
import { configDatasource } from '../../stores/ActiveBlueprint/config-datasource'

const syncOperationStore = useSyncOperationStore()
const configStore = useSyncConfigStore()
const blueprintSourceStore = useBlueprintSourceStore()
const activeBlueprintStore = useActiveBlueprintStore()

// 获取当前配置的计算属性
const currentConfig = computed(() => {
  if (!activeBlueprintStore.currentConfigId) {
    return null
  }
  return activeBlueprintStore.configList.find(
    (c) => c.id === activeBlueprintStore.currentConfigId
  ) || null
})

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

    // 执行同步，传入当前激活的配置信息
    const configId = currentConfig.value?.id
    const configName = currentConfig.value?.name
    await syncOperationStore.startSync('library-to-game', {
      activeConfigId: configId || undefined,
      activeConfigName: configName || undefined,
    })
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
    const selectionResult = await new Promise<{
      targetPath: string
      autoActivate: boolean
    } | null>((resolve) => {
      const targetPath = ref<string>('')
      const useCustomPath = ref(false)
      const customPath = ref('')
      const autoActivate = ref(false)

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
            // 新增：自动激活复选框
            h(
              'div',
              { style: 'margin-top: 16px; padding-top: 12px; border-top: 1px solid #dcdfe6;' },
              [
                h(ElCheckbox, {
                  modelValue: autoActivate.value,
                  'onUpdate:modelValue': (value: boolean) => {
                    autoActivate.value = value
                  },
                }, () => '同时更新已激活蓝图的配置（自动激活这些蓝图）')
              ]
            ),
          ]),
        showCancelButton: true,
        confirmButtonText: '开始同步',
        cancelButtonText: '取消',
        beforeClose: (action, instance, done) => {
          if (action === 'confirm') {
            let finalTargetPath: string
            if (useCustomPath.value) {
              if (!customPath.value || customPath.value.trim() === '') {
                ElMessage.warning('请输入自定义目录路径')
                done(false)
                return
              }
              finalTargetPath = customPath.value.trim()
            } else {
              if (!targetPath.value) {
                ElMessage.warning('请选择蓝图源')
                done(false)
                return
              }
              finalTargetPath = targetPath.value
            }
            resolve({
              targetPath: finalTargetPath,
              autoActivate: autoActivate.value,
            })
            done()
          } else {
            resolve(null)
            done()
          }
        },
      })
    })

    if (!selectionResult) {
      return // 用户取消
    }

    // 第三步：执行同步
    await syncDatasource.syncGameToLibrary({
      sourcePath: configStore.selectedSaveGamePath,
      targetPath: selectionResult.targetPath,
      blueprints: result.newBlueprints,
    })

    ElMessage.success('同步完成')

    // 第四步：如果选择了自动激活
    if (selectionResult.autoActivate) {
      try {
        // 0. 确保配置列表已加载
        await activeBlueprintStore.loadConfigList()

        // 1. 读取同步配置文件
        const syncConfig = await syncDatasource.readSyncConfig(
          configStore.selectedSaveGamePath
        )

        let targetConfigId: string | undefined

        if (syncConfig) {
          // 2. 检查配置是否存在
          const existingConfig = activeBlueprintStore.configList.find(
            (c) => c.id === syncConfig.activeConfigId
          )

          if (existingConfig) {
            // 配置存在，使用它
            targetConfigId = existingConfig.id
            await activeBlueprintStore.switchConfig(targetConfigId)
            console.log('使用现有配置', { configId: targetConfigId, configName: existingConfig.name })
          } else {
            // 配置不存在，创建新配置
            await activeBlueprintStore.createConfig(
              syncConfig.activeConfigName || '自动创建的配置'
            )
            // 获取新创建的配置ID
            targetConfigId = activeBlueprintStore.currentConfigId || undefined
            console.log('创建新配置', { configId: targetConfigId, configName: syncConfig.activeConfigName })
          }
        } else {
          // 没有同步配置，使用当前配置或创建新配置
          if (activeBlueprintStore.currentConfigId) {
            targetConfigId = activeBlueprintStore.currentConfigId
          } else {
            await activeBlueprintStore.createConfig('自动创建的配置')
            targetConfigId = activeBlueprintStore.currentConfigId || undefined
          }
        }

        if (!targetConfigId) {
          ElMessage.warning('无法确定目标配置，自动激活失败')
          return
        }

        // 3. 刷新蓝图源（找到包含新增蓝图的源）
        const targetSource = blueprintSourceStore.sources.find(
          (s) => s.path === selectionResult.targetPath
        )

        if (targetSource) {
          // 刷新这个源的子节点
          await blueprintSourceStore.refresh(targetSource.id)
          console.log('已刷新蓝图源', { sourceId: targetSource.id, sourceName: targetSource.name })
        }

        // 4. 直接操作配置文件，添加新增的蓝图
        const configData = await configDatasource.loadConfig(targetConfigId)
        if (!configData) {
          throw new Error('无法加载配置文件')
        }

        // 找到"未分组"节点，如果不存在则创建
        let ungroupedNode = configData.tree.find(
          (node) => node.id === 'ungrouped' && node.type === 'group'
        )

        if (!ungroupedNode) {
          // 创建未分组节点
          ungroupedNode = {
            id: 'ungrouped',
            type: 'group',
            name: '未分组',
            children: [],
          }
          configData.tree.push(ungroupedNode)
        }

        if (!ungroupedNode.children) {
          ungroupedNode.children = []
        }

        // 添加新增的蓝图到未分组
        for (const blueprint of result.newBlueprints) {
          const blueprintPath = `${selectionResult.targetPath}/${blueprint.basename}.sbp`
          const blueprintId = `sync-${blueprint.basename}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          
          const newNode = {
            id: `active-bp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'blueprint' as const,
            name: blueprint.basename,
            blueprintId,
            path: blueprintPath,
          }

          ungroupedNode.children.push(newNode)
          console.log('已添加蓝图到配置文件', { name: blueprint.basename, path: blueprintPath })
        }

        // 更新配置文件的更新时间
        configData.updatedAt = Date.now()

        // 保存配置文件
        await configDatasource.saveConfig(configData)
        console.log('配置文件已保存', { configId: targetConfigId })

        // 5. 直接重新加载配置并更新状态（避免 switchConfig 保存旧状态）
        const freshConfigData = await configDatasource.loadConfig(targetConfigId)
        if (freshConfigData && activeBlueprintStore.currentConfigId === targetConfigId) {
          // 直接更新状态，不调用 switchConfig
          activeBlueprintStore.treeData = freshConfigData.tree as any[]
          activeBlueprintStore.rootNode = {
            id: 'root',
            name: '根分组',
            type: 'group',
            children: freshConfigData.tree as any[],
          }
          console.log('配置状态已刷新', { configId: targetConfigId })
        }

        ElMessage.success(
          `已自动激活 ${result.newBlueprints.length} 个蓝图到配置：${activeBlueprintStore.configList.find(c => c.id === targetConfigId)?.name || '未知'}`
        )
      } catch (error) {
        console.error('自动激活蓝图失败:', error)
        ElMessage.warning('自动激活蓝图失败，请手动添加')
      }
    }
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(`同步失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }
}
</script>

<style scoped lang="scss">
.sync-controller {
  .sync-controls {
    display: flex;
    align-items: center;
  }
}
</style>


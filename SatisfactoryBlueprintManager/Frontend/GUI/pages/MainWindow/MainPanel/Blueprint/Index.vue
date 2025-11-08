<template>
  <div class="blueprint-container">
    <TitleCard />
    <SaveGameSelector />
    <PathConfig />
    <BlueprintSource />
    <ConfigManager />
    <ActiveBlueprint />
    <SyncProgressDialog v-model="showProgressDialog" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import TitleCard from './components/Sync/TitleCard.vue'
import SaveGameSelector from './components/Sync/SaveGameSelector.vue'
import PathConfig from './components/Sync/PathConfig.vue'
import BlueprintSource from './components/BlueprintSource/index.vue'
import ConfigManager from './components/ConfigManager/index.vue'
import ActiveBlueprint from './components/ActiveBlueprint/index.vue'
import SyncProgressDialog from './components/Sync/SyncProgressDialog.vue'
import { useBlueprintSourceStore } from './stores/BlueprintSource'
import { useActiveBlueprintStore } from './stores/ActiveBlueprint'
import { useGlobalTagsStore } from './stores/GlobalTags'
import { useSyncOperationStore } from './stores/Sync/operation-store'
import { useSyncConfigStore } from './stores/Sync/config-store'

const blueprintSourceStore = useBlueprintSourceStore()
const activeBlueprintStore = useActiveBlueprintStore()
const globalTagsStore = useGlobalTagsStore()
const syncOperationStore = useSyncOperationStore()
const syncConfigStore = useSyncConfigStore()

const showProgressDialog = ref(false)

// 监听同步状态
watch(
  () => syncOperationStore.isSyncing,
  (syncing) => {
    showProgressDialog.value = syncing
  }
)

onMounted(async () => {
  try {
    // 检查是否已经有数据（从 layout.vue 的预加载）
    const hasConfig = activeBlueprintStore.currentConfigId !== null
    const hasRootNodes = blueprintSourceStore.rootNodes.length > 0
    const hasTags = globalTagsStore.tags.length > 0

    console.log('[Blueprint] 检查预加载状态:', { hasConfig, hasRootNodes, hasTags })

    // 只加载尚未加载的数据
    const tasks = []
    
    if (!hasRootNodes) {
      console.log('[Blueprint] 加载蓝图源...')
      tasks.push(blueprintSourceStore.loadRootNodes())
    }
    
    if (!hasConfig) {
      console.log('[Blueprint] 加载配置...')
      tasks.push(activeBlueprintStore.initializeConfig())
    }
    
    if (!hasTags) {
      console.log('[Blueprint] 加载全局标签...')
      tasks.push(globalTagsStore.initializeGlobalTags())
    }
    
    // 同步配置总是需要加载
    tasks.push(syncConfigStore.loadConfig())

    if (tasks.length > 0) {
      await Promise.all(tasks)
      console.log('[Blueprint] 补充加载完成')
    } else {
      console.log('[Blueprint] 所有数据已预加载，跳过重复加载')
      // 仍然需要加载同步配置
      await syncConfigStore.loadConfig()
    }
  } catch (error) {
    console.error('Failed to initialize Blueprint module:', error)
  }
})
</script>

<style scoped lang="scss">
.blueprint-container {
  height: 100%;
  padding: 16px 24px;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  // 使用 block 布局，让子元素自然堆叠，不会被压缩
  display: block;

  // 子元素之间的间距通过 margin 控制
  > * {
    margin-bottom: 60px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  // 自定义滚动条样式（3px 宽度）
  &::-webkit-scrollbar {
    width: 3px;
    height: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 2px;
    min-height: 20px;
  }

  &::-webkit-scrollbar-track {
    background-color: rgba(0, 0, 0, 0.05);
    border-radius: 2px;
  }
}
</style>


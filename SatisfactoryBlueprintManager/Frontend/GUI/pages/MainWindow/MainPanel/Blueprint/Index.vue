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
    // 初始化加载数据
    await Promise.all([
      blueprintSourceStore.loadRootNodes(),
      activeBlueprintStore.initializeConfig(), // 初始化配置（会加载配置列表和上次的配置）
      globalTagsStore.initializeGlobalTags(), // 初始化全局标签
      syncConfigStore.loadConfig(), // 加载同步配置
    ])
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


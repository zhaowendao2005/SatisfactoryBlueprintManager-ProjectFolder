<template>
  <q-page class="blueprint-container">
    <TitleCard />
    <SaveGameSelector />
    <PathConfig />
    <BlueprintSource />
    <ConfigManager />
    <ActiveBlueprint />
    <SyncProgressDialog v-model="showProgressDialog" />
  </q-page>
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
import { useSyncOperationStore } from './stores/Sync/operation-store'
import { useSyncConfigStore } from './stores/Sync/config-store'

const blueprintSourceStore = useBlueprintSourceStore()
const activeBlueprintStore = useActiveBlueprintStore()
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
      syncConfigStore.loadConfig(), // 加载同步配置
    ])
  } catch (error) {
    console.error('Failed to initialize Blueprint module:', error)
  }
})
</script>

<style scoped lang="scss">
.blueprint-container {
  display: flex;
  flex-direction: column;
  padding: 16px 24px;
  gap: 60px;
  min-height: 100%;
  overflow-y: scroll;

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


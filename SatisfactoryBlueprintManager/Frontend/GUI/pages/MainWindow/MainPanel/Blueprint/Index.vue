<template>
  <q-page class="blueprint-container">
    <BlueprintSource />
    <ActiveBlueprint />
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import BlueprintSource from './components/BlueprintSource/index.vue'
import ActiveBlueprint from './components/ActiveBlueprint/index.vue'
import { useBlueprintSourceStore } from './stores/BlueprintSource'
import { useActiveBlueprintStore } from './stores/ActiveBlueprint'

const blueprintSourceStore = useBlueprintSourceStore()
const activeBlueprintStore = useActiveBlueprintStore()

onMounted(async () => {
  try {
    // 初始化加载数据
    await Promise.all([
      blueprintSourceStore.loadRootNodes(),
      activeBlueprintStore.loadActiveTree(),
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


<template>
  <div class="blueprint-source">
    <Topbar @add-source="handleAddSource" @refresh="handleRefresh" />
    <TreeView @show-details="handleShowDetails" />
  </div>
</template>

<script setup lang="ts">
import Topbar from './Topbar.vue'
import TreeView from './TreeView.vue'
import { useBlueprintSourceStore } from '../../stores/BlueprintSource'

const store = useBlueprintSourceStore()

const handleAddSource = async () => {
  // TODO: 实现添加源的对话框
  console.log('Add source clicked')
  // 示例：await store.addSource({ name: '新源', path: '/new/source' })
}

const handleRefresh = async () => {
  try {
    await store.refresh()
  } catch (error) {
    console.error('Failed to refresh:', error)
  }
}

const handleShowDetails = (nodeId: string) => {
  // TODO: 实现详细信息对话框
  console.log('Show details for:', nodeId)
}
</script>

<style scoped lang="scss">
.blueprint-source {
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  height: 400px;
  display: flex;
  flex-direction: column;
}
</style>


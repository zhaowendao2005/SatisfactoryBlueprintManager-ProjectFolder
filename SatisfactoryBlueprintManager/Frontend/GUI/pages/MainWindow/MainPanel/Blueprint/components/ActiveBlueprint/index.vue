<template>
  <div class="active-blueprint">
    <!-- 标题栏 -->
    <div class="header">
      <h3 class="title">已激活的蓝图</h3>
    </div>
    <!-- 控制器容器 -->
    <div class="controls-container">
      <BlueprintInfoController />
      <div class="sync-controls-wrapper">
        <SyncController />
      </div>
    </div>
    <!-- 视图切换器 -->
    <ViewSwitcher />
    <!-- 内容区域 -->
    <TreeView
      v-if="currentView === 'tree'"
      @show-details="handleShowDetails"
    />
    <TagView v-else />
    <!-- 详细信息抽屉 -->
    <DetailDrawer
      v-model="drawerVisible"
      title="蓝图详细信息"
      size="50%"
      @close="handleDrawerClose"
    >
      <BlueprintDetailPanel :blueprint-id="currentBlueprintId" />
    </DetailDrawer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ViewSwitcher from './ViewSwitcher.vue'
import TreeView from './TreeView.vue'
import TagView from './TagView.vue'
import DetailDrawer from '../DetailDrawer.vue'
import SyncController from '../Sync/SyncController.vue'
import BlueprintInfoController from '../BlueprintInfo/BlueprintInfoController.vue'
import BlueprintDetailPanel from './BlueprintDetailPanel.vue'
import { useActiveBlueprintStore } from '../../stores/ActiveBlueprint'

const store = useActiveBlueprintStore()

const currentView = computed(() => store.currentView)
const drawerVisible = ref(false)
const currentNodeId = ref<string | null>(null)
const currentBlueprintId = ref<string | null>(null)

/**
 * 查找节点并提取 blueprintId
 * @注意事项 解析时使用的是节点的 id（如 active-1762517375866-htxr26g），所以直接使用 node.id
 */
const findNodeById = (nodeId: string): { blueprintId: string | null; isBlueprint: boolean } => {
  const findInNodes = (nodes: typeof store.treeData): typeof result | null => {
    for (const node of nodes) {
      if (node.id === nodeId) {
        return {
          blueprintId: node.type === 'blueprint' ? node.id : null,
          isBlueprint: node.type === 'blueprint',
        }
      }
      if (node.children) {
        const found = findInNodes(node.children)
        if (found) return found
      }
    }
    return null
  }

  const result = findInNodes(store.treeData)
  return result || { blueprintId: null, isBlueprint: false }
}

const handleShowDetails = (nodeId: string) => {
  const { blueprintId, isBlueprint } = findNodeById(nodeId)
  
  if (!isBlueprint) {
    // 暂不处理分组节点
    return
  }

  currentNodeId.value = nodeId
  currentBlueprintId.value = blueprintId
  drawerVisible.value = true
}

const handleDrawerClose = () => {
  drawerVisible.value = false
  currentNodeId.value = null
  currentBlueprintId.value = null
}
</script>

<style scoped lang="scss">
.active-blueprint {
  height: 800px; // 固定高度
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;

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
  }

  .controls-container {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 20px;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.02), transparent);
    border-bottom: 1px solid #e0e0e0;

    .sync-controls-wrapper {
      margin-left: auto;
      display: flex;
      align-items: center;
    }
  }

  .icon-view-placeholder {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
  }
}
</style>


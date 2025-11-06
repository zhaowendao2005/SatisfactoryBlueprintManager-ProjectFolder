<template>
  <div class="active-blueprint">
    <!-- 标题栏 -->
    <div class="header">
      <h3 class="title">已激活的蓝图</h3>
      <div class="sync-controls">
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
    <div v-else class="icon-view-placeholder">
      <p>图标视图暂未实现</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ViewSwitcher from './ViewSwitcher.vue'
import TreeView from './TreeView.vue'
import SyncController from '../Sync/SyncController.vue'
import { useActiveBlueprintStore } from '../../stores/ActiveBlueprint'

const store = useActiveBlueprintStore()

const currentView = computed(() => store.currentView)

const handleShowDetails = (nodeId: string) => {
  // TODO: 实现详细信息对话框
  console.log('Show details for:', nodeId)
}
</script>

<style scoped lang="scss">
.active-blueprint {
  height: 400px; // 固定高度
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

    .sync-controls {
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


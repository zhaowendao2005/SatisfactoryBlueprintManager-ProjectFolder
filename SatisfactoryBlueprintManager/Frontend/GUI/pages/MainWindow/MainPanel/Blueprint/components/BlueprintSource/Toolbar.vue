<template>
  <div class="source-toolbar">
    <div class="toolbar-left">
      <span class="toolbar-title">蓝图源</span>
    </div>
    <div class="toolbar-right">
      <el-button size="small" @click="handleAddSource">
        <el-icon><Plus /></el-icon>
        添加源
      </el-button>
      <el-button size="small" @click="handleRefresh">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, Refresh } from '@element-plus/icons-vue'

const emit = defineEmits<{
  (e: 'add-source'): void
  (e: 'refresh'): void
}>()

const handleAddSource = () => {
  emit('add-source')
}

const handleRefresh = () => {
  emit('refresh')
}
</script>

<style scoped lang="scss">
.source-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 100%;

  .toolbar-left {
    .toolbar-title {
      font-size: 16px;
      font-weight: 500;
      color: #333;
    }
  }

  .toolbar-right {
    display: flex;
    gap: 8px;
  }
}
</style>

